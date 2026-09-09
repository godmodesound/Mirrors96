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
- P0 (prior handoff, not investigated in this visual-only update): reported backend startup / Nginx loop; App Store cleanup listed below.
- P1: physical-device validation of audio bridge and current mirror finish.
- P2: existing index.tsx refactor / expo-av migration; future reduced-motion-aware chrome sheen if requested.
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

### 3 new visual options added to BOTH labs (done, screenshot-verified — CODON / GENUS / E8, mapped from user ref images)
- **CymaScope (ScopeNodePanel.tsx)** — added as MEDIUMS (exclusive full-canvas, cycled via MED button; NOT geometries, since geometries are suppressed under exclusive cyma-family mediums). MEDIUMS now: CYMASCOPE,LASER,MIRRORS,CODON,GENUS,E8,CHLADNI,WATER,SAND,CYMATICS,MERCURY,GOLD,FIRE. Added PAL + MEDIUM_COLORS entries. drawScopeFace: isCodon/isGenus/isE8 added to `exclusive`; branches call drawCodon/drawGenus/drawE8(R, t*k+spin, pal, envSmooth).
  - drawCodon: genetic-code wheel — 4 nested base rings (A/G/C/U pastel palette) carved into 4/8/12/16 radial wedges + base glyphs + 5' hub, env wobble.
  - drawGenus: high-genus manifold — superformula organic body w/ iridescent blue gradient + rim light + 7 orbiting through-holes (dark cores, golden lens rims) + central hole.
  - drawE8: Gosset/E8 Petrie projection — 8 concentric rings ×30 verts (240), sparse-but-dense chord lattice, ring-hued orbs (8-color wheel), center singularity.
- **Particle Lab (GodmodeFeatures.tsx)** — added 3 modes to MODES + MODE_LABELS: codon, genus, e8. getTarget switch cases: codon=4 concentric rings, genus=6 small tori orbiting a ring (holes), e8=8 concentric rings (per=n/8). Uses existing chakra-hue color path.
- Draw functions drawCodon/drawGenus/drawE8 defined in ScopeNodePanel geometry section (before drawJulia) so they're in scope for drawScopeFace.

### 13 SKINS — global re-skin system (done, testing_agent iteration_10 — ALL FLOWS PASS)
- **User request**: "add 13 skins in these themes as an option for users to switch the way the app looks without changing how it works": 01 SYMBIOTE, 02 T-800, 03 T-1000, 04 DOOM, 05 WINTER, 06 NEW YORK 96, 07 CHAKRA, 08 1950, 09 1960, 10 1970, 11 1980, 12 96, 13 2000. User choices: switcher = HIDDEN button behind the main LOGO; default = 96 (identity, app unchanged); WINTER + 1950 are LIGHT skins; each skin gets an accurate PANTONE accent with a MARVEL hero reference; CymaScope/geometry must follow the skin; NO feature changes.
- **Architecture (look-only layer, zero behaviour change)**:
  - `/app/frontend/src/skins/palette.ts` — 13 `Skin` defs (accent, accent2, light, pantone, marvel hero) + `mapColorFor(skinId,color)`: parses hex/rgb/rgba/hsl/named → HSL → neutrals go through the (optionally inverted for light skins) lightness ramp tinted by the accent hue; very dark (<0.15 L) tinted surfaces stay surfaces (or flip near-white on light skins); chromatic colors go to accent (red band h<45||h>320) or accent2 (all other hues); near-neutral accents (SYMBIOTE silver) drive lightness instead of hue. `mapStringFor` re-colors every color literal inside a string (WebView HTML). Skin `y96` = identity short-circuit ⇒ default look is byte-identical.
  - `/app/frontend/src/skins/index.tsx` — `skinStyles(base)` = drop-in `StyleSheet.create` returning a Proxy that lazily builds + caches a re-colored sheet per skin id; `SK(color)` for inline literals; `skinHtml(html)` for WebView/iframe markup; `SkinProvider` (AsyncStorage `@godmode_skin_v1`, `epoch` remount counter, `pickerOpen` state); `useSkin()`.
  - `/app/frontend/src/skins/SkinPicker.tsx` — SKIN_SELECT modal (13 rows: index, 3 swatches, name, Pantone, Marvel hero, ● active). testIDs `skin-<id>`, `skin-close`.
  - `/app/frontend/app/_layout.tsx` — `<SkinProvider>` wraps `RootLayout`; screen tree wrapped in `<View key={'skin-'+epoch}>` so every cached sheet repaints; `<SkinPicker/>` rendered OUTSIDE that keyed View so it stays open while the app repaints behind it; StatusBar barStyle flips for light skins.
  - `/app/frontend/app/index.tsx` — hero logo wrapped in `<Pressable testID="hero-logo">`: `onLongPress` (500ms) or 3 quick taps → `setPickerOpen(true)`. Added `styles.heroLogoPress {width:'100%'}` (the wrapper collapsed the `width:'100%'` hero image without it).
