drop policy if exists "Users can update their agile intake requests"
on public.agile_intake_requests;

create policy "Users can update editable agile intake requests"
on public.agile_intake_requests
for update
to authenticated
using (
  owner_id = auth.uid()
  and status in ('draft', 'approval_failed')
)
with check (
  owner_id = auth.uid()
  and status in ('draft', 'approval_failed')
);
