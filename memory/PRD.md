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

### TE Modules — Frequency Sweep + Scalar Resonator (done, screenshot-verified)
- `src/TEModules.tsx`, Teenage Engineering-styled panels (flat dark, chunky drag-knobs w/ PanResponder, yellow/blue/red dot accents, tactile keys, LCD readouts) mounted at bottom of both labs.
- SWEEP: FROM/TO (1-26k, log knobs) + TIME (1-300s), LIN/LOG curve, LOOP, RUN/STOP; interval-driven AudioEngine.updateFreq on tone id 90 with live Hz + progress bar.
- SCALAR RESONATOR: CARRIER/PULSE/FIELD knobs; two detuned tones (ids 91/92, carrier ± pulse/2) create interference beating at pulse rate; LED blinks at pulse rate; presets 7.83 Hz (Schumann) + 432 Hz; ENGAGE/COLLAPSE.

### SCOPE//NODE merged panel + T-800 skin (done, tested — iteration_8.json)
- `src/ScopeNodePanel.tsx` replaces NodeConstellation + CymaticScope on home lab (NodeConstellation.tsx DELETED; CymaticScope kept — still used by CodesLabShared).
- One canvas, two faces with SPIN flip switch (SCOPE | ↻ | NODE): SCOPE = full cymatic oscilloscope (MED cycler + GEO multi-layer picker + measured Hz); NODE = harmonic orb lattice.
- NODE face: orb count chips 1/3/6/7/9/13/26/33/96 → sacred patterns (POINT/TRINITY/HEXAD/SEED/TESLA 3·6·9/FRUIT/TWIN RING/MASTER/PHYLLOTAXIS); orbs = real harmonics of layer-1 base freq, chakra-colored; ◇/◈ RSN button plays the real harmonic audio stack (AudioEngine tone IDs 201+, >20kHz skipped/dimmed, gain rolloff 1/n^0.55; auto-clears on main STOP; retunes live on base sweep).
- Old "NODES → N" link bar removed; SAVE/LOAD/SCLR/LNK chips folded into CODES_LAB header (preset panel opens under chips).
- T-800 reskin of whole CODES LAB: gunmetal frame (t800Frame, red top edge), "T-800 // CSM-101 HUD" tag, chrome dial rings, steel layer cards/readouts/buttons, NODE face has HUD scanlines + corner reticles.

### OrbitGeometry — cosmic Tone+Orbit auto-mapping (done, screenshot-verified)
- `src/OrbitGeometry.ts`: Cousto cosmic-octave table (13 orbits: SUN/MERCURY/VENUS/EARTH DAY/EARTH YEAR(OM)/PLATONIC YR/MOON/MARS/JUPITER/SATURN/URANUS/NEPTUNE/PLUTO) — any frequency octave-reduces into [126.22, 252.44) and maps to nearest orbit tone (cents deviation), each orbit keyed to a sacred geometry (SUN→FLOWER, MOON→VESICA, VENUS→SRI, EARTH DAY→MERKABA, EARTH YEAR→SPIRAL, JUPITER→METATRON, SATURN→NGON, NEPTUNE→JULIA…). Also exports shared chakraForFreq/NOTE_TO_CHAKRA + detectBeat (min pairwise layer delta ≤48Hz, plus scalar 7.83 pulse).
- ScopeNodePanel SCOPE face: ORB chip (auto ON by default, shows ♆ NEPTUNE etc., tap → MANUAL; manual GEO edits release auto lock, GEO shows AUTO·<geom>), meta line "♁ EARTH YEAR ORBIT 136.10 Hz (0¢) · TONE C# · SPIRAL · BEAT x Hz SYNC".
- Canvas: dashed orbit ring + glowing planet marker revolving at orbitHz/1024 rev/s; geometry alpha/scale pulse locked to binaural beat (display beat octave-capped ≤16Hz); orbit readout drawn at canvas bottom. Auto-updates on every preset/code/dial change (frequencies prop). index.tsx passes scalarBeatHz={scalarOn ? 7.83 : 0}.

