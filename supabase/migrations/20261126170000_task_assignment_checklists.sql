create table if not exists public.task_checklist_items (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 task_id uuid not null references public.tasks(id) on delete cascade,
 item_text text not null check (char_length(trim(item_text)) between 2 and 300),
 sort_order integer not null default 0,
 is_checked boolean not null default false,
 checked_at timestamptz,
 checked_by uuid references auth.users(id) on delete set null,
 created_at timestamptz not null default now()
);
create index if not exists task_checklist_items_task_order_idx on public.task_checklist_items(task_id,sort_order,created_at);
alter table public.task_checklist_items enable row level security;
grant select,insert on public.task_checklist_items to authenticated;
grant update(is_checked,checked_at,checked_by) on public.task_checklist_items to authenticated;
drop policy if exists task_checklist_read_assigned_or_managers on public.task_checklist_items;
create policy task_checklist_read_assigned_or_managers on public.task_checklist_items for select to authenticated using (
 private.has_org_role(organization_id,array['owner','admin','manager','viewer']::text[])
 or (private.has_org_role(organization_id,array['staff']::text[]) and exists(select 1 from public.tasks t where t.id=task_checklist_items.task_id and t.organization_id=task_checklist_items.organization_id and t.assigned_to=(select auth.uid())))
);
drop policy if exists task_checklist_insert_managers on public.task_checklist_items;
create policy task_checklist_insert_managers on public.task_checklist_items for insert to authenticated with check (
 private.has_org_role(organization_id,array['owner','admin','manager']::text[])
 and exists(select 1 from public.tasks t where t.id=task_checklist_items.task_id and t.organization_id=task_checklist_items.organization_id)
);
drop policy if exists task_checklist_update_assigned_staff on public.task_checklist_items;
create policy task_checklist_update_assigned_staff on public.task_checklist_items for update to authenticated using (
 private.has_org_role(organization_id,array['staff']::text[])
 and exists(select 1 from public.tasks t where t.id=task_checklist_items.task_id and t.organization_id=task_checklist_items.organization_id and t.assigned_to=(select auth.uid()))
) with check (
 private.has_org_role(organization_id,array['staff']::text[])
 and exists(select 1 from public.tasks t where t.id=task_checklist_items.task_id and t.organization_id=task_checklist_items.organization_id and t.assigned_to=(select auth.uid()))
);
