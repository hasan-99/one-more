# STORE_AUDIT.md — Phase 1 (audit only, no code changed)

Date: 2026-11-16 · App: ONE MORE · Expo SDK 58.0.25 · React Native 0.88.1 · React 19.3.0 · Supabase backend
Basis: repository read (package.json, app.json, eas.json, all plugins, src/), the earlier audit `docs/reports/store-compliance-2026-11.md`, `expo prebuild` results recorded in `docs/IMPLEMENTATION_LOG.md`, and commands run today.

Legend: ✅ PASS · ❌ FAIL · ⚠️ NEEDS ME (owner / console / device)

## Commands run today

| Command | Result |
| --- | --- |
| `npm audit --omit=dev` | ✅ 0 vulnerabilities |
| `npm outdated` | Only patch/major pins chosen by SDK 58 (react 19.3.0→.1, async-storage 2.2→3.1, gesture-handler 3.3→3.5, svg, worklets patch, eslint 9→10, typescript 6→7). None blocking |
| `npx expo-doctor` | 17/20 pass. 3 could not complete: the sandbox cannot reach `exp.host` / React Native Directory / Expo API (network policy). ⚠️ Re-run on your machine |
| `npx expo install --check` | Could not complete, same network block. ⚠️ Re-run on your machine |
| `expo prebuild` (Android, earlier phase) | package `com.anonymous.onemore`, minSdk 24, **targetSdk 36** (aapt) |

## A. Build toolchain

| Item | Status | Detail |
| --- | --- | --- |
| Expo SDK current | ✅ | SDK 58 (newer than the 54–55 the checklist names). New Architecture is the only mode in RN 0.88 |
| targetSdk 36 / compileSdk ≥ 36 | ✅ | aapt showed target 36; RN 0.88 default compileSdk 37 |
| 16 KB page size | ⚠️ | RN 0.88, Reanimated 4.7, worklets 0.13, screens 4.30, svg 15.16, webview 14, gesture-handler 3.3 are all current releases that ship 16 KB-aligned libs (not verified on a built AAB). Verify after the first release build (`zipalign -c -P 16`) |
| Android edge-to-edge | ⚠️ | `react-native-safe-area-context` is used; never checked on an Android 15/16 device |
| iOS built with Xcode 26 | ⚠️ | `eas.json` does not pin an `image`; EAS default is the latest image. Pin `"image": "latest"` on production to be explicit |
| `eas.json` production profile | ✅ | `autoIncrement`, AAB, channel. ❌ minor: `appVersionSource` is `local` (checklist prefers `remote`) |
| version / buildNumber / versionCode | ✅ | 1.0.0 / 1 / 1 |
| bundle id / package final | ❌ | **Both are still `com.anonymous.onemore` (Expo placeholder). Cannot be changed after the first upload** |
| No dev-only code in prod | ✅ | No `expo-dev-client` dependency, no localhost URLs (the Supabase client even refuses non-HTTPS) |
| No secrets in bundle | ✅ | grep for `sk_live`, `AIza`, `PRIVATE KEY`, `service_role` finds nothing; `.env.local` holds only publishable values |

## B. Crashes & completeness

| Item | Status | Detail |
| --- | --- | --- |
| Release build on real iOS + Android device, clean install | ⚠️ | Never done. Only web (Playwright) and an Android debug APK in an earlier phase |
| Crash scenarios (offline, denied, background, iPad) | ⚠️ | Offline/slow/error states exist on every async screen and are tested on web. Not tested on devices. `supportsTablet` is **not set** in `app.json` (Expo default = true for iOS) while the UI is a portrait phone UI: ❌ decide `false` or test iPad |
| No placeholders / dead links | ✅ | Privacy, Terms, Support, Delete-account, Licenses pages are real. ⚠️ they need the real support email/publisher env vars |
| Error boundary + friendly errors | ✅ | `AppErrorBoundary`, error + retry on loading failures (12 s timeout on profile gate) |
| Backend online during review | ⚠️ | Owner: apply the 4+ unapplied migrations, keep Supabase project awake (free tier pauses) |
| Splash + icon final | ❌ | Icon is now opaque 1024. Splash uses `one-more-logo.png` on black for light and dark. Logo is still "placeholder" per AGENTS.md rule 8; owner must supply final art. Android adaptive icon is set |
| Login not forced to see anything | ✅ | Explore, Teams, Challenges and game details work signed-out |

