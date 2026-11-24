-- Consolidate equivalent permissive UPDATE policies.
-- PostgreSQL combines permissive policies with OR; these expressions preserve
-- the existing access paths while avoiding duplicate policy evaluation.

drop policy if exists office_files_update_creator_draft on public.office_files;
drop policy if exists office_files_update_managers on public.office_files;
create policy office_files_update_allowed
on public.office_files
for update
to authenticated
using (
  (
    created_by = (select auth.uid())
    and status = 'draft'
    and private.is_org_member(organization_id)
  )
  or private.has_org_role(organization_id, array['owner','admin','manager'])
)
with check (
  (
    created_by = (select auth.uid())
    and status = 'draft'
    and private.is_org_member(organization_id)
  )
  or private.has_org_role(organization_id, array['owner','admin','manager'])
);

drop policy if exists tasks_update_assigned_staff on public.tasks;
drop policy if exists tasks_update_managers on public.tasks;
create policy tasks_update_allowed
on public.tasks
for update
to authenticated
using (
  (
    assigned_to = (select auth.uid())
    and private.has_org_role(organization_id, array['staff'])
  )
  or private.has_org_role(organization_id, array['owner','admin','manager'])
)
with check (
  (
    assigned_to = (select auth.uid())
    and private.has_org_role(organization_id, array['staff'])
  )
  or private.has_org_role(organization_id, array['owner','admin','manager'])
);
