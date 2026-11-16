// Measures page-load metrics for the built web app (served by `npx expo serve --port 8090`).
// Usage: node scripts/perf/measure.mjs <label>   -> writes docs/reports/perf-<label>.json
// Supabase is mocked (no backend in the sandbox), so numbers show app shell + bundle cost, not network latency to Supabase.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const label = process.argv[2] ?? 'run';
const base = process.env.PERF_BASE ?? 'http://127.0.0.1:8090';
const RUNS = Number(process.env.PERF_RUNS ?? 3);
const userId = 'e1ac8110-73a3-4f8b-a885-c6fc601e5a0d';
const iso = new Date().toISOString();
const soon = (d) => new Date(Date.now() + 864e5 * d).toISOString();

const profile = {
  id: userId, onboarding_complete: true, display_name: 'Hasan', city_id: 'c-1', area_id: 'a-1',
  preferred_position: 'midfielder', skill_level: 'advanced', strong_foot: 'right', shirt_number: 8, language: 'en',
};
const matches = [0, 1, 2, 3].map((i) => ({
  id: `m${i}`, title: `Game ${i}`, side_size: 5, capacity: 10, price_eur: 8, starts_at: soon(i + 1), ends_at: soon(i + 1),
  venue_display_name: 'Arena', venue_address: 'Nicosia', city_name_en: 'Nicosia', city_name_el: 'Λευκωσία',
  area_name_en: 'Strovolos', area_name_el: 'Στρόβολος', active_players: 3, free_spots: 7, status: 'published',
}));
const tables = {
  profiles: profile,
  cities: [{ id: 'c-1', slug: 'nicosia', name_en: 'Nicosia', name_el: 'Λευκωσία' }],
  areas: [{ id: 'a-1', city_id: 'c-1', slug: 'a', name_en: 'Aglantzia', name_el: 'Αγλαντζιά', created_at: iso }],
  user_preferences: { user_id: userId, preferred_formats: [5], availability_slots: ['mon'], max_radius_km: 20, timezone: 'Asia/Nicosia', created_at: iso, updated_at: iso },
  notification_preferences: { user_id: userId, in_app_enabled: true, discovery_email_enabled: false, chat_email_enabled: false, native_push_enabled: false, transactional_email_enabled: true, created_at: iso, updated_at: iso },
  search_matches: matches, list_matches: matches, get_discover_matches: matches,
};

const allPages = [
  ['landing', '/', false], ['sign-in', '/sign-in', false], ['sign-up', '/sign-up', false], ['privacy', '/privacy', false],
  ['home', '/home', true], ['explore', '/explore', true], ['teams', '/teams', true], ['challenges', '/challenges', true],
  ['profile', '/profile', true], ['settings', '/settings', true], ['notifications', '/notifications', true], ['create-game', '/create', true],
];

const wanted = process.env.PERF_PAGES ? process.env.PERF_PAGES.split(',') : null;
const pages = wanted ? allPages.filter((p) => wanted.includes(p[0])) : allPages;

const observer = () => {
  window.__m = { lcp: 0, cls: 0, fcp: 0, inp: 0 };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__m.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = e.startTime; }).observe({ type: 'paint', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) if (e.interactionId) window.__m.inp = Math.max(window.__m.inp, e.duration); }).observe({ type: 'event', durationThreshold: 16, buffered: true });
};

const median = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];

async function once(browser, [name, path, signed]) {
  const ctx = await browser.newContext({ viewport: { width: 393, height: 852 }, isMobile: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.addInitScript(observer);
  if (signed) {
    await page.addInitScript((id) => {
      const t = Math.floor(Date.now() / 1000);
      localStorage.setItem('one-more.locale', 'en');
      localStorage.setItem('one-more.theme', 'dark');
      localStorage.setItem('sb-ejlyaerurkjgsylrsthl-auth-token', JSON.stringify({ access_token: 'x', token_type: 'bearer', expires_in: 86400, expires_at: t + 86400, refresh_token: 'r',
        user: { id, aud: 'authenticated', role: 'authenticated', email: 'a@b.invalid', email_confirmed_at: '2026-01-01T00:00:00Z', app_metadata: {}, user_metadata: {}, identities: [], created_at: '2026-01-01T00:00:00Z' } }));
    }, userId);
  }
  await page.route('**/*.supabase.co/**', (route) => {
    const t = new URL(route.request().url()).pathname.split('/').pop() ?? '';
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tables[t] ?? []) });
  });
  // Block third-party fonts so the sandbox network does not skew results.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  let bytes = 0, reqs = 0, jsBytes = 0, imgBytes = 0, fontBytes = 0, apiCalls = 0;
  const seen = new Map();
  page.on('response', async (res) => {
    const u = res.url();
    if (u.includes('supabase.co')) { apiCalls++; const k = res.request().method() + ' ' + u; seen.set(k, (seen.get(k) ?? 0) + 1); return; }
    if (!u.startsWith(base)) return;
    const len = Number(res.headers()['content-length'] ?? 0) || (await res.body().catch(() => Buffer.alloc(0))).length;
    reqs++; bytes += len;
    if (/\.js(\?|$)/.test(u)) jsBytes += len;
    else if (/\.(png|jpe?g|webp|avif|svg)(\?|$)/.test(u)) imgBytes += len;
    else if (/\.(ttf|woff2?|otf)(\?|$)/.test(u)) fontBytes += len;
  });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(800);
  // Paint metrics are read BEFORE any interaction so a tap that navigates cannot pollute them.
  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    return { ...window.__m, ttfb: nav.responseStart, load: nav.loadEventEnd, dcl: nav.domContentLoadedEventEnd, url: location.pathname };
  });
  // Interaction: press a key on the page (no navigation) to sample input responsiveness.
  await page.keyboard.press('Tab').catch(() => {});
  await page.keyboard.press('Tab').catch(() => {});
  await page.waitForTimeout(300);
  m.inp = await page.evaluate(() => window.__m.inp);
  const dupes = [...seen.values()].filter((n) => n > 1).reduce((a, n) => a + n - 1, 0);
  await ctx.close();
  return { ...m, bytes, reqs, jsBytes, imgBytes, fontBytes, apiCalls, dupeApiCalls: dupes };
}

const browser = await chromium.launch({ executablePath: process.env.CHROME ?? '/opt/pw-browsers/chromium' });
const out = {};
for (const p of pages) {
  const runs = [];
  for (let i = 0; i < RUNS; i++) runs.push(await once(browser, p));
  const pick = (k) => Math.round(median(runs.map((r) => r[k])) * 1000) / 1000;
  out[p[0]] = { finalPath: runs[0].url, ttfb: pick('ttfb'), fcp: pick('fcp'), lcp: pick('lcp'), cls: pick('cls'), inp: pick('inp'), load: pick('load'),
    kb: Math.round(pick('bytes') / 1024), jsKb: Math.round(pick('jsBytes') / 1024), imgKb: Math.round(pick('imgBytes') / 1024), fontKb: Math.round(pick('fontBytes') / 1024),
    requests: pick('reqs'), apiCalls: pick('apiCalls'), dupeApiCalls: pick('dupeApiCalls') };
  console.log(p[0].padEnd(14), JSON.stringify(out[p[0]]));
}
await browser.close();
writeFileSync(new URL(`../../docs/reports/perf-${label}.json`, import.meta.url), JSON.stringify(out, null, 2));
