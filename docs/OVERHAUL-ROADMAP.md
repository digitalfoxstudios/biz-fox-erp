# Biz FOX ERP — System Overhaul Plan

## Non-negotiable safeguards
- Preserve the existing single-company Supabase project, organization/workspace identifier, user accounts, employee records, transactions, files, assignments, and audit history.
- Do not drop, truncate, recreate, or silently rename production tables or columns.
- Keep the existing Android signing keystore and package identities so upgrades remain installable over existing app installs.
- Use the approved source artwork at `assets/biz-fox-erp-logo.png`; do not redraw or alter the logo artwork.
- Keep manager/admin and staff experiences separate, with role-based access enforced by Supabase RLS and server-side functions.

## Phase 0 — Stabilize and audit
- Make GitHub Pages and both signed Android release builds deterministic.
- Add automated checks for JavaScript syntax, database migration consistency, and Android release artifacts.
- Verify the live schema against migrations before making schema changes.
- Inventory every screen, action, table, policy, edge function, and Android navigation path.
- Correct the known Android build dependency issue: install ImageMagick before generating launcher resources.

## Phase 1 — Product foundation and UX
- Establish a consistent responsive design system, accessible navigation, loading/empty/error states, confirmation dialogs, and mobile-first forms.
- Replace placeholder branding with the approved logo across login, manager portal, staff portal, splash screen, and launcher icons.
- Add a clear profile/account menu, session handling, password reset, and reliable update/offline messaging.
- Ensure Android back navigation, file uploads/downloads, external links, keyboard behavior, and network recovery work predictably.

## Phase 2 — Core office workflows
- HR: employee directory, departments, staff invitations, attendance, leave requests, employee status and history.
- e-Office: file register, file numbering, notes, attachments, movement, assignment, approvals, return/reject, closure, and audit trail.
- Correspondence: inward/outward registers, references, dispatch details, attachments, and status tracking.
- Tasks: manager assignment, staff acknowledgement, progress, blockers, evidence attachments, report submission, manager review, and completion.
- Meetings: calendar, agenda, attendance, minutes, decisions, and action items.
- Inventory/assets: item register, stock movements, issue/return, asset allocation, maintenance, and audit.
- Projects: project setup, work items, milestones, measurements, progress, expenses, and reports.
- Finance: chart of accounts, vouchers, income/expense entries, approvals, budgets, ledgers, and financial reports; enforce balanced accounting entries before enabling posting.
- Communication: announcements, notices, and read status.
- Reports/security: role-aware dashboards, exports, audit history, access review, and safe account administration.

## Phase 3 — Staff app
- Simple staff home screen with assigned work, due dates, priority, status, and unread feedback.
- Task details with instructions, attachments, progress updates, blockers, and evidence.
- Daily work reports with date, time/hours, work completed, challenges, next steps, and attachments.
- Clear report history and manager feedback.
- Staff can access only their own profile, assignments, reports, and authorized shared material.

## Phase 4 — Quality and release
- Test each workflow with manager, staff, and unauthorized accounts.
- Verify RLS isolation and storage access; never expose service-role credentials in client code.
- Test on narrow Android screens, poor connectivity, offline launch, session expiry, and app upgrades.
- Run signed Manager and Staff APK builds with the preserved keystore and verify signatures before publishing.
- Keep incomplete features clearly labelled rather than presenting nonfunctional controls as complete.

## Delivery rule
Ship small, reversible increments. Apply additive database migrations, verify them against the live project, and never perform destructive production changes as part of a visual redesign.
