# ONE MORE — Architecture, Database & Security Specification

## 1. Engineering principles

- **Single Expo + React Native + TypeScript repository**, Expo Router, Web-first and native-compatible.
- Supabase Auth, Postgres, RLS, Storage, Realtime, Edge Functions and scheduled jobs.
- Use TanStack Query for server-state caching and mutations; thin typed service modules (or equivalent lightweight well-supported approach). React Context only for auth, theme and locale—not duplicated server state.
- Use `react-hook-form` + Zod (or typed equivalent) for forms. Use shared semantic design tokens; choose ONE styling approach consistently. Use native-safe components and Web-compatible dependencies.
- Enforce capacity, permissions and offer expiry in Postgres transactions/database functions, never in browser logic alone.
- Start with seed/demo data **explicitly labeled demo** in local development. Real data comes from Supabase once connected.

## 2. Recommended repository layout

```text
one-more/
├── app/
│   ├── _layout.tsx
│   ├── index.tsx                      # guest landing / auth redirect
│   ├── (auth)/{sign-in,sign-up,verify-email,forgot-password,reset-password}.tsx
│   ├── (onboarding)/profile.tsx
│   ├── (tabs)/{index,explore,create,teams,profile}.tsx
│   ├── matches/[id].tsx
│   ├── matches/[id]/chat.tsx
│   ├── matches/[id]/manage.tsx
│   ├── teams/[id].tsx
│   ├── challenges/[id].tsx
│   ├── challenges/create.tsx
│   ├── notifications.tsx
│   └── settings.tsx
├── src/
│   ├── components/{ui,layout,match,team,challenge,chat}/
│   ├── features/{auth,profile,matches,waitlist,teams,challenges,chat,notifications,venues}/
│   ├── lib/{supabase,query,validation,datetime,permissions}/
│   ├── theme/{tokens,ThemeProvider,typography}/
│   ├── i18n/{en,el,index}.ts
│   ├── hooks/
│   └── types/{database,domain}.ts
├── assets/branding/                # placeholders; final logo later
├── supabase/
│   ├── migrations/
│   ├── seed.sql
│   ├── tests/
│   └── functions/{notify,process-reminders,process-waitlist}/
├── e2e/                            # Playwright Web
├── __tests__/
├── docs/                            # copied spec docs and implementation log
├── .env.example
├── AGENTS.md
├── package.json
└── tsconfig.json
```

Use exact router filenames valid for installed Expo Router; this is intended architecture, not a claim scaffold already exists.

## 3. Schema: source-of-truth tables

IDs default `uuid`; use `created_at`, `updated_at` timestamptz; enforce `NOT NULL`, foreign keys, indexes, unique/partial indexes and CHECK constraints. Favor migrations with SQL and generated Supabase database types. Store only necessary PII.

