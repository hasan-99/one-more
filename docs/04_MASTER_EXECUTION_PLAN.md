# ONE MORE — CODEX MASTER EXECUTION PLAN

**Mission:** Implement the complete ONE MORE football community app in small, independently verifiable phases. **Web works after every phase**, and native compatibility is protected throughout. This is the authoritative build sequence. Code agent must not skip gates or advance automatically.

## Before each phase

1. Read `AGENTS.md`, `README.md`, PRD, design and architecture; check current implementation log.
2. Inspect actual repository, dependencies, route structure and last test results.
3. State phase objective, exact intended files, build/test commands and missing external credentials.
4. Implement **only that phase**, using feature flags or coherent stubs if downstream features not yet built. Stubs must be labeled and must not simulate success of real backend requests.
5. Run common checks: `npm run lint`, `npm run typecheck`, `npm run test:run`, `npx expo export --platform web`, `npx expo start --web` (running server; verify actual page via browser/Playwright).
6. From Phase 02 onward add `npm run test:e2e` scoped to existing flows; from first DB phase run DB/RLS tests too.
7. Run scenario-based checks in the live Web app after every phase. Walk the changed flows as guest, signed-in player and organizer when applicable; intentionally exercise success, validation, empty, permission-denied, backend/storage failure and retry paths, fix discovered bugs, then re-run the checks. Check mobile 375px and desktop 1440px in dark and light when available; capture screenshots or explain lack of browser access.
8. Update `docs/IMPLEMENTATION_LOG.md` with exact evidence, deviations and next phase.
9. **Stop** and ask for next phase instruction. Failures are blockers unless documented and explicitly deferred with no false PASS.

## Copy/paste Codex prompt for any phase

```text
Read AGENTS.md and all docs. Implement Phase <NN> only from
`docs/04_MASTER_EXECUTION_PLAN.md` using the approved ONE MORE specs.
Do not work on later phases. Prefer a polished Web-first, shared Expo solution.
Write or update focused tests. Run lint, typecheck, unit tests, Expo Web export,
start and inspect Web at mobile and desktop widths (if browser accessible),
and run relevant E2E/DB tests. Log actual results in
`docs/IMPLEMENTATION_LOG.md`. Report PASS/PARTIAL/BLOCKED and stop.
```

## Phase 00 — Repo bootstrap and tooling

**Goal:** Reproducible Expo Router TypeScript app, running on Web.

**Tasks**
- Confirm current stable compatible Expo SDK/Router via official sources. Scaffold project, npm scripts `dev:web`, `lint`, `typecheck`, `test:run`, `test:e2e`, `build:web`, plus `format:check` if available.
- Install Web dependencies with `npx expo install react-dom react-native-web @expo/metro-runtime` if scaffold lacks them; use `expo install` for Expo-managed libraries.
- Configure ESLint, TypeScript strict, Prettier, unit runner, Playwright config, `.env.example`, `.gitignore`, folder structure, initial `AGENTS.md` and copy docs.
- Build `/` with `ONE MORE.` typography placeholder and obvious CTA, not a finished logo. Install a robust web font-loading strategy with fallback.
- Create `docs/IMPLEMENTATION_LOG.md`, CI minimal workflow (lint, types, unit, web export).

**Gate:** Home loads `http://localhost:<actual-port>`; screenshot at 375/1440; TypeScript, lint, unit, export pass; no missing dependency. No Supabase connection claimed yet.

## Phase 01 — Theme, brand, i18n foundations

**Goal:** Premium Electric Lime visual system with working System/Dark/Light theme and EN/EL language switch.

**Tasks:** Semantic tokens + ThemeProvider, persist theme choice, detect OS preference, typography, global layout, BrandMark placeholder; English/Greek translation dictionaries; locale and time formatting; responsive navigation primitives. Create component gallery page for buttons, fields, badges, cards, modal states and fonts. Web keyboard and focus styles.

**Gate:** Toggle theme and refresh (persists); change locale and refresh (persists); gallery shows every control in both modes, Greek glyphs not broken; contrast tests automated for important pairs; screenshots 375/768/1440. UI quality review: avoid generic dashboard aesthetic.

## Phase 02 — Shell, landing, routes and polished design skeleton

