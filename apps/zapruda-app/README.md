# ZAPRUDA APP — iOS + Android (native React Native)

This folder is a **separate mobile application** built with Expo / React Native, not a desktop web site or a Netlify WebView. The legacy web app remains unchanged alongside it for staged migration.

## Current scope

- Native tab bar: Лента · Комьюнити · Создать · Выезды · Чат
- Native welcome, sign-in / sign-up, profile, and Single-Field Flow report UI
- STAGING-only Supabase public reads and authenticated report creation; no fake catches, spots or messages
- Device-local authentication session via Expo SecureStore
- Matte black + lime visual system. Native Liquid Drop is still a follow-up item.
- The **first native scaffold** is not yet a verified Xcode/Gradle build or App Store release.

## Native build

On a connected macOS build environment with supported Xcode, install dependencies with `npm install`, set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in a **local untracked** .env, and run `npx expo run:ios` (or the Android equivalent). For signed internal test builds use an authorized EAS project and `eas build --platform ios --profile preview` / `--platform android --profile preview` after configuring credentials. Do not claim native-build PASS until a real build succeeds.

Set URL only to `https://yudtbifopfnjtjanaqrd.supabase.co`. Never use production `sonvniuwtvzzyuglscah`. The STAGING publishable key is public in client bundles, but service-role keys, PATs and signing credentials must **never** be embedded.

## Migration contract

Read-only feed uses `reports` columns `id,title,body,created_at,location_name`. Report publication first inspects existing web contract; the mobile interface disables actual submit until it has an authenticated user and required title/location. The app does not implement BIG FISH/KING moderation or ON SPOT+ until their protected STAGING dependencies and native API contract pass acceptance.

## Exit gates

1. Dependency installation and TypeScript success
2. Native iOS + Android build in authorized runner
3. iPhone Simulator and Android Emulator screenshots
4. Real authenticated STAGING report, logout/login and state recovery
5. Store assets, privacy disclosures, signing and TestFlight / Play internal test

Do not merge into main or touch Production until owner approval and release gates.
