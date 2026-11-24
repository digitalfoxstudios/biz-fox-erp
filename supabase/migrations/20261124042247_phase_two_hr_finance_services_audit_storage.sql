
create table public.attendance_records (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 attendance_date date not null default current_date,
 check_in timestamptz,
 check_out timestamptz,
 status text not null default 'present' check(status in ('present','absent','half_day','holiday','leave')),
 remarks text,
 recorded_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 unique(organization_id,employee_id,attendance_date)
);
create table public.leave_requests (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 employee_id uuid not null references public.employees(id) on delete cascade,
 leave_type text not null,
 start_date date not null,
 end_date date not null,
 reason text,
 status text not null default 'pending' check(status in ('pending','approved','rejected','cancelled')),
 reviewed_by uuid references auth.users(id) on delete set null,
 reviewed_at timestamptz,
 created_at timestamptz not null default now(),
 check(end_date >= start_date)
);
create table public.file_movements (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 office_file_id uuid not null references public.office_files(id) on delete cascade,
 from_user_id uuid references auth.users(id) on delete set null,
 to_user_id uuid references auth.users(id) on delete set null,
 movement_note text,
 action text not null default 'forwarded' check(action in ('created','forwarded','returned','approved','rejected','closed')),
 moved_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
create table public.finance_accounts (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 account_code text not null,
 account_name text not null,
 account_type text not null check(account_type in ('cash','bank','income','expense','liability','asset','equity')),
 is_active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(organization_id,account_code)
);
create table public.budgets (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 fiscal_year text not null,
 budget_head text not null,
 allocated_amount numeric(14,2) not null default 0 check(allocated_amount >= 0),
 revised_amount numeric(14,2) not null default 0 check(revised_amount >= 0),
 notes text,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 unique(organization_id,fiscal_year,budget_head)
);
create table public.financial_transactions (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 transaction_date date not null default current_date,
 transaction_type text not null check(transaction_type in ('income','expense','transfer')),
 amount numeric(14,2) not null check(amount > 0),
 account_id uuid references public.finance_accounts(id) on delete set null,
 reference_number text,
 description text not null,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.bills (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 bill_number text not null,
 payee_name text not null,
 purpose text not null,
 bill_date date not null default current_date,
 amount numeric(14,2) not null check(amount >= 0),
 status text not null default 'draft' check(status in ('draft','submitted','approved','rejected','paid')),
 attachment_path text,
 created_by uuid not null default auth.uid() references auth.users(id),
 approved_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,bill_number)
);
create table public.vouchers (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 voucher_number text not null,
 voucher_type text not null check(voucher_type in ('payment','receipt','journal')),
 voucher_date date not null default current_date,
 amount numeric(14,2) not null check(amount > 0),
 narration text not null,
 status text not null default 'draft' check(status in ('draft','posted','cancelled')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 unique(organization_id,voucher_number)
);
create table public.stock_items (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 item_code text not null,
 item_name text not null,
 unit text not null default 'Nos',
 quantity numeric(14,3) not null default 0 check(quantity >= 0),
 reorder_level numeric(14,3) not null default 0 check(reorder_level >= 0),
 location text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,item_code)
);
create table public.stock_movements (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 stock_item_id uuid not null references public.stock_items(id) on delete cascade,
 movement_type text not null check(movement_type in ('receipt','issue','adjustment')),
 quantity numeric(14,3) not null check(quantity > 0),
 reference_number text,
 notes text,
 moved_at timestamptz not null default now(),
 created_by uuid not null default auth.uid() references auth.users(id)
);
create table public.applications (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 application_number text not null,
 applicant_name text not null,
 service_name text not null,
 submitted_on date not null default current_date,
 status text not null default 'received' check(status in ('received','under_review','approved','rejected','completed')),
 assigned_to uuid references auth.users(id) on delete set null,
 notes text,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,application_number)
);
create table public.grievances (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 tracking_number text not null,
 applicant_name text not null,
 contact text,
 subject text not null,
 description text not null,
 status text not null default 'received' check(status in ('received','assigned','in_progress','resolved','closed','rejected')),
 assigned_to uuid references auth.users(id) on delete set null,
 resolved_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,tracking_number)
);

create index attendance_org_date_idx on public.attendance_records(organization_id,attendance_date desc);
create index attendance_employee_idx on public.attendance_records(employee_id,attendance_date desc);
create index leave_requests_org_status_idx on public.leave_requests(organization_id,status,start_date);
create index file_movements_file_idx on public.file_movements(office_file_id,moved_at desc);
create index finance_accounts_org_idx on public.finance_accounts(organization_id);
create index budgets_org_year_idx on public.budgets(organization_id,fiscal_year);
create index financial_transactions_org_date_idx on public.financial_transactions(organization_id,transaction_date desc);
create index bills_org_status_idx on public.bills(organization_id,status,bill_date desc);
create index vouchers_org_date_idx on public.vouchers(organization_id,voucher_date desc);
create index stock_items_org_idx on public.stock_items(organization_id);
create index stock_movements_item_idx on public.stock_movements(stock_item_id,moved_at desc);
create index applications_org_status_idx on public.applications(organization_id,status,submitted_on desc);
create index grievances_org_status_idx on public.grievances(organization_id,status,created_at desc);

