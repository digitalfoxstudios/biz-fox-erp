-- Single-company Biz FOX ERP: one internal workspace only.
-- Customer portal identities are linked directly to a customer record.
alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete set null;
create unique index if not exists customers_user_id_unique
  on public.customers(user_id) where user_id is not null;

drop policy if exists customers_read_self on public.customers;
create policy customers_read_self on public.customers
  for select to authenticated
  using (user_id = (select auth.uid()) and status = 'active');

drop policy if exists invoices_read_customer_self on public.invoices;
create policy invoices_read_customer_self on public.invoices
  for select to authenticated
  using (exists (
    select 1 from public.customers c
    where c.id = invoices.customer_id
      and c.organization_id = invoices.organization_id
      and c.user_id = (select auth.uid())
      and c.status = 'active'
  ));

drop policy if exists quotations_read_customer_self on public.quotations;
create policy quotations_read_customer_self on public.quotations
  for select to authenticated
  using (exists (
    select 1 from public.customers c
    where c.id = quotations.customer_id
      and c.organization_id = quotations.organization_id
      and c.user_id = (select auth.uid())
  ));

-- The internal organization_id remains for row-level security and reporting,
-- but the installation can never contain more than one company workspace.
create unique index if not exists organizations_single_company_only_idx
  on public.organizations ((true));
