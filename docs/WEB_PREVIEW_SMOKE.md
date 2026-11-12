# ONE MORE Web preview

Status: deployment has not run because this machine is not signed in to Expo Hosting or Vercel. Expo CLI currently reports `Not logged in`; do not publish a temporary deployment under another account.

## Prepare the owner's Expo project

1. Sign in from the owner's Expo account and connect this app with `npx eas-cli@latest init`.
2. In the Expo `preview` environment, set the two client-visible variables from the intended staging Supabase project: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. These values are intentionally public; never add a Supabase service-role key, SMTP password, or Resend API key to Expo Hosting.
3. Make sure the local preview build receives those same `EXPO_PUBLIC_*` values without displaying them in logs. Run `npm run build:web`, then `npx eas-cli@latest deploy --environment preview --alias staging`.
4. Record the returned `https://<preview-subdomain>--staging.expo.app` alias and deployment ID. Use the unique deployment URL for rollback evidence.
5. In Supabase Auth URL Configuration, set the verified HTTPS alias as the Site URL and allow the alias and its nested return paths. Keep the app's existing `one-more://` native scheme. Test a real OTP only after the SMTP provider succeeds.
6. Store Resend API key, verified sender address, and app base URL in Supabase Edge Function secrets only. The notification worker currently returns `503 mail_provider_not_configured` until these are configured.

## Local production-mode check

```powershell
npm run build:web
npx expo serve --port 8080
```

Open `http://localhost:8080` and check landing, `/privacy`, `/terms`, `/explore`, `/matches/<id>`, `/teams/<id>`, `/challenges/<id>`, sign-in, and sign-up. Verify refresh on each deep link, English/Greek and dark/light preferences, mobile widths 375 and 320, no horizontal scroll, and no browser console errors. This local URL is not the hosted release gate.

## Hosted smoke and security

After Expo Hosting is linked, open the HTTPS preview in a private browser and repeat the route/locale/theme checks. Verify response headers `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Cache-Control: no-store` on HTML. Check direct refresh on dynamic routes and the favicon. Test verified signup, OTP, login, reset, and sign-out. With two distinct authenticated browsers, test match approval, private chat, team challenge, notifications and reminders. Confirm the email is actually delivered before marking those gates PASS.

Privacy and Terms pages are deliberately marked as drafts awaiting qualified Cyprus/EU legal review. Do not describe this preview as legally approved or beta-ready until the final policies, deletion-request support process, and retention rules are approved and published. No analytics SDK or third-party analytics script is currently enabled.
