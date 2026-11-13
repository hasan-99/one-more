# ONE MORE Web preview

Status: staging is deployed through Expo Hosting under the owner's `hasan-jahouse` Expo account. The project is `ONE MORE` (`one-more`); preview alias: <https://one-more--staging.expo.app>; latest deployment URL: <https://one-more--l81iulnx4q.expo.app>. EAS access is scoped to `hasan-jahouse` with the Developer role. This is a guest preview, not a production or beta-ready release.

## Prepare the owner's Expo project

1. Expo account/project linking is complete with `npx eas-cli@latest init`; project ID is recorded in `app.json`.
2. The Expo `preview` environment has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the staging project. These values are intentionally public; never add a Supabase service-role key, SMTP password, or Resend API key to Expo Hosting.
3. `npm run build:web` and `npx eas-cli@latest deploy --environment preview --alias staging --dev-domain one-more` completed successfully. The alias and deployment URLs above are available; use the unique deployment URL for rollback evidence.
4. Supabase Auth URL Configuration now uses the verified HTTPS alias as the Site URL and allows the alias's nested return paths plus the app's `one-more://` native scheme. Resend accepted the SMTP connection and delivered a test message to the verified account owner's mailbox; a live signup confirmation email arrived, but app-side OTP completion remains unverified because the connected mail tool redacts codes. The current `onboarding@resend.dev` sender is owner-test-only; verify a custom domain before general-recipient use.
5. Store Resend API key, verified sender address, and app base URL in Supabase Edge Function secrets only. The notification worker currently returns `503 mail_provider_not_configured` until these are configured.

## Local production-mode check

```powershell
npm run build:web
npx expo serve --port 8080
```

Open `http://localhost:8080` and check landing, `/privacy`, `/terms`, `/explore`, `/matches/<id>`, `/teams/<id>`, `/challenges/<id>`, sign-in, and sign-up. Verify refresh on each deep link, English/Greek and dark/light preferences, mobile widths 375 and 320, no horizontal scroll, and no browser console errors. This local URL is not the hosted release gate.

## Hosted smoke and security

On the deployed HTTPS preview, repeat the route/locale/theme checks. Expo Hosting converts the configured `X-Frame-Options: DENY` response header to `Content-Security-Policy: frame-ancestors 'none'`; verify that CSP directive along with `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and `Cache-Control: no-store` on HTML. Check direct refresh on dynamic routes and the favicon. Test verified signup, OTP, login, reset, and sign-out. With two distinct authenticated browsers, test match approval, private chat, team challenge, notifications and reminders. Confirm the email is actually delivered before marking those gates PASS.

Privacy and Terms pages are deliberately marked as drafts awaiting qualified Cyprus/EU legal review. Do not describe this preview as legally approved or beta-ready until the final policies, deletion-request support process, and retention rules are approved and published. No analytics SDK or third-party analytics script is currently enabled.
