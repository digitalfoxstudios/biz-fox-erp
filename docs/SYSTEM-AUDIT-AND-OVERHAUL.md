# Biz FOX ERP — System and Application Audit

Audit date: 2026-11-24  
Repository: https://github.com/digitalfoxstudios/biz-fox-erp  
Deployment model: one company workspace; web portal plus separate Manager and Staff Android apps.

## Confirmed current foundation

- GitHub Pages web portal and separate Staff portal.
- Supabase PostgreSQL/Auth/Storage project in Mumbai: `ulhnkrtbswolpywesbgx`.
- Existing company data is scoped by the internal `organization_id`; retain it as a security key, not as a customer-facing tenant selector.
- Manager and Staff Android variants use separate application IDs and the existing release signing key from GitHub Actions secrets.
- Staff assignment/report database migrations and private office-document storage are present.
- Latest Android workflow succeeded on 2026-11-24; both APKs passed `apksigner verify`.

## Audit findings — work still required

1. **The manager web client is a compact, single-file application.** Most office modules are configured through a shared generic CRUD renderer. This is useful for registers, but it is not enough for real workflows such as approvals, finance posting, project execution, stock issue/return, and file movement.
2. **Workflow depth is uneven.** Tasks have a manager assignment/review path, but staff evidence attachments are not implemented in the staff UI. The staff client is currently a small single-file screen.
3. **Server-side source reproducibility is incomplete.** The repository has SQL migrations and generated database types, but the repository tree does not contain the documented `admin-create-staff` Edge Function source. The deployed function must be brought under source control before it is changed.
4. **The Android wrapper still has placeholder native branding.** Its top bar draws a text “FOX” tile instead of displaying the approved logo artwork. The launcher icon pipeline already uses the approved image.
5. **The app has no automated application test suite in the repository.** Add syntax, migration, workflow, and release checks before large refactors.
6. **Signing-key exposure incident:** a binary Java keystore was tracked as `keystore.txt` in this public repository. It has now been removed from the current branch. The Android build uses the GitHub Actions signing secrets, not that tracked file. Removing the latest copy does not erase the old object from Git history. Keep the current key for app-upgrade continuity; restrict access to the repository and arrange a Git-history purge of the exposed file. Do not publish the keystore or its passwords again.

## Target operating model

- One company, one controlled workspace, one company administrator hierarchy.
- Roles: Owner/Admin, Manager, Staff, and read-only Viewer. Permissions must be enforced by Supabase RLS and trusted server-side functions, not just hidden buttons.
- Every important business object has an owner, status, timestamps, history, and audit trail.
- Workflows must have explicit states and permitted transitions. A record being saved is not the same as an approval or completion.
- Manager and Staff apps remain separate. Staff see only their own profile, assigned work, submitted reports, feedback, and explicitly shared files.
- Existing data, user accounts, organization ID, storage objects, app IDs, and signing key must remain intact.

## Delivery sequence

### Stage 1 — Stabilize and secure
- Remove exposed secrets from the current source tree and clean public Git history.
- Bring deployed Edge Function source into the repository without exposing service-role credentials.
- Verify current live schema and RLS policies before additive migrations.
- Add automated JavaScript syntax checks and migration/release checks.

### Stage 2 — Rebuild the application shell
- Consistent brand system using the exact approved logo.
- Responsive manager navigation with clear dashboard, work queue, notifications, search, profile, and settings.
- Staff home focused on today's work, deadlines, updates, and report submission.
- Reliable loading, empty, error, offline, session-expiry, and update states.
- Replace the Android native “FOX” placeholder with the approved logo asset.

### Stage 3 — Complete business workflows
- HR: employee lifecycle, invitations, attendance, leave approvals, employee history.
- e-Office: file registration, numbering, notes, attachments, assignment, movement, approval/rejection, closure.
- Tasks: assignment, acknowledgement, progress, blocker, evidence, report, manager review, completion.
- Projects: milestones, work items, measurement units, progress, expenses, handover.
- Inventory: item/stock ledger, receipts, issues, returns, transfers, asset assignment and maintenance.
- Finance: chart of accounts, vouchers, balanced journal entries, approval and posting, ledgers and reports. Do not represent simple bill rows as a complete accounting system.
- Meetings/correspondence: registers, agenda, minutes, action items, dispatch and tracking.
- Reports: operational summaries, export, audit and access review.

### Stage 4 — Validate and release
- Test workflows as Owner/Admin, Manager, Staff, Viewer, and unauthorized user.
- Verify RLS and private storage access against the live Supabase project.
- Test narrow Android screens, keyboard behavior, attachments, downloads, poor network, offline launch, session expiry, and upgrades.
- Publish Manager and Staff APKs only after signed-build verification.

## Safety rules

- No destructive schema changes or data resets during redesign.
- Use additive, reversible migrations and verify each against the existing production project.
- Never modify the separate SecureV3 project.
- Never regenerate the Android signing key casually; it is required for in-place app upgrades.
- Do not claim a workflow is complete until its end-to-end manager/staff/unauthorized tests pass.
