import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { AudioEngine } from './AudioEngine';

import { skinStyles, SK, skinHtml } from './skins';

// ═══════════════════════════════════════════════════════════════
// MIRROR CUBES — 3D faceted periodic-table cube for the BRAIN tab
//
// Each face IS a "Mirror Cube" — a resonance chord of 6 elements
// bound by their neurobiological role. Frequencies are derived
// from primary emission spectral lines (Hans Cousto Cosmic Octave
// method) — octave-shifted into the audible 20-2000 Hz band.
//
//   Tap a single facet → plays that ONE element's Hz.
//   PLAY CUBE          → stacks ALL 6 frequencies of the current
//                        face together (the true "Mirror Cube" chord).
//   SPIN     — free-rotate mode
//   ALIGN    — snap face back to canonical order (+1 origin)
//   SCRAMBLE — randomize element positions within each face
// ═══════════════════════════════════════════════════════════════

export interface Element {
  sym: string;
  z: number;      // atomic number
  hz: number;     // audible-transposed frequency (Hz)
  name: string;
  color: string;  // category color
}

// Category palette (matches images: green metalloids, red transition, etc.)
const CAT = {
  chnops:   '#5aff8a',  // CHNOPS — bright green
  elec:     '#7db7ff',  // electrolyte alkali/alkaline — blue
  trace:    '#ff5e5e',  // trace transition metal — red
  noble:    '#ffd75e',  // noble gas — gold
  metalloid:'#c56aff',  // metalloid — purple
  reactive: '#ff9a3a',  // halogen/other reactive — orange
};

