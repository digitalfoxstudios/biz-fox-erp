-- Employee attendance GPS, task customer/site details and category-aware expenses.
alter table public.tasks
 add column if not exists customer_id uuid references public.customers(id) on delete set null,
 add column if not exists site_address text,
 add column if not exists site_latitude double precision,
 add column if not exists site_longitude double precision,
 add column if not exists site_contact_name text,
 add column if not exists site_contact_phone text;
create index if not exists tasks_customer_id_idx on public.tasks(customer_id);
drop policy if exists customers_read_assigned_staff on public.customers;
create policy customers_read_assigned_staff on public.customers for select to authenticated
using (
 private.is_org_member(organization_id)
 and exists(select 1 from public.tasks t where t.customer_id=customers.id and t.organization_id=customers.organization_id and t.assigned_to=(select auth.uid()))
);
alter table public.attendance_records
 add column if not exists check_in_latitude double precision,
 add column if not exists check_in_longitude double precision,
 add column if not exists check_in_accuracy_m double precision,
 add column if not exists check_out_latitude double precision,
 add column if not exists check_out_longitude double precision,
 add column if not exists check_out_accuracy_m double precision;
drop policy if exists attendance_records_insert_staff_plus on public.attendance_records;
create policy attendance_records_insert_staff_plus on public.attendance_records for insert to authenticated
with check (
 private.has_org_role(organization_id,array['owner','admin','manager']::text[])
 or (private.has_org_role(organization_id,array['staff']::text[]) and recorded_by=(select auth.uid())
 and exists(select 1 from public.employees e where e.id=attendance_records.employee_id and e.organization_id=attendance_records.organization_id and e.user_id=(select auth.uid()) and e.employment_status='active'))
);
drop policy if exists attendance_records_update_own_staff on public.attendance_records;
create policy attendance_records_update_own_staff on public.attendance_records for update to authenticated
using (recorded_by=(select auth.uid()) and private.has_org_role(organization_id,array['staff']::text[])
 and exists(select 1 from public.employees e where e.id=attendance_records.employee_id and e.organization_id=attendance_records.organization_id and e.user_id=(select auth.uid())))
with check (recorded_by=(select auth.uid()) and private.has_org_role(organization_id,array['staff']::text[])
 and exists(select 1 from public.employees e where e.id=attendance_records.employee_id and e.organization_id=attendance_records.organization_id and e.user_id=(select auth.uid())));
alter table public.task_expenses add column if not exists travel_mode text, add column if not exists from_location text, add column if not exists to_location text, add column if not exists distance_km numeric(10,2);
