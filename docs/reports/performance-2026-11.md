# Performance and navigation review — November 2026

Method: `scripts/perf/measure.mjs` loads each page in headless Chromium as a phone (393x852), CPU slowed 4x, network 1.6 Mbps / 150 ms, median of 3 runs, served by `expo serve` (no compression, no caching) with Supabase mocked. Numbers show the app shell and bundle cost, **not** real Supabase latency or the production host. Raw data: `perf-baseline.json` (before) and `perf-after.json` (after). Before = `main` at `cb29028`.

## Results (before -> after)

| Page        | Transfer KB  | Images KB   | Fonts KB    | FCP ms       | LCP ms       | CLS          | INP ms     | Load ms        | API calls (duplicates) |
| ----------- | ------------ | ----------- | ----------- | ------------ | ------------ | ------------ | ---------- | -------------- | ---------------------- |
| Landing     | 4606 -> 2243 | 1837 -> 96  | 772 -> 171  | n/a          | n/a          | 0 -> 0       | 56 -> 64   | 14373 -> 11270 | 0                      |
| Sign in     | 3760 -> 2030 | 1837 -> 96  | 0           | n/a          | n/a          | 0 -> 0       | 376 -> 448 | 10319 -> 10263 | 0                      |
| Home        | 5096 -> 2433 | 1837 -> 96  | 1299 -> 365 | 836 -> 840   | 2044 -> 1936 | 0 -> 0       | 40 -> 32   | 16928 -> 12272 | 1                      |
| Explore     | 5110 -> 2445 | 1837 -> 96  | 1299 -> 365 | 820 -> 828   | 2016 -> 2020 | 0.01 -> 0.01 | 40 -> 48   | 16865 -> 12377 | 3                      |
| Teams       | 5091 -> 2424 | 1837 -> 96  | 1299 -> 365 | 756 -> 788   | 2012 -> 1792 | 0 -> 0       | 24 -> 24   | 16778 -> 12291 | 4                      |
| Profile     | 5302 -> 2632 | 2056 -> 315 | 1299 -> 365 | 792 -> 792   | 2028 -> 1812 | 0 -> 0       | 40 -> 48   | 16718 -> 12201 | 7                      |
| Create game | 5123 -> 2450 | 1837 -> 96  | 1299 -> 365 | 2028 -> 1832 | 2028 -> 1832 | 0 -> 0       | 32 -> 32   | 16881 -> 12376 | 8 -> 6 (2 -> 0)        |

- TTFB is 15-60 ms everywhere (local server); it is not a bottleneck here and depends on the production host.
- "n/a": the browser did not report a paint entry for the landing and sign-in pages in this harness (the first paint happens before the observer sees it); their load time and size are valid.
- Total site folder: 6.0 MB -> 3.4 MB. Page weight fell about 52%; full load on throttled 4G fell about 27% (16.8 s -> 12.3 s). First paint of signed-in pages did not change: it is dominated by the 1.9 MB JavaScript bundle, which was not reduced.

## Findings and what was done (items 1-27)

