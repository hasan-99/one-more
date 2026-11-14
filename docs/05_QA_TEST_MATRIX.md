# ONE MORE — QA, Security & Release Test Matrix

## Test layers

- **Static:** ESLint, `tsc --noEmit`, config validation, translation key coverage, dependency compatibility (`npx expo-doctor`).
- **Unit:** formatting, statuses, time/DST, derived slots, form validation, theme storage, permissions UI mapping.
- **Component:** RTL for buttons/forms/cards/theme/lang, disabled and loading controls.
- **Integration:** Supabase local/staging with migrations, RLS under distinct users, transactional RPC and mail worker mocked provider.
- **E2E Web:** Playwright with two or more isolated browser contexts (guest, player, organizer/captain), desktop/mobile viewports.
- **Visual:** screenshots at mobile/tablet/desktop dark/light in EN/EL, manual design review and optionally screenshot diff.
- **Native smoke:** Android and iOS development build or simulator/device when resources available, documented separately; not implicit in Web result.

## Representative E2E scenarios (IDs must map to test names)

| ID       | Scenario                                                                                                 | Expected result                                                                                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01  | Signup with English name, phone, email/password; receive one-time code and verify; try an existing email | English name and private phone saved to own profile; onboarding only after verification; existing email shows sign-in guidance and does not open code verification                                |
| AUTH-02  | Incorrect, expired OTP + resend cooldown                                                                 | Informative error, no session bypass                                                                                                                                                              |
| AUTH-03  | Password login/logout/refresh/recovery                                                                   | Login uses email + password without OTP; reset returns the same generic response for any email, accepts recovery OTP only, rejects invalid/expired codes, then saves a new password and signs out |
| AUTH-04  | Deep link to private match as guest                                                                      | Redirect to sign-in; return after auth if allowed                                                                                                                                                 |
| UX-01    | System → Dark → Light, refresh                                                                           | Theme choice persists, all text readable                                                                                                                                                          |
| UX-02    | English ↔ Greek on each primary screen                                                                   | Correct translations, no broken layout                                                                                                                                                            |
| UX-03    | 375/768/1440 widths                                                                                      | No horizontal overflow, usable nav                                                                                                                                                                |
| MATCH-01 | Create 5v5, 7v7, 8v8, 11v11                                                                              | Correct capacities 10/14/16/22                                                                                                                                                                    |
| MATCH-02 | Create with guest slots                                                                                  | Remaining places consistent with capacity                                                                                                                                                         |
| MATCH-03 | Invalid date, overcapacity, bad price                                                                    | Server and UI reject                                                                                                                                                                              |
| MATCH-04 | Organizer marks open positions on pitch                                                                  | One marker per requested player; positions/counts persist and match cards/details; total open markers cannot exceed remaining capacity; accessible text alternative matches the map               |
| JOIN-01  | Player requests join                                                                                     | Pending, roster count unchanged                                                                                                                                                                   |
| JOIN-02  | Organizer approves                                                                                       | Accepted, roster increment, chat unlocked                                                                                                                                                         |
| JOIN-03  | Organizer rejects                                                                                        | No seat, no chat access                                                                                                                                                                           |
| JOIN-04  | Two approvals race for last slot                                                                         | Exactly one accepted; never oversubscribed                                                                                                                                                        |
| JOIN-05  | Nonorganizer tries approve via API                                                                       | RLS/RPC denies                                                                                                                                                                                    |
| WAIT-01  | Full match: queue users A and B                                                                          | Stable waitlist FIFO                                                                                                                                                                              |
| WAIT-02  | Seat opens                                                                                               | Offer to A, not auto-add; exclusive 15m window                                                                                                                                                    |
| WAIT-03  | A expires/declines                                                                                       | B receives next offer, no overlapping active reserve                                                                                                                                              |
| WAIT-04  | Concurrent offer accepts                                                                                 | Only one confirmed participant for one slot                                                                                                                                                       |
| CHAT-01  | Accepted user sends/receives live message                                                                | Realtime, ordered history, localized UI                                                                                                                                                           |
| CHAT-02  | Pending/rejected/removed user fetches/realtime                                                           | No read, send or subscribe leak                                                                                                                                                                   |
| CHAT-03  | Large input + HTML special chars                                                                         | Length enforced, text safely rendered                                                                                                                                                             |
| TEAM-01  | Create team, invite, accept                                                                              | Correct roles/membership                                                                                                                                                                          |
| TEAM-02  | Member tries captain operation                                                                           | Denied at DB layer                                                                                                                                                                                |
| CHAL-01  | Team challenges another team                                                                             | Pending request, no match prematurely created                                                                                                                                                     |
| CHAL-02  | Opponent accepted with agreed slot                                                                       | Single linked match, others closed                                                                                                                                                                |
| CHAL-03  | Concurrent accept of two teams                                                                           | Only one opponent accepted                                                                                                                                                                        |
| BOOK-01  | Booking status reported by organizer                                                                     | Public truthful status, private booking notes protected                                                                                                                                           |
| REM-01   | 24h and 2h reminders                                                                                     | One delivery per recipient/offset/event instance                                                                                                                                                  |
| REM-02   | Reschedule/cancel                                                                                        | Stale reminders invalidated; no duplicate send                                                                                                                                                    |
| REM-03   | Cyprus DST transition                                                                                    | Clock time accurate, UTC stored correctly                                                                                                                                                         |
| NOTIF-01 | Discovery opt-out                                                                                        | Optional promotional alert suppressed                                                                                                                                                             |
| SEC-01   | Cross-user fetch/modify direct Supabase API                                                              | Unauthorized access denied                                                                                                                                                                        |
| SEC-02   | Anon attempts read chat/private notes                                                                    | Denied                                                                                                                                                                                            |
| SEC-04   | Another authenticated user reads a player's phone number                                                 | Denied; only the profile owner can read it                                                                                                                                                        |
| SEC-03   | Client bundle contains secrets                                                                           | No service-role/SMTP/provider secrets                                                                                                                                                             |
| A11Y-01  | Keyboard, focus, labels, errors                                                                          | Navigable and understandable                                                                                                                                                                      |