**Goal:** All required navigable empty routes, beautiful layout, zero dead buttons.

**Tasks:** Expo Router layouts, guest/verified shell route placeholders, mobile bottom nav/desktop side nav, public Landing, skeleton Home/Explore/Create/Teams/Profile/Notifications/Settings/Match detail/Team detail/Challenge detail/Chat. Show explicit empty/loading states; route navigation functioning. Add responsive Design Review page accessible only in development; basic Playwright navigation tests.

**Gate:** Navigation and back/refresh/deep link smoke; screenshot each main route in Dark and Light, 375 and 1440; no horizontal scrolling, no broken route, no hidden fake functionality. All visible copy localized.

## Phase 03 — Supabase environment, auth & verified OTP

**Goal:** Real Supabase connected, signup+email confirmation code and normal password login.

**Tasks:** Setup local/staging Supabase; migration for profile trigger/safe profile lifecycle; Supabase client singleton, env validation; signup with English name and private phone plus email/password, verified email OTP using Confirm Signup template `{{ .Token }}`; `verifyOtp` correct type tested for installed SDK; resend cooldown, password login, reset password, signout; session state route guards. Storage per platform; no secrets in frontend; custom SMTP/test email provider or local mail test tool. Add password validation, user-friendly verification errors.

**Gate:** Real test inbox or local Auth mail catcher receives code, signup only reaches protected screen after verification, invalid/expired code fails, login/logout/refresh and forgot password tested on Web. Backend denies unauthorized protected data. If SMTP/keys unavailable, report BLOCKED for end-to-end email (do not call success).

## Phase 04 — Onboarding and profile/preferences

**Goal:** Real persistent profile, language/preferences and city selection.

**Tasks:** Migrations: profiles, cities, areas, user_preferences, notification_preferences. Seed verified initial Nicosia areas (no fictional venue addresses), protected CRUD and RLS. Screens: prefilled English name plus required city/area; optional position/skill/game formats/availability; edit profile and settings; avatar placeholder. Auth route guards account for incomplete profile.

**Gate:** Two test accounts each see own private preferences; forbidden update of other's profile; refresh persistence; profile completion and validation, EN/EL, Dark/Light, both viewport widths.

## Phase 05 — Matches DB and discovery UI

**Goal:** Real list and detail browsing with safe RLS, filtering and responsive cards.

**Tasks:** Migrations: venues, matches, participant reservation model, open-position slots, indexes, safe public views/RPC. Query hooks, cursor/paged discovery, sort by starts_at, city/area, date/time, side_size, price, free spots, level. Components MatchCard, compact pitch-position map for matches with open role needs, capacity progress, filters/skeleton/empty/error states. Position markers must match persisted open slots and remain a subset of derived vacancy count. RLS on public data/private fields.

**Gate:** Seeded local matches show accurate formats/capacity/time; position-needs maps and accessible position counts match each seeded match; filters and detail deep links work on Web; unauthenticated cannot read sensitive fields, results paginated, date formatting Cyprus/DST tests. No false claims that manual booking is verified.

## Phase 06 — Match creation/editing and booking tracker

**Goal:** Any verified player can publish, edit and cancel their own match, with manual field booking.

**Tasks:** Create/edit multi-section polished form and Zod/shared database validation. Venue name/address/manual location, starts_at, duration, format, guest reservations, organizer-selected open positions on a tappable pitch map (one marker per needed player), notes, fee, draft/publish, booking status. Derived remaining count, organizer defaults, cancellation flow, transactional update of position slots, strict organizer RLS. Position markers cannot exceed remaining capacity. Booking sensitive note/reference organizer-only. Schedule changes send update events later.

**Gate:** Create all four formats, confirm capacity 10/14/16/22; add/remove and persist positions in all pitch zones; open-position count cannot exceed remaining capacity and renders correctly on cards/details; invalid date and over-reserved slots blocked front/backend; other user cannot edit/cancel; publication visible to others; responsive forms tested.

## Phase 07 — Request to join and approval engine

**Goal:** Players request, organizers approve/deny; no overbooking.

**Tasks:** Join requests/participant migrations, secure RPCs with match-level locks, organizer management screen, pending/accepted/rejected/cancelled UI, request history and notifications outbox seed, idempotent actions, participant roster. Block organizer self-duplication, past/cancelled match, duplicate pending requests.

