import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

// HTML content for the hidden WebView that runs Web Audio API
const AUDIO_BRIDGE_HTML = `
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;background:#000;">
<script>
let ctx = null;
const oscs = {};
let masterGain = null;
let audioUnlocked = false;
let sessionTimerState = null;

let analyser = null;
let scopeBuffer = null;
let scopeStreamActive = false;
let scopeRAF = null;
function ensureCtx() {
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 44100 });
    } catch(e) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    masterGain = ctx.createGain();
    // Global analyser tap: masterGain -> analyser -> destination
    analyser = ctx.createAnalyser();
    analyser.fftSize = 8192; // 5.4Hz bins -> ~1Hz accuracy after parabolic interpolation
    analyser.smoothingTimeConstant = 0.65;
    masterGain.connect(analyser);
    analyser.connect(ctx.destination);
    scopeBuffer = new Uint8Array(analyser.fftSize);
    masterGain.gain.value = 0.5;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

// Live scope stream — broadcasts time-domain frames to RN at ~30fps
function startScopeStream() {
  if (scopeStreamActive || !analyser || !scopeBuffer) return;
  scopeStreamActive = true;
  var last = 0;
  function tick(ts) {
    if (!scopeStreamActive) return;
    if (ts - last >= 33) {
      last = ts;
      try {
        analyser.getByteTimeDomainData(scopeBuffer);
        // Downsample to 128 pts to keep payload light
        var out = new Array(128);
        var waveWin = Math.min(1024, scopeBuffer.length);
        var step = waveWin / 128;
        var peak = 0;
        for (var i = 0; i < 128; i++) {
          var v = scopeBuffer[Math.floor(i * step)];
          out[i] = v;
          var dev = Math.abs(v - 128);
          if (dev > peak) peak = dev;
        }
        // MEASURED Hz — FFT peak-bin detection with parabolic interpolation
        var measuredHz = 0;
        try {
          var fftLen = analyser.frequencyBinCount;
          if (!window.__freqBuf || window.__freqBuf.length !== fftLen) window.__freqBuf = new Uint8Array(fftLen);
          analyser.getByteFrequencyData(window.__freqBuf);
          var maxV = 0, maxI = 0;
          for (var k = 1; k < fftLen - 1; k++) {
            if (window.__freqBuf[k] > maxV) { maxV = window.__freqBuf[k]; maxI = k; }
          }
          if (maxV > 30 && maxI > 0 && maxI < fftLen - 1) {
            var yL = window.__freqBuf[maxI - 1], yC = window.__freqBuf[maxI], yR = window.__freqBuf[maxI + 1];
            var denom = (yL - 2 * yC + yR);
            var offset = denom !== 0 ? 0.5 * (yL - yR) / denom : 0;
            var binHz = ctx.sampleRate / analyser.fftSize;
            measuredHz = (maxI + offset) * binHz;
          }
        } catch(e) {}
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'scope', wave: out, peak: peak, measuredHz: measuredHz,
        }));
      } catch(e) {}
    }
    scopeRAF = requestAnimationFrame(tick);
  }
  scopeRAF = requestAnimationFrame(tick);
}
function stopScopeStream() {
  scopeStreamActive = false;
  if (scopeRAF) cancelAnimationFrame(scopeRAF);
  scopeRAF = null;
}

// iOS Safari: suspend on background, resume on foreground (preserves timer)
document.addEventListener('visibilitychange', function() {
  if (!ctx) return;
  if (document.hidden) {
    sessionTimerState = { suspended: true, time: Date.now() };
    try { ctx.suspend(); } catch(e) {}
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'visibility', visible: false }));
  } else {
    if (ctx.state === 'suspended') {
      ctx.resume().then(function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'visibility', visible: true, resumedAfter: sessionTimerState ? Date.now() - sessionTimerState.time : 0 }));
        sessionTimerState = null;
      }).catch(function() {});
    }
  }
});

// iOS silent switch detection via audio probe
function detectSilentSwitch() {
  if (!ctx) return;
  try {
    var osc = ctx.createOscillator();
    var analyser = ctx.createAnalyser();
    var gain = ctx.createGain();
    gain.gain.value = 0.001;
    osc.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    osc.start();
    setTimeout(function() {
      var data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      var silent = data.every(function(v) { return v === 128; });
      osc.stop();
      osc.disconnect();
      if (silent && ctx.state === 'running') {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'silentSwitch', silent: true }));
      }
    }, 200);
  } catch(e) {}
}

// Wavetable types — 4 native + 3 custom PeriodicWaves (pulse/organ/bell)
function makeWave(type) {
  if (type === 'pulse' || type === 'organ' || type === 'bell') {
    if (!window.__pw) window.__pw = {};
    if (window.__pw[type]) return window.__pw[type];
    var real = new Float32Array(33), imag = new Float32Array(33);
    if (type === 'pulse') { var d = 0.25; for (var n = 1; n <= 32; n++) { imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d); } }
    if (type === 'organ') { var amps = [0, 1, 0.6, 0.4, 0.3, 0, 0.2, 0, 0.15]; for (var n2 = 1; n2 < amps.length; n2++) { imag[n2] = amps[n2]; } }
    if (type === 'bell') { var ab = [0, 1, 0.4, 0.5, 0, 0.3, 0, 0.2, 0, 0, 0.15]; for (var n3 = 1; n3 < ab.length; n3++) { imag[n3] = ab[n3]; } }
    window.__pw[type] = ctx.createPeriodicWave(real, imag);
    return window.__pw[type];
  }
  return null;
}
function applyWave(osc, type) {
  try {
    var pw = makeWave(type);
    if (pw) { osc.setPeriodicWave(pw); } else { osc.type = type || 'sine'; }
  } catch(e) { osc.type = 'sine'; }
}

function startTone(id, freq, gain, wave) {
  ensureCtx();
  if (oscs[id]) {
    oscs[id].osc.frequency.setValueAtTime(freq, ctx.currentTime);
    oscs[id].gain.gain.setValueAtTime(gain, ctx.currentTime);
    if (wave) applyWave(oscs[id].osc, wave);
    return;
  }
  const osc = ctx.createOscillator();
  const gn = ctx.createGain();
  applyWave(osc, wave || 'sine');
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gn.gain.setValueAtTime(gain, ctx.currentTime);
  osc.connect(gn);
  gn.connect(masterGain);
  osc.start();
  oscs[id] = { osc, gain: gn };
}

function updateWave(id, wave) {
  if (oscs[id]) applyWave(oscs[id].osc, wave);
}

function stopTone(id) {
  if (oscs[id]) {
    try { oscs[id].osc.stop(); oscs[id].osc.disconnect(); } catch(e) {}
    delete oscs[id];
  }
}

function stopAll() {
  Object.keys(oscs).forEach(id => stopTone(id));
}

function updateFreq(id, freq) {
  if (oscs[id]) oscs[id].osc.frequency.setValueAtTime(freq, ctx.currentTime);
}

function updateGain(id, gain) {
  if (oscs[id]) oscs[id].gain.gain.setValueAtTime(gain, ctx.currentTime);
}

// Multi-frequency play (for library/moods)
let multiOscs = [];
function playMulti(freqs, gainVal) {
  ensureCtx();
  stopMulti();
  freqs.forEach(freq => {
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gn.gain.setValueAtTime(gainVal / Math.sqrt(freqs.length), ctx.currentTime);
    osc.connect(gn);
    gn.connect(masterGain);
    osc.start();
    multiOscs.push({ osc, gain: gn });
  });
}

function stopMulti() {
  multiOscs.forEach(({ osc }) => { try { osc.stop(); osc.disconnect(); } catch(e) {} });
  multiOscs = [];
}

// Binaural beats
let binL = null, binR = null, merger = null;
function startBinaural(carrier, beat) {
  ensureCtx();
  stopBinaural();
  merger = ctx.createChannelMerger(2);
  merger.connect(masterGain);
  binL = ctx.createOscillator();
  const lGain = ctx.createGain();
  binL.frequency.setValueAtTime(carrier, ctx.currentTime);
  lGain.gain.setValueAtTime(0.5, ctx.currentTime);
  binL.connect(lGain);
  lGain.connect(merger, 0, 0);
  binR = ctx.createOscillator();
  const rGain = ctx.createGain();
  binR.frequency.setValueAtTime(carrier + beat, ctx.currentTime);
  rGain.gain.setValueAtTime(0.5, ctx.currentTime);
  binR.connect(rGain);
  rGain.connect(merger, 0, 1);
  binL.start();
  binR.start();
}

function stopBinaural() {
  try { if (binL) { binL.stop(); binL.disconnect(); } } catch(e) {}
  try { if (binR) { binR.stop(); binR.disconnect(); } } catch(e) {}
  binL = binR = null;
}

function updateBinaural(carrier, beat) {
  if (binL && binR) {
    binL.frequency.setValueAtTime(carrier, ctx.currentTime);
    binR.frequency.setValueAtTime(carrier + beat, ctx.currentTime);
  }
}

// Soundscape
let scOscs = [];
let noiseNode = null;
function playSoundscape(baseFreq, harmonics, includeNoise, noiseLevel, volume) {
  ensureCtx();
  stopSoundscape();
  masterGain.gain.value = volume;
  harmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    const gn = ctx.createGain();
    osc.frequency.setValueAtTime(baseFreq * h, ctx.currentTime);
    gn.gain.setValueAtTime(0.3 / (i + 1), ctx.currentTime);
    osc.connect(gn);
    gn.connect(masterGain);
    osc.start();
    scOscs.push(osc);
  });
  if (includeNoise && noiseLevel > 0) {
    const bufSize = ctx.sampleRate * 10;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.5;
    }
    noiseNode = ctx.createBufferSource();
    noiseNode.buffer = buf;
    noiseNode.loop = true;
    const nGain = ctx.createGain();
    nGain.gain.value = noiseLevel;
    noiseNode.connect(nGain);
    nGain.connect(masterGain);
    noiseNode.start();
  }
}

function stopSoundscape() {
  scOscs.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch(e) {} });
  scOscs = [];
  if (noiseNode) { try { noiseNode.stop(); noiseNode.disconnect(); } catch(e) {} noiseNode = null; }
}

function updateVolume(vol) {
  if (masterGain) masterGain.gain.value = vol;
}

// Camelot tones
let camelotOscs = [];
function playCamelot(freq) {
  ensureCtx();
  stopCamelot();
  const osc = ctx.createOscillator();
  const gn = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gn.gain.setValueAtTime(0.35, ctx.currentTime);
  osc.connect(gn);
  gn.connect(masterGain);
  osc.start();
  camelotOscs.push({ osc, gain: gn });
  const osc2 = ctx.createOscillator();
  const gn2 = ctx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, ctx.currentTime);
  gn2.gain.setValueAtTime(0.12, ctx.currentTime);
  osc2.connect(gn2);
  gn2.connect(masterGain);
  osc2.start();
  camelotOscs.push({ osc: osc2, gain: gn2 });
}

function stopCamelot() {
  camelotOscs.forEach(({ osc }) => { try { osc.stop(); osc.disconnect(); } catch(e) {} });
  camelotOscs = [];
}

// Message handler
document.addEventListener('message', function(e) { handleMsg(e.data); });
window.addEventListener('message', function(e) { handleMsg(e.data); });

// ═══ MEDIA PLAYBACK — routes external mp3/m4a through masterGain
// so the analyser/CymaScope FFT sees the song in real time. ═══
var mediaEl = null, mediaSrc = null, mediaGain = null;
function playMedia(url) {
  ensureCtx();
  stopMedia();
  try {
    var el = new Audio();
    el.crossOrigin = 'anonymous';
    el.src = url;
    el.preload = 'auto';
    mediaEl = el;
    mediaGain = ctx.createGain();
    mediaGain.gain.value = 1.0;
    try {
      mediaSrc = ctx.createMediaElementSource(el);
      mediaSrc.connect(mediaGain);
      mediaGain.connect(masterGain);
    } catch(e) {}
    startScopeStream();
    var playP = el.play();
    if (playP && playP.catch) playP.catch(function(err){
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ mediaError: String(err) }));
    });
    el.addEventListener('ended', function() {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ mediaEnded: true }));
      stopMedia();
    });
    el.addEventListener('error', function() {
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ mediaError: 'load failed' }));
    });
  } catch(err) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ mediaError: String(err) }));
  }
}
function stopMedia() {
  try { if (mediaEl) { mediaEl.pause(); mediaEl.src = ''; mediaEl.load && mediaEl.load(); } } catch(e){}
  try { if (mediaSrc) mediaSrc.disconnect(); } catch(e){}
  try { if (mediaGain) mediaGain.disconnect(); } catch(e){}
  mediaEl = null; mediaSrc = null; mediaGain = null;
}
function setMediaVolume(v) { if (mediaGain) mediaGain.gain.value = Math.max(0, Math.min(1, v)); }

function handleMsg(raw) {
  try {
    const msg = JSON.parse(raw);
    switch(msg.type) {
      case 'startTone': startTone(msg.id, msg.freq, msg.gain, msg.wave); break;
      case 'stopTone': stopTone(msg.id); break;
      case 'stopAll': stopAll(); break;
      case 'updateFreq': updateFreq(msg.id, msg.freq); break;
      case 'updateGain': updateGain(msg.id, msg.gain); break;
      case 'updateWave': updateWave(msg.id, msg.wave); break;
      case 'playMulti': playMulti(msg.freqs, msg.gain || 0.3); break;
      case 'stopMulti': stopMulti(); break;
      case 'startBinaural': startBinaural(msg.carrier, msg.beat); break;
      case 'stopBinaural': stopBinaural(); break;
      case 'updateBinaural': updateBinaural(msg.carrier, msg.beat); break;
      case 'playSoundscape': playSoundscape(msg.baseFreq, msg.harmonics, msg.includeNoise, msg.noiseLevel, msg.volume); break;
      case 'stopSoundscape': stopSoundscape(); break;
      case 'updateVolume': updateVolume(msg.volume); break;
      case 'playCamelot': playCamelot(msg.freq); break;
      case 'stopCamelot': stopCamelot(); break;
      case 'unlockAudio': ensureCtx(); audioUnlocked = true; break;
      case 'playMedia': playMedia(msg.url); break;
      case 'stopMedia': stopMedia(); break;
      case 'setMediaVolume': setMediaVolume(msg.volume); break;
      case 'detectSilentSwitch': detectSilentSwitch(); break;
      case 'startScopeStream': ensureCtx(); startScopeStream(); break;
      case 'stopScopeStream': stopScopeStream(); break;
    }
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ ok: true, type: msg.type }));
  } catch(err) {
    window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ error: err.message }));
  }
}

// Signal ready — and pre-warm AudioContext for iOS
(function() {
  try {
    ensureCtx();
    // iOS requires AudioContext to be resumed after creation
    // Create a brief silent oscillator to "unlock" audio
    if (ctx) {
      const silentOsc = ctx.createOscillator();
      const silentGain = ctx.createGain();
      silentGain.gain.value = 0;
      silentOsc.connect(silentGain);
      silentGain.connect(ctx.destination);
      silentOsc.start();
      silentOsc.stop(ctx.currentTime + 0.001);
    }
  } catch(e) {}
  window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ ready: true }));
})();

// Also handle touch events on the document to unlock audio on iOS
document.addEventListener('touchstart', function unlockAudio() {
  ensureCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
  document.removeEventListener('touchstart', unlockAudio);
}, { once: true });
</script>
</body></html>
`;

