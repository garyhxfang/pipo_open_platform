create type public.agile_intake_status as enum (
  'draft',
  'submitting',
  'submitted',
  'approval_failed'
);

create or replace function public.generate_agile_intake_request_no()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'AR-'
    || to_char(current_date, 'YYYYMMDD')
    || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create table public.agile_intake_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null default public.generate_agile_intake_request_no(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status public.agile_intake_status not null default 'draft',
  business_type text not null default 'acquiring',
  business_name text not null default '',
  merchant_count integer not null default 0 check (merchant_count >= 0),
  capability_count integer not null default 0 check (capability_count >= 0),
  current_step integer not null default 1 check (current_step between 1 and 3),
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  structured_requirement text not null default '',
  lark_approval_instance_code text,
  lark_approval_url text,
  approval_error text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (request_no)
);

create index agile_intake_requests_owner_updated_idx
  on public.agile_intake_requests (owner_id, updated_at desc);

create index agile_intake_requests_owner_status_idx
  on public.agile_intake_requests (owner_id, status, updated_at desc);

create trigger agile_intake_requests_touch_updated_at
before update on public.agile_intake_requests
for each row execute function public.touch_updated_at();

alter table public.agile_intake_requests enable row level security;

create policy "Users can read their agile intake requests"
on public.agile_intake_requests
for select
to authenticated
using (owner_id = auth.uid());

create policy "Users can create their agile intake requests"
on public.agile_intake_requests
for insert
to authenticated
with check (
  owner_id = auth.uid()
  and status = 'draft'
);

create policy "Users can update their agile intake requests"
on public.agile_intake_requests
for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and status in ('draft', 'approval_failed')
);

revoke all on public.agile_intake_requests from anon, authenticated;
revoke execute on function public.generate_agile_intake_request_no() from public;

grant select, insert, update on public.agile_intake_requests to authenticated;

comment on table public.agile_intake_requests is
  'Persistent agile intake request lifecycle. Draft saves update the same row; submission records Lark approval state.';
