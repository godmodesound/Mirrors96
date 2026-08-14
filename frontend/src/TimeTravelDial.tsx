import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { AudioEngine } from './AudioEngine';

// ═══════════════════════════════════════════════════════════════
// TIME TRAVEL DIAL — MIRROR CUBES // BRAIN
//
// Interactive pathway through the KRYSTAR LAST-Ascension cycle
// (2008-3333 AD). A Back-to-the-Future flux-capacitor style
// dial lets the user jump across the 5 Stages of Starfire.
// Each stage renders its "Wheels Within Wheels" sacred geometry
// live in the WebView canvas and plays its resonant chord.
//
//   STAGE 1  KaLE Hara            (2007-2008)   Eckasha-Aah P-4
//   STAGE 2  KaLA KRYSTA          (2008-2047)   Eckasha-A P-12
//   STAGE 3  HarA Krysta          (2052-2225)   Cosmic Corridor-4
//   STAGE 4  HarA Krystyanna      (2230-3230)   Universal Veca Q-4 M31
//   STAGE 5  REIsha Krystara      (3233-3333)   Staah-LEi-yas (6-vector)
// ═══════════════════════════════════════════════════════════════

interface Stage {
  key: string;
  n: number;
  name: string;
  start: number;
  end: number;
  geometry: string;
  glyph: string;
  color: string;
  chord: number[];      // resonance frequencies (Hz)
  narrative: string;
  eckashaDepth: number; // how many nested wheels to draw
}

const STAGES: Stage[] = [
  { key: 's1', n: 1, name: 'KaLE HARA',       start: 2007, end: 2008, geometry: 'ECKASHA-AAH P-4',       glyph: '⊕', color: '#7db7ff', chord: [396.0, 7.83],       narrative: 'Gates Open · AshaLA Host M3 Start',    eckashaDepth: 1 },
  { key: 's2', n: 2, name: 'KaLA KRYSTA',     start: 2008, end: 2047, geometry: 'ECKASHA-A SPECTRA-3',   glyph: '◎', color: '#5aff8a', chord: [432, 528],           narrative: 'EtorA Transfiguration · Eiradonis merger', eckashaDepth: 2 },
  { key: 's3', n: 3, name: 'HARA KRYSTA',     start: 2052, end: 2225, geometry: 'COSMIC CORRIDOR-4',     glyph: '◈', color: '#ffd75e', chord: [528, 639],           narrative: 'AdorA Transfiguration · Bi-Location',   eckashaDepth: 3 },
  { key: 's4', n: 4, name: 'HARA KRYSTYANNA', start: 2230, end: 3230, geometry: 'UNIVERSAL VECA Q-4 M31',glyph: '☼', color: '#ff9a3a', chord: [432, 963],           narrative: '1000 Years of Peace · AshaLA Earth',    eckashaDepth: 4 },
  { key: 's5', n: 5, name: 'REISHA KRYSTARA', start: 3233, end: 3333, geometry: 'STAAH-LEi-YAS (6-VEC)', glyph: '✦', color: '#c56aff', chord: [111, 963, 432],      narrative: 'Celestialing Vapor · Enter Adashi 1',   eckashaDepth: 5 },
];

const MIN_YEAR = 1985; // Back-to-the-Future reference floor
const MAX_YEAR = 3333;
const DEFAULT_YEAR = 2026;

function stageForYear(y: number): Stage {
  // Snap to the nearest stage: within a range = that stage,
  // between ranges = the following stage. Pre-2007 = pre-cycle.
  for (const s of STAGES) if (y >= s.start && y <= s.end) return s;
  for (let i = 0; i < STAGES.length; i++) if (y < STAGES[i].start) return STAGES[i];
  return STAGES[STAGES.length - 1];
}