// Singleton ref for the WebView
let webViewRef: any = null;
let isWebViewReady = false;
let pendingMessages: string[] = [];

const sendToWebView = (msg: object) => {
  const json = JSON.stringify(msg);
  if (Platform.OS === 'web') return; // Web uses direct API
  if (webViewRef && isWebViewReady) {
    webViewRef.injectJavaScript(`handleMsg('${json.replace(/'/g, "\\'")}'); true;`);
  } else {
    pendingMessages.push(json);
  }
};

// Audio Engine API (works on all platforms)
export const AudioEngine = {
  // Tone layer controls
  startTone: (id: number, freq: number, gain: number, wave?: string) => {
    if (Platform.OS === 'web') {
      webStartTone(id, freq, gain, wave);
    } else {
      sendToWebView({ type: 'startTone', id, freq, gain, wave });
    }
  },
  updateWave: (id: number, wave: string) => {
    if (Platform.OS === 'web') {
      webUpdateWave(id, wave);
    } else {
      sendToWebView({ type: 'updateWave', id, wave });
    }
  },
  stopTone: (id: number) => {
    if (Platform.OS === 'web') {
      webStopTone(id);
    } else {
      sendToWebView({ type: 'stopTone', id });
    }
  },
  stopAll: () => {
    if (Platform.OS === 'web') {
      webStopAll();
    } else {
      sendToWebView({ type: 'stopAll' });
    }
  },
  updateFreq: (id: number, freq: number) => {
    if (Platform.OS === 'web') {
      webUpdateFreq(id, freq);
    } else {
      sendToWebView({ type: 'updateFreq', id, freq });
    }
  },
  updateGain: (id: number, gain: number) => {
    if (Platform.OS === 'web') {
      webUpdateGain(id, gain);
    } else {
      sendToWebView({ type: 'updateGain', id, gain });
    }
  },
  // Multi-frequency (library/moods)
  playMulti: (freqs: number[], gain: number = 0.3) => {
    if (Platform.OS === 'web') {
      webPlayMulti(freqs, gain);
    } else {
      sendToWebView({ type: 'playMulti', freqs, gain });
    }
  },
  stopMulti: () => {
    if (Platform.OS === 'web') {
      webStopMulti();
    } else {
      sendToWebView({ type: 'stopMulti' });
    }
  },
  // Binaural
  startBinaural: (carrier: number, beat: number) => {
    if (Platform.OS === 'web') {
      webStartBinaural(carrier, beat);
    } else {
      sendToWebView({ type: 'startBinaural', carrier, beat });
    }
  },
  stopBinaural: () => {
    if (Platform.OS === 'web') {
      webStopBinaural();
    } else {
      sendToWebView({ type: 'stopBinaural' });
    }
  },
  updateBinaural: (carrier: number, beat: number) => {
    if (Platform.OS === 'web') {
      webUpdateBinaural(carrier, beat);
    } else {
      sendToWebView({ type: 'updateBinaural', carrier, beat });
    }
  },
  // Soundscape
  playSoundscape: (baseFreq: number, harmonics: number[], includeNoise: boolean, noiseLevel: number, volume: number) => {
    if (Platform.OS === 'web') {
      webPlaySoundscape(baseFreq, harmonics, includeNoise, noiseLevel, volume);
    } else {
      sendToWebView({ type: 'playSoundscape', baseFreq, harmonics, includeNoise, noiseLevel, volume });
    }
  },
  stopSoundscape: () => {
    if (Platform.OS === 'web') {
      webStopSoundscape();
    } else {
      sendToWebView({ type: 'stopSoundscape' });
    }
  },
  updateVolume: (volume: number) => {
    if (Platform.OS === 'web') {
      webUpdateVolume(volume);
    } else {
      sendToWebView({ type: 'updateVolume', volume });
    }
  },
  // Camelot
  playCamelot: (freq: number) => {
    if (Platform.OS === 'web') {
      webPlayCamelot(freq);
    } else {
      sendToWebView({ type: 'playCamelot', freq });
    }
  },
  stopCamelot: () => {
    if (Platform.OS === 'web') {
      webStopCamelot();
    } else {
      sendToWebView({ type: 'stopCamelot' });
    }
  },
  // iOS hardening: unlock audio explicitly from user gesture
  unlockAudio: () => {
    if (Platform.OS === 'web') {
      ensureWebCtx();
    } else {
      sendToWebView({ type: 'unlockAudio' });
    }
  },
  // iOS: detect if silent switch is on
  detectSilentSwitch: () => {
    if (Platform.OS !== 'web') {
      sendToWebView({ type: 'detectSilentSwitch' });
    }
  },
  // Global master-bus scope: subscribe to live time-domain waveform frames
  subscribeScope: (cb: (frame: ScopeFrame) => void) => {
    scopeSubs.push(cb);
    // Kick native scope stream on first subscriber
    if (Platform.OS !== 'web' && scopeSubs.length === 1) {
      sendToWebView({ type: 'startScopeStream' });
    }
    // Immediately push latest cached frame
    try { cb(latestFrame); } catch {}
    return () => {
      scopeSubs = scopeSubs.filter(s => s !== cb);
      if (Platform.OS !== 'web' && scopeSubs.length === 0) {
        sendToWebView({ type: 'stopScopeStream' });
      }
    };
  },
  getLatestScope: (): ScopeFrame => latestFrame,
  // ═══ MEDIA — play external audio (mp3/m4a) through the same master bus so
  //     the CymaScope / analyser respond to the song in real time. ═══
  playMedia: (url: string, onEnd?: () => void) => {
    mediaEndCb = onEnd || null;
    if (Platform.OS === 'web') webPlayMedia(url, onEnd);
    else sendToWebView({ type: 'playMedia', url });
  },
  stopMedia: () => {
    mediaEndCb = null;
    if (Platform.OS === 'web') webStopMedia();
    else sendToWebView({ type: 'stopMedia' });
  },
  setMediaVolume: (v: number) => {
    if (Platform.OS === 'web') webSetMediaVolume(v);
    else sendToWebView({ type: 'setMediaVolume', volume: v });
  },
};

