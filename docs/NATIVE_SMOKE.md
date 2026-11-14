# Android and iOS native readiness

## Phase 17 result

- Android EAS internal APK: PASS for the multi-ABI build. Artifact: <https://expo.dev/accounts/hasan-jahouse/projects/one-more/builds/e6c7a28b-30bc-484e-b4cb-4cd41881a71a>. EAS uses a remotely stored keystore. Local Windows full-ABI builds can still hit the 260-character generated-path limit.
- Android install/device smoke: NOT TESTED; `adb devices -l` listed no connected devices. No emulator is installed or running.
- iOS Simulator EAS build: PASS; artifact: <https://expo.dev/accounts/hasan-jahouse/projects/one-more/builds/c197b894-d75a-44d0-bad5-c0eba8e34d31>. It has not been launched in a simulator or on an iPhone because this Windows host has no macOS/Xcode runtime.
- Physical iPhone build: NOT BUILT; the iOS Simulator artifact cannot install on a real iPhone. EAS reports `No Apple teams found for account hasan-jahouse`; the interactive development build also stops until an Apple Developer account is connected and an iPhone is provisioned.
- Expo Simulators cloud session: BLOCKED; `eas simulator:availability --json` returned `available: false` for `hasan-jahouse`. Do not call `simulator:start` until Expo enables access.
- Auth email delivery: Resend accepted SMTP and a signup confirmation email arrived at the verified owner mailbox. The connected mail tool redacted the OTP, so app-side verification and native OTP are still NOT TESTED.
- Native push: NOT CONFIGURED and therefore not in the smoke scope.

Both preview builds currently use the temporary identifier `com.anonymous.onemore`; choose the permanent Android application ID and iOS bundle ID before a store release. The iOS config declares `ITSAppUsesNonExemptEncryption: false` for standard/exempt encryption only. No final logo or store assets were introduced.

When Expo Simulators access is enabled, check it first, then install each existing build in a controlled session:

```powershell
npx eas-cli@latest simulator:availability --json
npx eas-cli@latest simulator:start --platform android --type agent-device --build-id e6c7a28b-30bc-484e-b4cb-4cd41881a71a --name "ONE MORE Android smoke" --non-interactive
npx eas-cli@latest simulator:start --platform ios --type agent-device --build-id c197b894-d75a-44d0-bad5-c0eba8e34d31 --name "ONE MORE iOS smoke" --non-interactive
```

The simulator session configuration contains controller credentials; `.env.eas-simulator` is ignored by Git. See [Expo's simulator installation guide](https://docs.expo.dev/eas/simulators/how-to/install-your-app/) and [availability instructions](https://docs.expo.dev/eas/simulators/get-started/).

## Expo Go on iPhone — current path

The project is linked to Expo owner `hasan-jahouse` as `@hasan-jahouse/one-more`, with display name `ONE MORE`. Expo Go and this project use SDK 58. The app source uses Expo Go-compatible modules; no app code imports a custom native module. `expo-dev-client` was removed from this Expo Go setup.

An iOS EAS Update is published on branch/channel `preview`, runtime version `exposdk:58.0.0`. To open it the first time, sign into Expo Go as `hasan-jahouse` and open this link on the iPhone:

[Open ONE MORE in Expo Go](exp://u.expo.dev/21afe9e8-5fec-4af0-baa0-3d0c4a8c2835?channel-name=preview)

If the direct link does not open, this page returns the same launch URL as text: <https://qr.expo.dev/eas-update?projectId=21afe9e8-5fec-4af0-baa0-3d0c4a8c2835&runtimeVersion=exposdk%3A58.0.0&channel=preview&slug=exp&format=url>. After opening it once, look for `ONE MORE` (`@hasan-jahouse/one-more`) under Expo Go's Projects list. Later updates can be published to the same channel; no QR is needed for each update. Expo Go must be using the same Expo account that owns the project.

The dashboard project is <https://expo.dev/accounts/hasan-jahouse/projects/one-more>; the current update is <https://expo.dev/accounts/hasan-jahouse/projects/one-more/updates/41491f59-e08d-4045-92b4-b270902cb8b7>.

To publish later iOS updates, use:

```powershell
npx eas-cli@latest update --channel preview --message "Describe the change" --environment preview --platform ios
```

The `preview-device` profile remains available for a standalone physical-device build, but that path requires Apple Developer membership and iPhone provisioning:

```powershell
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile preview-device
```

This Expo Go path is only for the current preview workflow; a standalone app distributed to testers or app stores will need its own native build. See [Expo's Expo Go SDK compatibility guide](https://docs.expo.dev/troubleshooting/expo-go-version-mismatch/) and [EAS Update QR links](https://docs.expo.dev/more/qr-codes/).

## Re-run on an Android workstation

Requirements: Node 22.13+, JDK 17, Android SDK and build-tools compatible with Expo's generated Gradle files, and an Android device or emulator. Set `JAVA_HOME`, `ANDROID_HOME`, and `ANDROID_SDK_ROOT` for that shell, then:

```powershell
npx expo prebuild --platform android --no-install
Set-Location android
.\gradlew.bat assembleDebug
adb devices -l
adb install -r app\build\outputs\apk\debug\app-debug.apk
```

This Windows checkout may need a shorter physical project path or Windows long-path support because generated C++ object paths exceed the legacy 260-character limit. The short directory alias alone did not resolve the real source path. Verify the connected device is the intended test device before installing.

## Device smoke checklist

On a working Android device with a valid OTP provider, test:

1. Launch and wait for the screen to settle; inspect `adb logcat` for app crashes, unhandled promises and permission prompts.
2. Sign up, verify OTP link, sign in, complete profile, sign out and sign in again.
3. Exercise keyboard submit/escape, dismissal and safe-area layout on auth/profile forms.
4. Open a match deep link, request a position from the pitch map, confirm it stays pending until organizer approval, then verify accepted roster/private chat boundaries.
5. Open a team challenge and notification; change English/Greek and dark/light, background/restore the app, and check preferences persist.
6. Check invalid/expired auth link, offline/retry and permission-denied states without granting unnecessary device permissions.

## iOS gate

iOS needs macOS with Xcode, Apple signing setup and a native build. Run the same smoke flow on a real iPhone or iOS Simulator after a successful build. Until then report **iOS not tested**, not PASS. Store publishing is outside this phase.