// ── Canvas HTML: draws "wheels within wheels" for the current year ──
const buildHtml = () => `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>html,body{margin:0;padding:0;background:#000;overflow:hidden;height:100%;}canvas{display:block;width:100%;height:100%;}</style>
</head><body><canvas id="c"></canvas><script>
var cv=document.getElementById('c'),ctx=cv.getContext('2d'),W=0,H=0,CX=0,CY=0,R=0;
function resize(){W=window.innerWidth;H=window.innerHeight;cv.width=W;cv.height=H;CX=W/2;CY=H/2;R=Math.min(W,H)*0.42;}
resize();window.addEventListener('resize',resize);
var cfg={depth:1,color:'#7db7ff',year:2026,stageColor:'#7db7ff',spin:true};
function upd(c){try{if(typeof c==='string')c=JSON.parse(c);if(c.depth!==undefined)cfg.depth=c.depth;if(c.color)cfg.color=c.color;if(c.year!==undefined)cfg.year=c.year;if(c.spin!==undefined)cfg.spin=c.spin;}catch(e){}}
window.updateDial=upd;
window.addEventListener('message',function(e){upd(e.data);});
document.addEventListener('message',function(e){upd(e.data);});
// Wheels within wheels — 12 probability circles at 30° with N nested Eckashas
function drawWheel(cx,cy,r,rot,depth,alpha){
  ctx.save();
  ctx.strokeStyle=cfg.color;ctx.lineWidth=1;ctx.globalAlpha=alpha;
  // outer master circle
  ctx.beginPath();ctx.arc(cx,cy,r,0,6.2832);ctx.stroke();
  // 12 probability spokes at 30 degrees
  for(var k=0;k<12;k++){var a=rot+k*Math.PI/6;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*r,cy+Math.sin(a)*r);ctx.stroke();}
  // 12 inner probability wheels (30° sectors)
  ctx.globalAlpha=alpha*0.55;
  for(var i=0;i<12;i++){var a=rot+i*Math.PI/6;var pr=r*0.5;var px=cx+Math.cos(a)*r*0.5,py=cy+Math.sin(a)*r*0.5;ctx.beginPath();ctx.arc(px,py,pr,0,6.2832);ctx.stroke();}
  // 12 outer probability wheels forming the flower rim
  ctx.globalAlpha=alpha*0.35;
  for(var j=0;j<12;j++){var a2=rot+j*Math.PI/6+Math.PI/12;var pr2=r*0.35;var px2=cx+Math.cos(a2)*r*0.72,py2=cy+Math.sin(a2)*r*0.72;ctx.beginPath();ctx.arc(px2,py2,pr2,0,6.2832);ctx.stroke();}
  // 12 numeric markers (probability positions)
  ctx.font='bold 8px monospace';ctx.fillStyle=cfg.color;ctx.textAlign='center';ctx.globalAlpha=alpha*0.85;
  for(var m=0;m<12;m++){var a3=rot+m*Math.PI/6-Math.PI/2;var tx=cx+Math.cos(a3)*r*1.06,ty=cy+Math.sin(a3)*r*1.06+3;ctx.fillText(String(m+1),tx,ty);}
  ctx.restore();
  // Nested Eckasha spiral — offset & smaller
  if(depth>0){
    var off=r*0.35;
    var nx=cx-Math.cos(rot*0.7)*off,ny=cy-Math.sin(rot*0.7)*off;
    drawWheel(nx,ny,r*0.55,-rot*0.8,depth-1,alpha*0.7);
  }
}
var t0=performance.now();
function frame(t){
  var dt=(t-t0)/1000;
  ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fillRect(0,0,W,H);
  // shell rings — density scales with year (past = fewer, future = more)
  var rot=cfg.spin?dt*0.06:0;
  // subtle center singularity — the "birth point / light-body zero"
  ctx.fillStyle=cfg.color;ctx.globalAlpha=0.9;ctx.beginPath();ctx.arc(CX,CY,2.2,0,6.2832);ctx.fill();ctx.globalAlpha=1;
  drawWheel(CX,CY,R,rot,cfg.depth,0.85);
  // Year annotation floating at the top
  ctx.font='bold 9px monospace';ctx.fillStyle=cfg.color;ctx.globalAlpha=0.75;ctx.textAlign='center';
  ctx.fillText(String(cfg.year)+' AD',CX,20);
  ctx.globalAlpha=1;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({ready:true}));
</script></body></html>`;