| #   | Finding                                                                        | Action                                                                                                                                                                        | Result                              |
| --- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 1   | Logo PNG 940 KB (1024 px) shown at 42-60 px; favicon the same file             | In-app logo `one-more-logo-256.png` (74 KB); favicon 24 KB. The 1024 px original stays for the app icon and splash                                                            | Images -1.7 MB per page             |
| 2   | Eight fonts, 1.4 MB, all blocking first render                                 | Subset to Latin + Greek + punctuation and needed OpenType features (`pyftsubset`), 375 KB total                                                                               | Fonts 1299 -> 365 KB                |
| 3   | Same reference data (cities, areas) fetched on every screen                    | `cachedRequest` (in-flight dedupe + 10 min TTL for cities/areas; failures never cached)                                                                                       | Create game: 2 duplicate calls -> 0 |
| 4   | Team directory fetched by three screens                                        | Shares an in-flight request, no persistent cache (no stale data)                                                                                                              | No duplicate concurrent calls       |
| 5   | Native-only landing HTML (31 KB) and WebView wrapper shipped in the web bundle | `ReferenceLandingNative.web.tsx` stub                                                                                                                                         | Removed from web bundle             |
| 6   | Two unused components (`MatchPitchMap`, `MatchPositionPicker`)                 | Deleted                                                                                                                                                                       | Less code                           |
| 7   | No skip link, no `main` landmark                                               | "Skip to content" link (EN/GL), `main` role on the content area                                                                                                               | Keyboard users skip the navigation  |
| 8   | Route chunks loaded only on first click                                        | `prefetch` on the five main navigation links                                                                                                                                  | Faster first navigation             |
| 9   | Database indexes                                                               | Reviewed 49 indexes: all common filters/sorts and foreign keys are covered. No N+1 found: screens call one RPC per list. No change needed                                     | OK                                  |
| 10  | `select('*')` on profile and match screens                                     | Left as is: the rows are small and typed; narrowing columns would risk breaking screens for little gain                                                                       | Recommendation                      |
| 11  | Route code splitting                                                           | Already on (`asyncRoutes` for web, 31 JS files). Per-route chunks are 12-35 KB; the cost is the shared 1.1 MB entry + 0.8 MB common bundle                                    | See remaining issues                |
| 12  | Minification                                                                   | Already minified in production export                                                                                                                                         | OK                                  |
| 13  | Compression and caching of static files                                        | Not controlled by the app: `expo serve` sends no compression and `max-age=0`. Estimated Brotli size of the two main bundles: 234 KB + 148 KB (about 380 KB instead of 1.9 MB) | Host setting, see recommendations   |
| 14  | Layout shift                                                                   | CLS 0 on all pages measured (0.01 on Explore); logo and nav have fixed sizes; fonts load before first render                                                                  | OK                                  |
| 15  | Loading, empty and error states, back/forward, reload, deep links              | Existing gates and states reviewed; new e2e test covers back, forward, reload and a deep link to a private page returning to sign-in with `returnTo`                          | OK                                  |
| 16  | Responsive navigation                                                          | Existing e2e layout audit (360/393/430, EN and GL) passes                                                                                                                     | OK                                  |

Not done, on purpose: converting images to WebP/AVIF (the remaining images are small, native iOS/Android and Expo Go do not all decode AVIF, and the player-card JPEGs are only loaded in the share modal); image/video lazy loading (the app has no below-the-fold images or videos); blanket `React.memo` (no profiling evidence of a render hotspot; INP is 24-448 ms in a 4x-slowed CPU, with sign-in slowest).

## Remaining issues and recommendations

1. **JavaScript bundle is 1.9 MB raw (about 380 KB Brotli).** It is the main reason for the 12 s throttled load. Next steps: lazy-load the Greek or English translation file only when needed, check what `@supabase/supabase-js` adds to the entry, and try Expo's experimental tree shaking in a separate branch.
2. **Host:** enable Brotli/Gzip and `Cache-Control: public, max-age=31536000, immutable` for `/_expo/static/*` and `/assets/*` (hashed file names), keep `no-store` for HTML. Verify with `curl -sI -H 'Accept-Encoding: br' https://<site>/`.
3. **Sign in** has the highest INP (448 ms on a 4x slow CPU). Profile that screen on a real phone.
4. The measurements use mocked Supabase. Re-run `PERF_RUNS=3 node scripts/perf/measure.mjs <label>` against production for real API timings.
5. Fonts are now subsets: if text in another script is ever needed (for example Cyrillic), regenerate them from the originals.

## Checks

tsc clean, ESLint clean, vitest 46/46, Playwright (mobile): navigation, security headers, auth, challenges, create game, onboarding, profile, layout audit all pass; desktop navigation test passes. No feature was removed.