// Media-end callback for native (WebView reports via postMessage)
let mediaEndCb: (() => void) | null = null;

// ===== Web-only direct implementations =====
let audioCtx: AudioContext | null = null;
const webOscs: { [key: number]: { osc: OscillatorNode; gain: GainNode } } = {};
let webMasterGain: GainNode | null = null;
let webAnalyser: AnalyserNode | null = null;
let webScopeBuf: Uint8Array<ArrayBuffer> | null = null;

// Web media playback (routes external audio through master bus for CymaScope FFT feedback)
let webMediaEl: HTMLAudioElement | null = null;
let webMediaSrc: MediaElementAudioSourceNode | null = null;
let webMediaGain: GainNode | null = null;

const webPlayMedia = (url: string, onEnd?: () => void) => {
  if (!ensureWebCtx() || !audioCtx || !webMasterGain) return;
  webStopMedia();
  try {
    const el = new Audio();
    el.crossOrigin = 'anonymous';
    el.src = url;
    el.preload = 'auto';
    webMediaEl = el;
    webMediaGain = audioCtx.createGain();
    webMediaGain.gain.value = 1.0;
    try {
      webMediaSrc = audioCtx.createMediaElementSource(el);
      webMediaSrc.connect(webMediaGain);
      webMediaGain.connect(webMasterGain);
    } catch (e) { /* already connected? */ }
    el.addEventListener('ended', () => { try { onEnd && onEnd(); } catch {} webStopMedia(); });
    el.play().catch(err => console.log('[AudioEngine] media play error', err));
  } catch (e) { console.log('[AudioEngine] webPlayMedia err', e); }
};

