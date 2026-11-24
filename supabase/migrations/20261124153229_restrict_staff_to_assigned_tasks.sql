drop policy if exists tasks_read_members on public.tasks;
create policy tasks_read_assigned_or_managers on public.tasks
for select to authenticated
using (
  private.has_org_role(organization_id, array['owner','admin','manager','viewer'])
  or (
    assigned_to = (select auth.uid())
    and private.has_org_role(organization_id, array['staff'])
  )
);
