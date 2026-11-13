# ONE MORE beta operations runbook

This describes the current app and owner actions still required for a hosted beta. It does not claim production deployment, legal approval or an operational support SLA.

## Environment and secrets

Only these publishable Supabase values belong in `.env.local` and the Expo Hosting preview environment:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Never put service-role, Postgres, SMTP or Resend private keys under `EXPO_PUBLIC_*`. Do not paste secrets into commits, screenshots, issue reports or chat.

### Supabase Auth email

Supabase Auth SMTP is separate from the app notification worker. The current Supabase settings use Resend (`smtp.resend.com`, port `465`, username `resend`) and a private Resend API key as the password. A live SMTP test was accepted by Resend and delivered to the account owner's mailbox. The configured sender is `onboarding@resend.dev`, which is suitable only for testing with the verified account owner; configure a verified custom domain before sending to general users. A real signup confirmation email also arrived, but the connected mail tool redacted its one-time code, so app-side OTP completion and password recovery remain unverified. Never put the API key in `EXPO_PUBLIC_*`, source, screenshots or chat. For Resend's SMTP requirements see [Resend SMTP setup](https://resend.com/changelog/smtp-service).

Before beta Auth sign-off:

1. Verify a sender domain and SPF/DKIM/DMARC with the provider before production/general-recipient use.
2. Set Auth Site URL to the actual HTTPS preview domain; allow only required preview/production redirect patterns and `one-more://` native redirects.
3. Use a fresh test mailbox to exercise signup, one-time code/link, password reset, expired link and sign-out; confirm the code in the app rather than relying only on provider acceptance.
4. Check provider delivery/bounce logs and Supabase Auth logs. Disable click tracking if it rewrites single-use Auth links.

### App notification email

Set these as Supabase Edge Function secrets only, then redeploy `notification-outbox-worker`:

- `RESEND_API_KEY` — private key from the approved Resend account
- `RESEND_FROM_EMAIL` — verified sender, e.g. `ONE MORE <notifications@verified-domain>`
- `APP_BASE_URL` — HTTPS public app base URL used for notification links

Do not use an unverified personal Gmail address as a production sender. Verify a real message from a test account, then inspect function invocation and provider events. Current worker health reports `mail_provider_not_configured`/HTTP 503 because these secrets are absent. Database inbox notifications exist independently of email delivery.

## Email volume and abuse control

- Auth email requests are subject to the live quotas in Supabase Authentication → Rate Limits. Current Supabase documentation lists 2 email requests/hour for the default provider and 30/hour with custom SMTP; dashboard values are authoritative for this project.
- Enforce a 60-second OTP resend cooldown in the UI after signup and after a successful resend or provider rate-limit response. This matches Supabase's documented default per-user signup-confirmation window; check the dashboard if the project value is customized ([Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)). Show the localized toast and do not claim an email was sent unless the provider accepted the request.
- Supabase enforces IP and endpoint Auth limits. Review the live values before public signup; add CAPTCHA if exposure/abuse warrants it.
- App email is queued in the server-owned outbox. Retry through the worker/queue rather than from the client. Inspect idempotency state before replaying an event.
- The worker currently fails because mail secrets are missing. This blocks email notifications and reminders; do not mark delivery PASS while it returns errors.

## Support and account deletion

There is no in-app support inbox or admin dashboard. Before inviting beta testers, the owner must provide a monitored support contact on the hosted product. Limit Supabase project access to named maintainers using individual accounts and MFA; do not share owner passwords.

An account deletion row is a request, not an automatic deletion. For each request:

1. Confirm the request in the user's signed-in context; never ask for passwords or one-time codes.
2. Review lawful retention needs for match records, moderation reports, disputes and notifications with the privacy contact before deleting or anonymizing data.
3. Use the supported administrative Supabase workflow to remove the Auth user only after disposition is approved. Verify related rows and storage objects separately.
4. Record request ID, decision and completion timestamp with minimum necessary audit data. Do not copy personal data into chat or this repo.
5. If it cannot be completed, tell the requester through the support channel; never mark it complete just because it was submitted.

Support handling and retention are not legally approved yet. The Privacy and Terms pages are drafts.

## Monitoring and routine checks

During a controlled beta, inspect:

- Supabase project Health/Reports, Database and Auth logs, Performance/Security Advisors, Edge Function logs and `pg_cron` job history.
- `notification-outbox-worker` success/error counts and `one-more-process-waitlist-offers` scheduled job.
- Repeated 401/403, 429, 5xx, queue age, duplicate reminders, match capacity discrepancies, and unauthorized chat/report attempts.
- Storage/database growth, backup age/availability, signup spikes, bounced mail and provider quotas.

Do not log access tokens, full email bodies, private booking references, message text or unnecessary personal information. No external error-monitoring/SLA service is configured. Advisor findings (intentional checked SECURITY DEFINER RPCs, `pg_net` placement and unused-index information) are recorded in the implementation log; review after workload changes.

## Backup and restore expectation

Do not assume this project has automatic backups. Confirm its current billing plan and Database → Backups page. [Supabase's backup documentation](https://supabase.com/docs/guides/platform/backups) says daily automated backups apply to Pro/Team/Enterprise; Free projects should regularly export data off-site. Storage API objects are not in a Postgres database backup. PITR is an add-on with separate cost; no PITR purchase or plan upgrade has been made for this project.

Using the current Supabase CLI, after linking the intended project:

```powershell
npx supabase link --project-ref <project-ref>
npx supabase db dump --remote -f .\backup\schema.sql
npx supabase db dump --remote --data-only --use-copy -f .\backup\data.sql
```

The CLI default dump is schema-only; dumps exclude Supabase-managed schemas such as Auth and Storage. Protect data dumps as confidential personal data, encrypt them at rest, store them outside this repo and back up Storage objects separately. Check `npx supabase db dump --help` because CLI options can change. See the [Supabase CLI reference](https://supabase.com/docs/reference/cli/supabase-db-dump).

Before restoring, stop writes/announce downtime, preserve a fresh copy, use the restore flow for the correct project, verify migrations, RLS, grants, Auth configuration, Storage files and critical workflows, then reopen traffic. Prefer restoring to a separate project for inspection where possible. A restore can discard later writes; choose a recovery point with the owner. Schedule a restore rehearsal before beta; none has been completed.

## Match venue and booking boundaries

V1 records a venue and manual booking status/reference. It does not contact venues, reserve time, validate availability, collect money, issue refunds or guarantee a field. The organizer confirms booking with the venue, reports status accurately and contacts players about changes. Do not describe a venue as booked unless the organizer confirmed it in the product.

## Incident playbook

1. **Triage and contain:** record UTC/time, affected route/service, request/error IDs and impact without tokens or secrets. For abuse, exposed credentials or suspected unauthorized access, restrict affected access and rotate the compromised secret in its provider dashboard.
2. **Protect users:** pause invites/new signups in Supabase Auth if new accounts are at risk; post status through the monitored support channel. Do not silently delete evidence or promise data recovery.
3. **Diagnose:** compare release/migration with Supabase Auth/database/function/cron logs and mail-provider events. Check outbox retry/idempotency state before replaying.
4. **Recover:** prefer a reviewed forward fix. For data corruption, choose a recovery point with the owner and understand potential data loss. Encode persistent schema corrections in a reviewed migration.
5. **Verify:** test auth if SMTP works, guest discovery, approval/capacity, private chat, teams/challenge, reminders, email and EN/EL mobile layout as relevant.
6. **Close:** record impact, timeline, data-exposure decision, remediation and follow-up in a restricted incident record. Keep names/emails out of the public repository.

## Known issues before beta

- No hosted Expo preview URL; EAS/Vercel are not authenticated on this machine.
- Supabase SMTP returns 535; notification worker has no Resend secrets and returns 503.
- Full authenticated two-user browser acceptance is blocked by email delivery.
- Android APK build is blocked by Windows C++ path length; no native device smoke. iOS is not tested on this Windows host.
- No real device OTP end-to-end, production backup/restore rehearsal or true concurrent load stress run.
- Phase 14 simulated Lighthouse run reported CLS 0.536 while browser observer measured .0023; discrepancy is unresolved.
- Legal drafts, support contact/process, retention and account-deletion completion policy await owner/legal review.
- Account-deletion submission/cancellation work; operational completion requires support/admin action.
- Android/iOS release IDs/signing and store publishing are not configured.

## Phase 2 backlog

- Verified venue-provider availability and booking integrations.
- Payments, refunds, receipts and financial reconciliation.
- Ratings/reputation with moderation and abuse controls.
- Recurrent matches and richer organizer operations.
- Native push setup, delivery preferences and device-token lifecycle.
- Web push only if deliberately selected.
- Audited least-privilege admin/support tools for moderation and account deletion.