- **Codemod** `/app/scripts/skin_codemod.py` (one-shot, already applied): tokenizer-based (handles template literals w/ nested `${}`, regex literals, JSX-text apostrophes) — `StyleSheet.create(` → `skinStyles(` in all 38 UI files, and quoted color literals inside function/render bodies → `SK('...')` (JSX attributes get `{SK('...')}`). Module-level data colors (chakra/piano/element/tab palettes) intentionally left unthemed; MobiusTabBar tab colors explicitly wrapped in `SK()`.
- **WebView canvases re-colored** via `skinHtml(...)`: ScopeNodePanel PANEL_HTML (useMemo), CymaticScope SCOPE_HTML, ElementCube, TimeTravelDial, GodmodeFeatures PARTICLE_HTML + EARTH_3D_HTML, binaural HEAD_MODEL_HTML. AudioEngine bridge HTML left alone (no visuals).
- **Notes / by design**: switching a skin remounts the screen tree, so screen-local state resets (audio keeps running — AudioEngine WebView lives outside the keyed View). 0 new TS errors vs baseline; only pre-existing lint warnings (now-unused `StyleSheet` imports).


## Session: Musical Spiral + Chakra re-base (June 2026)
- 13 CHAKRA BODY MAP re-based on THE MUSICAL SPIRAL (Universal Tuning 432): C 252 → C 504 (252/270/288/306/324/342/360/378/405/432/459/486/504). Key colours follow chakra light spectrum RED=ROOT → ORANGE → YELLOW → GREEN(HEART) → BLUE → INDIGO → VIOLET → MAGENTA → WHITE.
- NEW `/app/frontend/src/MusicalSpiral.tsx` (BRAIN tab, directly under the chakra map): interactive semicircle spiral (13 rays with Hz/degrees, tap to sound), 2nd-octave inner spiral, live ScopeNodePanel (CymaScope) driven by the selected tone, 7-chakra table (216-432-864 …, tappable), 7 HEALING FREQUENCIES (963→396, tap to play), 432 frequency grid (5 octaves × 12 notes), 7 alchemical stages footer.

## Current session — logo-matched mirror finish
- Request: “add a mirror Finish to the Mirrors Wheel and FREQUENCY LAB so it matches the logo.” Reference: uploaded silver/chrome 96 logo on black (`6ujv5mnt_B0209CA7-795F-4B90-BBD7-CAD7DAEA26B5.PNG`). Scope strictly visual; no app-icon, backend, tuning or audio-engine changes.
- `src/MirrorFinish.tsx`: shared native SVG multi-stop chrome/reflection gradients, polished concentric rings, lens-like spectrum nodes and non-intercepting control backgrounds. Chrome remains neutral silver across skins; surrounding UI and active colors still use existing skin system.
- `src/MirrorsWheel.tsx`: chrome outer/middle/hub rings, dark reflective key segments, spectrum color inlays, chrome butterfly loops and node bezels, SPIN in reserved toolbar so keys remain tappable. All 24 key mappings unchanged.
- `src/FrequencyMap.tsx`: chrome geometry strokes/node bezels/frame and control surfaces; subdued cool matrix background; colored lenses, infrared active states and original callbacks retained. Responsive SVG containers replace initial-screen Dimensions calculations; node labels kept inside edges.
- Removed unused, unbound animation loops in both touched modules (they drove no visible property). No new dependencies, images or services.
- Verification: touched files lint clean; no added tsc errors (fixed existing FrequencyMap interval-ref type). Focused regression `/app/test_reports/iteration_11.json`: PASS all 24 keys and original frequency values, second-tap stop, SPIN/butterfly, all eight geometries, node telemetry, PLAY/STOP, 432 chip toggle, T-1000/WINTER/default skins, 390px/320px fit with no page overflow. No new runtime exceptions. Physical iOS/Android rendering/audio remains a device-verification item. Existing unrelated framework deprecation warnings and baseline type errors remain outside this visual scope.

