drop policy if exists task_reports_insert_assigned_staff on public.task_reports;
create policy task_reports_insert_assigned_staff on public.task_reports
for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and private.has_org_role(organization_id, array['staff'])
  and exists (
    select 1 from public.tasks t
    where t.id = public.task_reports.task_id
      and t.organization_id = public.task_reports.organization_id
      and t.assigned_to = (select auth.uid())
  )
);