| Table | Essential fields / notes |
|---|---|
| `profiles` | `id uuid PK FK auth.users`, display_name, avatar_path, city_id, area_id, position, skill_level, language, onboarding_complete, created_at |
| `cities` | id, name_en, name_el, country_code; start with Cyprus verified place data |
| `areas` | id, city_id, name_en, name_el, optional coords |
| `venues` | id, name, city_id, area_id, address, latitude, longitude, created_by; manually entered or verified curated |
| `user_preferences` | user_id unique, allowed_formats array or relation, time windows, max_radius_km, match_alerts, timezone |
| `teams` | id, name, captain_id, city_id, description, avatar_path, status |
| `team_members` | id, team_id, user_id, role (`captain/member/co_captain`), status (`invited/active/left`), joined_at; unique active member |
| `team_invites` | id, team_id, invited_user_id or invite token hash, invited_by, status, expires_at |
| `matches` | id, organizer_id, challenge_id nullable, title, side_size enum(5,7,8,11), capacity computed or constrained, city_id, area_id, venue_id nullable, venue_display_name, starts_at UTC, duration_minutes, level, price_eur numeric(8,2), visibility, event_status, booking_status, reserved_guest_slots, notes |
| `match_participants` | id, match_id, user_id, status (`active/left/removed`), joined_at; partial unique active (match_id,user_id) |
| `match_position_slots` | id, match_id, position_code (`goalkeeper/defender/midfielder/forward/any`), status (`open/filled/removed`), assigned_participant_id nullable unique, created_at; each open row is one organizer-requested role marker. Position needs are a subset of vacant capacity, not extra capacity. |
| `match_join_requests` | id, match_id, user_id, status (`pending/accepted/rejected/cancelled`), reviewed_by, reviewed_at; ensure one active request per match/user; history permitted |
| `match_waitlist` | id, match_id, user_id, status (`waiting/offered/accepted/removed`), created_at, priority_seq; unique waiting/offered entry |
| `waitlist_offers` | id, match_id, waitlist_id, offered_user_id, status (`offered/accepted/declined/expired`), expires_at, unique active reservations |
| `team_challenges` | id, home_team_id, format, city_id, area_id, venue_id nullable, note, skill_level, status, created_by, agreed_starts_at nullable |
| `challenge_windows` | id, challenge_id, starts_at, ends_at; multiple proposed dates/times, timezone conversion at input |
| `challenge_requests` | id, challenge_id, away_team_id, requested_by, status; unique active opposing-team request |
| `field_bookings` | id, match_id UNIQUE, status, organizer_notes **private**, reference **private**, confirmed_at, reported_by; no venue inventory/payment |
| `match_messages` | id, match_id, sender_id, body, created_at, deleted_at; RLS restricted |
| `notification_preferences` | user_id, in_app_enabled, transactional_email_enabled, discovery_email_enabled, chat_email_enabled, native_push_enabled |
| `notifications` | id, recipient_id, event_type, entity_type, entity_id, data jsonb validated, read_at, created_at; recipient-only |
| `notification_deliveries` | id, notification_id, channel, state, attempts, provider_message_id, sent_at, dedupe_key UNIQUE |
| `match_reminders` | id, match_id, recipient_id, offset_minutes (1440 or 120), scheduled_at, state, dedupe_key UNIQUE, sent_at |
| `device_tokens` | id, user_id, platform, token encrypted/appropriately protected, updated_at; own tokens only |
| `reports` | id, reporter_id, target_kind, target_id, reason, status, created_at; admin-only review |
| `moderation_actions` | id, actor_id, target_kind, target_id, action, occurred_at; authorized only |

### Derived facts

`capacity = 2 * side_size`. `filled = count(active match_participants) + reserved_guest_slots`. Active exclusive waitlist reservations must count against available capacity until released/expired. `remaining = max(0, capacity - filled - active_offer_reservations)`. Prefer exposing a secure view or RPC returning consistent numbers. Avoid storing a mutable `missing_players` column that can become stale.

### Essential constraints/indexes

- FK `profiles.id -> auth.users.id` with safe deletion process.
- `side_size IN (5,7,8,11)`; `duration_minutes BETWEEN 30 AND 240`; `reserved_guest_slots >= 0`; price >= 0.
- One active membership per (`team_id`, `user_id`), one active participant per (`match_id`, `user_id`), one pending request per (`match_id`, `user_id`), one waiting/offered queue item per (`match_id`, `user_id`).
- Index `(city_id, starts_at, event_status)` on `matches`, `(match_id, created_at)` on messages; `(recipient_id, created_at DESC)` notifications; `(status, expires_at)` offers.
- Cancel/past match must reject new join requests on server.
- Position-slot creation/update must be transactional and cannot create more open slots than the match's derived remaining capacity. Approving a join request still requires organizer approval; an optional organizer assignment fills one matching open slot atomically with approval.
- `challenge_id` linked to no more than one confirmed match; two opponent approvals cannot succeed simultaneously.

## 4. Database functions / transactional operations

Implement SECURITY DEFINER only if necessary; minimize privilege, set stable `search_path`, validate `auth.uid()` explicitly, restrict EXECUTE grants; call from server with authenticated identity.

| RPC/function | Required atomic behavior |
|---|---|
| `request_match_join(match_id)` | Verify current user, match open/future, nonparticipant, no pending duplicate; insert pending request |
| `review_join_request(request_id, decision)` | Lock match/roster or use serializable transaction; verify organizer; approve only if unreserved capacity available; create participant, update request, enqueue notification; idempotent |
| `leave_match(match_id)` | Verify participant; mark left, revoke chat access, run offer logic; idempotent |
| `join_waitlist(match_id)` | Verify match is full or eligible for queue, authenticated, not participant, no active queue item |
| `offer_next_waitlisted(match_id)` | Under match lock, expire stale offers then reserve one free spot for first eligible waiting user, expiry now+15m; notify via outbox |
| `accept_waitlist_offer(offer_id)` | Owner-only, offered+unexpired, lock match, ensure available reserved slot, add participant, mark offered accepted atomically |
| `respond_to_challenge(request_id)` | Ensure captain/authorized person, accept at most one opponent, reject conflicting requests, flag negotiation/matched; linked match after agreed slot |
| `send_match_message(match_id, body)` | Confirm sender is organizer or active accepted participant; trim/validate/rate-limit and insert |