export default function TimeTravelDial() {
  const [year, setYear] = useState(DEFAULT_YEAR);
  const [playing, setPlaying] = useState(false);
  const [spin, setSpin] = useState(true);
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);
  const stage = useMemo(() => stageForYear(year), [year]);
  const html = useMemo(() => buildHtml(), []);

  const send = useCallback((cfg: object) => {
    const json = JSON.stringify(cfg);
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.postMessage(json, '*'); } catch {}
    } else {
      webRef.current?.injectJavaScript(`window.updateDial&&window.updateDial(${JSON.stringify(json)});true;`);
    }
  }, []);

  // Push year+stage into canvas whenever they change
  useEffect(() => {
    send({ year, color: stage.color, depth: stage.eckashaDepth, spin });
  }, [year, stage, spin, send]);

  const jumpYear = (delta: number) => setYear(y => Math.max(MIN_YEAR, Math.min(MAX_YEAR, y + delta)));
  const warpTo = (y: number) => setYear(Math.max(MIN_YEAR, Math.min(MAX_YEAR, y)));
  const togglePlay = () => {
    if (playing) { AudioEngine.stopMulti(); setPlaying(false); }
    else { AudioEngine.playMulti(stage.chord, 0.3); setPlaying(true); }
  };

  // Stop any playing chord when unmounted
  useEffect(() => () => { AudioEngine.stopMulti(); }, []);

  // 4-digit LCD-style year — split into individual "flip" characters
  const yearDigits = String(year).padStart(4, '0').split('');

  // Slider position 0..1 across the KRYSTAR full range
  const sliderPct = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
  const stageMarkers = STAGES.map(s => ({
    n: s.n,
    color: s.color,
    pct: (s.start - MIN_YEAR) / (MAX_YEAR - MIN_YEAR),
  }));

  return (
    <View style={st.wrap}>
      {/* ── Header ── */}
      <View style={st.header}>
        <Text style={st.title}>◈ TIME TRAVEL DIAL</Text>
        <Text style={st.subtitle}>KRYSTAR LAST-ASCENSION CYCLE · 2008–3333 AD</Text>
      </View>

      {/* ── LCD-flip year display (BTTF style) ── */}
      <View style={[st.lcdWrap, { borderColor: stage.color }]}>
        <View style={st.lcdLabel}>
          <Text style={[st.lcdLabelTxt, { color: stage.color }]}>◈ DESTINATION</Text>
          <Text style={st.lcdSublabel}>YEAR · TARGET</Text>
        </View>
        <View style={st.lcdDigits}>
          {yearDigits.map((d, i) => (
            <View key={i} style={[st.lcdCell, { borderColor: stage.color + '80' }]}>
              <Text style={[st.lcdDigit, { color: stage.color }]}>{d}</Text>
            </View>
          ))}
          <Text style={[st.lcdSuffix, { color: stage.color }]}>AD</Text>
        </View>
      </View>

      {/* ── Wheels-within-wheels canvas ── */}
      <View style={[st.canvasStage, { borderColor: stage.color + '80' }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: html,
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000' },
            onLoad: () => send({ year, color: stage.color, depth: stage.eckashaDepth, spin }),
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html }}
            style={st.webview}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onLoadEnd={() => send({ year, color: stage.color, depth: stage.eckashaDepth, spin })}
          />
        )}
      </View>

      {/* ── Stage descriptor card ── */}
      <View style={[st.stageCard, { borderColor: stage.color }]}>
        <View style={st.stageRow1}>
          <Text style={[st.stageGlyph, { color: stage.color }]}>{stage.glyph}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[st.stageName, { color: stage.color }]}>
              STAGE {stage.n} · {stage.name}
            </Text>
            <Text style={st.stageDates}>{stage.start}–{stage.end} AD</Text>
          </View>
          <TouchableOpacity
            style={[st.playBtn, playing && { backgroundColor: stage.color, borderColor: stage.color }]}
            onPress={togglePlay}
            activeOpacity={0.75}
          >
            <Text style={[st.playGlyph, playing && { color: '#000' }]}>{playing ? '◼' : '▶'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={[st.stageGeometry, { color: stage.color }]}>◈ {stage.geometry}</Text>
        <Text style={st.stageNarrative}>{stage.narrative}</Text>
        <View style={st.stageChord}>
          <Text style={st.stageChordLbl}>CHORD:</Text>
          {stage.chord.map((f, i) => (
            <View key={i} style={[st.chordChip, { borderColor: stage.color + '80' }]}>
              <Text style={[st.chordChipTxt, { color: stage.color }]}>{f.toFixed(2)} Hz</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Year dial controls: ± jog + slider + warp presets ── */}
      <View style={st.dialRow}>
        <TouchableOpacity style={st.jogBtn} onPress={() => jumpYear(-100)} activeOpacity={0.7}>
          <Text style={st.jogTxt}>◀◀</Text>
          <Text style={st.jogSub}>-100y</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.jogBtn} onPress={() => jumpYear(-10)} activeOpacity={0.7}>
          <Text style={st.jogTxt}>◀</Text>
          <Text style={st.jogSub}>-10y</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.jogBtn} onPress={() => jumpYear(-1)} activeOpacity={0.7}>
          <Text style={st.jogTxt}>◁</Text>
          <Text style={st.jogSub}>-1y</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.jogBtn} onPress={() => jumpYear(1)} activeOpacity={0.7}>
          <Text style={st.jogTxt}>▷</Text>
          <Text style={st.jogSub}>+1y</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.jogBtn} onPress={() => jumpYear(10)} activeOpacity={0.7}>
          <Text style={st.jogTxt}>▶</Text>
          <Text style={st.jogSub}>+10y</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.jogBtn} onPress={() => jumpYear(100)} activeOpacity={0.7}>
          <Text style={st.jogTxt}>▶▶</Text>
          <Text style={st.jogSub}>+100y</Text>
        </TouchableOpacity>
      </View>

      {/* ── Timeline slider ── */}
      <View style={st.timelineWrap}>
        <View style={st.timelineTrack}>
          {/* stage color band segments */}
          {STAGES.map((s, i) => {
            const start = (s.start - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
            const end = (s.end - MIN_YEAR) / (MAX_YEAR - MIN_YEAR);
            return (
              <View
                key={s.key}
                style={{
                  position: 'absolute',
                  left: `${start * 100}%`,
                  width: `${(end - start) * 100}%`,
                  top: 0,
                  bottom: 0,
                  backgroundColor: s.color + '35',
                }}
              />
            );
          })}
          {stageMarkers.map(m => (
            <View
              key={m.n}
              style={{
                position: 'absolute',
                left: `${m.pct * 100}%`,
                top: -3,
                bottom: -3,
                width: 1,
                backgroundColor: m.color,
              }}
            />
          ))}
          {/* Playhead */}
          <View
            style={{
              position: 'absolute',
              left: `${sliderPct * 100}%`,
              top: -5,
              bottom: -5,
              width: 3,
              backgroundColor: stage.color,
              shadowColor: stage.color,
              shadowOpacity: 0.8,
              shadowRadius: 6,
            }}
          />
        </View>
        <View style={st.timelineLabels}>
          <Text style={st.timelineTick}>{MIN_YEAR}</Text>
          <Text style={st.timelineTick}>2500</Text>
          <Text style={st.timelineTick}>{MAX_YEAR}</Text>
        </View>
      </View>

      {/* ── Warp presets: jump to each KRYSTAR stage start ── */}
      <View style={st.warpRow}>
        <Text style={st.warpLbl}>WARP</Text>
        {STAGES.map(s => (
          <TouchableOpacity
            key={s.key}
            style={[st.warpChip, { borderColor: s.color + '80' }, stage.n === s.n && { backgroundColor: s.color + '20', borderColor: s.color }]}
            onPress={() => warpTo(s.start)}
            activeOpacity={0.7}
          >
            <Text style={[st.warpChipYr, { color: s.color }]}>{s.start}</Text>
            <Text style={[st.warpChipLbl, { color: s.color, opacity: 0.7 }]}>S{s.n}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Spin toggle ── */}
      <View style={st.spinRow}>
        <TouchableOpacity
          style={[st.spinBtn, spin && st.spinBtnOn]}
          onPress={() => setSpin(s => !s)}
          activeOpacity={0.75}
        >
          <Text style={[st.spinTxt, spin && { color: '#000' }]}>{spin ? '◈ SPIN ON' : '◇ SPIN OFF'}</Text>
        </TouchableOpacity>
        <Text style={st.hint}>◈ 6 TIME VECTORS = 1 TIME CONTINUUM</Text>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
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
  // ─── LCD DIGITS ───
  lcdWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    backgroundColor: '#000',
    gap: 10,
  },
  lcdLabel: {
    borderRightWidth: 1,
    borderRightColor: '#1a2028',
    paddingRight: 10,
  },
  lcdLabelTxt: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.4,
  },
  lcdSublabel: {
    color: '#5a646f',
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 1.2,
    marginTop: 2,
  },
  lcdDigits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    justifyContent: 'flex-end',
  },
  lcdCell: {
    width: 28,
    height: 40,
    borderWidth: 1,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
  },
  lcdDigit: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  lcdSuffix: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginLeft: 4,
  },
  // ─── Canvas stage ───
  canvasStage: {
    height: 260,
    backgroundColor: '#000',
    borderWidth: 1,
    borderRadius: 4,
    overflow: 'hidden',
  },
  webview: { flex: 1, backgroundColor: '#000000' },
  // ─── Stage descriptor ───
  stageCard: {
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 4,
    padding: 10,
    backgroundColor: '#050a05',
  },
  stageRow1: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageGlyph: { fontSize: 20, fontWeight: '900' },
  stageName: { fontSize: 11, fontWeight: '900', letterSpacing: 1.4 },
  stageDates: { color: '#5a646f', fontSize: 8, fontWeight: '800', letterSpacing: 1.4, marginTop: 2 },
  stageGeometry: { fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 6 },
  stageNarrative: { color: '#c9d2dd', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, marginTop: 3, opacity: 0.9 },
  stageChord: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, flexWrap: 'wrap' },
  stageChordLbl: { color: '#5a646f', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  chordChip: {
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 5,
    paddingVertical: 2,
    backgroundColor: '#000',
  },
  chordChipTxt: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  playBtn: {
    minWidth: 44, minHeight: 44,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#5aff8a', borderRadius: 3, backgroundColor: '#000',
  },
  playGlyph: { color: '#5aff8a', fontSize: 16, fontWeight: '900' },
  // ─── Jog / dial ───
  dialRow: { flexDirection: 'row', gap: 3, marginTop: 8 },
  jogBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 3,
    paddingVertical: 6,
    alignItems: 'center',
    backgroundColor: '#000',
    minHeight: 40,
  },
  jogTxt: { color: '#c9d2dd', fontSize: 10, fontWeight: '900' },
  jogSub: { color: '#5a646f', fontSize: 6, fontWeight: '800', letterSpacing: 0.8, marginTop: 2 },
  // ─── Timeline ───
  timelineWrap: { marginTop: 8, marginBottom: 4 },
  timelineTrack: {
    height: 8,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#1a2028',
    borderRadius: 4,
    overflow: 'visible',
    position: 'relative',
  },
  timelineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timelineTick: {
    color: '#5a646f',
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 1,
  },
  // ─── Warp presets ───
  warpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 6,
  },
  warpLbl: {
    color: '#5a646f',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.2,
    marginRight: 2,
  },
  warpChip: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 3,
    paddingVertical: 5,
    paddingHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#000',
  },
  warpChipYr: { fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  warpChipLbl: { fontSize: 6, fontWeight: '800', letterSpacing: 0.8, marginTop: 1 },
  // ─── Spin + hint ───
  spinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  spinBtn: {
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#000',
  },
  spinBtnOn: { borderColor: '#5aff8a', backgroundColor: '#5aff8a' },
  spinTxt: { color: '#7d8794', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  hint: {
    color: '#3a7a4a',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.4,
    flex: 1,
    textAlign: 'right',
  },
});
