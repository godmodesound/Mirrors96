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

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);
    masterGain.gain.value = 0.5;
  }
  if (ctx.state === 'suspended') ctx.resume();
  return true;
}

function startTone(id, freq, gain) {
  ensureCtx();
  if (oscs[id]) {
    oscs[id].osc.frequency.setValueAtTime(freq, ctx.currentTime);
    oscs[id].gain.gain.setValueAtTime(gain, ctx.currentTime);
    return;
  }
  const osc = ctx.createOscillator();
  const gn = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gn.gain.setValueAtTime(gain, ctx.currentTime);
  osc.connect(gn);
  gn.connect(masterGain);
  osc.start();
  oscs[id] = { osc, gain: gn };
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

function handleMsg(raw) {
  try {
    const msg = JSON.parse(raw);
    switch(msg.type) {
      case 'startTone': startTone(msg.id, msg.freq, msg.gain); break;
      case 'stopTone': stopTone(msg.id); break;
      case 'stopAll': stopAll(); break;
      case 'updateFreq': updateFreq(msg.id, msg.freq); break;
      case 'updateGain': updateGain(msg.id, msg.gain); break;
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
  startTone: (id: number, freq: number, gain: number) => {
    if (Platform.OS === 'web') {
      webStartTone(id, freq, gain);
    } else {
      sendToWebView({ type: 'startTone', id, freq, gain });
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
};

// ===== Web-only direct implementations =====
let audioCtx: AudioContext | null = null;
const webOscs: { [key: number]: { osc: OscillatorNode; gain: GainNode } } = {};
let webMasterGain: GainNode | null = null;

const ensureWebCtx = () => {
  if (Platform.OS !== 'web') return false;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    webMasterGain = audioCtx.createGain();
    webMasterGain.connect(audioCtx.destination);
    webMasterGain.gain.value = 0.5;
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return true;
};

const webStartTone = (id: number, freq: number, gain: number) => {
  if (!ensureWebCtx() || !audioCtx || !webMasterGain) return;
  if (webOscs[id]) {
    webOscs[id].osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    webOscs[id].gain.gain.setValueAtTime(gain, audioCtx.currentTime);
    return;
  }
  const osc = audioCtx.createOscillator();
  const gn = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  gn.gain.setValueAtTime(gain, audioCtx.currentTime);
  osc.connect(gn);
  gn.connect(webMasterGain);
  osc.start();
  webOscs[id] = { osc, gain: gn };
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