const webStopMedia = () => {
  try { if (webMediaEl) { webMediaEl.pause(); webMediaEl.src = ''; } } catch {}
  try { if (webMediaSrc) webMediaSrc.disconnect(); } catch {}
  try { if (webMediaGain) webMediaGain.disconnect(); } catch {}
  webMediaEl = null; webMediaSrc = null; webMediaGain = null;
};

const webSetMediaVolume = (v: number) => {
  if (webMediaGain) webMediaGain.gain.value = Math.max(0, Math.min(1, v));
};

const ensureWebCtx = () => {
  if (Platform.OS !== 'web') return false;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 44100 } as any);
    } catch(e) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    webMasterGain = audioCtx.createGain();
    webAnalyser = audioCtx.createAnalyser();
    webAnalyser.fftSize = 8192; // 5.4Hz bins -> ~1Hz accuracy after parabolic interpolation
    webAnalyser.smoothingTimeConstant = 0.65;
    webMasterGain.connect(webAnalyser);
    webAnalyser.connect(audioCtx.destination);
    webScopeBuf = new Uint8Array(webAnalyser.fftSize);
    webMasterGain.gain.value = 0.5;
    startWebScopeLoop();

    // iOS Safari: suspend/resume on visibility change
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!audioCtx) return;
        if (document.hidden) {
          audioCtx.suspend().catch(() => {});
        } else {
          audioCtx.resume().catch(() => {});
        }
      });
    }
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return true;
};