## Current session — 96 MIRRORS album expansion and global artwork update
- User request: Add 3 uploaded WAVs to 96 MIRRORS as MIRROR WORLD, MIND SYNC and INTERLUDE FLIP; update album cover everywhere. Follow-up selected the latest **white-background** silver 96 image (`a531g1s7_Codex Image Sep 6, 2026, 02_21_12 AM.png`), replacing the earlier black reference for the album only.
- Preserved tracks 1–11. Appended 12 MIRROR WORLD (240s), 13 MIND SYNC (200s), 14 INTERLUDE FLIP (35s). `src/AlbumData.ts` shares names, full track URLs and cover throughout Home/Sound; original WAV URLs retained in `originalUrl` fields. Album name standardized to 96 MIRRORS.
- Updated Home album carousel/nav thumbnail, Sound shelf/selected album, and legacy Store catalogue/detail/library/admin artwork. Portrait logo is contained, not cropped, with white backing. App hero/skin logo remains unchanged (not an album cover).
- Large source masters are 96kHz 32-bit float WAVs (~176/147/26MB). Prepared full-length 48kHz 320kbps MP3s (~9.6/8.0/1.4MB) using ffmpeg; no trims, pitch/tempo/volume changes. Original hosted WAVs untouched.
- New backend `music_catalog.py` release constants and `music_streaming.py`: public allowlisted `/api/music/mirrors/{slug}.mp3` GET/HEAD, byte ranges incl. suffix and 416 errors, bounded disposable /tmp cache. Audio hosted in Emergent Managed Object Storage; secret stays backend-only; exact storage paths/size/hash/source/title are persisted in MongoDB `public_music_files` (track_id unique). No arbitrary file proxy or user-upload route.
- `backend/scripts/publish_mirrors_streams.py`: one-time publication already run successfully, idempotent content-UUID paths. Requires existing backend storage key env and prepared `/tmp/mirrors-audio/*.mp3`; no new user credentials. Stream reads initialize storage lazily, retry stale 503 once, 503 gracefully if unavailable. App streaming URLs derive from EXPO_PUBLIC_BACKEND_URL.
- `seed_store_albums()` now applies a versioned metadata migration for the existing mirrors document, not only new DBs: current cover, full 14-track array with aligned stream URLs, title/description. Prices, downloads and purchase records preserved; library display resolves current album name/artwork.
- No new JS/Python packages. ffmpeg installed in the working environment only for one-time transcode. TypeScript baseline errors elsewhere remain, Sound timer-ref type fixed; touched files lint clean.
- Verification: backend regression `backend/tests/test_mirrors_album_streaming.py` (added by testing agent) PASS 6 tests; JUnit `test_reports/pytest/iteration12_mirrors_album_streaming.xml`. Catalogue parity/repeated reads, stream GET/HEAD/206/suffix/416/404 and cache regeneration pass. Agent verified all three new tracks through Home/Sound and legacy Store, Sound progress advancing, original track1 and other albums preserved, white cover across views, no duplicate testIDs. Agent did not create its advertised iteration_12.json; findings retained here from its completion report. Native-device playback remains unverified.

