# Android and iOS native readiness

## Phase 17 result

- Android Expo prebuild: PASS; the generated native project currently defaults to `com.anonymous.onemore`.
- Android debug APK: PASS for `arm64-v8a`. Built from a physical short checkout at `C:\a` with `npx expo prebuild --platform android --clean --no-install` and `gradlew assembleDebug -PreactNativeArchitectures=arm64-v8a`. The verified APK is `android/app/build/outputs/apk/debug/app-debug.apk` in the workspace (86 MB), signed with the local debug key. The default identifier remains `com.anonymous.onemore`.
- Other Android ABIs: BLOCKED by the Windows path limit. The full-ABI build reached `armeabi-v7a` and Ninja failed when its generated path measured 261 characters. Keep the available debug build arm64-only unless the build path is shortened further or long paths are enabled.
- Android install/device smoke: NOT TESTED; `adb devices -l` listed no connected devices and no emulator was available. No BIOS, Windows feature or reboot changes were made.
- iOS: NOT TESTED; this Windows host has no macOS/Xcode environment, signing identity or EAS login.
- Email OTP: NOT TESTED natively; hosted SMTP still rejects authentication, so a verified session cannot be established.
- Native push: NOT CONFIGURED and therefore not in the smoke scope.

The portable Temurin JDK 17 is under the user's local Programs folder. It was installed without changing the machine-wide PATH or JAVA_HOME. Android project files produced by Expo prebuild are ignored/generated; set a real Android application ID and iOS bundle ID before release. The default debug package is not a store identity.

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