// Wavetable types — 4 native + 3 custom PeriodicWaves (pulse/organ/bell)
const webPWCache: Record<string, PeriodicWave> = {};
const webMakeWave = (type: string): PeriodicWave | null => {
  if (!audioCtx) return null;
  if (type !== 'pulse' && type !== 'organ' && type !== 'bell') return null;
  if (webPWCache[type]) return webPWCache[type];
  const real = new Float32Array(33), imag = new Float32Array(33);
  if (type === 'pulse') { const d = 0.25; for (let n = 1; n <= 32; n++) imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * d); }
  if (type === 'organ') { const amps = [0, 1, 0.6, 0.4, 0.3, 0, 0.2, 0, 0.15]; for (let n = 1; n < amps.length; n++) imag[n] = amps[n]; }
  if (type === 'bell') { const ab = [0, 1, 0.4, 0.5, 0, 0.3, 0, 0.2, 0, 0, 0.15]; for (let n = 1; n < ab.length; n++) imag[n] = ab[n]; }
  webPWCache[type] = audioCtx.createPeriodicWave(real, imag);
  return webPWCache[type];
};
const webApplyWave = (osc: OscillatorNode, type?: string) => {
  try {
    const pw = type ? webMakeWave(type) : null;
    if (pw) osc.setPeriodicWave(pw);
    else osc.type = (type as OscillatorType) || 'sine';
  } catch { osc.type = 'sine'; }
};

