# Mandatory Codex Instructions — ONE MORE

You are implementing the ONE MORE football community product. **Read `README.md` and all docs before editing.** Use the specs as source of truth. If an ambiguity is not a security or billing risk, use the documented default and log the decision. Never claim a gate passed without actually running it.

## Execution contract

1. Work on **one requested phase only** (`docs/04_MASTER_EXECUTION_PLAN.md`); do not move forward without the user's subsequent command.
2. Start each phase by stating target, expected files, dependencies and verification commands.
3. Prefer small, typed, cross-platform components and feature-focused services. Single source of truth for themes, localization and Supabase queries.
4. Write tests alongside code. No `any` unless justified; no silently swallowed errors; no local fake persistence presented as backend data.
5. Execute and report: lint, typecheck, unit tests, web export, and start web app. Confirm browser behavior if a browser tool is available; otherwise explicitly say browser not inspected.
6. SQL schema and RLS changes must be migration files; never manual-only schema that cannot be reproduced. Test as `anon`, authenticated user, organizer and unauthorized user.
7. Use real `EXPO_PUBLIC_*` publishable variables for client, never service/secret keys. Server-only credentials are kept in Supabase secrets.
8. Do not introduce final logo/assets. Use `BrandMark` with replaceable text placeholder; maintain contrast and layout.
9. All visible copy uses i18n keys in English and Greek; avoid hard-coded user-facing strings.
10. Every async screen has loading, empty, error, success and permission-denied states. Accessible focus, labels and keyboard controls are mandatory on Web.
11. Do not add unnecessary abstractions, microservices, payments, venue-provider booking or non-MVP gamification.
12. After each phase append to `docs/IMPLEMENTATION_LOG.md`: phase, change summary, commands, exit codes, browser checks, tests, screenshots location if available, blockers, and next instruction.

## Required final report for every phase

```
Phase: XX — Name
Status: PASS | PARTIAL | BLOCKED
Changed files: ...
Checks: lint [result], typecheck [result], tests [result], export:web [result], dev:web [result]
Browser verification: exact desktop/mobile screens checked OR not verified + why
Security verification: ...
Remaining issues: ...
Next phase: XX (not started)
```

## Important product rules

- Anyone authenticated with a completed verified profile may create matches or teams.
- Match join **always requires organizer approval** for V1; pending is not confirmed.
- Teams and team challenges are in **V1**, not postponed.
- Private match chat is restricted to accepted players and match organizer; access revoked when player leaves.
- Waitlist is ordered and offers require explicit acceptance within a configurable expiration (default 15 minutes); do not auto-confirm a player.
- Reminders 24h and 2h before start; time zone is `Asia/Nicosia`, store instants as `timestamptz` UTC.
- Field booking V1 means **manual booking status tracking**, not integrating booking/payment APIs.
- Bilingual English + Greek from day one; allow in-app language switch.
- Dark/light theme switch, persisted user preference, system default for first launch.
