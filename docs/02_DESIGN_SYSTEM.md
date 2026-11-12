# ONE MORE — Premium Brand & UX Design System v1.0

## Design north star

Build a **confident, stadium-inspired, premium and impressively polished** football social application—not a generic admin dashboard. The experience must feel excellent on a phone AND function beautifully on Web today. Use strong typography, a disciplined lime accent, crisp surfaces, thoughtful whitespace, game-card visual rhythm and delightfully responsive micro-interactions. **Keep the logo as a replaceable placeholder until supplied.** Never invent branded SVG artwork as the final logo.

Core visual message: **`ONE MORE.`** / **`YOUR GAME STARTS HERE.`** / **`NEED ONE MORE?`** / **`BE THE ONE.`** Avoid using too many slogans on one screen.

## 1. Approved palette & semantic color tokens

### Base brand

| Token | Value | Use |
|---|---|---|
| `brand.pitchBlack` | `#101510` | Primary dark background / text on lime |
| `brand.electricLime` | `#C7FF28` | Primary CTA, active icon, special highlight |
| `brand.white` | `#FFFFFF` | Main text on dark / light cards |

### Dark scheme (default suggested)

| Semantic token | Value |
|---|---|
| `background` | `#101510` |
| `surface` | `#192119` |
| `surfaceRaised` | `#222D22` |
| `textPrimary` | `#FFFFFF` |
| `textSecondary` | `#C3CDC0` |
| `textMuted` | `#A9B6A7` |
| `border` | `#405040` |
| `primaryButton` | `#C7FF28` |
| `primaryButtonText` | `#101510` |
| `focusRing` | `#C7FF28` |

### Light scheme

| Semantic token | Value |
|---|---|
| `background` | `#F7F9F2` |
| `surface` | `#FFFFFF` |
| `surfaceRaised` | `#EDF2E6` |
| `textPrimary` | `#101510` |
| `textSecondary` | `#4C584C` |
| `border` | `#CBD5C6` |
| `primaryButton` | `#C7FF28` |
| `primaryButtonText` | `#101510` |
| `activeTextOnLight` | `#547100` (retest contrast at intended size) |
| `focusRing` | `#516B00` |

### Status tokens (use readable foreground, not color alone)

Use `success`, `warning`, `error`, `info` badge pairings with separate light/dark foreground/background combinations; define and verify in code rather than guessing. **Do not use neon lime for every status.** A game `Open` state and a successful booking are semantically different.

### Contrast rules

- Dark `#101510` text on `#C7FF28` button has excellent contrast (approx **15.6:1**).
- **Never put white text on lime** (approx **1.18:1**, fails normal text contrast).
- White on Pitch Black approx **18.5:1**. Verify all secondary, disabled, border, error and focus colors using WCAG checker in actual components.
- Meet WCAG AA for normal text at 4.5:1 (or 3:1 large text), visible keyboard focus and non-text contrast appropriate to control boundaries.

## 2. Typography

- **Display:** `Barlow Condensed` weights 700/800 for striking match headlines and hero slogans; ensure valid Greek glyph coverage or use Greek-compatible fallback explicitly.
- **UI/body:** `Inter` 400/500/600/700 with explicit support for Latin and Greek glyphs; fallback to platform sans where required.
- Use Expo Fonts in shared Web/Native setup. Avoid font loading flashes; test Greek glyphs on Web and native simulators.
- Type ramp: `display 48/52` desktop, `36/40` mobile; `h1 32/36`, `h2 24/29`, `h3 20/25`, body `16/24`, secondary `14/21`, label `12/16` (dp / px equivalent).
- Headlines uppercase sparingly, never uppercase long Greek paragraphs. Tabular numerals for date, score, participant counts. Respect text scaling.

## 3. Spacing, geometry, motion