## C. Accounts & login

| Item | Status | Detail |
| --- | --- | --- |
| In-app account deletion | ✅ code / ⚠️ not applied | `delete_my_account()` + Settings flow written. **Migration `20261118090000` is not applied to the live DB**, so deletion does nothing in production until applied |
| Web deletion URL (Play) | ✅ | `/delete-account` route (needs production domain) |
| Sign in with Apple needed? | ✅ N/A | Email + password only, no third-party login |
| Demo/review account | ⚠️ | Owner must create on production backend; notes drafted in `docs/store/REVIEW_NOTES.md` |
| Password reset / logout | ✅ | One-time-code reset; logout clears the session (`signOut`) |

## D. Permissions & privacy

| Item | Status | Detail |
| --- | --- | --- |
| Permission list | ✅ | Manifest has no location, camera, mic, contacts, notifications. Blocked: READ_MEDIA_*, READ/WRITE_EXTERNAL_STORAGE, SYSTEM_ALERT_WINDOW |
| iOS usage strings | ✅ | Only Photos (save player card) has a specific string; Face ID removed |
| In-context permission requests | ✅ | Nothing requested at launch |
| Approximate location / photo picker / contact picker | ✅ N/A | No location, contacts; saving card uses write-only media-library path |
| ATT / IDFA | ✅ N/A | No tracking SDKs. `NSPrivacyTracking: false` |
| Privacy manifest | ✅ | `ios.privacyManifests` with UserDefaults CA92.1 and others declared |
| Privacy policy page + in-app links | ✅ | `/privacy`, linked in Settings and auth page. ⚠️ lawyer review; Cyprus Commissioner and GDPR rights included |
| AI/LLM data | ✅ N/A | No AI provider calls |
| Data inventory / labels | ✅ | `docs/store/DATA_INVENTORY.md`, `PRIVACY_LABELS.md`. ⚠️ owner enters them in consoles |

## E. User-generated content

| Item | Status | Detail |
| --- | --- | --- |
| Terms with zero tolerance | ✅ | `/terms`, accepted at sign-up |
| Report content/user | ✅ | Chat message report exists |
| Block user | ✅ code / ⚠️ not applied | `block_user` etc. in migration `20261118091000`, not applied to DB |
| Moderation contact / removal | ✅ | Organizer can remove players; support email on `/support` (⚠️ needs real email) |
| Not targeting children | ✅ | 16+ |

## F. Payments

✅ N/A. No purchases, subscriptions, or external payment links. Prices on games are informational.

## G. Minimum functionality & design

| Item | Status | Detail |
| --- | --- | --- |
| Not just a WebView | ✅ | Native screens. WebView only used for bundled landing/auth pitch HTML (no remote URLs) |
| Tap targets ≥ 44 pt | ⚠️ | Language switcher/bell are 40 px (below 44). Rest not measured on device |
| Dark mode | ✅ | `userInterfaceStyle: automatic`, in-app switch |
| Dynamic font size (to 1.3×) | ❌ | No `maxFontSizeMultiplier` anywhere; scaling is the default (OK), but not tested at 1.3× so layout cut-offs unverified |
| Android back / keyboard | ⚠️ | Not verified on device. `KeyboardAvoidingView` in only 4 files; check all form screens |
| No cross-platform store mentions | ✅ | none found |
| Trademarks | ⚠️ | Landing uses player-card images; confirm you own them |

## H. OTA updates

| Item | Status | Detail |
| --- | --- | --- |
| `expo-updates` JS/asset only | ✅ | |
| runtimeVersion policy | ✅ | `sdkVersion`. ⚠️ risk: a JS update that needs a new native module would crash older binaries inside the same SDK; consider `appVersion` or `fingerprint` policy |
| No hidden review mode | ✅ | |

## I. Notifications

⚠️ In-app notification list + bell only (no push). No `expo-notifications`, no `POST_NOTIFICATIONS`. If push is added later it needs the checks in this section.

## J. Store listing assets

| Item | Status | Detail |
| --- | --- | --- |
| Name/subtitle/descriptions drafted | ✅ | `docs/store/STORE_LISTING.md` |
| Real screenshots | ⚠️ | Must come from a real device/simulator with real data; `docs/screenshots` are mocked and must NOT be uploaded |
| Feature graphic 1024×500 | ⚠️ | Not created |
| Support / privacy / deletion URLs | ⚠️ | Pages exist; need production domain |
| Review notes | ✅ | `docs/store/REVIEW_NOTES.md` |