## Test users & fixtures

- `organizer_nicosia`, `player_a_lakatamia`, `player_b_strovolos`, `captain_home`, `captain_away`, `outsider`, `guest`.
- Match A nearly full 5v5; Match B full 7v7 with waitlist; Match C cancelled; challenge open + another accepted; venue booking pending/confirmed; Greek and English users.
- Seed deterministic dates relative to test clock and allow clock injection in reminder tests; never depend on current wall-clock fixtures to remain valid.

## Phase-gate commands (define scripts in Phase 00)

```bash
npm run lint
npm run typecheck
npm run test:run
npx expo-doctor
npx expo export --platform web
npx expo start --web
```

End-to-end (after Phase 02 scaffolding):

```bash
npm run test:e2e
```

**Important:** `npx expo start --web` is a long-running server; run it in a persistent terminal, check `http://localhost:8081` or the port reported, do not assume port. Do not mark browser check PASS merely because the server started. Browser tool or Playwright navigation is required for the actual inspection. `expo export` verifies bundling, not functional UX. Do not run tests requiring external keys and falsely report successful if credentials are absent.

## Gates

- **Per phase:** code compiles, tests of new logic pass, no broken existing routes, browser loads, QA report and screenshots if available.
- **Feature complete:** all relevant IDs above pass against real backend; no critical security loopholes or mock-data claims.
- **Web beta:** basic legal/privacy documents, custom email sender and deliverability checks, hosting configured, rate limits, monitoring, account deletion, security review, cross-browser QA.
- **Native beta:** Android/iOS builds and push permissions/tokens validated; screen safe areas and keyboard checked, device testing logged.

## Regression log template

```md
### YYYY-MM-DD — Phase XX

- Commit / working tree:
- Automated tests and counts:
- RLS checks:
- Web URL checked:
- Desktop + mobile screenshots:
- Dark/light and EN/EL checks:
- Issues / severity:
- Decision PASS/PARTIAL/BLOCKED:
```
