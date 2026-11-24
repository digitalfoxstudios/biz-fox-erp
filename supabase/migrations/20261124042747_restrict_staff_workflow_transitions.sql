
drop policy if exists tasks_insert_staff_plus on public.tasks;
create policy tasks_insert_staff_plus on public.tasks for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and status='pending')
);
drop policy if exists office_files_insert_staff_plus on public.office_files;
create policy office_files_insert_staff_plus on public.office_files for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and status in ('draft','open'))
);
drop policy if exists bills_insert_staff_plus on public.bills;
create policy bills_insert_staff_plus on public.bills for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and status in ('draft','submitted'))
);
drop policy if exists vouchers_insert_staff_plus on public.vouchers;
create policy vouchers_insert_staff_plus on public.vouchers for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and status='draft')
);
drop policy if exists leave_requests_insert_staff_plus on public.leave_requests;
create policy leave_requests_insert_staff_plus on public.leave_requests for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and status='pending')
);
drop policy if exists applications_insert_staff_plus on public.applications;
create policy applications_insert_staff_plus on public.applications for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and status='received')
);
drop policy if exists grievances_insert_staff_plus on public.grievances;
create policy grievances_insert_staff_plus on public.grievances for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and status='received')
);
drop policy if exists file_movements_insert_staff_plus on public.file_movements;
create policy file_movements_insert_staff_plus on public.file_movements for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and action in ('created','forwarded','returned'))
);
drop policy if exists announcements_insert_staff_plus on public.announcements;
create policy announcements_insert_staff_plus on public.announcements for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager'])
 or (private.has_org_role(organization_id,array['staff']) and published_at is null)
);
