# Pharmacy App (Expo)

Single-package Expo SDK 54 app (React Native 0.81.5, React 19.1.0). New Architecture enabled. Pure JavaScript, no TypeScript.

## Commands

```bash
npx expo start          # dev server
npx expo start --android
npx expo start --ios
eas build --profile development   # dev client build
eas build --profile preview       # internal preview
eas build --profile production    # production (auto-increment)
```

No lint, typecheck, or test scripts exist. There is no test suite.

## Architecture

- **Entry**: `index.js` -> `App.js` (registers root component)
- **Navigation**: React Navigation v7 native stack. Auth-gated screens (Home, Cart, Checkout, etc.) vs. global screens (Admin, Chat) registered in `App.js` `NavigationTree`.
- **Auth**: Firebase Auth via `AuthContext.js`. `useAuth()` hook exposes `user`, `login`, `logout`, `loading`. A dev bypass (`IS_BYPASS_ENABLED`) skips Firebase — keep it `false` in production.
- **Cart**: `CartContext.js`. Cart persisted in AsyncStorage (`@al_shifa_pharmacy_cart`). `placeOrder()` writes to Firestore `orders` collection.
- **Backend**: Firebase (Auth + Firestore). Config in `firebaseConfig.js`. Firestore uses unlimited cache.
- **Payments**: Stripe React Native (test key hardcoded in `App.js`).
- **Theme**: `theme.js` exports `COLORS` and `currentPharmacyConfig`. All styling uses these constants.
- **Config**: `config.js` exports `CONFIG` (currency: PKR).

## Screens

All in `screens/`. Key ones: `HomeScreen`, `CartScreen`, `CheckoutScreen`, `AdminDashboardScreen`, `ElevatedDashboard` (master admin), `MasterLoginScreen`, `ChatScreen`.

## Gotchas

- `AppConfig/Settings` Firestore doc has a `isLocked` kill switch — if true, all users get signed out. Don't trigger this accidentally.
- Firebase API keys are committed in `firebaseConfig.js`. This is by design (client-side Firebase config), but be aware.
- `screens/Order/` is an empty directory — likely leftover.
- `CLAUDE.md` just references this file (`@AGENTS.md`).
- EAS project ID: `43ce51a9-9a31-4b99-bc03-4814d127592d`
- Android package: `com.shobeee.PharmacyAppStable`
- Cleartext traffic enabled on Android (`usesCleartextTraffic: true`).

## Expo Version

Expo SDK 54. Reference exact docs: https://docs.expo.dev/versions/v54.0.0/
