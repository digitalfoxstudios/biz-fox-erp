-- Baseline schema for Biz FOX ERP. This migration is already applied to the
-- dedicated Supabase project as 20261124041909_initial_secure_office_schema.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text, phone text, job_title text, avatar_path text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.organizations (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(trim(name)) between 2 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 timezone text not null default 'Asia/Kolkata',
 created_by uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.organization_members (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null default 'staff' check(role in ('owner','admin','manager','staff','viewer')),
 status text not null default 'active' check(status in ('invited','active','disabled')),
 created_at timestamptz not null default now(),
 unique(organization_id,user_id)
);
create table public.departments (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 name text not null, code text, description text,
 head_user_id uuid references auth.users(id) on delete set null,
 is_active boolean not null default true,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,name), unique(organization_id,code)
);
create table public.employees (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 user_id uuid references auth.users(id) on delete set null,
 department_id uuid references public.departments(id) on delete set null,
 employee_code text not null, full_name text not null,
 email text, phone text, designation text,
 employment_status text not null default 'active' check(employment_status in ('active','on_leave','suspended','separated')),
 date_of_joining date, notes text,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,employee_code)
);
create table public.office_files (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 file_number text not null, subject text not null, description text,
 status text not null default 'draft' check(status in ('draft','open','pending_approval','approved','rejected','closed')),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 storage_path text,
 created_by uuid not null default auth.uid() references auth.users(id),
 assigned_to uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,file_number)
);
create table public.correspondence (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 direction text not null check(direction in ('inward','outward')),
 reference_number text not null, subject text not null,
 sender_name text, recipient_name text,
 received_or_sent_on date not null default current_date,
 status text not null default 'registered' check(status in ('registered','under_process','replied','dispatched','closed')),
 storage_path text,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,direction,reference_number)
);
create table public.tasks (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null, description text,
 status text not null default 'pending' check(status in ('pending','in_progress','blocked','completed','cancelled')),
 priority text not null default 'normal' check(priority in ('low','normal','high','urgent')),
 assigned_to uuid references auth.users(id) on delete set null,
 due_at timestamptz,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.meetings (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null, agenda text, minutes text,
 starts_at timestamptz not null, location text,
 status text not null default 'scheduled' check(status in ('scheduled','held','postponed','cancelled')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table public.assets (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 asset_code text not null, name text not null, category text, location text,
 condition text not null default 'good' check(condition in ('new','good','needs_repair','retired')),
 assigned_to uuid references auth.users(id) on delete set null,
 acquired_on date,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,asset_code)
);
create table public.projects (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 project_code text not null, name text not null, description text,
 status text not null default 'planned' check(status in ('planned','active','on_hold','completed','cancelled')),
 start_date date, target_date date, budget numeric(14,2),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,project_code)
);
create table public.announcements (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 title text not null, body text not null, published_at timestamptz, expires_at timestamptz,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.audit_logs (
 id bigint generated always as identity primary key,
 organization_id uuid not null references public.organizations(id) on delete cascade,
 actor_user_id uuid references auth.users(id) on delete set null,
 action text not null, entity_type text not null, entity_id text,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);

create index organization_members_user_idx on public.organization_members(user_id,status);
create index departments_org_idx on public.departments(organization_id);
create index employees_org_idx on public.employees(organization_id);
create index office_files_org_status_idx on public.office_files(organization_id,status,created_at desc);
create index correspondence_org_date_idx on public.correspondence(organization_id,received_or_sent_on desc);
create index tasks_org_status_idx on public.tasks(organization_id,status,due_at);
create index meetings_org_starts_idx on public.meetings(organization_id,starts_at);
create index assets_org_idx on public.assets(organization_id);
create index projects_org_idx on public.projects(organization_id);
create index announcements_org_publish_idx on public.announcements(organization_id,published_at desc);
create index audit_logs_org_created_idx on public.audit_logs(organization_id,created_at desc);

create or replace function private.is_org_member(p_org_id uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.organization_members m
 where m.organization_id=p_org_id and m.user_id=(select auth.uid()) and m.status='active');
$$;
create or replace function private.has_org_role(p_org_id uuid,p_roles text[])
returns boolean language sql stable security definer set search_path=''
as $$
 select exists(select 1 from public.organization_members m
 where m.organization_id=p_org_id and m.user_id=(select auth.uid())
 and m.status='active' and m.role=any(p_roles));
$$;
revoke all on function private.is_org_member(uuid) from public,anon;
revoke all on function private.has_org_role(uuid,text[]) from public,anon;
grant execute on function private.is_org_member(uuid) to authenticated;
grant execute on function private.has_org_role(uuid,text[]) to authenticated;

create or replace function private.bootstrap_organization_owner()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.organization_members(organization_id,user_id,role,status)
 values(new.id,new.created_by,'owner','active');
 return new;
end;
$$;
revoke all on function private.bootstrap_organization_owner() from public,anon,authenticated;
create trigger organizations_bootstrap_owner after insert on public.organizations
for each row execute function private.bootstrap_organization_owner();

create or replace function private.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path=''
as $$
begin
 insert into public.profiles(id,full_name)
 values(new.id,nullif(trim(new.raw_user_meta_data ->> 'full_name'),''))
 on conflict(id) do nothing;
 return new;
end;
$$;
revoke all on function private.create_profile_for_new_user() from public,anon,authenticated;
create trigger auth_user_profile_created after insert on auth.users
for each row execute function private.create_profile_for_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path=''
as $$ begin new.updated_at=now(); return new; end; $$;
do $$
declare t text;
begin
 foreach t in array array['profiles','organizations','departments','employees','office_files','correspondence','tasks','meetings','assets','projects'] loop
  execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
 end loop;
end $$;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.office_files enable row level security;
alter table public.correspondence enable row level security;
alter table public.tasks enable row level security;
alter table public.meetings enable row level security;
alter table public.assets enable row level security;
alter table public.projects enable row level security;
alter table public.announcements enable row level security;
alter table public.audit_logs enable row level security;

grant select,insert,update on public.profiles to authenticated;
grant select,insert,update,delete on public.organizations to authenticated;
grant select on public.organization_members to authenticated;
grant select,insert,update,delete on public.departments,public.employees,public.office_files,public.correspondence,public.tasks,public.meetings,public.assets,public.projects,public.announcements to authenticated;
grant select on public.audit_logs to authenticated;
grant usage,select on all sequences in schema public to authenticated;

create policy profiles_read_self on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy profiles_insert_self on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy profiles_update_self on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy organizations_read_members on public.organizations for select to authenticated using(private.is_org_member(id));
create policy organizations_create_self on public.organizations for insert to authenticated with check(created_by=(select auth.uid()));
create policy organizations_update_admin on public.organizations for update to authenticated using(private.has_org_role(id,array['owner','admin'])) with check(private.has_org_role(id,array['owner','admin']));
create policy organizations_delete_owner on public.organizations for delete to authenticated using(private.has_org_role(id,array['owner']));
create policy organization_members_read_self_or_admin on public.organization_members for select to authenticated using(user_id=(select auth.uid()) or private.has_org_role(organization_id,array['owner','admin']));

do $$
declare t text;
begin
 foreach t in array array['departments','employees','office_files','correspondence','tasks','meetings','assets','projects','announcements'] loop
  execute format('create policy %I on public.%I for select to authenticated using(private.is_org_member(organization_id))',t||'_read_members',t);
  execute format('create policy %I on public.%I for insert to authenticated with check(private.has_org_role(organization_id,array[''owner'',''admin'',''manager'',''staff'']))',t||'_insert_staff_plus',t);
  execute format('create policy %I on public.%I for update to authenticated using(private.has_org_role(organization_id,array[''owner'',''admin'',''manager''])) with check(private.has_org_role(organization_id,array[''owner'',''admin'',''manager'']))',t||'_update_managers',t);
  execute format('create policy %I on public.%I for delete to authenticated using(private.has_org_role(organization_id,array[''owner'',''admin'']))',t||'_delete_admins',t);
 end loop;
end $$;
create policy audit_logs_read_admin on public.audit_logs for select to authenticated using(private.has_org_role(organization_id,array['owner','admin']));