## K. Fonts

| Item | Status | Detail |
| --- | --- | --- |
| Inventory + licences | ✅ | Barlow, Barlow Condensed, Inter (SIL OFL 1.1); OFL files in repo; `/licenses` screen lists them |
| Loaded via `expo-font` | ❌ | Fonts are loaded in code, not via the `expo-font` config plugin (no `expo-font` plugin entry in app.json). Works, but checklist prefers the plugin to avoid a flash of the wrong font |
| fontFamily vs PostScript names iOS/Android | ⚠️ | Not verified on device |
| Bold via separate files | ✅ | Separate Barlow files per weight |
| Unused files | ✅ | All 8 referenced |
| RTL/Arabic | ✅ N/A | Product is English + Greek only (owner decision) |
| Greek glyphs | ⚠️ | Confirm the subsetted fonts include Greek on device |

## L. Libraries

| Item | Status | Detail |
| --- | --- | --- |
| expo-doctor / install --check | ⚠️ | Blocked by sandbox network; run locally |
| npm audit | ✅ | 0 |
| Unused deps (depcheck) | ⚠️ | Not run (needs registry/network). Candidates to check: `expo-sharing`, `expo-media-library`, `react-native-webview` (all used) |
| Privacy-impacting SDKs | ✅ | None (no Firebase, Facebook, Sentry, etc.) |
| Licences | ✅ | 0 GPL/AGPL problem; list in `THIRD_PARTY_LICENSES.md` |
| Lockfile | ✅ | `package-lock.json` committed, EAS uses npm |
| Background modes | ✅ | none declared |
| Duplicate react | ⚠️ | `npm ls react` not re-run today |

## M. Security

| Item | Status | Detail |
| --- | --- | --- |
| Tokens in SecureStore | ❌ | **Auth session is stored in `AsyncStorage`** (`native-auth-session-storage.ts`; SecureStore is only a read-only legacy source that is migrated away). Checklist requires Keychain/Keystore. Needs a chunked SecureStore adapter or an AES-encrypted AsyncStorage with the key in SecureStore |
| Logs | ✅ | Only one `console.error` (generic string) |
| Screen capture | ✅ N/A | no payment/ID screens |
| Logout clears caches | ⚠️ | Session cleared; request cache (`request-cache.ts`) and AsyncStorage key `one-more.profile-complete.<uid>` should be explicitly cleared on logout/deletion (check) |
| HTTPS only | ✅ | Supabase client rejects non-HTTPS; no cleartext |
| RLS on all tables | ⚠️ | Hardened in earlier audit; policies not re-verified against live DB |
| Rate limiting | ✅ code / ⚠️ not applied | migration `20261117090000` not applied |
| Deep links | ✅ | custom scheme only; no privileged route without auth |
| WebView | ✅ | bundled HTML only |
| Android hardening | ⚠️ | `allowBackup=false` ✅. R8/shrink: not enabled (needs `expo-build-properties`, not installed): ❌ |
| Hermes | ✅ | default in RN 0.88 |
| Play App Signing / keystore | ⚠️ | Owner |

## N. Accessibility, localisation, UX

| Item | Status | Detail |
| --- | --- | --- |
| Labels | ✅ | 152 accessibility label uses; tested on web |
| Contrast AA | ⚠️ | Checked in the Phase 14 web matrix, not on device |
| VoiceOver / TalkBack | ⚠️ | Not tested on device |
| Greek + English | ✅ | lazy Greek |
| Small phones / notch | ⚠️ | Web viewports only |
| IPv6-only | ✅ | no hardcoded IPs |
| Reviewer outside Cyprus | ⚠️ | Review notes explain; demo data required |

## O. Performance & size

| Item | Status | Detail |
| --- | --- | --- |
| Web numbers before/after | ✅ | `docs/reports/performance-2026-11.md` |
| Native cold start, AAB/IPA size | ⚠️ | Never measured (no release build) |
| `expo-image` | ❌ | Not installed; RN `Image` used |
| Lists use FlatList/FlashList | ❌ | Zero FlatList/FlashList; 15 files use `ScrollView` and `.map()` (103 files hit `.map`). Fine for short lists, risky for Explore/Chat/Notifications growing |
| Timers/listeners cleaned | ⚠️ | Bell polling cleans up; not exhaustively audited for leaks |