**Gate:** Player A requests, organizer approves, count increments exactly one; pending never fills a seat; unauthorized reviews fail; **parallel approval race** for final seat yields one success; back/refresh shows truth; E2E two independent users.

## Phase 08 — Waitlist and exclusive offers

**Goal:** Reliable automatic vacancy replacement without silent enrollment.

**Tasks:** Migrations queue/offer, position ordering, `offer_next_waitlisted` and `accept_waitlist_offer`, 15min expiration, decline/timeout processing, cancellation and withdrawal race handling; UI waiting/offer countdown (display only; server authoritative), next-in-queue notifications.

**Gate:** A and B queue, seat opens, only A has active exclusive offer; expiration/decline sends to B; A not automatically added; concurrent acceptance cannot overfill; expired offer refused by DB; cron tests with controlled clock.

## Phase 09 — Private match chat

**Goal:** Real-time text chat exclusively for accepted players/organizer.

**Tasks:** Messages schema/RLS, message RPC, realtime subscription with authenticated channel filter and authorization, fetch pagination, read/send loading/error, moderation/report, clean teardown on signout/leave/rejection, keyboard and scrolling. No PII or HTML injection.

**Gate:** Accepted A and organizer exchange messages live in separate browsers; pending B, removed C and anon cannot fetch/insert/subscribe to private content. Long messages and reconnect tested; dark/light UI polished.

## Phase 10 — Teams, invitations and management

**Goal:** Players can create teams and captains can manage members.

**Tasks:** Teams, memberships, invitations and ownership constraints; create team, list teams, team profile, invite/accept/remove, captain transfer if implemented; no forced single-team restriction. RLS and member/captain RPC checks.

**Gate:** Captain creates; member accepts invite; unauthorized member cannot change captain/modify team; one user can join two teams; team screens work Web and locales.

## Phase 11 — Team challenge lifecycle

**Goal:** Teams can challenge each other and agree a match.

**Tasks:** Challenges/window/request migrations, create/open/list/filter/request/approve/decline; one opponent per challenge; agreed exact kickoff and field required before linked match creation, no double creation, ownership/authorization; compelling VS cards and challenge details.

**Gate:** Home captain posts date windows; away captain requests; home captain accepts; exact slot agreed; linked match created once; other challenger prevented from winning same challenge even under concurrent requests.

## Phase 12 — Notifications center and real email delivery

**Goal:** In-app notifications for important state changes and email routed by preference.

**Tasks:** Notifications tables and delivery outbox, Edge Function mail provider, templating EN/EL, inbox unread/read UI, deep links, optional discovery matching based on explicit city/format/time preferences, rate limiting/retries/dedupe; separate transactional from promotional preference controls.

**Gate:** End-to-end trigger from join approval/challenge/offer visible in target's inbox; real dev email delivered; another user cannot read messages; opt-out suppresses discovery notices; duplicate worker invocation does not create duplicate deliveries.

## Phase 13 — Scheduled 24h/2h reminders

**Goal:** Trustworthy timed reminders before matches.

**Tasks:** Reminder table; scheduler via Supabase Cron/Edge Functions; generation on accepted participant and match creation; cancel/recreate on time change; cancel on leave/match cancellation; after match start no pending reminder; secure job token storage. UTC timestamps with Cyprus local rendered time; retry logic with idempotent delivery.

**Gate:** Fake clock integration test hits T-24h and T-2h, exactly once each; DST boundary, reschedule, cancellation, new participant after T-24h, reruns and network retry. Real scheduled smoke on staging documented.

## Phase 14 — Polish and accessibility/performance

**Goal:** Convert "functional" to genuinely impressive production-caliber product.

**Tasks:** Audit every screen vs Design System: hero, whitespace, type, CTA hierarchy, tabs, empty/error/loading/disabled states, motion/reduced-motion, no overflow, keyboard and focus, usable on 320px. Optimize query caching, image loading, virtualize long feeds, prevent excessive realtime listeners, add basic error monitoring with scrubbed PII. Translation proofread and missing-key check.