### CYMASCOPE realtime accurate feedback (done, screenshot-verified)
- AudioEngine (native HTML + web loop): analyser fftSize 1024→8192 (5.4Hz bins → ~1Hz measured accuracy w/ parabolic interp; verified 433.4 for 432 tone); wave display window kept at 1024 samples; NEW multi-peak spectrum extraction (top 6 local maxima, parabolic interp) added to ScopeFrame as `peaks:[{hz,mag}]` (native postMessage + web dispatch + RN onMessage).
- ScopeNodePanel: new default medium CYMASCOPE — physically-modeled circular water membrane rendered per-pixel on a 112px offscreen canvas (blit-scaled, circular clip, field computed every 2nd frame): standing capillary Faraday waves with k∝f^(2/3) dispersion scaling, angular mode n=max(3,round(√(f/432)·6)), Bessel-like radial decay, meniscus rim damping, deep-blue→cyan→white caustic palette. Driven by LIVE FFT peaks (up to 4 partials superimposed = true multi-tone interference); falls back to configured freqs when silent. Meta line: "≋ CYMASCOPE · FARADAY k∝f^⅔ · LIVE FFT DRIVE <peaks> Hz" / "AWAITING SIGNAL — WATER AT REST" (peaks state throttled 450ms).
- NOTE: AudioEngine.tsx suffered tail-corruption during edit (duplicated tail after styles) — fixed by truncating at line 914. Watch this file.

### SCALAR FREQ METER (done, screenshot-verified)
- `src/ScalarFreqMeter.tsx` mounted in CODES_LAB directly under ScopeNodePanel: T-800 precision master control — 2-decimal readout (tap to type exact value, decimal-pad), step chips −1/−0.1/−0.01/+0.01/+0.1/+1 with hold-to-repeat (380ms delay, 80ms interval).
- index.tsx: shiftSpectrum(delta)/setSpectrumTo(value) — shifts EVERY layer by the same Δ (linear offset, 0.01 precision, clamp 0.01–26000) via layersLiveRef (sync ref so hold-repeat accumulates between renders) + isPlayingRef; live AudioEngine.updateFreq when playing. Orbit/geometry/CymaScope all follow automatically.
- Also fixed 2 TS errors in AudioEngine.tsx (Uint8Array<ArrayBuffer> generics for analyser buffers).
- USER-REPORTED "error when playing frequencies EXECUTE": could NOT reproduce on web across EXECUTE/STOP cycles, NODE+RSN, multi-layer, archive. Old Metro logs showed a transient corrupted state (duplicate AsyncStorage import in index.tsx + how.tsx missing semicolon) that has since been fixed — likely the user hit that window. tsc + lint now clean, all flows verified. AWAITING USER CONFIRMATION or exact error text/screenshot if it persists (possibly native/Expo Go only).

### Meter fusion + spectrum position + 7 wavetables (done, screenshot-verified)
- ScalarFreqMeter fused into the lab instrument stack (marginTop:-16, square top, no red edge — attaches directly beneath ScopeNodePanel).
- SPECTRUM POSITION indicator in meter: log-scale 1Hz–26kHz track, red marker, SUB/LOW/MID/HIGH/ULTRA band highlight, % readout.
- Analog layer manual edit upgraded to 0.01 precision (commitFreqEdit rounds 2dp, min 0.01, digital readout shows toFixed(2), maxLength 8).
- 7 WAVETABLES: SINE/TRI/SAW/SQR native + PLS(25% pulse)/ORG(organ additive)/BEL(bell-ish) via createPeriodicWave (cached) — implemented in BOTH native bridge HTML (makeWave/applyWave, startTone(wave), updateWave msg) and web path (webMakeWave/webApplyWave/webUpdateWave). AudioEngine.startTone(id,freq,gain,wave?) + AudioEngine.updateWave(id,wave). Per-layer WAVE chip row in NODE cards, live-switchable while playing; ToneLayer.wave? (default SINE); presets persist wave.

