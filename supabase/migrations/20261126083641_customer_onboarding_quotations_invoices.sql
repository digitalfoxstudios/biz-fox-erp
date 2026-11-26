-- Customer onboarding, quotations and invoices for Biz FOX ERP.
-- All records are scoped to the single Bluestar Electronics workspace.
create table public.customers (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 customer_code text not null,
 customer_name text not null check(length(trim(customer_name)) between 2 and 180),
 customer_type text not null default 'individual' check(customer_type in ('individual','business','government','other')),
 contact_person text, phone text, alternate_phone text, email text, gstin text,
 billing_address text, shipping_address text, city text, state text, pincode text, notes text,
 status text not null default 'active' check(status in ('active','inactive','prospect')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,customer_code)
);
create table public.quotations (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 quotation_number text not null,
 customer_id uuid not null references public.customers(id) on delete restrict,
 quotation_date date not null default current_date, valid_until date, subject text,
 line_items jsonb not null default '[]'::jsonb check(jsonb_typeof(line_items)='array'),
 subtotal numeric(14,2) not null default 0 check(subtotal>=0),
 discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
 tax_amount numeric(14,2) not null default 0 check(tax_amount>=0),
 grand_total numeric(14,2) not null default 0 check(grand_total>=0),
 terms text, notes text,
 status text not null default 'draft' check(status in ('draft','sent','accepted','rejected','expired','converted')),
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,quotation_number)
);
create table public.invoices (
 id uuid primary key default gen_random_uuid(),
 organization_id uuid not null references public.organizations(id) on delete cascade,
 invoice_number text not null,
 customer_id uuid not null references public.customers(id) on delete restrict,
 quotation_id uuid references public.quotations(id) on delete set null,
 invoice_date date not null default current_date, due_date date,
 line_items jsonb not null default '[]'::jsonb check(jsonb_typeof(line_items)='array'),
 subtotal numeric(14,2) not null default 0 check(subtotal>=0),
 discount_amount numeric(14,2) not null default 0 check(discount_amount>=0),
 tax_amount numeric(14,2) not null default 0 check(tax_amount>=0),
 grand_total numeric(14,2) not null default 0 check(grand_total>=0),
 amount_paid numeric(14,2) not null default 0 check(amount_paid>=0 and amount_paid<=grand_total),
 payment_status text not null default 'unpaid' check(payment_status in ('unpaid','partially_paid','paid','overdue','cancelled')),
 place_of_supply text, terms text, notes text,
 created_by uuid not null default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(organization_id,invoice_number)
);
create index customers_org_name_idx on public.customers(organization_id,customer_name);
create index customers_created_by_idx on public.customers(created_by);
create index quotations_org_date_idx on public.quotations(organization_id,quotation_date desc);
create index quotations_customer_id_idx on public.quotations(customer_id);
create index quotations_created_by_idx on public.quotations(created_by);
create index invoices_org_date_idx on public.invoices(organization_id,invoice_date desc);
create index invoices_org_payment_idx on public.invoices(organization_id,payment_status,due_date);
create index invoices_customer_id_idx on public.invoices(customer_id);
create index invoices_quotation_id_idx on public.invoices(quotation_id);
create index invoices_created_by_idx on public.invoices(created_by);
alter table public.customers enable row level security;
alter table public.quotations enable row level security;
alter table public.invoices enable row level security;
grant select,insert,update,delete on public.customers,public.quotations,public.invoices to authenticated;
create policy customers_read_managers on public.customers for select to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy customers_insert_managers on public.customers for insert to authenticated with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy customers_update_managers on public.customers for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager'])) with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy customers_delete_admins on public.customers for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin']));
create policy quotations_read_managers on public.quotations for select to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy quotations_insert_managers on public.quotations for insert to authenticated with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy quotations_update_managers on public.quotations for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager'])) with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy quotations_delete_admins on public.quotations for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin']));
create policy invoices_read_managers on public.invoices for select to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy invoices_insert_managers on public.invoices for insert to authenticated with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy invoices_update_managers on public.invoices for update to authenticated using(private.has_org_role(organization_id,array['owner','admin','manager'])) with check(private.has_org_role(organization_id,array['owner','admin','manager']));
create policy invoices_delete_admins on public.invoices for delete to authenticated using(private.has_org_role(organization_id,array['owner','admin']));
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger quotations_set_updated_at before update on public.quotations for each row execute function public.set_updated_at();
create trigger invoices_set_updated_at before update on public.invoices for each row execute function public.set_updated_at();