**Gate:** Full dark/light + EN/EL screenshot matrix; Lighthouse/Web performance/accessibility review (report actual measured values, no invented score); no P0/P1 UI issues, design review checklists signed.

## Phase 15 — Security/integration regression and full Web E2E

**Goal:** Security and all workflows validated together.

**Tasks:** Run full matrix in `05_QA_TEST_MATRIX.md` with isolated authenticated identities, direct REST/RPC abuse tests, concurrency stress, RLS evaluation, provider failure and offline/retry handling, token/PII review, account deletion/privacy flows; cross-browser Web test. Correct defects now.

**Gate:** All critical flows green, no RLS escape, no oversubscription, private chat genuinely private, reminders deduped, no secrets in build, Web deep links work, all bugs triaged with reproducible evidence.

## Phase 16 — Production-like Web preview deployment

**Goal:** Secure hosted Web preview for stakeholders.

**Tasks:** Setup staging Supabase + mail, deploy `npx expo export --platform web` output to hosting supporting Expo Router mode, add auth redirect allowlist and SPA fallback, HTTPS, environment variables, domain when available, secure headers, manual smoke script, audit analytics opt-in, privacy/terms placeholder marked as pending legal review until approved.

**Gate:** Shareable staging URL loads in private browsing, verified signup/login and real email work, match/chat/challenge flows work across two devices/browsers, refresh/deep links work, no console failures or leaked keys. Provide exact tested URL only after actually deployed.

## Phase 17 — Android/iOS readiness and native smoke

**Goal:** Same codebase builds and behaves correctly on native devices.

**Tasks:** Check all platform-specific dependencies, safe areas, deep links, OTP session, keyboard and fonts; Expo EAS development builds; icon/splash placeholder policy until final logo is delivered. Native push tokens with Expo Notifications only if configured; native email/in-app still fallback. Test Android+iOS when devices/build credentials available.

**Gate:** Real build artifacts install, critical flows smoke on Android/iOS, native logs clear, permissions sensible. If no Mac/iOS environment or credentials, mark iOS as **not tested**, not PASS. Store publication is separate future task.

## Phase 18 — Beta sign-off & backlog

**Goal:** Deliver documentation and operational readiness.

**Tasks:** README setup; environment checklist, schema diagram, admin/support handling, monitoring, email delivery/rate-limit policy, backup/restore expectations, manual venue-booking limitations, beta incident playbook, known issues and Phase 2 backlog (real venue-provider booking/payment, ratings, recurrent matches, native push refinements, web push only if intentionally adopted).

**Gate:** Full acceptance walkthrough from sign-up to match to team challenge; documented limitations and support workflows; no unreported blocker. Report Web vs Native readiness separately.

## Phase dependency map

```text
00 Scaffold
  -> 01 Design/i18n -> 02 Shell
  -> 03 Auth -> 04 Profile -> 05 Discovery -> 06 Create Match
  -> 07 Join Engine -> 08 Waitlist -> 09 Private Chat
  -> 10 Teams -> 11 Challenges
  -> 12 Notifications -> 13 Reminders
  -> 14 Polish -> 15 Security/E2E -> 16 Hosted Web
  -> 17 Native smoke -> 18 Beta sign-off
```

## Common operator prompts

**After a PASS**

```text
Review the previous phase's implementation log and test evidence. Implement
Phase <next> only. Preserve working Web routes, the approved Electric Lime
brand, English/Greek localization, and persistent dark/light switch.
Do not regress any previous acceptance criteria. Stop after its gate.
```

**When a gate FAILS**

```text
Do not advance. Diagnose Phase <current> failures using recorded commands and
browser/SQL test evidence. Fix root causes, add a regression test, rerun all
required gates, update IMPLEMENTATION_LOG.md, and stop.
```

**When an external credential is missing**

```text
Do not fake success or hardcode secrets. Complete locally testable work, use
a clearly identified dev-only mail catcher/mock where appropriate, mark real
integration BLOCKED, list the exact owner-provided setting needed, and stop.
```

## Final platform quality contract

A Web PASS is **only** when an actual browser was opened and the route works, beyond a successful bundle. A production PASS requires a real hosted URL tested against a real staging/production backend. iOS/Android PASS requires separate device/build proof. This plan is a specification until implemented; it is not evidence any feature already runs.