- Spacing unit 4: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64`.
- Radius: controls 12, cards 18, modal sheets 24, pill 999.
- Touch targets >=44x44; buttons 52 (primary) and 44 (secondary); comfortable input height 52.
- Card border dark `#405040` at 1px; subtle shadow only where useful on light theme. Dark theme uses tonal elevation, not large gray drop-shadows.
- Animations: 120–220ms for selection and transitions; use reduced-motion support; avoid scroll-jank, splash overload, gratuitous gradients or large decorative assets.
- Layout responsive: 320px minimum feasible, target 375px/mobile, 768px tablet, 1280–1440px desktop. Side nav on wide screens, bottom tab navigation on phone. Max content width approx 1200px; forms 560–640px; cards grid 1/2/3 depending viewport.

## 4. Brand/logo placeholder (actual logo will be added later)

Implement `<BrandMark variant="wordmark|symbol" />`:
- `wordmark`: render `ONE MORE.` in bold typography, optionally accent `MORE.` with lime on dark; on light use dark text and sparing dark-green accent.
- `symbol`: minimal square placeholder containing `1+` **only temporarily**, clearly marked placeholder in source. No logo artwork should be finalized.
- Reserve app icon/splash assets as replaceable resources in `assets/branding/`. Document exact asset sizes and adaptation when supplied, including Android adaptive icon safe area and iOS app icon.
- When final logo arrives, replace asset/BrandMark only, without redesigning spacing or screen hierarchy.

## 5. Core components (build reusable before whole screens)

`AppScreen`, `PageHeader`, `BrandMark`, `ThemedText`, `PrimaryButton`, `SecondaryButton`, `TextField`, `PasswordField`, `OTPInput`, `SelectField`, `DateTimeField`, `SegmentedTabs`, `StatusBadge`, `MatchCard`, `TeamCard`, `ChallengeCard`, `PlayerAvatar`, `PlayerCountBar`, `EmptyState`, `ErrorState`, `Skeleton`, `BottomNav`, `DesktopNav`, `ModalSheet`, `Toast`, `ConfirmDialog`, `LanguageSwitcher`, `ThemeSwitcher`, `NotificationBell`, `VenueBookingBadge`, `WaitlistPosition`, `ChatBubble`.

For each component: sizes, active/disabled/error/loading/pressed/focus behavior, dark+light, EN+EL, keyboard/focus and screen-reader labels; use semantic actions, no inert fake controls.

## 6. Screen-by-screen creative direction

### A. Landing (guest)

- **Hero:** dark stadium-inspired abstract background using CSS/RN shapes (no unlicensed stock photos), large `ONE MORE.` lockup, statement `YOUR GAME STARTS HERE.` and bright lime primary button `FIND YOUR GAME`.
- Below: two clean tiles `NEED PLAYERS?` and `HAVE A TEAM?`, then how it works in 3 steps; keep hero above fold on mobile.
- Desktop split hero with visual live match card **labeled demo** until populated; never advertise fabricated real matches.

### B. Auth (Sign up, Verify, Sign in, Forgot/Reset)

- Narrow max 440px, bold title, friendly helper, email/password inputs, password visibility toggle, six digit OTP, resend timer, clearly readable errors, success confirmation, no auto-sign-in assumptions.
- Theme/language switch available even before account creation. Show secure login feedback without user-enumeration leakage.

### C. Profile onboarding

- Progress 1 of 2 / 2 of 2, essential fields first, optional preferences next, skip optional avatar. City/area, format chips (5v5/7v7/8v8/11v11), favorite position, skill, time slots; avoid forcing GPS.

### D. Home

- Greeting + selected city; hero CTA; `UPCOMING NEAR YOU` game cards, `YOUR NEXT GAME` with countdown and booking status, horizontal `TEAM CHALLENGES` carousel, optional `AVAILABLE TO PLAY` toggle. Do not show empty fake matches; delightful empty state.

### E. Explore

- Desktop side filters + card grid; mobile sticky search + filter sheet + list. Each game card: date/time chip, format, field/area, status, available places, progress, fee, organizer, `VIEW GAME` CTA. Clear filter and sort state. Avoid more than two simultaneous bright lime accents per viewport section.

### F. Match detail

