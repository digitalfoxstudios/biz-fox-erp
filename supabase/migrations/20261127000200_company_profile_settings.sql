-- Company identity and contact fields managed from Admin > Company settings.
alter table public.organizations
  add column if not exists phone text,
  add column if not exists address text,
  add column if not exists website text,
  add column if not exists gst_number text;

alter table public.organizations
  add constraint organizations_gst_number_format
  check (gst_number is null or gst_number ~ '^[0-9A-Z]{15}$')
  not valid;

alter table public.organizations
  validate constraint organizations_gst_number_format;
