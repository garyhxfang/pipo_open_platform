create or replace function public.publish_config(p_scope text, p_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_version integer;
  schema_version text;
begin
  if public.current_app_role() is distinct from 'publisher'::public.app_role then
    raise exception 'Only publishers can publish configuration';
  end if;

  schema_version := coalesce(p_payload ->> 'schemaVersion', '');
  if schema_version not in ('1', '2') then
    raise exception 'Unsupported configuration schema version';
  end if;

  if schema_version = '2' and (
    jsonb_typeof(p_payload -> 'dimensions') is distinct from 'array'
    or jsonb_typeof(p_payload -> 'capabilities') is distinct from 'array'
    or jsonb_typeof(p_payload -> 'supportRules') is distinct from 'array'
    or jsonb_typeof(p_payload -> 'conflicts') is distinct from 'array'
  ) then
    raise exception 'Invalid capability configuration v2 payload';
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

revoke execute on function public.publish_config(text, jsonb) from public;
grant execute on function public.publish_config(text, jsonb) to authenticated;

comment on function public.publish_config(text, jsonb) is
  'Publishes immutable capability configuration snapshots. Schema v2 stores dimension-aware support rules and capability conflicts.';
