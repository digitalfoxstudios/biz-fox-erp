# Biz FOX ERP

A centralized office automation platform for web and Android.

## Main office portal

- Dashboard and administration
- HR, attendance and leave
- e-Office files and correspondence
- Accounts and finance
- Departments, meetings and work assignments
- Inventory, assets and projects
- Reports, audit and role-based security

Web portal: https://digitalfoxstudios.github.io/biz-fox-erp/

## Separate Staff Work App

Staff use a separate app to:
- Sign in with their own account
- View only their assigned work
- Read assignment instructions and deadlines
- Update work status
- Submit work reports with date, hours spent, work completed, challenges and next steps
- View manager feedback on submitted reports

Staff portal: https://digitalfoxstudios.github.io/biz-fox-erp/staff.html

### Staff onboarding

1. A manager opens **Administration & HR** in the main portal and adds the employee using their work email address.
2. The employee opens the Staff Work App and creates an account using that exact same email address.
3. Biz FOX ERP automatically links the staff login to the employee record.
4. A manager opens **Tasks & Work**, creates an assignment and selects the linked employee.
5. The employee sees the assignment in the Staff App and submits progress or completion reports.
6. The manager reviews the report and approves it or requests changes with feedback.

If the employee already has a login, adding an employee record with the same email links the account automatically.

## Android apps

The signed Android release is published as two separate apps:
- **Biz FOX ERP** — manager and office administration app
- **Biz FOX Staff** — staff assignments and work reports

Download both APKs from the [v1.0.6 release](https://github.com/digitalfoxstudios/biz-fox-erp/releases/tag/v1.0.6). The release workflow verifies both APK signatures before publishing.

## Architecture

- Responsive web application with installable app support
- Supabase PostgreSQL, Auth, Storage and Realtime
- GitHub source control and automated deployment
- Separate manager and staff Android app variants

## Security

- Supabase service-role/secret keys are not included in browser or Android clients.
- Row Level Security is enabled on exposed application tables.
- Staff users can read only their own assigned tasks and their own reports.
- Managers can assign work and review reports within their organization.
- Work-report storage is private.

## Database foundation

The dedicated Supabase project is provisioned in the Mumbai region. The public schema contains 26 tables with Row Level Security enabled and organization-scoped policies.

Core tables include profiles, organizations, organization_members, departments, employees, office_files, correspondence, tasks, task_reports, meetings, assets, projects, announcements and audit_logs.

Generated TypeScript database definitions are stored in `types/database.types.ts`.

## Authentication

The web client uses the Supabase publishable key only. No service-role or secret key is included in browser code. Users register/sign in at `login.html`, then create an organization workspace. The database trigger assigns the creator the owner role automatically.

Staff accounts are linked to employee records by matching the email address. No separate invitation email is required in this first staff-app release.

## Current implementation status

- [x] Responsive application shell and navigation
- [x] Supabase project and secured database foundation
- [x] Email/password sign-up, sign-in and password reset UI
- [x] Organization workspace creation and membership bootstrap
- [x] Initial CRUD forms and record lists for core office modules
- [x] Private office-document storage and file movement register
- [x] Staff work assignment and report workflow
- [x] Separate Staff Work App and signed Android APK
- [x] Manager report review and feedback
- [ ] Deeper approval workflows and remaining module automation
- [ ] Photo/document attachments on staff work reports
- [ ] Advanced staff invitation and administration screens

Routine module screens are being delivered in phases; unfinished screens are labelled as such.

## Hosting and Auth configuration

The repository includes a GitHub Actions Pages deployment workflow. Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once in this repository.

Set the Supabase Auth **Site URL** to:

`https://digitalfoxstudios.github.io/biz-fox-erp/`

Allow that URL and the staff portal path in the Supabase Auth redirect URL list so email confirmation and password recovery return to the app.

Never add a secret or service-role key to `assets/js/supabase.js`.
