# Notes for App Review and Google Play review

## Access without an account

Browsing games, teams and challenges (Explore, Teams, Challenges, game details) works **without signing in**. Creating a game, requesting to join, chatting, creating teams and posting challenges need an account.

## Demo accounts (owner must create these before submitting)

The backend must be live and these accounts pre-created with a **confirmed email** (sign-up normally needs an emailed one-time code that reviewers cannot receive):

| Role                             | Purpose                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `review-player@<your-domain>`    | Completed profile; has requested to join a game; member of a team                                           |
| `review-organizer@<your-domain>` | Completed profile; organises a future game with a pending request; captain of a team with an open challenge |

Create them in Supabase Dashboard → Authentication → Add user (tick "Auto Confirm"), sign in once in the app to complete the profile, then create a future game, a team and a challenge so every screen has data. Use long random passwords and rotate them after review. Do not put credentials in the repository.

## Notes to paste in the review form

ONE MORE connects amateur football players in Cyprus. Open Explore to browse games without signing in. Sign in with the demo accounts above to test: create a game, request to join, approve a request (organizer), open the game chat, report or block a message (long list under the message), create a team, post a challenge. Account deletion: Settings → Delete my account (immediate and permanent, so please use a throw-away account for it, or sign up with a new email). No in-app purchases, ads or tracking. No special hardware or location permission is used.
