# ONE MORE — Find your game

ONE MORE is a bilingual (English/Greek) football community for finding local matches, building teams and arranging team challenges across Cyprus. It uses Expo Router, React Native, TypeScript and Supabase. Product requirements and the visual system live in [`docs/`](docs/).

## Current readiness

- **Web:** A hosted Expo staging preview is live at [one-more--staging.expo.app](https://one-more--staging.expo.app). It serves the guest preview and live Supabase discovery query; authenticated signup/OTP acceptance is still incomplete. This is not a production or beta-ready release.
- **Authentication:** Signup collects English name, private phone, email and a password (minimum 8 characters), then verifies with a one-time email code. Existing-email responses guide the user to sign in. Normal login remains email + password. Password recovery uses an 8-digit code. Browser coverage uses mocked Auth responses; real signup/recovery code completion remains unverified. The current `onboarding@resend.dev` sender is limited to its verified owner; a verified custom domain is needed for general recipients.
- **Notifications:** In-app inbox is available. Email delivery needs the Edge Function Resend settings listed in [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md).
- **Android:** An internal multi-ABI APK builds successfully with EAS; local Windows native builds can still hit the 260-character path limit. Expo's cloud simulator is not enabled for this account, and no local device/emulator is connected.
- **iOS:** The app uses Expo SDK 58, matching the current Expo Go iPhone release. The EAS project is owned by `hasan-jahouse`, and an iOS update is published on the `preview` channel. Open the project once with the Expo Go link in [`docs/NATIVE_SMOKE.md`](docs/NATIVE_SMOKE.md); it should then remain in Expo Go's Projects list. A physical-device standalone `.ipa` still requires an Apple Developer team and a registered iPhone.
- **Policies:** Privacy and Terms routes are drafts awaiting qualified Cyprus/EU legal review.

Do not treat this workspace as a production deployment or store-ready release. See the [phase log](docs/IMPLEMENTATION_LOG.md) and [beta operations runbook](docs/OPERATIONS_RUNBOOK.md) for current blockers and evidence.

## Requirements

- Node.js 22.13 or newer
- npm
- A Supabase project for real backend data
- Docker Desktop only if you want the complete local Supabase stack

## Local Web setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Set these values in `.env.local` using your Supabase project. The URL and publishable key are client-visible by design; never put a service-role, database password, SMTP password, or Resend API key in an `EXPO_PUBLIC_*` variable.

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Then start the app:

```powershell
npm run dev:web
```

Use `npm run preview:web` to build and serve the production-mode export locally at `http://localhost:8080`. This is a local preview, not a hosted deployment. The landing-page sample match is labeled as demo content.

## Supabase schema

Migrations are the reproducible schema source. For a new local stack, start Docker Desktop, then run:

```powershell
npx supabase start
npx supabase db reset
```

To deploy reviewed migrations to a linked project:

```powershell
npx supabase link --project-ref <project-ref>
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db push
```

Review the target project and migration plan before applying changes. Never apply migrations by hand in Studio without a matching migration file. See [`docs/SCHEMA_OVERVIEW.md`](docs/SCHEMA_OVERVIEW.md).

## Commands

```powershell
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e -- --workers=1
npm run build:web
npm run format:check
npx expo-doctor
npm audit
```

Android requires a local Android SDK and JDK. `npm run android` builds and installs on a connected device/emulator; iOS native builds require macOS and Xcode. Native readiness evidence is in [`docs/NATIVE_SMOKE.md`](docs/NATIVE_SMOKE.md).

## Product rules to preserve

- Every signup must complete email verification and the required profile before creating a match or team.
- Every match join requires organizer approval. A pending request is not a confirmed place.
- Waitlist offers need explicit acceptance before expiry; the default offer window is 15 minutes.
- Private match chat is limited to accepted players and the organizer.
- Store match instants as UTC `timestamptz`; display in `Asia/Nicosia`.
- V1 field booking is manual status tracking only. There are no venue-provider booking or payment integrations.
- Keep English and Greek copy synchronized. Keep the theme preference switch available.

## Project docs

- [`docs/04_MASTER_EXECUTION_PLAN.md`](docs/04_MASTER_EXECUTION_PLAN.md) — phases and acceptance gates
- [`docs/IMPLEMENTATION_LOG.md`](docs/IMPLEMENTATION_LOG.md) — executed work and actual checks
- [`docs/WEB_PREVIEW_SMOKE.md`](docs/WEB_PREVIEW_SMOKE.md) — owner-run hosting procedure
- [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md) — support, mail, monitoring, backup and incidents
- [`docs/SCHEMA_OVERVIEW.md`](docs/SCHEMA_OVERVIEW.md) — current schema map
