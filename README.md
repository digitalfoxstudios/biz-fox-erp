# Biz FOX ERP

A single-company office automation platform for web and Android. It is configured for one company workspace, not multi-tenant customer accounts.

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

1. An administrator opens **Administration & HR** and adds the employee with their work email address.
2. The administrator selects **Create staff login** beside the employee record.
3. Biz FOX sends a secure account invitation to the employee. The employee uses the email link to set their password.
4. The staff account is linked to the employee record and receives the staff role automatically.
4. A manager opens **Tasks & Work**, creates an assignment and selects the linked employee.
5. The employee sees the assignment in the Staff App and submits progress or completion reports.
6. The manager reviews the report and approves it or requests changes with feedback.

Staff self-registration is disabled. Only authorized company administrators can create staff invitations.

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
- Managers can assign work and review reports within the company workspace.
- Work-report storage is private.

## Database foundation

The dedicated Supabase project is provisioned in the Mumbai region. The public schema contains 26 tables with Row Level Security enabled and company-scoped policies. The `organization_id` column is retained internally as a workspace/security key; users cannot create or switch company workspaces.

Core tables include profiles, organizations, organization_members, departments, employees, office_files, correspondence, tasks, task_reports, meetings, assets, projects, announcements and audit_logs.

Generated TypeScript database definitions are stored in `types/database.types.ts`.

## Authentication

The web client uses the Supabase publishable key only. No service-role or secret key is included in browser code. Company administrators sign in at `login.html`. Public account registration and creation of additional company workspaces are disabled.

Administrators add an employee and select **Create staff login**. A secured Supabase Edge Function checks the caller's company role, sends an invitation, links the account to the employee record and grants the staff role. Staff self-registration is disabled.

## Current implementation status

- [x] Responsive application shell and navigation
- [x] Supabase project and secured database foundation
- [x] Email/password sign-in and password reset UI
- [x] Single-company workspace with public company creation disabled
- [x] Admin-controlled staff account invitations
- [x] Initial CRUD forms and record lists for core office modules
- [x] Private office-document storage and file movement register
- [x] Staff work assignment and report workflow
- [x] Separate Staff Work App and signed Android APK
- [x] Manager report review and feedback
- [ ] Deeper approval workflows and remaining module automation
- [ ] Photo/document attachments on staff work reports
- [x] Admin-created staff invitations from the employee directory

Routine module screens are being delivered in phases; unfinished screens are labelled as such.

## Hosting and Auth configuration

The repository includes a GitHub Actions Pages deployment workflow. Enable **Settings → Pages → Build and deployment → Source: GitHub Actions** once in this repository.

Set the Supabase Auth **Site URL** to:

`https://digitalfoxstudios.github.io/biz-fox-erp/`

Allow that URL and the staff portal path in the Supabase Auth redirect URL list so email confirmation and password recovery return to the app.

Never add a secret or service-role key to `assets/js/supabase.js`.
