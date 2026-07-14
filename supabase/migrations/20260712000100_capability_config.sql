create type public.app_role as enum ('viewer', 'editor', 'publisher');

create table public.app_members (
  email text primary key check (email = lower(email)),
  role public.app_role not null default 'viewer',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.config_drafts (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (scope, owner_id)
);

create table public.config_releases (
  id bigint generated always as identity primary key,
  scope text not null,
  version integer not null check (version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),
  unique (scope, version)
);

create index config_releases_latest_idx
  on public.config_releases (scope, version desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger app_members_touch_updated_at
before update on public.app_members
for each row execute function public.touch_updated_at();

create trigger config_drafts_touch_updated_at
before update on public.config_drafts
for each row execute function public.touch_updated_at();

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.app_members
  where email = lower(coalesce(auth.jwt() ->> 'email', ''))
    and active = true
  limit 1;
$$;

create or replace function public.get_published_config(p_scope text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'version', version,
    'published_at', published_at,
    'payload', payload
  )
  from public.config_releases
  where scope = p_scope
  order by version desc
  limit 1;
$$;

create or replace function public.publish_config(p_scope text, p_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
begin
  if public.current_app_role() is distinct from 'publisher'::public.app_role then
    raise exception 'Only publishers can publish configuration';
  end if;

  if coalesce(p_payload ->> 'schemaVersion', '') <> '1' then
    raise exception 'Unsupported configuration schema version';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_scope));

  select coalesce(max(version), 0) + 1
    into next_version
  from public.config_releases
  where scope = p_scope;

  insert into public.config_releases (scope, version, payload, published_by)
  values (p_scope, next_version, p_payload, auth.uid());

  return next_version;
end;
$$;

alter table public.app_members enable row level security;
alter table public.config_drafts enable row level security;
alter table public.config_releases enable row level security;

revoke execute on function public.touch_updated_at() from public;
revoke execute on function public.current_app_role() from public;
revoke execute on function public.get_published_config(text) from public;
revoke execute on function public.publish_config(text, jsonb) from public;

create policy "Members can read their membership"
on public.app_members
for select
to authenticated
using (email = lower(coalesce(auth.jwt() ->> 'email', '')));

create policy "Editors can read their own drafts"
on public.config_drafts
for select
to authenticated
using (
  owner_id = auth.uid()
  and public.current_app_role() in ('editor', 'publisher')
);

create policy "Editors can create their own drafts"
on public.config_drafts
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and public.current_app_role() in ('editor', 'publisher')
);

create policy "Editors can update their own drafts"
on public.config_drafts
for update
to authenticated
using (
  owner_id = auth.uid()
  and public.current_app_role() in ('editor', 'publisher')
)
with check (
  owner_id = auth.uid()
  and public.current_app_role() in ('editor', 'publisher')
);

revoke all on public.app_members from anon, authenticated;
revoke all on public.config_drafts from anon, authenticated;
revoke all on public.config_releases from anon, authenticated;

grant select on public.app_members to authenticated;
grant select, insert, update on public.config_drafts to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.get_published_config(text) to anon, authenticated;
grant execute on function public.publish_config(text, jsonb) to authenticated;

comment on table public.app_members is
  'Allowlist for the capability configuration center. Add the first publisher manually in the SQL editor.';

comment on table public.config_drafts is
  'Per-user editable configuration snapshots.';

comment on table public.config_releases is
  'Immutable published configuration snapshots consumed by the capability map.';
