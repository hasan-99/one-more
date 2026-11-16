# FIX_PLAN.md — proposed fixes (nothing started; waiting for your approval)

Owner = **ME** (console / manual / decision), **CODE** = I do it. Effort S/M/L. Section = STORE_AUDIT.md letter.

## P0 — Blockers

| ID | Section | Problem | Fix | Files | Verify | Effort | Depends | Who |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P0-1 | A | Bundle id/package is the placeholder `com.anonymous.onemore` | Pick final id, set `ios.bundleIdentifier` + `android.package` | app.json | `expo config`, prebuild shows new values | S | your decision | ME (choose) + CODE |
| P0-2 | C/E/M | Account deletion, block users, rate limits exist only as migration files, not applied | Apply the 4 migrations to production Supabase and run a delete/block test with a throwaway account | supabase/migrations/20261117*, 20261118* | RPCs callable; deletion removes auth user | M | none | ME (apply) + CODE (test script) |
| P0-3 | Q/P/B | Privacy/Terms/Support show empty contact + publisher | Set the 3 `EXPO_PUBLIC_*` vars in EAS and on hosting | env / EAS | `/support` shows email | S | none | ME |
| P0-4 | B | No release build ever run on real devices | `eas build --profile preview-device` iOS + Android, test clean install, offline, deny permissions, back button, small phone, iPad decision | — | checklist in REVIEW_NOTES | M | P0-1 | ME (test) |
| P0-5 | C | No demo reviewer account | Create on production, add credentials to review notes | docs/store/REVIEW_NOTES.md | login works | S | P0-2 | ME |
| P0-6 | M | Auth session tokens stored in `AsyncStorage`, not Keychain/Keystore | Replace with encrypted storage: random AES key in SecureStore, session blob in AsyncStorage encrypted (SecureStore alone has a 2 KB limit); migrate existing sessions; clear on logout | src/lib/native-auth-session-storage.ts, src/lib/auth-session-storage.ts + tests | unit tests (migration + round-trip), web unaffected, device login after update | M | none | CODE |

## P1 — High risk

| ID | Section | Problem | Fix | Files | Verify | Effort | Depends | Who |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P1-1 | B | `supportsTablet` unset → iOS runs as iPad app (rejection risk for a phone-only layout) | Set `ios.supportsTablet: false` (or test iPad) | app.json | prebuild Info.plist `UIDeviceFamily` | S | none | CODE |
| P1-2 | M | Logout/deletion does not explicitly clear request cache and `profile-complete` key | Clear both in sign-out and delete flows | src/lib/request-cache.ts, (app)/_layout.tsx, settings.tsx | unit + e2e | S | none | CODE |
| P1-3 | M | RLS not re-verified against the live DB | Run `pg` policy test script as anon/user/organiser/stranger on staging | supabase tests | all deny cases pass | M | P0-2 | ME + CODE |
| P1-4 | A | `appVersionSource: local`; EAS image not pinned | Set `appVersionSource: remote`, production `ios.image: latest` | eas.json | `eas build:version:get` | S | EAS login | CODE |
| P1-5 | G | Tap targets 40 px (bell, language switch) < 44 pt | Raise to 44 | AppShell, preferences-switchers | e2e measures ≥44 | S | none | CODE |
| P1-6 | G | No check at font scale 1.3× | Add Playwright run with scaled text + fix clipping | e2e + screens | screenshots | M | none | CODE |
| P1-7 | H | `runtimeVersion` = sdkVersion risks OTA crash after native changes | Switch to `{ "policy": "fingerprint" }` | app.json | `eas update` shows runtime | S | none | CODE (needs your OK: OTA you already published stops reaching current Expo Go build? — I will explain first) |
| P1-8 | N/J | Real screenshots + feature graphic missing | Capture from real build with seed data | — | — | M | P0-4 | ME |
| P1-9 | L | `expo-doctor` / `install --check` / depcheck not completed (sandbox blocks network) | Run locally, send me output; I fix findings | — | clean output | S | none | ME → CODE |

## P2 — Medium

| ID | Section | Problem | Fix | Effort | Who |
| --- | --- | --- | --- | --- | --- |
| P2-1 | M | R8/resource shrinking off | Add `expo-build-properties` with `enableProguardInReleaseBuilds` + `enableShrinkResourcesInReleaseBuilds`; test release APK | S | CODE |
| P2-2 | K | Fonts not loaded via `expo-font` plugin | Add plugin entry with the 8 font files; keep runtime fallback | S | CODE |
| P2-3 | O | No FlatList for growing lists (Explore, Notifications, Chat) | Move the 3 long lists to FlatList with keyExtractor; keep web tests green | L | CODE |
| P2-4 | O | RN `Image` without cache | Add `expo-image` for player-card and logo images; web unchanged | M | CODE |
| P2-5 | R | `useNativeDriver: false` in 2 spots, RN Animated | Move to Reanimated or native driver where the property allows | M | CODE |
| P2-6 | A | 16 KB / edge-to-edge unverified | Check release AAB with `zipalign -P 16`; test insets on Android 15/16 | S | ME (device) |
| P2-7 | Q | Policy exists only as an app route | Also export static `legal/privacy-policy.md`, `terms-of-service.md`, `delete-account.html` for hosting | S | CODE |
| P2-8 | B | Final logo/splash art | Provide final assets | S | ME |

