# Test Credentials

## Google Sign-In (Emergent-managed OAuth)
- No app-managed passwords — auth flows through https://auth.emergentagent.com/ (Google OAuth).
- Backend endpoints: POST /api/auth/google/session (body: {session_id, mirrors_id?}), GET /api/auth/me (Bearer), POST /api/auth/logout (Bearer).
- Users stored in `google_users` collection (custom user_id `user_<hex12>`, email unique); sessions in `user_sessions` (7-day expiry, TTL index).
- Sign-in is OPTIONAL; app fully usable unauthenticated.
- UI locations: CODES I.D. (/chirpconnect → SETTINGS → ACCOUNT) and MIRRORS I.D. tab (/mirrors-id, logged-out view).
- Token storage: expo-secure-store (mobile) / localStorage key `google_session_token` (web).

## Sign in with Apple (iOS only — added June 2026)
- Frontend: `expo-apple-authentication` native button (`src/AppleSignInButton.tsx`, testID `apple-sign-in`) rendered under the Google button in CODES I.D. Settings → ACCOUNT and MIRRORS I.D. logged-out view. Hidden on web/Android and when already signed in. `signInWithApple` lives in `src/GoogleAuthContext.tsx` (shared user/session state with Google).
- Backend: POST /api/auth/apple {identity_token, full_name?, email?, mirrors_id?} → verifies RS256 against Apple JWKS (iss + aud from `APPLE_AUDIENCES` env = bundle id + `host.exp.Exponent`), upserts `google_users` by `apple_sub` (sparse unique index; name/email saved on first sign-in only), issues 7-day `user_sessions` token. Same /api/auth/me + /api/auth/logout.
- app.json: `ios.usesAppleSignIn: true` + plugin. Requires a real Apple ID on a physical iOS device (Expo Go works with `host.exp.Exponent` audience). Not testable on web.
- Backend tests: `backend/tests/test_apple_auth.py` (5 pass, local RSA key stands in for Apple JWKS).

## Legacy email/password auth (orphaned, /api/auth/register + /api/auth/login)
- Not reachable from shipped UI; no test accounts maintained.
