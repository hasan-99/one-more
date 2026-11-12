# ONE MORE implementation log

## 2026-11-12 — Phase 00: Repo bootstrap and tooling

- **Status:** PASS
- **Summary:** Created the Expo SDK 58 / Expo Router TypeScript scaffold, copied the approved build pack, added a branded landing page with a clearly labeled demo card, added typed English and Greek landing copy, local font assets with system fallbacks, lint/type/test/Playwright/export commands, CI, environment example, and responsive browser setup.
- **Decisions:** Selected Expo SDK 58 and Expo Router from the current official Expo docs. Vitest is the unit runner; Playwright runs Chromium at 375×812 and 1440×900. The match shown on the landing page is demo content. Supabase is not connected during this phase.
- **Commands:**
  - `npm run lint` — PASS, exit 0
  - `npm run typecheck` — PASS, exit 0
  - `npm run test:run` — PASS, 1 file / 2 tests, exit 0
  - `npm run test:e2e` — PASS, desktop + mobile, 2 tests, exit 0
  - `npm run format:check` — PASS, exit 0
  - `npx expo-doctor` — PASS, 20/20 checks, exit 0
  - `npm run build:web` — PASS, web export created `dist`, exit 0
  - `npm run dev:web -- --port 8090 --clear` — PASS, started by Playwright `webServer`; browser loaded the app at `http://127.0.0.1:8090`
- **Browser verification:** Chromium desktop 1440×900 and mobile 375×812. Checked landing text, primary CTA, demo label, no horizontal page overflow, and responsive hero placement. Screenshots: `docs/screenshots/phase-00/desktop-chromium.png`, `docs/screenshots/phase-00/mobile-chromium.png`.
- **Security verification:** No Supabase client, schema, or data access was added. `.env.example` contains blank publishable-variable placeholders only; no credentials are committed.
- **Issues / deviations:** Expo's `npx expo lint` auto-setup reported a version-detection error after installing ESLint 9, so `npm run lint` uses ESLint directly and passes. npm reported 8 moderate advisories during dependency installation; they were not remediated in this phase.
- **Next:** Phase 01 — theme, brand, and i18n foundations. Not started.

### 2026-11-12 — Phase 01: Theme, brand, and i18n foundations

- **Status:** PASS
- **Summary:** Added semantic dark/light Electric Lime tokens and status colors; a cross-platform preference provider persists System/Dark/Light and EN/EL using AsyncStorage, resolves system appearance, localizes the document language, and reports persistence errors. The landing screen and placeholder BrandMark now follow the selected theme and locale. Added Cyprus-localized date/number formatting, a responsive navigation primitive, and a development-only component gallery for buttons, fields, badges, cards, dialog, and typography. Greek display copy uses Inter to preserve glyph coverage. Keyboard focus styles remain visible.
- **Dependencies:** Added Expo SDK 58-compatible `@react-native-async-storage/async-storage`. No Supabase client or credentials added.
- **Commands:**
  - `npm run lint` — PASS, exit 0
  - `npm run typecheck` — PASS, exit 0
  - `npm run test:run` — PASS, 2 files / 5 tests, exit 0 (includes WCAG AA contrast pairs and Cyprus time formatting)
  - `npm run test:e2e` — PASS, 2 landing tests across desktop/mobile, exit 0
  - `npm run format:check` — PASS, exit 0
  - `npx expo-doctor` — PASS, 20/20 checks, exit 0
  - `npm run build:web` — PASS, Expo Web export created `dist`, exit 0
  - `npm run dev:web -- --port 8092 --clear` — PASS, server loaded on `http://127.0.0.1:8092`; gallery inspected in Chromium
- **Browser verification:** Visited `/design-review`; confirmed all gallery controls and Greek copy render. Changed to Light + Greek, refreshed, and confirmed `html lang="el"`, `color-scheme: light`, and stored values `one-more.theme=light`, `one-more.locale=el`. System mode followed emulated light/dark OS settings. Keyboard Tab reached a button with `:focus-visible` and a solid outline. No horizontal overflow at 375, 768, and 1440px in Dark/EN and Light/EL. Browser console had no errors during the final single-server inspection.
- **Screenshots:** `docs/screenshots/phase-01/{dark-en,light-el}-{375,768,1440}.png`.
- **Security verification:** No backend connection or secrets introduced. Preference values only store theme and locale locally.
- **Issues / deviations:** None for the phase gate. Starting two Expo dev servers concurrently during inspection caused a temporary Metro cache error; after stopping both, all checks and the final browser inspection passed with one server.
- **Next:** Phase 02 — shell, landing, routes and polished design skeleton. Not started; waiting for the user's next instruction.

### 2026-11-12 — Phase 02: Shell, landing, routes and design skeleton

- **Status:** PASS
- **Summary:** Added the responsive guest app shell with desktop sidebar, tablet navigation and mobile bottom navigation; wired the landing CTA and shell links; added Home, Explore, Create, Teams, Profile, Notifications, Settings, Match, Team, Challenge and Chat route skeletons with honest empty states. Added English and Greek copy for all new visible text and retained the development-only design review link.
- **Decisions:** Kept every route as a localized preview/empty state because backend and feature phases are not implemented yet. Disabled Expo Router async routes in `app.json` after repeated Playwright navigations exposed Metro `unknown module` errors; route navigation and production web checks then passed. E2E uses the minified web bundle to avoid Metro HMR disconnects during repeated screenshot navigation.
- **Commands:**
  - `npm run lint` — PASS, exit 0
  - `npm run typecheck` — PASS, exit 0
  - `npm run test:run` — PASS, 2 files / 5 tests, exit 0
  - `npm run test:e2e -- --workers=1 --project=desktop-chromium` — PASS, 4 tests, exit 0 (includes route/theme screenshot matrix)
  - `npm run test:e2e -- --workers=1 --project=mobile-chromium` — PASS, 3 tests passed / 1 screenshot-matrix test skipped by design, exit 0
  - `npm run format:check` — PASS, exit 0
  - `npx expo-doctor` — PASS, 20/20 checks, exit 0
  - `npm run build:web` — PASS, Expo server-rendered web export created `dist`, exit 0
  - `npm run dev:web -- --port 8090 --clear` — PASS, app started and was opened in Chromium for direct navigation verification
- **Browser verification:** Tested landing CTA to Explore and shell navigation. Playwright checked every Phase 02 route at 375×812 and 1440×900 in Dark and Light, with no horizontal overflow. Greek localization was checked on desktop and mobile. Screenshots: `docs/screenshots/phase-02/` (44 images).
- **Security verification:** No database, Supabase client, credentials, or protected data access was added. Preview-only content is identified as a guest preview or empty state.
- **Issues / deviations:** The first browser run found a React Native Web `Link asChild` array-style incompatibility and an Expo dev-bundler cache issue. Flattened link styles, waited for preference hydration before interactions, and ran final E2E against a minified web bundle. No known blockers remain.
- **Next:** Phase 03 — Supabase foundation and reproducible schema. Not started; waiting for the user's next instruction.

## Follow-up product requirement — Open positions on a pitch map (2026-11-12)

- Organizer selects needed player positions by adding one marker per player on a pitch map during match creation/editing.
- Match cards and details reuse the map to show the positions still open, with an accessible text/count alternative.
- Markers are vacancy annotations, not extra capacity or automatic join approvals. Position assignment and slot updates remain organizer-controlled and capacity-safe.
- Recorded in the PRD, design system, architecture, Phase 05/06 tasks and QA matrix. **Not implemented in Phase 01.**