## P3 — Polish (only if you want them; they change look and feel, so I will show designs first)

| ID | Item | Effort |
| --- | --- | --- |
| P3-1 | Layout-matched skeleton loaders on Explore/Home/Teams | M |
| P3-2 | `expo-haptics` on join/send/confirm | S |
| P3-3 | React Compiler (run `react-compiler-healthcheck`, then enable) | M |
| P3-4 | Bottom sheets (gorhom) instead of `Modal`, blur header | L |
| P3-5 | TanStack Query with persisted cache + optimistic updates | L (large rewrite, risk) |
| P3-6 | Prefetch on press-in, offline banner | M |

## Suggested order

1. P0-6, P1-1, P1-2, P1-4, P1-5, P2-1, P2-2, P2-7 (all CODE, low risk, batch 1).
2. You do: P0-1 id decision, P0-2, P0-3, P1-9.
3. P1-6, P1-7, P2-3, P2-4, P2-5 (batch 2).
4. Device test round (P0-4, P2-6), then P1-8, P0-5.
5. P3 only if you ask.

Not doing without your decision: P3-4 and P3-5 (large rewrites; "do not break existing features").

## Progress — batch 1 (2026-11-16)

| ID | Status | Note |
| --- | --- | --- |
| P0-6 | ✅ code | Session encrypted with AES-256-GCM (`@noble/ciphers`); random key in SecureStore (`expo-crypto` for randomness). Old plain sessions are upgraded in place; lost key/tampering = signed out. 5 new unit tests |
| P1-1 | ✅ | `ios.supportsTablet: false`; prebuild shows `TARGETED_DEVICE_FAMILY = "1"` (iPhone only) |
| P1-2 | ✅ | `clearLocalUserData()` (request cache + profile flag) runs on sign-out and account deletion |
| P1-4 | ✅ | `appVersionSource: remote`, production iOS `image: latest`. ⚠️ You must run `eas build:version:set` once if you want to start from a specific number |
| P1-5 | ✅ | Bell and language switch are 44×44 |
| P2-1 | ✅ | `expo-build-properties`; prebuild shows `enableMinifyInReleaseBuilds=true`, `enableShrinkResourcesInReleaseBuilds=true` |
| P2-2 | ⏭ dropped | The font plugin registers fonts by file name (`Barlow-Regular`) but the code uses names like `Barlow_400Regular`; switching would mean renaming every fontFamily for no gain. Runtime loading stays |
| P2-7 | pending | static legal files |
| P0-1 | waiting | needs your bundle id |

## Progress — batch 2 (2026-11-16)

I checked each item against the code before changing anything:

| ID | Result |
| --- | --- |
| P2-3 FlatList | ⏭ not needed. Explore loads 10 games per page with a Load more button, notifications are capped at 50 rows, chat loads pages. No unbounded list exists, so converting would add risk without a measurable gain |
| P2-4 expo-image | ⏭ not needed. The app has one `<Image>`, a bundled asset, and no remote image URLs. A disk cache has nothing to cache |
| P2-5 `useNativeDriver: false` | ⏭ kept. Both uses animate a number shown as text and a progress bar width; the native driver cannot animate those properties |
| P2-7 static legal files | ✅ `npm run legal:export` writes `legal/privacy-policy(.el).md`, `terms-of-service(.el).md`, `delete-account(.el).html` from the same source as the in-app pages. Missing email/publisher show as `[CONFIRM: …]` until the env vars are set |
| P1-6 font scale 1.3× | ⚠️ open: web cannot emulate OS text size faithfully; test on a device with Settings → Display → Larger Text |
| P3-3 React Compiler | ⚠️ open: the healthcheck command was blocked in this environment; run `npx react-compiler-healthcheck@latest` locally |
| P1-7 runtimeVersion → fingerprint | ⚠️ open: waiting for your OK (changes which updates reach which builds) |

## P0-1 done (2026-11-16)
Bundle id and Android package are now `com.onemore.app` (chosen by the owner). Register exactly this id in App Store Connect and Play Console; it cannot be changed after the first upload.