const webStartTone = (id: number, freq: number, gain: number, wave?: string) => {
  if (!ensureWebCtx() || !audioCtx || !webMasterGain) return;
  if (webOscs[id]) {
    webOscs[id].osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    webOscs[id].gain.gain.setValueAtTime(gain, audioCtx.currentTime);
    if (wave) webApplyWave(webOscs[id].osc, wave);
    return;
  }
  const osc = audioCtx.createOscillator();
  const gn = audioCtx.createGain();
  webApplyWave(osc, wave || 'sine');
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gn.gain.setValueAtTime(gain, audioCtx.currentTime);
  osc.connect(gn);
  gn.connect(webMasterGain);
  osc.start();
  webOscs[id] = { osc, gain: gn };
};

const webUpdateWave = (id: number, wave: string) => {
  if (webOscs[id]) webApplyWave(webOscs[id].osc, wave);
};

const webStopTone = (id: number) => {
  if (webOscs[id]) {
    try { webOscs[id].osc.stop(); webOscs[id].osc.disconnect(); } catch (e) {}
    delete webOscs[id];
  }
};

const webStopAll = () => {
  Object.keys(webOscs).forEach(id => webStopTone(parseInt(id)));
};

const webUpdateFreq = (id: number, freq: number) => {
  if (audioCtx && webOscs[id]) webOscs[id].osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
};

const webUpdateGain = (id: number, gain: number) => {
  if (audioCtx && webOscs[id]) webOscs[id].gain.gain.setValueAtTime(gain, audioCtx.currentTime);
};

let webMultiOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
const webPlayMulti = (freqs: number[], gainVal: number) => {
  if (!ensureWebCtx() || !audioCtx || !webMasterGain) return;
  webStopMulti();
  freqs.forEach(freq => {
    const osc = audioCtx!.createOscillator();
    const gn = audioCtx!.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, audioCtx!.currentTime);
    gn.gain.setValueAtTime(gainVal / Math.sqrt(freqs.length), audioCtx!.currentTime);
    osc.connect(gn);
    gn.connect(webMasterGain!);
    osc.start();
    webMultiOscs.push({ osc, gain: gn });
  });
};

const webStopMulti = () => {
  webMultiOscs.forEach(({ osc }) => { try { osc.stop(); osc.disconnect(); } catch (e) {} });
  webMultiOscs = [];
};

let webBinL: OscillatorNode | null = null;
let webBinR: OscillatorNode | null = null;
let webMerger: ChannelMergerNode | null = null;

