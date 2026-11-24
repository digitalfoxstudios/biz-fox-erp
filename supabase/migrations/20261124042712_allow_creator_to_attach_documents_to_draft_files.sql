create policy office_files_update_creator_draft
on public.office_files for update to authenticated
using (created_by=(select auth.uid()) and status='draft' and private.is_org_member(organization_id))
with check (created_by=(select auth.uid()) and status='draft' and private.is_org_member(organization_id));