// 6 faces × 6 tiles per face = 36 elements
// Frequencies computed as: c / λ_primary_emission / 2^n, chosen n so 200 <= Hz <= 800
const FACES: { title: string; elems: Element[] }[] = [
  {
    title: 'ORGANIC CORE',
    elems: [
      { sym: 'H',  z: 1,  hz: 415.30, name: 'HYDROGEN',   color: CAT.chnops },
      { sym: 'C',  z: 6,  hz: 550.20, name: 'CARBON',     color: CAT.chnops },
      { sym: 'N',  z: 7,  hz: 544.99, name: 'NITROGEN',   color: CAT.chnops },
      { sym: 'O',  z: 8,  hz: 350.83, name: 'OXYGEN',     color: CAT.chnops },
      { sym: 'P',  z: 15, hz: 638.31, name: 'PHOSPHORUS', color: CAT.chnops },
      { sym: 'S',  z: 16, hz: 296.10, name: 'SULFUR',     color: CAT.chnops },
    ],
  },
  {
    title: 'ELECTROLYTES',
    elems: [
      { sym: 'Li', z: 3,  hz: 406.65, name: 'LITHIUM',   color: CAT.elec },
      { sym: 'Na', z: 11, hz: 463.02, name: 'SODIUM',    color: CAT.elec },
      { sym: 'Mg', z: 12, hz: 478.06, name: 'MAGNESIUM', color: CAT.elec },
      { sym: 'K',  z: 19, hz: 355.85, name: 'POTASSIUM', color: CAT.elec },
      { sym: 'Ca', z: 20, hz: 322.68, name: 'CALCIUM',   color: CAT.elec },
      { sym: 'Cl', z: 17, hz: 375.86, name: 'CHLORINE',  color: CAT.elec },
    ],
  },
  {
    title: 'TRACE METALS',
    elems: [
      { sym: 'Fe', z: 26, hz: 353.30, name: 'IRON',      color: CAT.trace },
      { sym: 'Cu', z: 29, hz: 419.89, name: 'COPPER',    color: CAT.trace },
      { sym: 'Zn', z: 30, hz: 637.60, name: 'ZINC',      color: CAT.trace },
      { sym: 'Mn', z: 25, hz: 505.42, name: 'MANGANESE', color: CAT.trace },
      { sym: 'Se', z: 34, hz: 703.11, name: 'SELENIUM',  color: CAT.trace },
      { sym: 'I',  z: 53, hz: 498.34, name: 'IODINE',    color: CAT.trace },
    ],
  },
  {
    title: 'NOBLE GASES',
    elems: [
      { sym: 'He', z: 2,  hz: 464.20, name: 'HELIUM',  color: CAT.noble },
      { sym: 'Ne', z: 10, hz: 426.02, name: 'NEON',    color: CAT.noble },
      { sym: 'Ar', z: 18, hz: 336.10, name: 'ARGON',   color: CAT.noble },
      { sym: 'Kr', z: 36, hz: 388.72, name: 'KRYPTON', color: CAT.noble },
      { sym: 'Xe', z: 54, hz: 471.55, name: 'XENON',   color: CAT.noble },
      { sym: 'Rn', z: 86, hz: 447.30, name: 'RADON',   color: CAT.noble },
    ],
  },
  {
    title: 'METALLOIDS',
    elems: [
      { sym: 'B',  z: 5,  hz: 545.94, name: 'BORON',    color: CAT.metalloid },
      { sym: 'Si', z: 14, hz: 541.94, name: 'SILICON',  color: CAT.metalloid },
      { sym: 'Ge', z: 32, hz: 512.20, name: 'GERMANIUM',color: CAT.metalloid },
      { sym: 'As', z: 33, hz: 620.44, name: 'ARSENIC',  color: CAT.metalloid },
      { sym: 'Sb', z: 51, hz: 448.15, name: 'ANTIMONY', color: CAT.metalloid },
      { sym: 'Te', z: 52, hz: 396.75, name: 'TELLURIUM',color: CAT.metalloid },
    ],
  },
  {
    title: 'REACTIVE',
    elems: [
      { sym: 'F',  z: 9,  hz: 397.86, name: 'FLUORINE', color: CAT.reactive },
      { sym: 'Br', z: 35, hz: 419.02, name: 'BROMINE',  color: CAT.reactive },
      { sym: 'Al', z: 13, hz: 344.29, name: 'ALUMINUM', color: CAT.reactive },
      { sym: 'Sn', z: 50, hz: 458.60, name: 'TIN',      color: CAT.reactive },
      { sym: 'Mo', z: 42, hz: 471.86, name: 'MOLYBDENUM',color: CAT.reactive },
      { sym: 'Cd', z: 48, hz: 512.44, name: 'CADMIUM',  color: CAT.reactive },
    ],
  },
];

