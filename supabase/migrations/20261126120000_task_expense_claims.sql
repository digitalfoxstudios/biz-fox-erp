-- Task-linked employee expense claims: travel, sourced materials and receipts.
create table if not exists public.task_expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete restrict,
  expense_date date not null default current_date,
  expense_type text not null check (expense_type in ('travel','material','other')),
  description text not null check (length(trim(description)) >= 3),
  vendor_name text,
  quantity numeric(12,3) check (quantity is null or quantity > 0),
  unit text,
  unit_rate numeric(12,2) check (unit_rate is null or unit_rate >= 0),
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  receipt_paths text[] not null default '{}',
  status text not null default 'pending_review' check (status in ('pending_review','approved','rejected','revision_requested')),
  manager_feedback text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_expenses_org_task_date_idx on public.task_expenses(organization_id, task_id, expense_date desc);
create index if not exists task_expenses_submitter_idx on public.task_expenses(submitted_by, created_at desc);
alter table public.task_expenses enable row level security;
drop policy if exists task_expenses_read_own_or_managers on public.task_expenses;
create policy task_expenses_read_own_or_managers on public.task_expenses for select to authenticated
using (submitted_by = (select auth.uid()) or private.has_org_role(organization_id, array['owner','admin','manager']::text[]));
drop policy if exists task_expenses_insert_assigned_staff on public.task_expenses;
create policy task_expenses_insert_assigned_staff on public.task_expenses for insert to authenticated
with check (
 submitted_by = (select auth.uid())
 and private.has_org_role(organization_id, array['staff']::text[])
 and exists(select 1 from public.tasks t where t.id=task_expenses.task_id and t.organization_id=task_expenses.organization_id and t.assigned_to=(select auth.uid()))
);
drop policy if exists task_expenses_update_managers on public.task_expenses;
create policy task_expenses_update_managers on public.task_expenses for update to authenticated
using (private.has_org_role(organization_id, array['owner','admin','manager']::text[]))
with check (private.has_org_role(organization_id, array['owner','admin','manager']::text[]));
grant select, insert, update on public.task_expenses to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('task-expenses','task-expenses',false,8388608,array['image/jpeg','image/png','application/pdf'])
on conflict (id) do update set public=false,file_size_limit=8388608,allowed_mime_types=array['image/jpeg','image/png','application/pdf'];
drop policy if exists task_expenses_storage_read on storage.objects;
create policy task_expenses_storage_read on storage.objects for select to authenticated
using (bucket_id='task-expenses' and private.is_org_member(((storage.foldername(name))[1])::uuid)
 and (((storage.foldername(name))[4]=(select auth.uid())::text)
 or private.has_org_role(((storage.foldername(name))[1])::uuid,array['owner','admin','manager']::text[])));
drop policy if exists task_expenses_storage_upload on storage.objects;
create policy task_expenses_storage_upload on storage.objects for insert to authenticated
with check (bucket_id='task-expenses' and private.is_org_member(((storage.foldername(name))[1])::uuid)
 and (storage.foldername(name))[4]=(select auth.uid())::text
 and exists(select 1 from public.task_expenses e where e.id=((storage.foldername(name))[3])::uuid and e.organization_id=((storage.foldername(name))[1])::uuid and e.submitted_by=(select auth.uid())));
