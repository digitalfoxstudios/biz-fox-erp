# Biz FOX ERP

Biz FOX ERP is being rebuilt as a multi-tenant business and office-management platform by Digital FOX Studio.

## Platform direction

- One unified sign-in page; the app determines access from the authenticated account.
- Platform Super Admin console for provisioning and managing business accounts.
- Separate, isolated business workspaces. A user's access is based on active organization membership.
- Business roles include owner, admin, manager, staff and viewer.
- Tenant-owned records use `organization_id` and database Row Level Security (RLS).
- Staff workflow includes assigned work, checklist items, expenses and work reports.

## Main application areas

- Overview dashboard
- Administration, employees and attendance
- Files and e-Office
- Correspondence
- Customers, quotations and invoices
- Accounts and finance
- Departments and meetings
- Tasks and work assignments
- Inventory, assets and projects
- Communication, reports and security

Some module screens and workflows are still being implemented and tested. The presence of a menu item does not mean that every workflow is production-complete.

## Platform administration

The Platform Super Admin signs in through the unified login page. Authorized platform accounts are routed to `platform-admin.html`.

The platform console currently provides:
- Starter, Business and Enterprise plan catalog (prices remain unset at zero pending approval)
- Business account listing
- Business status management
- Business provisioning for an existing owner account (platform-managed)
- Public self-service company registration with owner sign-up, email verification support and automatic Owner membership

New companies should use the **Register your company** link on the unified login page. The owner creates their own account, verifies their email when required, and the server-side registration function creates a 14-day trial workspace and Owner membership. The Platform Console's manual provisioning option remains for existing Auth accounts. Owner invitations are not part of the registration flow.

## Tenant isolation and security

- Tenant-owned application tables have RLS enabled and use `organization_id`.
- Membership and role checks are implemented through database policies and private helper functions.
- Platform provisioning/listing/status functions check the caller against `platform_super_admins`.
- Platform RPC execution is revoked from `anon` and `public`; authenticated execution is guarded inside each function.
- Browser clients must use only the Supabase publishable/anon key. Never put a service-role or secret key in web or Android code.

Security review is ongoing. Supabase currently reports warnings for authenticated execution of the three guarded `SECURITY DEFINER` platform functions and disabled leaked-password protection. Review these before production launch.

## Current rollout status

- [x] Clean application data and Auth accounts as explicitly requested; source code, branding and storage buckets were preserved.
- [x] Register the Platform Super Admin account.
- [x] Add the initial multi-tenant platform database foundation.
- [x] Add Platform Super Admin dashboard and authentication routing.
- [x] Add permission-checked tenant management RPCs.
- [x] Verify RLS is enabled on all current public tables and tenant-owned tables carry `organization_id`.
- [ ] Complete tenant-isolation tests across every table, view, RPC and Storage bucket.
- [x] Add self-service company registration and owner account creation through Supabase Auth.
- [x] Add server-side company provisioning with email-verification enforcement and automatic Owner membership.
- [ ] Complete end-to-end tests for tenant signup, email verification, onboarding, switching and suspension.
- [ ] Complete remaining business module workflows and offline synchronization tests.
- [ ] Build, sign and verify separate native Android Admin and Staff APKs.

## Source and deployment

Repository: https://github.com/digitalfoxstudios/biz-fox-erp

The multi-tenant work is currently on the `feature/multi-tenant-platform` branch in pull request #1. It has not yet been merged or deployed to the public app URL.

Existing public app: https://digitalfoxstudios.github.io/biz-fox-erp/

Do not treat the existing public app or previously published APK references as the completed multi-tenant release. A new release will be announced only after the branch is reviewed, merged, deployed and tested.
