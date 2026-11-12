# ONE MORE — Product Requirements (PRD v1.0)

## 1. Vision and value

**Positioning:** "ONE MORE — Your game starts here." A football-only community for finding local games, filling missing player slots, creating squads and challenging other squads. Launch market: Nicosia (Nicosia, Lakatamia, Strovolos, etc.), extensible to Cyprus-wide discovery. Currency EUR. English/Greek on release. First platform web; native mobile is an explicit compatibility requirement.

**Primary jobs**
- Solo player: find an upcoming 5v5, 7v7, 8v8 or 11v11 game nearby, request a seat and get confirmation.
- Organizer: post a scheduled game with missing player positions, review requests, manage roster, waitlist, reminders and chat.
- Captain: create a team and challenge another team within a location/date/time window.

**Out of scope V1:** platform payments, booking an actual venue through a venue inventory system, public chat, gambling, standings/leagues, player ratings, automated AI matching, web push, monetization.

## 2. Roles and authorizations

| Role | Permissions |
|---|---|
| Guest | Explore marketing landing and public preview of open matches with limited details; no contact data or participant identities |
| Verified player | Edit own profile/preferences, browse, request to join, create match, create team, manage own participation |
| Match organizer | Edit/cancel own match, review join requests, manage approved participants/waitlist, send match updates, moderate own match chat |
| Team captain | Create/edit team, invite/remove members, appoint co-captain (optional V1), submit/respond to team challenges |
| Admin | Handle abuse reports and support via backend-controlled admin tools; no admin access exposed to general app clients |

A single account can be player, organizer and captain concurrently, and be in multiple teams.

## 3. Key entities and vocabulary

- **Match:** a real scheduled football session with format, confirmed players and organizer.
- **Join request:** pending/accepted/rejected/cancelled submission to a match; **pending does not consume capacity**.
- **Participant:** confirmed roster entry; only accepted participants are allowed to chat.
- **Waitlist:** ordered queue once capacity is reached.
- **Waitlist offer:** exclusive temporary invitation to take a freed slot; acceptance is required.
- **Team:** persistent named group with captain and members.
- **Challenge:** invitation to other teams to arrange a match, with proposed windows and location.
- **Manual venue booking:** record whether organizer booked a physical football field independently.

## 4. Screens and flows — V1

### Guest/auth flow

1. Landing with ONE MORE identity, "Find a game", "Create a match", concise CTA and language/theme controls.
2. Sign up using email, password, password confirmation and terms consent.
3. Email verification code (OTP), resend cooldown, expired/incorrect code errors.
4. Complete profile: display name, city/area, preferred formats, preferred position (optional), skill level (optional), availability and notification consent.
5. Login with email + password; forgot/reset password; sign out.
6. Auth/verification/complete-profile route guards on refresh and deep link.

**Supabase design:** signUp with email/password, confirm sign-up email template with `{{ .Token }}`, verify via supported `verifyOtp` signup token type (confirm against installed SDK/docs). Do NOT replace this with passwordless login. Existing users log in by password. Test resend cooldown and session persistence.

### Main navigation

Five bottom tabs: **Home, Explore, Create, Teams, Profile**. Secondary stack routes: match details, join request details, chat, create/edit match, team details/edit/create, challenge details/create, notifications, preferences. Desktop: max-width content and left navigation or split-pane; persistent visible CTA.

### Home & discovery

- Greeting; city selector (default from profile, not inferred); featured matches soon; "2 players needed" urgency; challenges near you; quick create.
- Explore filters: city, area, date range, time, game format, skill level, price (free or fee indicator), open slots, distance **only if coordinates exist and permission is granted**.
- Default sort: soonest future match, then closest if coordinate data exists. Distinguish fully booked from joinable.
- Empty states with "Create a match" / reset filters. Do not show fictional real matches.

### Create a match

Fields: title; format `5v5 / 7v7 / 8v8 / 11v11`; starts at date/time (Asia/Nicosia); duration minutes (60/90/120 or valid custom); city; area; venue name/address; optional coordinates; skill level; organizer notes; capacity = `2 * side_size`; initially confirmed roster count; number of players needed derived from capacity minus confirmed; price per player (EUR, optional); `venue_booking_status = not_booked | pending | confirmed`; booking reference optional private; `visibility = public | unlisted` (public default).

**Critical capacity rule:** Organizer explicitly chooses initial roster members or initial occupied slots with a clearly separated **unregistered guest count**. `confirmed registered participants + reserved guest slots <= capacity`. If guests are tracked only as a count, call them "guest reservations" and do not display as registered users. `remaining = capacity - confirmed_count - reserved_guest_slots`. Never let organizers enter an arbitrary "missing" value detached from capacity. If confirmed registered participants include the organizer, do not double count.

Create as draft then publish; require starts_at in the future and an explicit booking warning when venue is unconfirmed. Published match can be `open`, `full`, `confirmed`, `completed`, `cancelled` (confirmed means event confirmed, not necessarily full). Fullness is derived from capacity and active roster; do not conflate with organizer booking confirmation. Editing schedule notifies participants and regenerates reminders.

### Join a match

- Verified signed-in user taps **Request to join** on `open` public match.
- Request becomes `pending`; organizer notified; roster unchanged.
- Organizer approves/rejects with idempotent transaction. If no capacity, pending request cannot be accepted: offer waitlist instead.
- Approved participant sees roster/chat; denied/cancelled request sees appropriate read-only status.
- No duplicate active requests; no self-join as organizer if already participant; cannot request cancelled/past match.
- On participant withdrawal, release seat atomically and create waitlist offer.