const webStartBinaural = (carrier: number, beat: number) => {
  if (!ensureWebCtx() || !audioCtx || !webMasterGain) return;
  webStopBinaural();
  webMerger = audioCtx.createChannelMerger(2);
  webMerger.connect(webMasterGain);
  webBinL = audioCtx.createOscillator();
  const lGain = audioCtx.createGain();
  webBinL.frequency.setValueAtTime(carrier, audioCtx.currentTime);
  lGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  webBinL.connect(lGain);
  lGain.connect(webMerger, 0, 0);
  webBinR = audioCtx.createOscillator();
  const rGain = audioCtx.createGain();
  webBinR.frequency.setValueAtTime(carrier + beat, audioCtx.currentTime);
  rGain.gain.setValueAtTime(0.5, audioCtx.currentTime);
  webBinR.connect(rGain);
  rGain.connect(webMerger, 0, 1);
  webBinL.start();
  webBinR.start();
};

const webStopBinaural = () => {
  try { if (webBinL) { webBinL.stop(); webBinL.disconnect(); } } catch (e) {}
  try { if (webBinR) { webBinR.stop(); webBinR.disconnect(); } } catch (e) {}
  webBinL = webBinR = null;
};

const webUpdateBinaural = (carrier: number, beat: number) => {
  if (audioCtx && webBinL && webBinR) {
    webBinL.frequency.setValueAtTime(carrier, audioCtx.currentTime);
    webBinR.frequency.setValueAtTime(carrier + beat, audioCtx.currentTime);
  }
};

let webScOscs: OscillatorNode[] = [];
let webNoiseNode: AudioBufferSourceNode | null = null;

const webPlaySoundscape = (baseFreq: number, harmonics: number[], includeNoise: boolean, noiseLevel: number, volume: number) => {
  if (!ensureWebCtx() || !audioCtx || !webMasterGain) return;
  webStopSoundscape();
  webMasterGain.gain.value = volume;
  harmonics.forEach((h, i) => {
    const osc = audioCtx!.createOscillator();
    const gn = audioCtx!.createGain();
    osc.frequency.setValueAtTime(baseFreq * h, audioCtx!.currentTime);
    gn.gain.setValueAtTime(0.3 / (i + 1), audioCtx!.currentTime);
    osc.connect(gn);
    gn.connect(webMasterGain!);
    osc.start();
    webScOscs.push(osc);
  });
  if (includeNoise && noiseLevel > 0) {
    const bufSize = audioCtx.sampleRate * 10;
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const data = buf.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 0.5;
    }
    webNoiseNode = audioCtx.createBufferSource();
    webNoiseNode.buffer = buf;
    webNoiseNode.loop = true;
    const nGain = audioCtx.createGain();
    nGain.gain.value = noiseLevel;
    webNoiseNode.connect(nGain);
    nGain.connect(webMasterGain);
    webNoiseNode.start();
  }
};

const webStopSoundscape = () => {
  webScOscs.forEach(osc => { try { osc.stop(); osc.disconnect(); } catch (e) {} });
  webScOscs = [];
  if (webNoiseNode) { try { webNoiseNode.stop(); webNoiseNode.disconnect(); } catch (e) {} webNoiseNode = null; }
};

const webUpdateVolume = (vol: number) => {
  if (webMasterGain) webMasterGain.gain.value = vol;
};

let webCamelotOscs: { osc: OscillatorNode; gain: GainNode }[] = [];
const webPlayCamelot = (freq: number) => {
  if (!ensureWebCtx() || !audioCtx || !webMasterGain) return;
  webStopCamelot();
  const osc = audioCtx.createOscillator();
  const gn = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gn.gain.setValueAtTime(0.35, audioCtx.currentTime);
  osc.connect(gn);
  gn.connect(webMasterGain);
  osc.start();
  webCamelotOscs.push({ osc, gain: gn });
  const osc2 = audioCtx.createOscillator();
  const gn2 = audioCtx.createGain();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(freq * 2, audioCtx.currentTime);
  gn2.gain.setValueAtTime(0.12, audioCtx.currentTime);
  osc2.connect(gn2);
  gn2.connect(webMasterGain);
  osc2.start();
  webCamelotOscs.push({ osc: osc2, gain: gn2 });
};

const webStopCamelot = () => {
  webCamelotOscs.forEach(({ osc }) => { try { osc.stop(); osc.disconnect(); } catch (e) {} });
  webCamelotOscs = [];
};

// ===== Global scope subscribers (real-time master-bus waveform) =====
export type ScopeFrame = { wave: number[]; peak: number; measuredHz?: number; peaks?: { hz: number; mag: number }[] };
type ScopeSub = (frame: ScopeFrame) => void;
let scopeSubs: ScopeSub[] = [];
let latestFrame: ScopeFrame = { wave: new Array(128).fill(128), peak: 0, measuredHz: 0 };

const dispatchScope = (frame: ScopeFrame) => {
  latestFrame = frame;
  for (let i = 0; i < scopeSubs.length; i++) {
    try { scopeSubs[i](frame); } catch {}
  }
};

