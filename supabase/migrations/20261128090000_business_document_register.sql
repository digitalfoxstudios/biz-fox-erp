-- Unified operational documents for the eight additional company document types.
create table if not exists public.business_documents (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 document_type text not null check (document_type in ('receipt','work_order','delivery_challan','service_report','installation_report','amc_agreement','purchase_order','expense_voucher')),
 document_number text not null,
 document_date date not null default current_date,
 customer_id uuid references public.customers(id) on delete set null,
 title text,
 fields jsonb not null default '{}'::jsonb check(jsonb_typeof(fields)='object'),
 line_items jsonb not null default '[]'::jsonb check(jsonb_typeof(line_items)='array'),
 status text not null default 'draft',
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(organization_id,document_type,document_number)
);
create index if not exists business_documents_org_type_date_idx on public.business_documents(organization_id,document_type,document_date desc);
create index if not exists business_documents_customer_idx on public.business_documents(customer_id);
alter table public.business_documents enable row level security;
grant select,insert,update,delete on public.business_documents to authenticated;
drop policy if exists business_documents_read_managers on public.business_documents;
create policy business_documents_read_managers on public.business_documents for select to authenticated
using(private.has_org_role(organization_id,array['owner','admin','manager']));
drop policy if exists business_documents_insert_managers on public.business_documents;
create policy business_documents_insert_managers on public.business_documents for insert to authenticated
with check(private.has_org_role(organization_id,array['owner','admin','manager']) and created_by=(select auth.uid()));
drop policy if exists business_documents_update_managers on public.business_documents;
create policy business_documents_update_managers on public.business_documents for update to authenticated
using(private.has_org_role(organization_id,array['owner','admin','manager']))
with check(private.has_org_role(organization_id,array['owner','admin','manager']));
drop policy if exists business_documents_delete_managers on public.business_documents;
create policy business_documents_delete_managers on public.business_documents for delete to authenticated
using(private.has_org_role(organization_id,array['owner','admin']));
drop trigger if exists business_documents_set_updated_at on public.business_documents;
create trigger business_documents_set_updated_at before update on public.business_documents
for each row execute function public.set_updated_at();
