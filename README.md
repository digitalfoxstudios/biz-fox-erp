# Biz FOX ERP

A centralized office automation platform for web and Android.

## Planned modules
- Dashboard and administration
- HR, attendance and leave
- e-Office files and correspondence
- Accounts and finance
- Departments, meetings and tasks
- Inventory, assets and projects
- Reports, audit and role-based security

## Architecture
- Responsive web application with installable PWA support
- Supabase PostgreSQL, Auth, Storage and Realtime
- GitHub source control and automated deployment

## Security
- Keep Supabase service-role/secret keys out of browser and Android clients.
- Enable Row Level Security on every exposed table and add least-privilege policies before connecting user data.

This repository is the dedicated Biz FOX ERP project and is separate from Secure Suite.

## Database foundation

The dedicated Supabase project is provisioned in the Mumbai region. The initial remote migration is recorded as `20261124041909_initial_secure_office_schema`; a follow-up migration adds indexes for foreign-key columns. The public schema currently contains 25 tables with Row Level Security enabled and organization-scoped policies.

Core tables include profiles, organizations, organization_members, departments, employees, office_files, correspondence, tasks, meetings, assets, projects, announcements and audit_logs.

Generated TypeScript database definitions are stored in `types/database.types.ts`.

## Authentication

The web client uses the Supabase publishable key only. No service-role or secret key is included in browser code. Users register/sign in at `login.html`, then create an organization workspace. The database trigger assigns the creator the owner role automatically.

## Current implementation status

- [x] Responsive application shell and navigation
- [x] Supabase project and initial secured database schema
- [x] Email/password sign-up, sign-in and password reset UI
- [x] Organization workspace creation and membership bootstrap
- [x] Dashboard counts connected to secured database tables
- [x] Initial CRUD forms and record lists for HR, departments, e-Office files, correspondence, finance, tasks, meetings, assets, projects, circulars and service applications\n- [ ] Approval workflows and deeper module automation
- [ ] Staff invitations and administration screens
- [x] Private office-documents storage bucket and file movement register\n- [x] Audit event capture for operational record changes
- [ ] Automated audit event capture and reporting
- [ ] Android packaging and release workflow

Routine module screens are being delivered in phases; unfinished screens are labelled as such.

## One-time hosting and Auth configuration

The repository includes a GitHub Actions Pages deployment workflow. Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once in this repository. The Pages site is not yet enabled, so a public app URL is not claimed yet.

After Pages is enabled, set the Supabase Auth **Site URL** to:

`https://digitalfoxstudios.github.io/biz-fox-erp/`

Add that same URL (and `https://digitalfoxstudios.github.io/biz-fox-erp/**` if using a wildcard) to the Supabase Auth allowed redirect URLs so email confirmation and password recovery return to the app.

The Supabase publishable key in `assets/js/supabase.js` is designed for browser use. Never add a secret or service-role key to this file.
