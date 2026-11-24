-- Add indexes for foreign-key columns flagged by the Supabase database linter.
create index organizations_created_by_idx on public.organizations(created_by);
create index departments_head_user_idx on public.departments(head_user_id);
create index departments_created_by_idx on public.departments(created_by);
create index employees_user_id_idx on public.employees(user_id);
create index employees_department_id_idx on public.employees(department_id);
create index employees_created_by_idx on public.employees(created_by);
create index office_files_created_by_idx on public.office_files(created_by);
create index office_files_assigned_to_idx on public.office_files(assigned_to);
create index correspondence_created_by_idx on public.correspondence(created_by);
create index tasks_assigned_to_idx on public.tasks(assigned_to);
create index tasks_created_by_idx on public.tasks(created_by);
create index meetings_created_by_idx on public.meetings(created_by);
create index assets_assigned_to_idx on public.assets(assigned_to);
create index assets_created_by_idx on public.assets(created_by);
create index projects_created_by_idx on public.projects(created_by);
create index announcements_created_by_idx on public.announcements(created_by);
create index audit_logs_actor_user_id_idx on public.audit_logs(actor_user_id);