- Hero strip with `5V5` large, date/time, venue booking status, venue/map open link, roster grid split by team if assigned, remaining spots, format/skill/cost, organizer notes, join request state, `Request to Join` or `Join Waitlist`.
- Accepted participant gets `Open Match Chat`; show clear cancellation/reassignment flows. Requesters see `Pending approval` not green confirmed.

### G. Create/edit match

- Wizard or single structured scroll: `MATCH FORMAT` → `WHEN & WHERE` → `SQUAD & SPOTS` → `FIELD BOOKING` → `REVIEW & PUBLISH`.
- Live participant count calculation; block invalid date, negative fee, over-capacity; prominent warning if field not confirmed. Provide Save Draft and Publish actions.

### H. Team hub & team profile

- Visual team crest placeholder, team member avatars, captain tools, invites, members and `CHALLENGE TEAM`; emphasize shared team identity. Challenge listings show window, format and response state.

### I. Create/respond to challenge

- Strong `VS` composition, home team vs unknown opponent, requested format + date windows, CTA `CHALLENGE`, incoming requests approval, agreed scheduled details before match creation.

### J. Match chat

- Mobile full-screen conversation with pinned match/time strip; desktop split details/chat, message bubbles with clear own-vs-other distinction; sending state, retry, error, time grouping, scroll-to-bottom, loading history, report message. Acceptances controlled server-side.

### K. Notifications and settings

- Group by Today / Earlier, unread indicator, deep-link to correct entity and localized text; toggles for reminders/marketing channels where legally and technically appropriate. Theme choices `System / Dark / Light`, language `English / Ελληνικά`.

### L. Venue booking

- Manual status card `NOT BOOKED / PENDING / CONFIRMED` with explicit "Organizer-reported" badge. Edit booking private notes only for organizer. Public venue address/map link, no fake book-now button.

## 7. Mobile+desktop layouts

| Breakpoint concept | UX rule |
|---|---|
| 320–599 | One column; 16px margins; fixed bottom nav respecting safe area; bottom-sheet filters; primary CTA full width |
| 600–1023 | Two-column cards where room permits; optimized tablet navigation |
| 1024+ | Left navigation rail, wider center content, optional detail sidebar; max-width; avoid stretched 100%-width forms |

Use shared React Native components, `useWindowDimensions` or design tokens. Web-specific accessibility/hover keyboard treatment is allowed via `.web.tsx` wrappers as necessary; avoid separate unrelated Web app.

## 8. Dark/light switch implementation contract

- `ThemePreference = 'system' | 'dark' | 'light'` persisted in cross-platform storage.
- For `system`, resolve from OS/web appearance; listen to changes. On first launch, respect system. Explicit selection persists across sessions and refresh.
- ThemeProvider supplies semantic tokens; no hard-coded `#fff`/`#000` scattered inside screens. Test every major route in both modes.
- Dark should feel premium, not illegible; light mode is fully designed, not a simple inverted screen.
- Theme switch controls are functional in both guest landing and signed-in Settings; setting persists when user signs in.

## 9. Localization contract

- i18n keys and typed translations `en`, `el`. No user-facing English literals in screens.
- Use Intl for dates/numbers, `EUR` currency, Cyprus local display. Avoid hardcoded UTC offsets; use IANA `Asia/Nicosia`.
- Greek translations verified by human later; avoid truncation at 200% text scaling. App brand ONE MORE remains untranslated.
- Language switch persists; sync to profile optionally. Browser refresh stays on selected language.

## 10. UI quality gate

- Screenshot review in desktop 1440x900, tablet 768x1024, mobile 375x812, each dark/light, and both EN/EL for main screens.
- No horizontal overflow, clipped headings, unreadable controls, font fallback glitches, dead CTA or inconsistent status badges.
- Keyboard through dialogs, form errors announced and field focus stable. Visual regression screenshots for Home, Explore, Match Detail, Create, Teams, Challenge, Chat, Settings.
- Visual QA is separate from functional QA: a beautiful mock without real Supabase connections does **not** count as a finished feature.