### Waitlist

- If full, user can "Join waitlist"; monotonically increasing queue rank per match (timestamp + ID tie-break), no duplicate entries.
- If a seat opens, first eligible user gets exclusive offer with **15-minute expiration** (configurable server-side). It reserves one slot temporarily. User explicitly Accepts or Declines; if expires/rejects, offer next user. If user is already booked in another overlapping match, warn and require a policy decision (V1 default: prevent conflicting accepted participation).
- Expiration is processed by server cron and checked again inside accept transaction; impossible to confirm two users for one place. Notify both via in-app and email as preference permits. Waitlist queue becomes closed when match begins/cancelled.

### Private match chat

- One thread per match; visible to organizer and **accepted active** participants only. No previews of messages for pending users. Supabase Realtime only after RLS authorization; server checks permissions for send/read.
- Messages: text-only V1 (max 1000 characters), timestamps, author display name; pagination. Escape untrusted text, basic rate limit, report inappropriate message. Organizer can remove an offensive message; record moderation audit.
- On leave/kick/cancel, revocation applies to future reads and live updates. Ensure already delivered content cannot be retroactively erased from a user's device; avoid keeping long-lived offline cache after sign-out.

### Reminders & notifications

- Event notifications: new relevant match (opt-in), join pending/approved/rejected, match changes/cancel, challenge received/accepted, waitlist offered, chat message (optional batching), and **24h + 2h before game** for accepted participants/organizer.
- Time zone: input and display in Europe/Cyprus locale using `Asia/Nicosia`; store UTC `timestamptz`. Account for DST. Deduplicate by event key; reschedule if time changes; do not send after cancellation; never disclose email addresses to other players.
- Web V1: in-app + transactional email. Mobile native push added and tested later; web push not assumed supported by Expo Notifications.
- Preferences: opt-in for match discovery suggestions, required transactional alerts for match changes; allow channel selection for optional alerts; throttle.

### Teams and challenges (V1, mandatory)

- Create team with name, city, description, optional icon placeholder, captain; join/invite members via authenticated invitation and acceptance. Unique team membership per person/team; captain cannot be removed without transfer.
- Challenge creation: home team, format, requested skill level, city/area, proposed date/time windows, optional field, short note and status `open`.
- Opponent captain sends request representing their team; creator accepts one opponent transactionally; request status `accepted`, other competing requests rejected/closed; challenge status `matched`; create linked match after both sides confirm one exact time/location (do not assume a date range is an actual booking).
- Prevent a team from challenging itself, members from acting as captain without permission, duplicate competing accepted opponents or cancelled challenges.
- Challenge status `open / negotiating / matched / cancelled / expired`; request status `pending / accepted / rejected / withdrawn`.

### Field booking V1

- Manual tracking: field name/address/location, reservation status `not_booked / pending / confirmed`, confirmation time and optional booking note/reference visible **only to organizer**, not an external venue API.
- Public detail: "Field confirmed" only when organizer has explicitly marked it, with disclaimer organizer is responsible; no claim of verified venue inventory.
- No payments, no automatic availability; integrate real venue onboarding in future version.

## 5. Sample localized strings

| Key | English | Greek |
|---|---|---|
| `home.title` | Your next game starts here. | Ο επόμενος αγώνας σου ξεκινά εδώ. |
| `match.find` | Find a match | Βρες αγώνα |
| `match.create` | Create a match | Δημιούργησε αγώνα |
| `join.request` | Request to join | Αίτημα συμμετοχής |
| `join.pending` | Waiting for approval | Αναμονή έγκρισης |
| `team.challenge` | Challenge a team | Προκάλεσε μια ομάδα |
| `match.playersNeeded` | Players needed | Χρειάζονται παίκτες |
| `theme.dark` | Dark mode | Σκούρο θέμα |
| `theme.light` | Light mode | Φωτεινό θέμα |

Greek copy above is a starting draft; review with a native Greek speaker before launch. App name stays ONE MORE in both locales.

## 6. Privacy, moderation and compliance

- Minimal profile fields; no public personal email, password or raw notification token.
- Email verification required; server trust based on verified Auth user, never a mutable client flag.
- Report match, user or message; basic block/report flow and abuse queue; avoid unsolicited marketing.
- Explicit privacy policy, terms, account deletion request workflow and retention policy before public release. Verify Cyprus/EU GDPR requirements with qualified legal review. Do not imply legal compliance merely because RLS is implemented.
- Safety: field organizer responsibility, optional minimum age rule to define before launch, policy for no-show and dangerous content.

## 7. V1 success criteria

- Guest can browse previews; user can sign up, verify OTP, log in/out and recover password on Web.
- Organizer publishes 5v5–11v11 match; accepts requests; confirmed total never exceeds capacity under concurrent operations.
- Accepted user can chat; pending/rejected/ex-accepted cannot read/send.
- Waitlisted user can accept exclusive freed-place offer, with expiry/no double seat.
- Team captain can create team, invite member and challenge another team to create linked match.
- Reminders send at intended offsets (within scheduled worker granularity) without duplicates across reruns/cancellations.
- Both theme modes and both languages work on all shipped routes; user choices persist.
- Web app works at 375px, 768px and 1440px, keyboard and screen reader basics checked; production web export builds.
