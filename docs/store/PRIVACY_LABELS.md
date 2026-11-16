# Store privacy declarations (to enter in the consoles)

Derived from `DATA_INVENTORY.md`. No data is used for tracking and none is sold or used for advertising.

## Apple App Store Connect → App Privacy

Does the app collect data? **Yes.** Tracking: **No** (no "Data Used to Track You"). Tracking domains: none.

| Apple data type                                                                                                                   | Linked to user                                                               | Used for tracking | Purpose                                    |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------- | ------------------------------------------ |
| Contact Info → Email Address                                                                                                      | Yes                                                                          | No                | App Functionality                          |
| Contact Info → Name (display name)                                                                                                | Yes                                                                          | No                | App Functionality                          |
| Contact Info → Phone Number                                                                                                       | Yes                                                                          | No                | App Functionality (private contact detail) |
| Identifiers → User ID                                                                                                             | Yes                                                                          | No                | App Functionality                          |
| User Content → Other User Content (chat messages, team and game descriptions)                                                     | Yes                                                                          | No                | App Functionality                          |
| Location                                                                                                                          | Not collected (the city/area is typed by the user, not read from the device) | –                 | –                                          |
| Usage Data, Diagnostics, Purchases, Financial, Health, Contacts, Photos or Videos, Audio, Browsing/Search History, Sensitive Info | Not collected                                                                | –                 | –                                          |

The same collected types are embedded in the build through `ios.privacyManifests` in `app.json` (generated into `PrivacyInfo.xcprivacy`; verified with `expo prebuild`). Required-reason API declarations: UserDefaults (CA92.1), File timestamp (C617.1, 0A2A.1, 3B52.1), System boot time (35F9.1), Disk space (E174.1, 85F4.1), the set Expo and React Native modules use.

Privacy Policy URL: `https://<your-domain>/privacy`. User Privacy Choices URL (optional): `https://<your-domain>/delete-account`.

Export compliance: `ITSAppUsesNonExemptEncryption = false` is set (the app uses only standard HTTPS).

## Google Play Console → App content

**Data safety**

- Collects or shares data: **Collects, does not share** with third parties for their own use (service providers acting for us are not "sharing").
- Data encrypted in transit: **Yes**. Users can request deletion: **Yes**.
- Account creation methods: **Username/email and password**. Deletion URL: `https://<your-domain>/delete-account` (matches in-app deletion).

| Play category / type                                                                                                     | Collected | Shared | Optional | Purpose                               |
| ------------------------------------------------------------------------------------------------------------------------ | --------- | ------ | -------- | ------------------------------------- |
| Personal info → Email address                                                                                            | Yes       | No     | No       | Account management, App functionality |
| Personal info → Name                                                                                                     | Yes       | No     | No       | App functionality                     |
| Personal info → Phone number                                                                                             | Yes       | No     | No       | App functionality                     |
| Personal info → User IDs                                                                                                 | Yes       | No     | No       | App functionality, Account management |
| Messages → Other in-app messages                                                                                         | Yes       | No     | Yes      | App functionality                     |
| App activity → Other user-generated content                                                                              | Yes       | No     | Yes      | App functionality                     |
| Location, Financial, Health, Contacts, Photos/videos, Audio, Web browsing, App info and performance, Device or other IDs | No        | –      | –        | –                                     |

**Other App content declarations**

- Privacy policy: `https://<your-domain>/privacy`.
- Ads: **No ads**. Government app: No. Financial features: None. Health: None.
- User generated content: **Yes** (in-app report and block, moderation by organisers and support; see Terms).
- Target audience: **16 and over** (not designed for children; do not enrol in Families).
- News app: No. COVID-19: No. Data deletion: URL above.
- Permissions declarations: none needed (the build declares only INTERNET and VIBRATE).
