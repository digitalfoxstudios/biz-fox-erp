-- Biz FOX ERP multi-tenant platform foundation
create table if not exists public.platform_subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,
  monthly_price numeric(12,2) not null default 0 check (monthly_price >= 0),
  yearly_price numeric(12,2) not null default 0 check (yearly_price >= 0),
  max_users integer not null default 5 check (max_users > 0),
  features jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.organizations
  add column if not exists account_status text not null default 'active' check (account_status in ('trial','active','suspended','cancelled')),
  add column if not exists subscription_plan_id uuid references public.platform_subscription_plans(id),
  add column if not exists trial_ends_at timestamptz,
  add column if not exists billing_email text,
  add column if not exists max_users_override integer check (max_users_override is null or max_users_override > 0);
alter table public.platform_subscription_plans enable row level security;
drop policy if exists platform_plans_super_admin_read on public.platform_subscription_plans;
create policy platform_plans_super_admin_read on public.platform_subscription_plans
for select to authenticated using (
  exists (select 1 from public.platform_super_admins s where s.user_id = auth.uid())
);
insert into public.platform_subscription_plans(name,code,monthly_price,yearly_price,max_users,features)
values
 ('Starter','starter',499,4990,5,'["Core office modules","Staff assignments","Attendance"]'::jsonb),
 ('Business','business',999,9990,20,'["All Starter features","Finance and inventory","Reports and approvals"]'::jsonb),
 ('Enterprise','enterprise',2499,24990,100,'["All Business features","Advanced controls","Priority support"]'::jsonb)
on conflict (code) do nothing;
create or replace function public.platform_create_tenant(p_name text,p_slug text,p_owner_email text,p_plan_code text default 'starter')
returns jsonb language plpgsql security definer set search_path=public,auth as $$
declare v_org public.organizations%rowtype; v_owner_id uuid; v_plan public.platform_subscription_plans%rowtype;
begin
 if not exists(select 1 from public.platform_super_admins where user_id=auth.uid()) then raise exception 'Platform Super Admin access required'; end if;
 if length(trim(coalesce(p_name,'')))<2 or length(trim(coalesce(p_slug,'')))<3 then raise exception 'Business name and slug are required'; end if;
 select id into v_owner_id from auth.users where lower(email)=lower(trim(p_owner_email)) limit 1;
 if v_owner_id is null then raise exception 'Owner account not found. Invite and verify the owner first.'; end if;
 select * into v_plan from public.platform_subscription_plans where code=p_plan_code and is_active=true;
 if v_plan.id is null then raise exception 'Selected subscription plan is unavailable'; end if;
 insert into public.organizations(name,slug,created_by,account_status,subscription_plan_id,billing_email,trial_ends_at)
 values(trim(p_name),lower(trim(p_slug)),auth.uid(),'trial',v_plan.id,lower(trim(p_owner_email)),now()+interval '14 days') returning * into v_org;
 insert into public.organization_members(organization_id,user_id,role,status) values(v_org.id,v_owner_id,'owner','active');
 return jsonb_build_object('id',v_org.id,'name',v_org.name,'slug',v_org.slug,'status',v_org.account_status,'owner_email',lower(trim(p_owner_email)),'plan',v_plan.name);
end; $$;
revoke all on function public.platform_create_tenant(text,text,text,text) from public;
grant execute on function public.platform_create_tenant(text,text,text,text) to authenticated;
create or replace function public.platform_set_tenant_status(p_tenant_id uuid,p_status text)
returns boolean language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.platform_super_admins where user_id=auth.uid()) then raise exception 'Platform Super Admin access required'; end if;
 if p_status not in ('trial','active','suspended','cancelled') then raise exception 'Invalid tenant status'; end if;
 update public.organizations set account_status=p_status,updated_at=now() where id=p_tenant_id;
 if not found then raise exception 'Business account not found'; end if; return true;
end; $$;
revoke all on function public.platform_set_tenant_status(uuid,text) from public;
grant execute on function public.platform_set_tenant_status(uuid,text) to authenticated;
create or replace function public.platform_list_tenants()
returns table(id uuid,name text,slug text,account_status text,billing_email text,created_at timestamptz,plan_name text,member_count bigint)
language plpgsql security definer set search_path=public as $$
begin
 if not exists(select 1 from public.platform_super_admins where user_id=auth.uid()) then raise exception 'Platform Super Admin access required'; end if;
 return query select o.id,o.name,o.slug,o.account_status,o.billing_email,o.created_at,p.name,
 (select count(*) from public.organization_members m where m.organization_id=o.id)
 from public.organizations o left join public.platform_subscription_plans p on p.id=o.subscription_plan_id order by o.created_at desc;
end; $$;
revoke all on function public.platform_list_tenants() from public;
grant execute on function public.platform_list_tenants() to authenticated;