// Build the HTML for a real CSS-3D rotating cube. Each face is a 3x2 grid of
// diamond-shaped element tiles. The cube auto-spins when SPIN is on and
// can be swiped/dragged to inspect any face.
const buildHtml = (faces: typeof FACES) => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
html,body{margin:0;padding:0;background:#000;overflow:hidden;height:100%;color:#eee;font-family:'Courier New',monospace;-webkit-user-select:none;user-select:none;}
.stage{position:absolute;inset:0;perspective:900px;perspective-origin:50% 45%;}
.cube{position:absolute;left:50%;top:50%;width:220px;height:220px;transform-style:preserve-3d;margin-left:-110px;margin-top:-110px;transition:transform 0.6s cubic-bezier(0.22,1,0.36,1);}
.face{position:absolute;left:0;top:0;width:220px;height:220px;background:rgba(3,5,9,0.92);border:1px solid rgba(255,255,255,0.18);box-sizing:border-box;padding:12px;display:flex;flex-direction:column;box-shadow:0 0 30px rgba(0,0,0,0.6) inset;}
.face .title{font-size:8px;font-weight:900;letter-spacing:2px;color:#7d8794;text-align:center;margin-bottom:6px;text-transform:uppercase;}
.grid{flex:1;display:grid;grid-template-columns:1fr 1fr 1fr;grid-template-rows:1fr 1fr;gap:6px;}
.tile{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.10);background:rgba(0,0,0,0.55);border-radius:2px;transform:rotate(0deg);cursor:pointer;transition:transform 0.18s, border-color 0.18s, background 0.18s;overflow:hidden;}
.tile .diamond{position:absolute;inset:6px;transform:rotate(45deg);border:1px solid currentColor;opacity:0.35;pointer-events:none;}
.tile .sym{font-size:22px;font-weight:900;letter-spacing:1px;line-height:1;}
.tile .z{font-size:8px;font-weight:800;opacity:0.75;margin-top:2px;}
.tile .hz{font-size:7px;font-weight:800;letter-spacing:0.6px;color:#c9d2dd;opacity:0.55;margin-top:1px;}
.tile:active{transform:scale(0.94);}
.tile.on{border-color:currentColor;background:rgba(255,255,255,0.05);box-shadow:0 0 12px currentColor;}
.tile.on .hz{opacity:1;color:currentColor;}
.f0{transform:rotateY(  0deg) translateZ(110px);}
.f1{transform:rotateY( 90deg) translateZ(110px);}
.f2{transform:rotateY(180deg) translateZ(110px);}
.f3{transform:rotateY(-90deg) translateZ(110px);}
.f4{transform:rotateX( 90deg) translateZ(110px);}
.f5{transform:rotateX(-90deg) translateZ(110px);}
.readout{position:absolute;left:0;right:0;bottom:8px;text-align:center;font-size:9px;font-weight:900;letter-spacing:1.5px;color:#ff0a0a;pointer-events:none;text-shadow:0 0 6px rgba(255,10,10,0.5);}
.status{position:absolute;left:0;right:0;top:6px;text-align:center;font-size:8px;font-weight:900;letter-spacing:2px;color:#5a646f;pointer-events:none;}
</style></head><body>
<div class="stage" id="stage">
  <div class="cube" id="cube">
    ${faces.map((face, fi) => `
    <div class="face f${fi}" data-face="${fi}">
      <div class="title">${face.title}</div>
      <div class="grid">
        ${face.elems.map((e, ei) => `
          <div class="tile" data-face="${fi}" data-slot="${ei}" data-hz="${e.hz}" data-sym="${e.sym}" data-name="${e.name}" style="color:${e.color};">
            <div class="diamond"></div>
            <div class="sym">${e.sym}</div>
            <div class="z">${e.z}</div>
            <div class="hz">${e.hz.toFixed(1)}</div>
          </div>
        `).join('')}
      </div>
    </div>`).join('')}
  </div>
  <div class="status" id="status">◈ TAP A FACET · SPIN TO ORBIT</div>
  <div class="readout" id="readout"></div>
</div>
<script>
var cube=document.getElementById('cube'),readout=document.getElementById('readout'),status=document.getElementById('status');
var rotX=-18,rotY=22,dragging=false,lx=0,ly=0,spin=false,spinRAF=null,tPrev=0;
var lastTilesData=null;
function post(o){var j=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(j);else if(window.parent&&window.parent!==window)window.parent.postMessage(j,'*');}
function apply(){cube.style.transform='rotateX('+rotX+'deg) rotateY('+rotY+'deg)';}
apply();
function loop(ts){if(!spin){spinRAF=null;return;}if(!tPrev)tPrev=ts;var dt=(ts-tPrev)/1000;tPrev=ts;rotY+=dt*24;apply();spinRAF=requestAnimationFrame(loop);}
function startSpin(){if(spin)return;spin=true;tPrev=0;cube.style.transition='none';spinRAF=requestAnimationFrame(loop);}
function stopSpin(){spin=false;cube.style.transition='transform 0.6s cubic-bezier(0.22,1,0.36,1)';}
function snapToFace(faceIdx){
  stopSpin();
  var map=[{x:-10,y:0},{x:-10,y:-90},{x:-10,y:180},{x:-10,y:90},{x:-90,y:0},{x:90,y:0}];
  rotX=map[faceIdx].x;rotY=map[faceIdx].y;apply();
}
// Pointer drag for manual orbit
function down(e){dragging=true;stopSpin();var t=e.touches?e.touches[0]:e;lx=t.clientX;ly=t.clientY;}
function move(e){if(!dragging)return;var t=e.touches?e.touches[0]:e;var dx=t.clientX-lx,dy=t.clientY-ly;rotY+=dx*0.5;rotX-=dy*0.5;lx=t.clientX;ly=t.clientY;cube.style.transition='none';apply();e.preventDefault&&e.preventDefault();}
function up(){dragging=false;cube.style.transition='transform 0.6s cubic-bezier(0.22,1,0.36,1)';}
document.addEventListener('mousedown',down);document.addEventListener('mousemove',move);document.addEventListener('mouseup',up);
document.addEventListener('touchstart',down,{passive:true});document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',up);
// Tile tap → post to RN
var last=null;
document.addEventListener('click',function(ev){
  var el=ev.target;while(el&&!el.dataset)el=el.parentElement;
  while(el && !(el.dataset && el.dataset.hz))el=el.parentElement;
  if(!el)return;
  var hz=parseFloat(el.dataset.hz),sym=el.dataset.sym,name=el.dataset.name,face=parseInt(el.dataset.face);
  if(last)last.classList.remove('on');
  el.classList.add('on');last=el;
  readout.textContent='◈ '+sym+' · '+name+' · '+hz.toFixed(2)+' Hz · A=432';
  post({src:'mirrorcubes',type:'element',sym:sym,name:name,hz:hz,face:face});
});
// External control messages
function handle(raw){try{var m=typeof raw==='string'?JSON.parse(raw):raw;if(m.cmd==='spin'){m.on?startSpin():stopSpin();}
else if(m.cmd==='align'){stopSpin();rotX=-18;rotY=22;apply();
  // Restore original element order to whichever face is toward viewer
  restoreOrder();
  status.textContent='◈ ALIGNED · '+(m.origins||0)+'/6 ORIGINS';
}
else if(m.cmd==='scramble'){
  scrambleTiles();
  status.textContent='◈ SCRAMBLED · '+(m.origins||0)+'/6 ORIGINS';
}
else if(m.cmd==='face'){snapToFace(m.idx);}
else if(m.cmd==='pulse'){
  var sel=document.querySelector('.tile[data-face="'+m.face+'"][data-slot="'+m.slot+'"]');
  if(sel){if(last)last.classList.remove('on');sel.classList.add('on');last=sel;
    readout.textContent='⇄ '+m.sym+' · '+Number(m.hz).toFixed(2)+' Hz → TEMPORAL DIAL';}
}
else if(m.cmd==='clear'){if(last){last.classList.remove('on');last=null;}readout.textContent='';}
}catch(e){}}
document.addEventListener('message',function(e){handle(e.data);});
window.addEventListener('message',function(e){handle(e.data);});
// Snapshot the original tile order per face for restoration
var faceTiles=[];
for(var fi=0;fi<6;fi++){
  var grid=document.querySelectorAll('.f'+fi+' .grid')[0];
  var kids=Array.prototype.slice.call(grid.children);
  faceTiles.push({grid:grid,order:kids.slice()});
}
function scrambleTiles(){
  faceTiles.forEach(function(f){
    var shuffled=f.order.slice();
    for(var i=shuffled.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=shuffled[i];shuffled[i]=shuffled[j];shuffled[j]=t;}
    // clear + reinsert
    while(f.grid.firstChild)f.grid.removeChild(f.grid.firstChild);
    shuffled.forEach(function(k){f.grid.appendChild(k);});
  });
}
function restoreOrder(){
  faceTiles.forEach(function(f){
    while(f.grid.firstChild)f.grid.removeChild(f.grid.firstChild);
    f.order.forEach(function(k){f.grid.appendChild(k);});
  });
}
window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({ready:true}));
</script></body></html>`;

// ═══ TEMPORAL RESONATOR — sequential emission driving the Time Travel Dial ═══
export interface ResonatorEmission {
  sym: string;
  name: string;
  hz: number;
  color: string;
  step: number;   // absolute step count since resonator start
  face: number;
  ts: number;
}

interface Props {
  onElement?: (e: Element, face: number) => void;
  onEmit?: (emission: ResonatorEmission | null) => void; // null = resonator stopped
}

const RES_TONE_ID = 4300;
const RES_STEP_MS = 1500;

export default function ElementCube({ onElement, onEmit }: Props) {
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);
  const [spinning, setSpinning] = useState(false);
  const [origins, setOrigins] = useState(6);           // 6/6 aligned by default
  const [selected, setSelected] = useState<Element | null>(null);
  const [face, setFace] = useState<number>(0);
  const [scrambled, setScrambled] = useState(false);
  const currentToneId = useRef<number>(4200);
  // Multi-freq "cube chord" state — playing all 6 frequencies of a face together
  const [cubePlaying, setCubePlaying] = useState<number | null>(null);

  const html = React.useMemo(() => buildHtml(FACES), []);

  const send = useCallback((msg: object) => {
    const json = JSON.stringify(msg);
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.postMessage(json, '*'); } catch {}
    } else {
      webRef.current?.injectJavaScript(`window.postMessage(${JSON.stringify(json)}, '*'); true;`);
    }
  }, []);

  // Handle facet taps from the cube WebView
  const onWebMessage = useCallback((raw: string) => {
    try {
      const data = JSON.parse(raw);
      if (data.type === 'element') {
        const flat = FACES.flatMap(f => f.elems);
        const el = flat.find(e => e.sym === data.sym);
        if (el) {
          setSelected(el);
          setFace(data.face);
          // Exact element frequency — engine tuning defaults to A=432 (pass-through)
          AudioEngine.startTone(currentToneId.current, el.hz, 0.35, 'sine');
          onElement && onElement(el, data.face);
        }
      }
    } catch {}
  }, [onElement]);

  // Web: facet taps arrive via window messages from the iframe
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const h = (e: MessageEvent) => {
      try {
        const d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d && d.src === 'mirrorcubes' && d.type === 'element') onWebMessage(typeof e.data === 'string' ? e.data : JSON.stringify(e.data));
      } catch {}
    };
    window.addEventListener('message', h);
    return () => window.removeEventListener('message', h);
  }, [onWebMessage]);

  useEffect(() => {
    // Auto-stop tone after 3s so it doesn't ring forever
    if (!selected) return;
    const t = setTimeout(() => AudioEngine.stopTone(currentToneId.current), 3200);
    return () => clearTimeout(t);
  }, [selected]);

  // Cleanup on unmount
  useEffect(() => () => { AudioEngine.stopTone(currentToneId.current); }, []);

  const toggleSpin = () => {
    const next = !spinning;
    setSpinning(next);
    send({ cmd: 'spin', on: next });
  };
  const align = () => {
    send({ cmd: 'align', origins: 6 });
    setOrigins(6);
    setScrambled(false);
  };
  const scramble = () => {
    // Every scramble breaks 1 origin, minimum 0 remaining. When 0, next
    // scramble wraps back to 5 so the readout keeps engaging.
    const next = scrambled ? Math.max(0, origins - 1) : 5;
    setOrigins(next);
    setScrambled(true);
    send({ cmd: 'scramble', origins: next });
  };

  // ═══ PLAY CUBE — stack all 6 element frequencies of the current face.
  //     Each face is a "Mirror Cube" — a chord of neurobiologically-linked
  //     resonances. Second tap toggles off. ═══
  const playCube = () => {
    if (cubePlaying === face) {
      AudioEngine.stopMulti();
      setCubePlaying(null);
      return;
    }
    const freqs = FACES[face].elems.map(e => e.hz);
    AudioEngine.playMulti(freqs, 0.28);
    setCubePlaying(face);
    setSelected(null);
  };

  // Auto-stop cube chord if user switches face away from playing one
  useEffect(() => {
    if (cubePlaying !== null && cubePlaying !== face) {
      AudioEngine.stopMulti();
      setCubePlaying(null);
    }
  }, [face, cubePlaying]);

  // Cleanup: stop cube chord on unmount
  useEffect(() => () => { AudioEngine.stopMulti(); }, []);

  // ═══ TEMPORAL RESONATOR — sequentially emit each element of the current
  //     face (step-sequencer). Every emission fires onEmit() → drives the
  //     Time Travel Dial in real time as an in-sync frequency resonator. ═══
  const [resonating, setResonating] = useState(false);
  const [resStep, setResStep] = useState(0);
  const stepRef = useRef(0);
  const faceRef = useRef(face);
  const resTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => { faceRef.current = face; }, [face]);

  const emitStep = useCallback(() => {
    const f = faceRef.current;
    const idx = stepRef.current % 6;
    const el = FACES[f].elems[idx];
    AudioEngine.startTone(RES_TONE_ID, el.hz, 0.3, 'sine');
    send({ cmd: 'pulse', face: f, slot: idx, sym: el.sym, hz: el.hz });
    setResStep(idx);
    onEmit && onEmit({ sym: el.sym, name: el.name, hz: el.hz, color: el.color, step: stepRef.current, face: f, ts: Date.now() });
    stepRef.current += 1;
  }, [send, onEmit]);

  const toggleResonate = () => {
    if (resonating) {
      if (resTimer.current) clearInterval(resTimer.current);
      resTimer.current = null;
      AudioEngine.stopTone(RES_TONE_ID);
      send({ cmd: 'clear' });
      setResonating(false);
      onEmit && onEmit(null);
    } else {
      stepRef.current = 0;
      setResonating(true);
      emitStep();
      resTimer.current = setInterval(emitStep, RES_STEP_MS);
    }
  };

  // Cleanup resonator on unmount
  useEffect(() => () => {
    if (resTimer.current) clearInterval(resTimer.current);
    AudioEngine.stopTone(RES_TONE_ID);
  }, []);


  return (
    <View style={st.wrap}>
      <View style={st.header}>
        <Text style={st.title}>◈ MIRROR CUBES</Text>
        <Text style={st.subtitle}>36 BRAIN ELEMENTS · 6 CUBE CHORDS · COSMIC-OCTAVE Hz · A=432 TUNING</Text>
      </View>

      <View style={st.stage}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: skinHtml(html),
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: SK('#000') },
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html: skinHtml(html) }}
            style={st.webview}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onMessage={(ev) => onWebMessage(ev.nativeEvent.data)}
          />
        )}
      </View>

      {/* Live readout of the tapped element */}
      <View style={st.readoutBar}>
        {selected ? (
          <>
            <View style={[st.readoutDot, { backgroundColor: selected.color }]} />
            <Text style={[st.readoutSym, { color: selected.color }]}>{selected.sym}</Text>
            <Text style={st.readoutName}>{selected.name}</Text>
            <Text style={[st.readoutHz, { color: selected.color }]}>{selected.hz.toFixed(2)} Hz · A=432</Text>
            <Text style={st.readoutFace}>{FACES[face]?.title}</Text>
          </>
        ) : (
          <Text style={st.readoutHint}>TAP A FACET · OR PLAY THE ENTIRE CUBE BELOW</Text>
        )}
      </View>

      {/* ═══ PLAY CUBE — stack all 6 face frequencies together ═══ */}
      <TouchableOpacity
        style={[st.cubePlayBtn, cubePlaying === face && st.cubePlayBtnActive]}
        onPress={playCube}
        activeOpacity={0.75}
      >
        <Text style={[st.cubePlayGlyph, cubePlaying === face && st.cubePlayGlyphActive]}>
          {cubePlaying === face ? '◼' : '▶'}
        </Text>
        <View style={{ flex: 1 }}>
          <Text style={[st.cubePlayTitle, cubePlaying === face && st.cubePlayTitleActive]}>
            {cubePlaying === face ? 'STOP MIRROR CUBE' : `PLAY MIRROR CUBE · ${FACES[face].title}`}
          </Text>
          <View style={st.cubeChord}>
            {FACES[face].elems.map((e) => (
              <View key={e.sym} style={[st.cubeChordChip, { borderColor: e.color + (cubePlaying === face ? 'ff' : '80') }]}>
                <Text style={[st.cubeChordSym, { color: e.color }]}>{e.sym}</Text>
                <Text style={[st.cubeChordHz, { color: e.color, opacity: cubePlaying === face ? 1 : 0.75 }]}>{e.hz.toFixed(1)}</Text>
              </View>
            ))}
          </View>
        </View>
      </TouchableOpacity>

      {/* ═══ TEMPORAL RESONATOR — sequential emission → Time Travel Dial ═══ */}
      <TouchableOpacity
        style={[st.resBtn, resonating && st.resBtnActive]}
        onPress={toggleResonate}
        activeOpacity={0.75}
      >
        <Text style={[st.resGlyph, resonating && st.resGlyphActive]}>⇄</Text>
        <View style={{ flex: 1 }}>
          <Text style={[st.resTitle, resonating && st.resTitleActive]}>
            {resonating ? 'RESONATING → TIME TRAVEL DIAL' : 'TEMPORAL RESONATOR · EMIT SEQUENCE → DIAL'}
          </Text>
          <Text style={st.resSub}>
            {resonating
              ? `STEP ${resStep + 1}/6 · ${FACES[face].elems[resStep]?.sym} ${FACES[face].elems[resStep]?.hz.toFixed(1)} Hz → TEMPORAL COORDINATE`
              : 'EACH ELEMENT Hz WARPS THE DIAL TO ITS YEAR · IN-SYNC'}
          </Text>
        </View>
        <View style={st.resSteps}>
          {FACES[face].elems.map((e, i) => (
            <View
              key={e.sym}
              style={[
                st.resStepDot,
                { borderColor: e.color },
                resonating && resStep === i && { backgroundColor: e.color, shadowColor: e.color, shadowOpacity: 0.9, shadowRadius: 5 },
              ]}
            />
          ))}
        </View>
      </TouchableOpacity>

      {/* Controls: SCRAMBLE · ALIGN · SPIN + origins readout */}
      <View style={st.controlRow}>
        <TouchableOpacity style={st.ctlBtn} onPress={scramble} activeOpacity={0.7}>
          <Text style={st.ctlTxt}>SCRAMBLE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.ctlBtn} onPress={align} activeOpacity={0.7}>
          <Text style={st.ctlTxt}>ALIGN</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.ctlBtn, spinning && st.ctlBtnActive]}
          onPress={toggleSpin}
          activeOpacity={0.7}
        >
          <Text style={[st.ctlTxt, spinning && st.ctlTxtActive]}>SPIN</Text>
        </TouchableOpacity>
        <Text style={st.originsTxt}>{origins} / 6 ORIGINS ALIGNED</Text>
      </View>

      {/* Face-jump chips — snap the cube to any face */}
      <View style={st.faceChipRow}>
        {FACES.map((f, i) => (
          <TouchableOpacity
            key={f.title}
            style={[st.faceChip, face === i && st.faceChipOn]}
            onPress={() => { send({ cmd: 'face', idx: i }); setFace(i); }}
            activeOpacity={0.7}
          >
            <Text style={[st.faceChipTxt, face === i && st.faceChipTxtOn]}>{f.title.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={st.footNote}>
        FREQUENCIES DERIVED FROM PRIMARY EMISSION SPECTRA · HANS COUSTO COSMIC OCTAVE METHOD
      </Text>
    </View>
  );
}

const st = skinStyles({
  wrap: {
    borderWidth: 1,
    borderColor: '#0a2a0a',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
    backgroundColor: '#020a02',
  },
  header: { alignItems: 'center', marginBottom: 8 },
  title: {
    color: '#5aff8a',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
  },
  subtitle: {
    color: '#3a7a4a',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 3,
  },
  stage: {
    height: 300,
    backgroundColor: '#000',
    borderWidth: 1,
    borderColor: '#0a2a0a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  webview: { flex: 1, backgroundColor: '#000000' },
  readoutBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#0a2a0a',
    backgroundColor: '#050a05',
    borderRadius: 4,
    minHeight: 30,
  },
  readoutDot: { width: 6, height: 6, borderRadius: 3 },
  readoutSym: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  readoutName: { color: '#c9d2dd', fontSize: 9, fontWeight: '800', letterSpacing: 1, flex: 1 },
  readoutHz: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  readoutFace: { color: '#5a646f', fontSize: 7, fontWeight: '800', letterSpacing: 1.4 },
  readoutHint: { color: '#3a7a4a', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, textAlign: 'center', flex: 1 },
  // ═══ PLAY CUBE bar — stacks all 6 face frequencies as a chord ═══
  cubePlayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#0a2a0a',
    borderRadius: 4,
    backgroundColor: '#040a04',
    minHeight: 56,
  },
  cubePlayBtnActive: {
    borderColor: '#5aff8a',
    backgroundColor: 'rgba(90,255,138,0.10)',
    shadowColor: '#5aff8a',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  cubePlayGlyph: {
    color: '#3a7a4a',
    fontSize: 20,
    fontWeight: '900',
  },
  cubePlayGlyphActive: { color: '#5aff8a' },
  cubePlayTitle: {
    color: '#3a7a4a',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  cubePlayTitleActive: { color: '#5aff8a' },
  cubeChord: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    marginTop: 5,
  },
  cubeChordChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: '#000',
  },
  cubeChordSym: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  cubeChordHz: {
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  // ═══ TEMPORAL RESONATOR bar ═══
  resBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#1a2a3a',
    borderRadius: 4,
    backgroundColor: '#02060c',
    minHeight: 52,
  },
  resBtnActive: {
    borderColor: '#7db7ff',
    backgroundColor: 'rgba(125,183,255,0.10)',
    shadowColor: '#7db7ff',
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  resGlyph: {
    color: '#3a5a7a',
    fontSize: 20,
    fontWeight: '900',
  },
  resGlyphActive: { color: '#7db7ff' },
  resTitle: {
    color: '#3a5a7a',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  resTitleActive: { color: '#7db7ff' },
  resSub: {
    color: '#5a646f',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  resSteps: {
    flexDirection: 'row',
    gap: 4,
  },
  resStepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: '#000',
  },
  ctlBtn: {
    borderWidth: 1,
    borderColor: '#2a3340',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  ctlBtnActive: {
    borderColor: '#5aff8a',
    backgroundColor: 'rgba(90,255,138,0.12)',
  },
  ctlTxt: {
    color: '#7d8794',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  ctlTxtActive: { color: '#5aff8a' },
  originsTxt: {
    marginLeft: 'auto',
    color: '#5aff8a',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  faceChipRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 6,
    flexWrap: 'wrap',
  },
  faceChip: {
    borderWidth: 1,
    borderColor: '#1a2028',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 2,
    backgroundColor: '#000',
    flex: 1,
    alignItems: 'center',
  },
  faceChipOn: {
    borderColor: '#5aff8a',
    backgroundColor: 'rgba(90,255,138,0.10)',
  },
  faceChipTxt: {
    color: '#5a646f',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  faceChipTxtOn: { color: '#5aff8a' },
  footNote: {
    color: '#3a7a4a',
    fontSize: 6,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 9,
  },
});