## P. Legal & misc

✅ Terms, Privacy, Support in app; GDPR sections present; no gambling; no in-app rating prompts. ⚠️ Lawyer review; GDPR consent: no analytics, so no consent banner needed.

## Q. Privacy policy

✅ Written from the code (`src/legal/legal-content.ts`, EN + EL, `/privacy`). Missing vs the checklist: separate `legal/*.md` + hostable HTML files (the app route is the single source); `[CONFIRM: …]` markers for controller name/address are via env vars (`EXPO_PUBLIC_DEVELOPER_NAME/ADDRESS`) that are still empty. 3-column Code | Policy | Store-forms table: partially in `DATA_INVENTORY.md`.

## R. UI performance & premium polish

| Item | Status | Detail |
| --- | --- | --- |
| Measured numbers | ✅ web / ❌ native | Web done; no release build on device |
| React Compiler | ❌ | Not enabled (`experiments.reactCompiler` absent). Health check not run |
| TanStack Query / SWR | ❌ | Custom `request-cache.ts` (TTL + dedupe) instead. Works; no persisted cache, no optimistic updates |
| Optimistic updates | ❌ | Join/send are server-confirmed (by design: join needs approval) |
| Skeletons | ⚠️ | Football loader added; screens use text/spinner loading cards, not layout-matched skeletons |
| Reanimated 4 / UI-thread animation | ❌ | Reanimated installed but `Animated` (RN) used; 2 spots with `useNativeDriver: false` (demo-player-movement.tsx:158, teams/create.tsx:749) |
| Gesture handler | ⚠️ | installed, not used for sheets/swipes |
| Haptics | ❌ | `expo-haptics` not installed |
| Bottom sheets / Liquid Glass / blur | ❌ | none (plain `Modal`) |
| Reduce Motion | ✅ | BallLoader/bell respect it |
| Barrel imports | ✅ | direct imports |
| TS strict | ✅ | |
| Native 60/120 fps measurements | ⚠️ | none |

## Summary

| Section | Pass | Fail | Needs me |
| --- | --- | --- | --- |
| A Toolchain | 6 | 2 (bundle id, appVersionSource) | 3 |
| B Crashes | 4 | 2 (supportsTablet, final splash/icon art) | 3 |
| C Accounts | 4 | 0 | 2 (apply migration, demo account) |
| D Permissions/privacy | 8 | 0 | 2 |
| E UGC | 4 | 0 | 1 (apply migration) |
| F Payments | N/A | 0 | 0 |
| G Design | 4 | 1 (font scale) | 3 |
| H OTA | 2 | 0 | 1 (runtimeVersion policy) |
| K Fonts | 4 | 1 (plugin) | 2 |
| L Libraries | 6 | 0 | 3 |
| M Security | 6 | 2 (token storage, R8) | 4 |
| O/R Perf & polish | 4 | 8 | 4 |

## Manual tasks for you (owner)

1. Choose final bundle id / package (e.g. `com.<yourname>.onemore`) — cannot change later.
2. Apply the 4 pending migrations to the Supabase project (rate limits, delete account, block users, plus earlier ones).
3. Set `EXPO_PUBLIC_SUPPORT_EMAIL`, `EXPO_PUBLIC_DEVELOPER_NAME`, `EXPO_PUBLIC_DEVELOPER_ADDRESS`, production Supabase vars in EAS.
4. Host the web export on an HTTPS domain; give me the URLs for the stores.
5. Create the demo reviewer account on production.
6. Apple: membership, agreements, age rating, App Privacy labels, DSA trader status, TestFlight. Google: identity verification, Data safety, IARC, account-deletion URL, **12 testers × 14 days closed test if personal account**.
7. Real-device release test (iPhone + mid/low Android), real screenshots, feature graphic.
8. Run `npx expo-doctor` and `npx expo install --check` locally (blocked here).
9. Lawyer review of privacy/terms. Enable MFA on Expo/Supabase/GitHub accounts.

## Commands (after fixes)

```bash
npx expo-doctor && npx expo install --check
eas build --platform all --profile production
eas submit --platform ios --latest
eas submit --platform android --latest
```