const startWebScopeLoop = () => {
  if (Platform.OS !== 'web') return;
  let last = 0;
  let freqBuf: Uint8Array<ArrayBuffer> | null = null;
  const tick = (ts: number) => {
    if (!webAnalyser || !webScopeBuf) return;
    if (ts - last >= 33) {
      last = ts;
      try {
        webAnalyser.getByteTimeDomainData(webScopeBuf);
        const out: number[] = new Array(128);
        const step = webScopeBuf.length / 128;
        let peak = 0;
        for (let i = 0; i < 128; i++) {
          const v = webScopeBuf[Math.floor(i * step)];
          out[i] = v;
          const dev = Math.abs(v - 128);
          if (dev > peak) peak = dev;
        }
        // MEASURED Hz — FFT peak bin + parabolic interpolation
        let measuredHz = 0;
        const specPeaks: { hz: number; mag: number }[] = [];
        try {
          const fftLen = webAnalyser.frequencyBinCount;
          if (!freqBuf || freqBuf.length !== fftLen) freqBuf = new Uint8Array(fftLen);
          webAnalyser.getByteFrequencyData(freqBuf);
          const binHz = audioCtx ? audioCtx.sampleRate / webAnalyser.fftSize : 0;
          let maxV = 0, maxI = 0;
          for (let k = 1; k < fftLen - 1; k++) {
            if (freqBuf[k] > maxV) { maxV = freqBuf[k]; maxI = k; }
          }
          if (maxV > 30 && maxI > 0 && maxI < fftLen - 1 && audioCtx) {
            const yL = freqBuf[maxI - 1], yC = freqBuf[maxI], yR = freqBuf[maxI + 1];
            const denom = (yL - 2 * yC + yR);
            const offset = denom !== 0 ? 0.5 * (yL - yR) / denom : 0;
            measuredHz = (maxI + offset) * binHz;
          }
          // MULTI-PEAK spectrum — top local maxima for CymaScope accurate drive
          if (binHz > 0) {
            for (let q = 2; q < fftLen - 2; q++) {
              const v2 = freqBuf[q];
              if (v2 > 28 && v2 >= freqBuf[q-1] && v2 >= freqBuf[q+1] && v2 > freqBuf[q-2] && v2 > freqBuf[q+2]) {
                const pL = freqBuf[q-1], pR = freqBuf[q+1];
                const pden = (pL - 2 * v2 + pR);
                const poff = pden !== 0 ? 0.5 * (pL - pR) / pden : 0;
                specPeaks.push({ hz: Math.round((q + poff) * binHz * 10) / 10, mag: v2 });
                q += 2;
              }
            }
            specPeaks.sort((a, b) => b.mag - a.mag);
            specPeaks.length = Math.min(specPeaks.length, 6);
          }
        } catch {}
        dispatchScope({ wave: out, peak, measuredHz, peaks: specPeaks });
      } catch {}
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

// ===== Hidden WebView Component (rendered only on native) =====
export const AudioBridgeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const wvRef = useRef<WebView>(null);

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.ready) {
        console.log('[AudioEngine] WebView bridge ready');
        isWebViewReady = true;
        // Flush pending messages
        pendingMessages.forEach(msg => {
          if (wvRef.current) {
            wvRef.current.injectJavaScript(`handleMsg('${msg.replace(/'/g, "\\'")}'); true;`);
          }
        });
        pendingMessages = [];
      }
      if (data.ok) {
        console.log('[AudioEngine] Command OK:', data.type);
      }
      if (data.error) {
        console.warn('[AudioEngine] Error:', data.error);
      }
      // iOS visibility change — audio context suspended/resumed
      if (data.type === 'visibility') {
        console.log('[AudioEngine] Visibility:', data.visible ? 'foreground' : 'background');
      }
      // iOS silent switch detected
      if (data.type === 'silentSwitch' && data.silent) {
        console.warn('[AudioEngine] Silent switch may be ON — sessions will be inaudible');
      }
      // Live master-bus scope frame
      if (data.type === 'scope' && Array.isArray(data.wave)) {
        dispatchScope({ wave: data.wave, peak: data.peak || 0, measuredHz: data.measuredHz || 0, peaks: Array.isArray(data.peaks) ? data.peaks : [] });
      }
      // Native media playback ended
      if (data.mediaEnded && mediaEndCb) {
        try { mediaEndCb(); } catch {}
        mediaEndCb = null;
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' && wvRef.current) {
      webViewRef = wvRef.current;
    }
    return () => {
      webViewRef = null;
      isWebViewReady = false;
    };
  }, []);

  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <View style={styles.hiddenWebViewContainer}>
        <WebView
          ref={wvRef}
          source={{ html: AUDIO_BRIDGE_HTML }}
          onMessage={onMessage}
          style={styles.hiddenWebView}
          javaScriptEnabled={true}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          mixedContentMode="always"
        />
      </View>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  hiddenWebViewContainer: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 1,
    height: 1,
    overflow: 'hidden',
    opacity: 0,
    pointerEvents: 'none',
  },
  hiddenWebView: {
    width: 1,
    height: 1,
    backgroundColor: '#000000',
  },
});