### Nixie redesign of Scalar Meter (done, screenshot-verified)
- ScalarFreqMeter.tsx fully rewritten: Nixie-era lab instrument — bakelite panel (#14100a) w/ brass corner screws, glowing orange Nixie tube digits (tap to type exact), brass step keys, amber spectrum bar.
- LIVE TUNING GALVANOMETER: SVG arc gauge ±50¢, needle = cents deviation of MEASURED FFT Hz (AudioEngine.subscribeScope) vs meter target; green in-tune zone + lock lamp (±3¢); status text LOCKED / ±x.x¢ OFF TARGET / NO SIGNAL. Same props/integration (value/layerCount/onShift/onSet unchanged).

## Pending user verification (physical iPhone via Expo Go)
- Video capture (96s) + camera permissions
- Notch/safe-area spacing
- Voice→preview→SEND end-to-end + haptics feel

## Backlog
- Refactor index.tsx (>3k lines) into components — HIGH RISK of edit corruption
- App Store blockers: remove Stripe checkout (sound.tsx + /api/store/checkout, /api/sound/checkout), uninstall unused perms (expo-location/contacts/notifications/blur/symbols), delete orphaned mirrors-id.tsx + store.tsx, fix NSCameraUsageDescription "chirp"→"Mirror"
- Migrate expo-av → expo-audio (deprecation warning)
- Dedupe generate_mirrors_id() in server.py

### $-Codes / GodMode tier + Three-Field Scope Sequence (done, tested by testing_agent iteration_9 — all 7 flows PASS)
- **Engine (AudioEngine.tsx, BOTH native HTML bridge + web path)**: `AudioEngine.setGodMode(on, pulse?)` / `getGodMode()`. GodMode rewires the tone generator into a scalar-augmented chain: dual-channel DDS (oscL freq−p/2 → merger ch0, oscR freq+p/2 → ch1), AM/burst LFO at pulse Hz modulating the amp gate (depth 0.45×gain), constant-current drivers (0.5 gains), matched opposed coils (inverted −0.22 crossfeed into both channels = interference nulls), field sensing via existing master analyser. setGodMode LIVE-REBUILDS all sounding chains (captures freq/gain, swaps chain type — no silence). startTone/stopTone/updateFreq/updateGain/updateWave are god-aware (osc entries: `{god:true, freq, oL,oR,lfo,gL,gR,amp,lfoDepth,merger,inv}` vs `{osc,gain}`). playMulti/stopMulti REWRITTEN to route through startTone with reserved ids 9000+ (so archive stacks inherit godMode). handleMsg case 'setGodMode'.
- **index.tsx**: godMode state (init from AudioEngine.getGodMode()); gold `$ CODES` / `$ GODMODE` chip in CODES_LAB headerChipRow (toggleGodMode); pulse synced to scalarHz via effect; ScopeNodePanel scalarBeatHz = scalarOn || (godMode && isPlaying) ? scalarHz : 0. CODES ARCHIVE modal: tier row STANDARD vs '$-CODES · GODMODE' (gold), meta line 'SCALAR-AUGMENTED · DUAL-DDS ±x.xxHz SIDEBANDS · AM BURST x.xxHz · OPPOSED-COIL FIELD', '$ ' prefix + '· $-CODE' tag on entries in codex + a-z views. Styles: godChip*, archiveStyles.tier*.
- **library.tsx**: godTier state + tier row (STANDARD/$-CODES + hint) below view tabs; '$ ' prefix in renderEntry; setTier calls AudioEngine.setGodMode.
- **ScopeNodePanel.tsx PANEL_HTML**: THREE-FIELD SEQUENCE on CYMASCOPE face — FLD envelope state; I·POTENTIAL (gold dashed outer ring + 6 seed circles, arms instantly on env>0.03), II·BIOFIELD (teal counter-rotating flower torus at R*0.52, arms after fresh FFT peaks held >900ms), III·COHERENCE (violet-white merkaba core beat-pulse-locked, arms when cfg.beat>0 or held >2400ms). drawFieldLabels: 3 dot+label indicators at canvas top lighting with each field. Zero latency (driven by LIVE analyser frames).
- **Arc radius guard**: monkey-patched CanvasRenderingContext2D.arc in PANEL_HTML + binaural HEAD_MODEL_HTML to clamp negative/non-finite radii (fixed intermittent '/binaural radius -6.08 negative' pageerror; verified 0 pageerrors after).
- NOTE: testing agent's "library $ prefix missing" was a FALSE NEGATIVE (entries were collapsed in codex view; verified working with expanded category).
- Also this session: CymaScope enhancement (144px field, 6 smoothed FFT drivers, audio-gated dark FX), scalar knob → header SCLR chip (+/− steppers, SWP cycle), ScalarKnob.tsx DELETED, ScopeNodePanel added to /binaural tab.