**Concurrency test is non-negotiable:** two parallel approvals for one seat must yield **exactly one** success; two accepts of one waitlist slot must yield exactly one success.

## 5. Row-level security (RLS) matrix

Enable RLS for all user data tables (and Storage objects). **Never trust client role fields or organizer/captain flags.**

| Table/group | Read | Insert/update/delete |
|---|---|---|
| profiles | limited public profile by authenticated users as required; self full profile | self only, safe column restrictions |
| matches/venues | public open match detail excluding private notes/reference; member-only sensitive fields | organizer only via validated RPC; verified signed-in user can create |
| requests | requester and organizer only | requester creates/cancels own; organizer approval via RPC only |
| participants | safe roster readable to active participant/organizer; limited count otherwise | server-side transaction only |
| waitlist/offers | own status and organizer queue; do not expose other users' private details | join own queue; offers processed by RPC only |
| teams/team_members | active team profiles; private invitation info to target/captain | captain/member own permitted actions via guarded RPC |
| challenges/requests | public open challenge summary, team captains see own requests | captain-only create/respond |
| match_messages | only organizer or current active accepted participants | only authorized senders; no unauthenticated access; delete/moderation restricted |
| notifications/preferences/tokens | recipient/user only | own preferences, token updates; server writes notifications |
| field_bookings | public reported status only; notes/reference organizer only | match organizer only |
| reports/moderation | report submitter own; admin separate protected context | reporter submits, admin acts |

Use separate secure view / RPC instead of exposing a table with private fields and relying only on row-level checks. PostgreSQL RLS is row-level, not automatic per-column masking. Test all unauthorized operations using the **anon client key + authenticated tokens**, not service role.

## 6. Notifications, reminders and events

- Use **transactional outbox** persisted to database for join review/waitlist/challenge events; worker delivers email/in-app and records retry/dedupe.
- Supabase Cron (`pg_cron`) invokes secured Edge Functions on schedule (e.g., once per minute). Worker claims due reminder rows using locking/`SKIP LOCKED` or equivalent, rechecks match status, membership, updated start time, preference, and idempotency.
- For match start change: cancel stale `match_reminders` and regenerate based on `starts_at`; ensure no duplicate emails on worker retries. If match created less than 24 hours before start, don't send a mislabeled 24h reminder immediately; send only future 2h reminder if eligible; booking updates sent separately.
- Email provider API only in Edge Function secrets. Template uses correct language, Cyprus local time, no private data leaking.
- Web: in-app and email. Native: optional Expo push in later native QA; Expo notification stack does **not** provide web push. Never substitute browser alerts for true push.

## 7. Auth and session lifecycle

- `signUp({ email, password })` + Confirm Signup template with `{{ .Token }}`. OTP verification according to actual SDK's sign-up verification type; route user through required profile completion.
- Login `signInWithPassword`; `resetPasswordForEmail`; session persistence, sign-out and protected layouts. Use platform-appropriate secure storage; on web use SDK-supported storage and protect against XSS. Prefer a single Supabase client singleton.
- All backend checks use `auth.uid()`, never an email passed in body as authority. Do not expose whether email exists during password reset.

## 8. Environments/deploy

- `.env.example`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. No real secrets checked in.
- Supabase: local dev instance (CLI/Docker if available), staging project, production project. Keep migrations reproducible and seeds nonproduction.
- Web development: `npx expo start --web`; Web production: `npx expo export --platform web`, deploy to compatible hosting, ensure SPA/static deep-link fallback configured for Expo Router mode.
- Supabase allowed redirect URLs and auth email templates must include real staging and production URLs as appropriate. Define CSP / secure headers at hosting for web. No source-map secrets.
- Native builds after web baseline with Expo EAS and platform-specific tests; do not assume a web green check means mobile will work.

## 9. Open engineering choices (freeze in Phase 00/01)

1. Confirm Expo stable SDK version, Expo Router version and Web compatibility from official docs.
2. Theme storage adapter for Native/Web (AsyncStorage or Expo-supported documented approach).
3. Library for date/time input that works on Web and Native; fallback platform module permitted.
4. Email delivery vendor and transactional template service, developer test mailbox.
5. Test runner selection (`vitest` or `jest`), React Native testing library and Playwright on Web; freeze `npm run test:run` contract.
6. Data migration strategy with Supabase CLI and local integration tests; if Docker unavailable, staging test strategy documented.

Do not pretend these external choices have been configured. Verify them during execution and record them.