do $$
declare t text;
begin
 foreach t in array array['attendance_records','leave_requests','bills','stock_items','applications','grievances'] loop
  execute format('create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t);
 end loop;
end $$;

alter table public.attendance_records enable row level security;
alter table public.leave_requests enable row level security;
alter table public.file_movements enable row level security;
alter table public.finance_accounts enable row level security;
alter table public.budgets enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.bills enable row level security;
alter table public.vouchers enable row level security;
alter table public.stock_items enable row level security;
alter table public.stock_movements enable row level security;
alter table public.applications enable row level security;
alter table public.grievances enable row level security;

grant select,insert,update,delete on public.attendance_records,public.leave_requests,public.file_movements,public.finance_accounts,public.budgets,public.financial_transactions,public.bills,public.vouchers,public.stock_items,public.stock_movements,public.applications,public.grievances to authenticated;
grant usage,select on all sequences in schema public to authenticated;

do $$
declare t text;
begin
 foreach t in array array['attendance_records','leave_requests','file_movements','finance_accounts','budgets','financial_transactions','bills','vouchers','stock_items','stock_movements','applications','grievances'] loop
  execute format('create policy %I on public.%I for select to authenticated using (private.is_org_member(organization_id))',t||'_read_members',t);
  execute format('create policy %I on public.%I for insert to authenticated with check (private.has_org_role(organization_id,array[''owner'',''admin'',''manager'',''staff'']))',t||'_insert_staff_plus',t);
  execute format('create policy %I on public.%I for update to authenticated using (private.has_org_role(organization_id,array[''owner'',''admin'',''manager''])) with check (private.has_org_role(organization_id,array[''owner'',''admin'',''manager'']))',t||'_update_managers',t);
  execute format('create policy %I on public.%I for delete to authenticated using (private.has_org_role(organization_id,array[''owner'',''admin'']))',t||'_delete_admins',t);
 end loop;
end $$;

create or replace function private.capture_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
 v_org uuid;
 v_entity text;
 v_action text;
 v_id text;
 v_row jsonb;
 v_old jsonb;
 v_fields jsonb;
begin
 if TG_OP = 'DELETE' then
   v_row := to_jsonb(OLD); v_org := OLD.organization_id; v_id := OLD.id::text; v_action := 'delete';
 else
   v_row := to_jsonb(NEW); v_org := NEW.organization_id; v_id := NEW.id::text; v_action := lower(TG_OP);
 end if;
 if TG_OP = 'UPDATE' then
   v_old := to_jsonb(OLD);
   select coalesce(jsonb_agg(k), '[]'::jsonb) into v_fields
   from jsonb_object_keys(v_row) as k
   where v_row -> k is distinct from v_old -> k;
 else
   select coalesce(jsonb_agg(k), '[]'::jsonb) into v_fields from jsonb_object_keys(v_row) as k;
 end if;
 v_entity := TG_TABLE_NAME;
 insert into public.audit_logs(organization_id,actor_user_id,action,entity_type,entity_id,details)
 values(v_org,(select auth.uid()),v_action,v_entity,v_id,jsonb_build_object('changed_fields',v_fields));
 if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;
revoke all on function private.capture_audit_log() from public,anon,authenticated;
do $$
declare t text;
begin
 foreach t in array array['departments','employees','office_files','correspondence','tasks','meetings','assets','projects','announcements','attendance_records','leave_requests','file_movements','finance_accounts','budgets','financial_transactions','bills','vouchers','stock_items','stock_movements','applications','grievances'] loop
  execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function private.capture_audit_log()',t,t);
 end loop;
end $$;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('office-documents','office-documents',false,26214400,array['application/pdf','image/jpeg','image/png','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;

create policy office_documents_read_members on storage.objects for select to authenticated
using (bucket_id='office-documents' and private.is_org_member((storage.foldername(name))[1]::uuid));
create policy office_documents_upload_staff on storage.objects for insert to authenticated
with check (bucket_id='office-documents' and private.has_org_role((storage.foldername(name))[1]::uuid,array['owner','admin','manager','staff']));
create policy office_documents_update_managers on storage.objects for update to authenticated
using (bucket_id='office-documents' and private.has_org_role((storage.foldername(name))[1]::uuid,array['owner','admin','manager']))
with check (bucket_id='office-documents' and private.has_org_role((storage.foldername(name))[1]::uuid,array['owner','admin','manager']));
create policy office_documents_delete_admins on storage.objects for delete to authenticated
using (bucket_id='office-documents' and private.has_org_role((storage.foldername(name))[1]::uuid,array['owner','admin']));
