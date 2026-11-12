# ONE MORE — Find your game

Web-first football community for Nicosia, Cyprus, built with Expo Router,
React Native, TypeScript and Supabase. Product behavior and visual decisions
follow the specs in [`docs/`](docs/).

## Requirements

- Node.js 22.13 or newer (Expo SDK 58 requirement)
- npm

## Local development

```bash
npm install
copy .env.example .env.local
# Replace both placeholders with your Supabase project URL and publishable key.
npm run dev:web
```

Supabase is connected for email/password authentication. Signup verification and
password recovery require an email provider configured for the project. The
sample match on the landing page is explicitly labeled as demo content. Only a
publishable key belongs in `EXPO_PUBLIC_*` variables; never put service-role or
other private keys in the client.

## Project commands

```bash
npm run lint
npm run typecheck
npm run test:run
npm run test:e2e
npm run build:web
npm run format:check
```

`docs/04_MASTER_EXECUTION_PLAN.md` defines the phase gates. Implement one phase
at a time and record evidence in [`docs/IMPLEMENTATION_LOG.md`](docs/IMPLEMENTATION_LOG.md).
