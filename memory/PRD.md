# GODMODE SOUND — Mobile App PRD (memory)

## Product
Mobile version of godmodesound.com: 432Hz frequency generator, interactive frequency maps (FREQUENCY_LAB / sacred geometries), MIRRORS WHEEL, CODES I.D. (Nextel-style PTT with voice/video/codes chirps), free music streaming. Aesthetic: black + infrared #ff0a0a, brutalist cosmic minimalism. Top nav pills must stay: MIRRORS | 90.6 | GODMODE | DJ SETS. Audio via hidden WebView bridge (src/AudioEngine.tsx).

## Recent sessions (June–July 2026)
### Frequency Lab HUD reskin (done, verified)
- `src/FrequencyMap.tsx`: matrix code-rain background, red HUD corner brackets + cyan accents, cyan GEOMETRY/TELEMETRY readouts, glowing ringed nodes, rounded Greek band buttons (δθαβγH), glowing red solfeggio chips. All interactivity intact (node taps, PLAY GEOMETRY, protocols).

### CODES I.D. upgrades (done, tested — iteration_1.json)
- PTT button uses red "96" smoke image: `assets/images/codes-id-button.jpg` (also header avatar + default profile image).
- Haptic Engine in Settings: ON/OFF toggle, INTENSITY (LIGHT/MEDIUM/HEAVY), PULSE FREQUENCY (1X/2X/3X); persisted `@codes_haptic_settings`; fires on PTT press; tap-to-preview.
- Profile image upload (expo-image-picker, base64 → AsyncStorage `@mirrors_avatar`), shown in header + Settings. NSPhotoLibraryUsageDescription added.
- Visual feedback: glow ring + red overlay while recording.
- iPhone Action Button setup card in Settings (Shortcuts → Open App).
- Fixed: expo-haptics version mismatch (now ~15.0.8), expo-file-system legacy import (send-chirp base64 path would have crashed on device).

### CODES I.D. — identity, playback, chat styles (done, tested — iteration_3.json)
- Renames: "chirp" → "Mirror" in all UI, NEXTEL removed everywhere (incl. backend AI prompt), RETROSUPERFUTURE removed.
- Editable IDENTITY in Settings (display name + actual MIRRORS I.D.) — backend `PUT /api/mirrors/{id}/change_id` (400/404/409 handling, contacts preserved).
- Message playback in MESSAGES tab: tap bubble → voice (expo-av Sound), video (fullscreen modal), codes (AudioEngine.playMulti, 8s auto-stop); tap-again stops.
- Customizable CHAT STYLE: INFRARED/MATRIX/MONO themes, persisted `@codes_chat_style`.
- Landing hero image swapped to new MIRRORS 96 artwork (index.tsx).

### Google Sign-In (done, tested — iteration_4.json)
- Optional Emergent-managed Google OAuth: button in CODES I.D. Settings (ACCOUNT section, links mirrors_id) + MIRRORS I.D. logged-out view.
- Frontend: `src/GoogleAuthContext.tsx` (provider in _layout), `src/GoogleSignInButton.tsx`; tokens in SecureStore (native) / localStorage (web); web redirect lands on '/' with #session_id handling.
- Backend: POST /api/auth/google/session, GET /api/auth/me, POST /api/auth/logout; `google_users` + `user_sessions` collections with unique/TTL indexes.

### 96 — AI Frequency Guide (done, tested — iteration_5.json)
- OpenAI gpt-5.5 via emergentintegrations 0.2.0 streaming; USER'S OWN OPENAI_API_KEY in backend/.env (currently quota-blocked — user will fund it; feature works in graceful-degraded mode until then).
- Persona "96": Miss-Minutes-style folksy timekeeper; recommends frequencies/protocols, explains app features.
- Backend: POST /api/guide/chat (SSE stream), GET /api/guide/history/{sid}; messages persisted in `guide_messages`; in-memory chat cache rebuilds context from DB after restarts.
- Frontend: `src/NinetySixGuide.tsx` — floating 96 button on / and /library; fullscreen modal chat with expo/fetch streaming; session in AsyncStorage `@ninety_six_session`.

### Interactive CODES links + one-tap frequency edit (done, tested — iteration_6.json)
- Codes bubbles in CODES I.D. MESSAGES now have '⧉ TAP TO LOAD IN LAB' → saves AsyncStorage '@pending_lab_load' → router.push('/') → useFocusEffect in index.tsx loads layers + LOADED banner (works for sent & received).
- Digital Hz readouts in CODES_LAB (index.tsx) and library lab (CodesLabShared.tsx) are tap-to-edit: numeric TextInput, clamps 1-2000, live audio update when playing.

### CODES LAB meters + archive load cleanup (done, screenshot-verified)
- LOADED banner (index lab + CodesLabShared) now has inline ▶ PLAY / ■ STOP next to the loaded archive name (syncs with EXECUTE); archive LOAD now correctly sets the banner and loads multi-frequency entries (stale-state bug fixed).
- Two frequency meters per layer: (top) FULL SPECTRUM — log-scale EM bar 10^0→10^21 Hz (Hz/kHz/MHz/GHz/IR/VIS/UV/X/γ segments, audio window outlined, white marker, "PLUG-INS SOON" for future bandwidths) in `src/SpectrumMeters.tsx`; (bottom) audio editor extended to 0Hz–26kHz with tick scale; tap-to-edit + dial clamps updated to 26000.

### CODES ARCHIVE scroll fix + lab uniformity (done, tested — iteration_7.json)
- /library restructured to ONE outer ScrollView (header/lab/search/tabs/content/footer scroll together); inner content + A-Z sidebar ScrollViews converted to Views (contentCol style added).
- Library CodesLabShared now matches home lab exactly: compact prop dropped (gain visible), digital readout white/200-weight.
- Known cosmetic: negative-SVG console noise from AnalogDial pre-layout sizing (pre-existing).

### Cymatic Oscilloscope (done, screenshot-verified)
- `src/CymaticScope.tsx`: canvas renderer (WebView native / iframe web) with real-time frequency feedback — readout "432.00 Hz · <MEDIUM> PROTOCOL ACTIVE/STANDBY", radial grid, mode-derived cymatic point cloud (angular n from f%12, radial m from f/100), glowing rim, breathing/spin when playing.
- 7 mediums: CHLADNI (nodal), WATER (ripples), SAND (grains), CYMATICS (default green, matches reference), MERCURY, GOLD (glossy), FIRE (orange drift).
- Mounted in both labs (index.tsx + CodesLabShared.tsx) between LOADED banner and layer cards; config pushed via injectJavaScript / contentWindow.updateScope.

## Pending user verification (physical iPhone via Expo Go)
- Video capture (96s) + camera permissions
- Notch/safe-area spacing
- Voice→preview→SEND end-to-end + haptics feel

## Backlog
- Refactor index.tsx (>2.4k lines) into components
- Remove residual Stripe endpoints in backend/server.py
- Migrate expo-av → expo-audio (deprecation warning)
- Dedupe generate_mirrors_id() in server.py