## Current session — CODES Archive redesign (voice explicitly cancelled)
- Latest request: “forget voice focus on new Archive design only.” No voice controls, recordings, permissions or transcription integration added.
- Shared `src/archive/ArchiveScreen.tsx` replaces the old `app/library.tsx` screen and Home's duplicate Archive modal. 300 existing archive entries across 22 actual categories unchanged. Home keeps its existing load-to-main-lab and recent-frequency history callbacks; auth/history services unchanged.
- Design: high-contrast off-white names on black panels, infrared accents, chrome archive icon, larger controls, actual counts, category grid with English labels and secondary Latin names, A–Z horizontal letter selector, name/category/Hz search with counts and reset state. Default CODEX browsing. Search stays above results; main generator starts collapsed in LAB instead of dominating first view.
- Behavior: shared transient archive playback session with stable IDs across filters, single tap plays and stages to Lab, second tap stops, hold previews and release stops, persistent playback bar with elapsed timer. Explicit LAB arrow stages up to 5 frequencies in existing shared Lab or closes Home modal and loads Home layers, exactly as before. Standard/$-Codes engine setting retained. Existing single-frequency Solfeggio, Schumann and six mood stacks retained.
- Modular files: ArchiveHeader, ArchiveControls, ArchiveCollections, ArchiveEntry, ArchiveReadout, ArchiveLab; archiveData uses original data; archiveSession wraps existing AudioEngine. No AudioEngine/backend/album source changes for this redesign. Header respects reduced-motion; native safe area/keyboard handling; >44px primary controls; virtualized lists; existing skin system retained.
- Verification: all edited Archive/Home files lint clean, TypeScript diff against baseline empty. `iteration_13.json` identified focused-search gesture failures; fixed focus-dependent header layout shift, CODEX reset and50x48letter targets. `iteration_14.json` passed Sound but identified cross-route Archive focus failures. Troubleshooter traced lingering Home Modal wrapper/focus trap: entire Archive Modal and SendCodesModal now conditionally unmount, not just their children. Final main regression `/app/test_reports/iteration_15.json` PASS: three complete Home→popup→Sound→Archive→Home cycles at390/375/320; modal DOM detached, input actually focused, fill/play/stop/load/reset/category taps all work. Earlier selftest also verified holdpreview/release and Home explicitload+banner. Prior reports remain historical pre-fix findings, not current blockers. Physical-device keyboard/audio verification remains pending.

## Current session — Sound Lab matches Archive / remove FREE labels
- Request: “remove the word free from next to any songs matching the sound Lab menu with the archive design”. Removed music FREE badges and promotional copy from Home SoundLab, `/sound`, and legacy Store album/card surfaces. Access and backend prices are unchanged.
- Shared `src/sound/` components: SoundHeader (Archive-style section identity/chrome record icon), SoundArtwork (actual covers, white Mirrors background stays identical across skins), SoundLibrary (six real albums /53recordings, full-width track rows), SoundTrack, SoundReadout, soundStyles.
- Home Sound Lab and `/sound` now use identical black/charcoal panels, legible off-white titles, infrared selection/playback highlights, mono metadata and >44px controls. Home's old narrow in-card tracklist replaced by full-width selected album tracklist. New `OPEN SOUND LAB` action navigates to `/sound` after stopping Home playback, not a checkout action.
- `/sound` reduced from815-line page to focused shared layout. `useSoundPlayback` retains expo-av, uses real position/duration callbacks for progress and elapsed; cancellation tokens prevent stale async loads from playing after stop/album switch. Loading/error/retry feedback added. Home retains existing AudioEngine.playMedia callback and no fabricated progress readout.
- Existing album data, original11 + new3MIRRORS songs and latestwhitecover unchanged. No voice UI or permissions. No AudioEngine/backend/media changes in this design update. Old unused Home checkout helper/backend Stripe endpoints remain a separate backlog item; unused `/sound` checkout code removed with page rewrite.
- Verification: lint clean and TypeScript diff empty vs baseline. Main screenshots and testing-agent `/app/test_reports/iteration_14.json` PASS Sound/Home/Store layout, all6albums/53recordings, MIRRORS14tracks/latestwhitecover/new3durations and actualprogress+stop, noFREElabels,390/320fit/nohorizontalpageoverflow, HomeOpenSoundLabnavigation. Backend original regression again6/6 (iteration14JUnit). Archive issues in that report fixed and self-verified in iteration15. No remaining observed bugs in requested scope; native device review remains.
