create table if not exists public.task_reports (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  submitted_by uuid not null references auth.users(id) on delete cascade,
  report_date date not null default current_date,
  work_done text not null check (length(trim(work_done)) >= 3),
  hours_spent numeric(6,2) check (hours_spent is null or (hours_spent >= 0 and hours_spent <= 24)),
  challenges text,
  next_steps text,
  task_status text not null default 'in_progress' check (task_status in ('in_progress','blocked','completed')),
  report_status text not null default 'pending_review' check (report_status in ('pending_review','approved','revision_requested')),
  manager_feedback text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_org_assigned_idx on public.tasks(organization_id, assigned_to, status);
create index if not exists task_reports_org_task_created_idx on public.task_reports(organization_id, task_id, created_at desc);
create index if not exists employees_org_email_lower_idx on public.employees(organization_id, lower(email)) where email is not null;

alter table public.task_reports enable row level security;

drop policy if exists employees_insert_staff_plus on public.employees;
create policy employees_insert_managers on public.employees
for insert to authenticated
with check (private.has_org_role(organization_id, array['owner','admin','manager']));

drop policy if exists tasks_update_assigned_staff on public.tasks;
create policy tasks_update_assigned_staff on public.tasks
for update to authenticated
using (assigned_to = (select auth.uid()) and private.has_org_role(organization_id, array['staff']))
with check (assigned_to = (select auth.uid()) and private.has_org_role(organization_id, array['staff']));

create or replace function private.guard_staff_task_updates()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.assigned_to = (select auth.uid())
     and private.has_org_role(old.organization_id, array['staff']) then
    if new.organization_id is distinct from old.organization_id
       or new.title is distinct from old.title
       or new.description is distinct from old.description
       or new.priority is distinct from old.priority
       or new.assigned_to is distinct from old.assigned_to
       or new.due_at is distinct from old.due_at
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at then
      raise exception 'Staff can only update the status of their assigned work';
    end if;
  end if;
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guard_staff_task_updates on public.tasks;
create trigger guard_staff_task_updates
before update on public.tasks
for each row execute function private.guard_staff_task_updates();

drop policy if exists task_reports_read_own_or_managers on public.task_reports;
create policy task_reports_read_own_or_managers on public.task_reports
for select to authenticated
using (
  submitted_by = (select auth.uid())
  or private.has_org_role(organization_id, array['owner','admin','manager'])
);

drop policy if exists task_reports_insert_assigned_staff on public.task_reports;
create policy task_reports_insert_assigned_staff on public.task_reports
for insert to authenticated
with check (
  submitted_by = (select auth.uid())
  and private.has_org_role(organization_id, array['staff'])
  and exists (
    select 1 from public.tasks t
    where t.id = task_id
      and t.organization_id = organization_id
      and t.assigned_to = (select auth.uid())
  )
);

drop policy if exists task_reports_update_managers on public.task_reports;
create policy task_reports_update_managers on public.task_reports
for update to authenticated
using (private.has_org_role(organization_id, array['owner','admin','manager']))
with check (private.has_org_role(organization_id, array['owner','admin','manager']));

drop policy if exists task_reports_delete_managers on public.task_reports;
create policy task_reports_delete_managers on public.task_reports
for delete to authenticated
using (private.has_org_role(organization_id, array['owner','admin']));

create or replace function private.touch_task_report_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists touch_task_report_updated_at on public.task_reports;
create trigger touch_task_report_updated_at
before update on public.task_reports
for each row execute function private.touch_task_report_updated_at();

create or replace function private.link_employee_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  employee_row record;
begin
  if new.email is null or length(trim(new.email)) = 0 then
    return new;
  end if;

  for employee_row in
    select e.id, e.organization_id
    from public.employees e
    where e.user_id is null
      and e.employment_status = 'active'
      and lower(e.email) = lower(new.email)
  loop
    update public.employees
       set user_id = new.id, updated_at = now()
     where id = employee_row.id and user_id is null;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (employee_row.organization_id, new.id, 'staff', 'active')
    on conflict (organization_id, user_id) do update
      set status = 'active',
          role = case
            when public.organization_members.role in ('owner','admin','manager')
              then public.organization_members.role
            else 'staff'
          end;
  end loop;
  return new;
end;
$$;

drop trigger if exists on_auth_user_link_employee on auth.users;
create trigger on_auth_user_link_employee
after insert on auth.users
for each row execute function private.link_employee_auth_user();

create or replace function private.link_existing_auth_user_to_employee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  matched_user_id uuid;
begin
  if new.email is null or new.user_id is not null or new.employment_status <> 'active' then
    return new;
  end if;

  select u.id into matched_user_id
  from auth.users u
  where lower(u.email) = lower(new.email)
  order by u.created_at
  limit 1;

  if matched_user_id is not null then
    update public.employees
       set user_id = matched_user_id, updated_at = now()
     where id = new.id and user_id is null;

    insert into public.organization_members (organization_id, user_id, role, status)
    values (new.organization_id, matched_user_id, 'staff', 'active')
    on conflict (organization_id, user_id) do update
      set status = 'active',
          role = case
            when public.organization_members.role in ('owner','admin','manager')
              then public.organization_members.role
            else 'staff'
          end;
  end if;
  return new;
end;
$$;

drop trigger if exists link_existing_auth_user_to_employee on public.employees;
create trigger link_existing_auth_user_to_employee
after insert or update of email on public.employees
for each row execute function private.link_existing_auth_user_to_employee();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-reports',
  'task-reports',
  false,
  15728640,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists task_reports_storage_read on storage.objects;
create policy task_reports_storage_read on storage.objects
for select to authenticated
using (
  bucket_id = 'task-reports'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
  and (
    ((storage.foldername(name))[4]) = (select auth.uid())::text
    or private.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin','manager'])
  )
);

drop policy if exists task_reports_storage_upload on storage.objects;
create policy task_reports_storage_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'task-reports'
  and private.is_org_member(((storage.foldername(name))[1])::uuid)
  and ((storage.foldername(name))[4]) = (select auth.uid())::text
  and exists (
    select 1 from public.task_reports r
    where r.id = ((storage.foldername(name))[3])::uuid
      and r.organization_id = ((storage.foldername(name))[1])::uuid
      and r.submitted_by = (select auth.uid())
  )
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'tasks'
    ) then
      alter publication supabase_realtime add table public.tasks;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'task_reports'
    ) then
      alter publication supabase_realtime add table public.task_reports;
    end if;
  end if;
end $$;
