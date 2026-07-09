# Test Credentials

## Google Sign-In (Emergent-managed OAuth)
- No app-managed passwords — auth flows through https://auth.emergentagent.com/ (Google OAuth).
- Backend endpoints: POST /api/auth/google/session (body: {session_id, mirrors_id?}), GET /api/auth/me (Bearer), POST /api/auth/logout (Bearer).
- Users stored in `google_users` collection (custom user_id `user_<hex12>`, email unique); sessions in `user_sessions` (7-day expiry, TTL index).
- Sign-in is OPTIONAL; app fully usable unauthenticated.
- UI locations: CODES I.D. (/chirpconnect → SETTINGS → ACCOUNT) and MIRRORS I.D. tab (/mirrors-id, logged-out view).
- Token storage: expo-secure-store (mobile) / localStorage key `google_session_token` (web).

## Legacy email/password auth (orphaned, /api/auth/register + /api/auth/login)
- Not reachable from shipped UI; no test accounts maintained.
