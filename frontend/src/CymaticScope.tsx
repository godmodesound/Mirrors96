import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';
import { AudioEngine, ScopeFrame } from './AudioEngine';

// ═══════════════════════════════════════════════════════════
// CYMATIC HYBRID OSCILLOSCOPE — audio-reactive master-bus visualizer
// 2 axes:
//   MEDIUM   → visual substrate (sand · water · mercury · fire …)
//   GEOMETRY → sacred-geometry overlay (Flower of Life, Metatron,
//              Sri Yantra, Vesica, Merkaba, Phi Spiral, N-gon)
// Both react to real time-domain data from AudioEngine (all layers).
// ═══════════════════════════════════════════════════════════

export const MEDIUMS = ['CHLADNI', 'WATER', 'SAND', 'CYMATICS', 'MERCURY', 'GOLD', 'FIRE'] as const;
export type Medium = typeof MEDIUMS[number];

const MEDIUM_COLORS: Record<Medium, string> = {
  CHLADNI: '#7de87d',
  WATER: '#5fc9ff',
  SAND: '#e8c87d',
  CYMATICS: '#8dff9d',
  MERCURY: '#d8dce8',
  GOLD: '#ffd75e',
  FIRE: '#ff5a2a',
};

export const GEOMETRIES = ['NONE', 'FLOWER', 'METATRON', 'SRI', 'VESICA', 'MERKABA', 'SPIRAL', 'NGON'] as const;
export type Geometry = typeof GEOMETRIES[number];

const GEOMETRY_LABEL: Record<Geometry, string> = {
  NONE: '— NONE',
  FLOWER: 'FLOWER OF LIFE',
  METATRON: "METATRON",
  SRI: 'SRI YANTRA',
  VESICA: 'VESICA PISCIS',
  MERKABA: 'MERKABA',
  SPIRAL: 'PHI SPIRAL',
  NGON: 'N-GON',
};

const SCOPE_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:#000;overflow:hidden;}canvas{display:block;}</style>
</head><body>
<canvas id="c"></canvas>
<script>
var canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
var W=0,H=0,CX=0,CY=0,R0=0;
function resize(){W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H;CX=W/2;CY=H/2;R0=Math.min(W,H)*0.40;}
resize();window.addEventListener('resize',resize);
var cfg={freqs:[432],playing:false,medium:'CYMATICS',geometry:'NONE'};
var LIVE={wave:new Array(128).fill(128),peak:0,ts:0};
var PAL={
  CHLADNI:{main:'#9be89b',glow:'#3aff6e',dim:'rgba(125,232,125,0.10)'},
  WATER:{main:'#8fd8ff',glow:'#19b6ff',dim:'rgba(95,201,255,0.10)'},
  SAND:{main:'#eed9a6',glow:'#d9a441',dim:'rgba(232,200,125,0.10)'},
  CYMATICS:{main:'#a8f0a0',glow:'#4dff77',dim:'rgba(141,255,157,0.10)'},
  MERCURY:{main:'#eceef5',glow:'#aab4c8',dim:'rgba(216,220,232,0.10)'},
  GOLD:{main:'#ffe08a',glow:'#ffaa00',dim:'rgba(255,215,94,0.10)'},
  FIRE:{main:'#ff9a5a',glow:'#ff2a0a',dim:'rgba(255,90,42,0.10)'}
};
window.updateScope=function(c){try{if(typeof c==='string')c=JSON.parse(c);if(c.freqs)cfg.freqs=c.freqs;if(typeof c.playing==='boolean')cfg.playing=c.playing;if(c.medium)cfg.medium=c.medium;if(c.geometry)cfg.geometry=c.geometry;}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);if(w&&w.wave){LIVE.wave=w.wave;LIVE.peak=w.peak||0;LIVE.ts=performance.now();}}catch(e){}};
window.addEventListener('message',function(e){
  var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}}catch(_){}
  window.updateScope(d);
});
document.addEventListener('message',function(e){
  var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}}catch(_){}
  window.updateScope(d);
});
function polarGrid(p){
  ctx.strokeStyle=p.dim;ctx.lineWidth=0.5;
  for(var i=0;i<24;i++){var a=i*Math.PI/12;ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(CX+Math.cos(a)*R0*1.22,CY+Math.sin(a)*R0*1.22);ctx.stroke();}
  for(var k=1;k<=4;k++){ctx.beginPath();ctx.arc(CX,CY,R0*1.15*k/4,0,6.2832);ctx.stroke();}
}

// ═══ SACRED GEOMETRY OVERLAYS ═══
function circleAt(x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,6.2832);ctx.stroke();}
function polygon(x,y,r,n,rot){
  ctx.beginPath();
  for(var i=0;i<=n;i++){var a=rot+i*6.2832/n;var px=x+Math.cos(a)*r,py=y+Math.sin(a)*r;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}
  ctx.stroke();
}
function starLine(x1,y1,x2,y2){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();}

function drawFlower(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1;ctx.globalAlpha=0.35+env*0.55;
  var r=R*0.28;
  // Center
  circleAt(CX,CY,r);
  // 6 surrounding petals
  for(var i=0;i<6;i++){var a=rot+i*Math.PI/3;circleAt(CX+Math.cos(a)*r,CY+Math.sin(a)*r,r);}
  // Outer ring 12
  ctx.globalAlpha=0.22+env*0.45;
  for(var j=0;j<12;j++){var a2=rot+j*Math.PI/6;var d=r*Math.sqrt(3);circleAt(CX+Math.cos(a2)*d,CY+Math.sin(a2)*d,r);}
  // Halo
  ctx.globalAlpha=0.5+env*0.5;
  circleAt(CX,CY,R);
}

function drawMetatron(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1;ctx.globalAlpha=0.55+env*0.4;
  var r=R*0.13;
  var pts=[[CX,CY]];
  // 6 inner
  for(var i=0;i<6;i++){var a=rot+i*Math.PI/3;pts.push([CX+Math.cos(a)*R*0.28,CY+Math.sin(a)*R*0.28]);}
  // 6 outer
  for(var j=0;j<6;j++){var a2=rot+Math.PI/6+j*Math.PI/3;pts.push([CX+Math.cos(a2)*R*0.56,CY+Math.sin(a2)*R*0.56]);}
  // Circles
  for(var k=0;k<pts.length;k++){circleAt(pts[k][0],pts[k][1],r);}
  // All-to-all connections (Metatron's Cube edges)
  ctx.globalAlpha=0.15+env*0.4;
  ctx.strokeStyle=pal.main;
  for(var a1=0;a1<pts.length;a1++){for(var b=a1+1;b<pts.length;b++){starLine(pts[a1][0],pts[a1][1],pts[b][0],pts[b][1]);}}
}

function drawSri(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.2;ctx.globalAlpha=0.55+env*0.4;
  // 9 interlocking triangles: 4 pointing up (Shiva), 5 pointing down (Shakti)
  var scales=[1.0,0.85,0.72,0.60,0.48];
  for(var i=0;i<scales.length;i++){polygon(CX,CY,R*scales[i]*0.72,3,rot+(i%2?Math.PI:0)+i*0.08);}
  ctx.strokeStyle=pal.main;ctx.globalAlpha=0.35+env*0.5;
  polygon(CX,CY,R*0.90*0.72,3,rot);
  polygon(CX,CY,R*0.90*0.72,3,rot+Math.PI);
  // Enclosing lotus (16 petals)
  ctx.globalAlpha=0.25+env*0.4;
  for(var p=0;p<16;p++){var pa=rot+p*Math.PI/8;ctx.beginPath();ctx.arc(CX+Math.cos(pa)*R*0.86,CY+Math.sin(pa)*R*0.86,R*0.09,0,6.2832);ctx.stroke();}
  // Bindu (center dot)
  ctx.fillStyle=pal.glow;ctx.globalAlpha=0.9;ctx.beginPath();ctx.arc(CX,CY,3+env*3,0,6.2832);ctx.fill();
}

function drawVesica(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.4;ctx.globalAlpha=0.5+env*0.5;
  var r=R*0.55;var d=r*0.5;
  var dx=Math.cos(rot)*d,dy=Math.sin(rot)*d;
  circleAt(CX-dx,CY-dy,r);
  circleAt(CX+dx,CY+dy,r);
  ctx.globalAlpha=0.3+env*0.4;
  circleAt(CX,CY,r*1.4);
}

function drawMerkaba(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.4;ctx.globalAlpha=0.6+env*0.4;
  polygon(CX,CY,R*0.72,3,rot);
  polygon(CX,CY,R*0.72,3,rot+Math.PI);
  ctx.strokeStyle=pal.main;ctx.globalAlpha=0.3+env*0.4;
  circleAt(CX,CY,R*0.72);
  circleAt(CX,CY,R*0.32);
}

function drawSpiral(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.4;ctx.globalAlpha=0.55+env*0.5;
  var phi=1.61803399;
  ctx.beginPath();
  var r=R*0.03,a=rot;
  for(var i=0;i<420;i++){
    var s=i/45;
    r=R*0.03*Math.pow(phi,s);
    if(r>R)break;
    a+=0.09;
    var x=CX+Math.cos(a)*r,y=CY+Math.sin(a)*r;
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.stroke();
  // Mirrored second arm
  ctx.beginPath();
  a=rot+Math.PI;
  for(var j=0;j<420;j++){
    var s2=j/45;
    r=R*0.03*Math.pow(phi,s2);
    if(r>R)break;
    a+=0.09;
    var x2=CX+Math.cos(a)*r,y2=CY+Math.sin(a)*r;
    j===0?ctx.moveTo(x2,y2):ctx.lineTo(x2,y2);
  }
  ctx.stroke();
}

function drawNgon(R,rot,pal,env,freq){
  // Vertex count derived from frequency
  var n=3+Math.round((freq%20)+1);
  if(n>24)n=24;if(n<3)n=3;
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.4;ctx.globalAlpha=0.55+env*0.45;
  polygon(CX,CY,R*0.85,n,rot);
  // Nested polygons (scale down)
  ctx.globalAlpha=0.35+env*0.4;
  polygon(CX,CY,R*0.60,n,rot+Math.PI/n);
  polygon(CX,CY,R*0.35,n,rot);
  // Star connections (every-other vertex)
  ctx.strokeStyle=pal.main;ctx.globalAlpha=0.25+env*0.35;
  ctx.beginPath();
  var step=Math.max(2,Math.floor(n/2));
  for(var i=0;i<=n;i++){var a=rot+i*step*6.2832/n;var x=CX+Math.cos(a)*R*0.85,y=CY+Math.sin(a)*R*0.85;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();
}

// Audio-reactive envelope smoothing
var envSmooth=0;
function draw(t){
  ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(0,0,W,H);
  var p=PAL[cfg.medium]||PAL.CYMATICS;
  polarGrid(p);
  // Live amplitude 0..1
  var live=Math.min(1,(LIVE.peak||0)/110);
  var fresh=(performance.now()-LIVE.ts)<400;
  var env=fresh?live:(cfg.playing?0.35:0);
  envSmooth=envSmooth*0.75+env*0.25;
  var audioActive=envSmooth>0.02;
  var f=(cfg.freqs&&cfg.freqs[0])||432;
  var n=2+Math.round(f%12);
  var m=3+Math.round((f/100)%9);
  var spin=audioActive?t*0.00045*(1+(f%7)*0.25)*(0.4+envSmooth*1.6):0;
  var breathe=1+(0.04+0.14*envSmooth)*Math.sin(t*0.003*(1+(f%5)));
  var R=R0*breathe;
  var med=cfg.medium;
  var pts=Math.floor((audioActive?(med==='SAND'?1400:900):320)*(0.4+envSmooth*1.4));
  for(var i=0;i<pts;i++){
    var th=Math.random()*6.2832,r=Math.sqrt(Math.random());
    var I=Math.abs(Math.sin(n*th+spin)*Math.sin(m*Math.PI*r));
    var wsIdx=Math.floor(((th/6.2832)+r)%1*127);
    var wsAmp=Math.abs(LIVE.wave[wsIdx]-128)/128;
    I=Math.min(1,I*(0.55+wsAmp*1.6));
    var hit=false,size=1.4,alpha=0;
    if(med==='CHLADNI'){hit=I<0.14;alpha=0.5+Math.random()*0.4;size=1.2;}
    else if(med==='SAND'){hit=I<0.20;alpha=0.35+Math.random()*0.35;size=1.0;}
    else if(med==='WATER'){var w=Math.abs(Math.sin(m*Math.PI*r-(audioActive?t*0.004:0)));hit=w>0.9;alpha=0.30+0.4*w;size=1.6+envSmooth*2;}
    else if(med==='FIRE'){hit=I>0.55;alpha=0.35+0.5*I;size=1.5+I+envSmooth*2;}
    else if(med==='MERCURY'||med==='GOLD'){hit=I>0.62;alpha=0.35+0.55*I;size=1.8+I*1.2+envSmooth;}
    else {hit=I>0.58;alpha=0.30+0.55*I;size=1.3+I+envSmooth;}
    if(!hit)continue;
    var x=CX+Math.cos(th)*r*R,y=CY+Math.sin(th)*r*R;
    if(med==='FIRE'){y-=I*10*Math.random()*(0.6+envSmooth);}
    ctx.globalAlpha=alpha;ctx.fillStyle=p.main;
    ctx.fillRect(x,y,size,size);
    if((med==='MERCURY'||med==='GOLD')&&I>0.85){ctx.globalAlpha=0.9;ctx.fillStyle='#ffffff';ctx.fillRect(x,y,1,1);}
  }
  ctx.globalAlpha=1;
  // Live waveform ring
  if(fresh){
    ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=8;
    ctx.strokeStyle=p.main;ctx.lineWidth=1.2;ctx.globalAlpha=0.7;
    ctx.beginPath();
    var N=LIVE.wave.length;
    for(var wi=0;wi<N;wi++){
      var wa=(wi/N)*6.2832;
      var wv=(LIVE.wave[wi]-128)/128;
      var wr=R*(1.02+wv*0.14);
      var wx=CX+Math.cos(wa)*wr,wy=CY+Math.sin(wa)*wr;
      wi===0?ctx.moveTo(wx,wy):ctx.lineTo(wx,wy);
    }
    ctx.closePath();ctx.stroke();ctx.restore();
  }

  // ═══ SACRED GEOMETRY OVERLAY ═══
  if(cfg.geometry && cfg.geometry !== 'NONE'){
    ctx.save();
    ctx.shadowColor=p.glow;ctx.shadowBlur=audioActive?12+envSmooth*18:6;
    var geomRot=spin*0.6;
    var geomR=R*0.92;
    switch(cfg.geometry){
      case 'FLOWER':   drawFlower(geomR,geomRot,p,envSmooth);break;
      case 'METATRON': drawMetatron(geomR,geomRot,p,envSmooth);break;
      case 'SRI':      drawSri(geomR,geomRot,p,envSmooth);break;
      case 'VESICA':   drawVesica(geomR,geomRot,p,envSmooth);break;
      case 'MERKABA':  drawMerkaba(geomR,geomRot,p,envSmooth);break;
      case 'SPIRAL':   drawSpiral(geomR,geomRot,p,envSmooth);break;
      case 'NGON':     drawNgon(geomR,geomRot,p,envSmooth,f);break;
    }
    ctx.restore();
    ctx.globalAlpha=1;
  }

  // Rim
  ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=audioActive?18+envSmooth*22:8;
  ctx.strokeStyle=p.glow;ctx.lineWidth=audioActive?2:1;ctx.globalAlpha=audioActive?0.85:0.4;
  ctx.beginPath();
  for(var a2=0;a2<=6.2832;a2+=0.05){
    var wob=1+(audioActive?(0.02+0.05*envSmooth)*Math.sin(n*a2+spin*3):0.006*Math.sin(n*a2));
    var rx=CX+Math.cos(a2)*R*wob,ry=CY+Math.sin(a2)*R*wob;
    a2===0?ctx.moveTo(rx,ry):ctx.lineTo(rx,ry);
  }
  ctx.closePath();ctx.stroke();ctx.restore();
  // Core
  ctx.globalAlpha=audioActive?0.95:0.5;ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=14+envSmooth*20;
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(CX,CY,audioActive?(2.6+envSmooth*4):1.8,0,6.2832);ctx.fill();ctx.restore();
  ctx.globalAlpha=1;
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
</script></body></html>`;

interface Props {
  frequencies: number[];
  playing: boolean;
}

export default function CymaticScope({ frequencies, playing }: Props) {
  const [medium, setMedium] = useState<Medium>('CYMATICS');
  const [geometry, setGeometry] = useState<Geometry>('NONE');
  const [livePeak, setLivePeak] = useState(0);
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  const pushConfig = useCallback((cfg: object) => {
    const json = JSON.stringify(cfg);
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.updateScope?.(json); } catch {}
    } else {
      webRef.current?.injectJavaScript(`window.updateScope(${JSON.stringify(json)}); true;`);
    }
  }, []);

  const pushWave = useCallback((frame: ScopeFrame) => {
    const payload = JSON.stringify({ __wave: true, wave: frame.wave, peak: frame.peak });
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.pushWave?.(payload); } catch {}
    } else {
      const safe = payload.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      webRef.current?.injectJavaScript(`window.pushWave&&window.pushWave('${safe}');true;`);
    }
  }, []);

  useEffect(() => {
    pushConfig({ freqs: frequencies, playing, medium, geometry });
  }, [frequencies, playing, medium, geometry, pushConfig]);

  useEffect(() => {
    const unsub = AudioEngine.subscribeScope((frame) => {
      pushWave(frame);
      setLivePeak(frame.peak);
    });
    return unsub;
  }, [pushWave]);

  const color = MEDIUM_COLORS[medium];
  const mainFreq = frequencies[0] || 432;
  const audioActive = livePeak > 3;

  return (
    <View style={st.wrap}>
      {/* Readout */}
      <View style={[st.readout, { borderColor: color }]}>
        <Text style={[st.readoutText, { color }]}>
          {mainFreq.toFixed(2)} Hz · {medium}{geometry !== 'NONE' ? ` · ${geometry}` : ''} · {audioActive ? `LIVE ${Math.round((livePeak / 128) * 100)}%` : (playing ? 'ACTIVE' : 'STANDBY')}
        </Text>
      </View>

      {/* Scope canvas */}
      <View style={[st.scope, { borderColor: `${color}40` }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: SCOPE_HTML,
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000' },
            onLoad: () => pushConfig({ freqs: frequencies, playing, medium, geometry }),
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html: SCOPE_HTML }}
            style={st.webview}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onLoadEnd={() => pushConfig({ freqs: frequencies, playing, medium, geometry })}
          />
        )}
      </View>

      {/* Medium selector */}
      <View style={st.selectorRow}>
        <Text style={st.selectorLabel}>MEDIUM</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.pillRow}>
          {MEDIUMS.map(mm => (
            <TouchableOpacity
              key={mm}
              style={[st.pill, { borderColor: MEDIUM_COLORS[mm] }, medium === mm && { backgroundColor: MEDIUM_COLORS[mm] }]}
              onPress={() => setMedium(mm)}
            >
              <Text style={[st.pillText, { color: medium === mm ? '#000' : MEDIUM_COLORS[mm] }]}>{mm}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sacred Geometry selector */}
      <View style={st.selectorRow}>
        <Text style={st.selectorLabel}>SACRED</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.pillRow}>
          {GEOMETRIES.map(g => (
            <TouchableOpacity
              key={g}
              style={[
                st.pill,
                { borderColor: g === 'NONE' ? '#3a1a1a' : '#ff0a0a' },
                geometry === g && (g === 'NONE' ? st.pillActiveDim : st.pillActive),
              ]}
              onPress={() => setGeometry(g)}
            >
              <Text
                style={[
                  st.pillText,
                  { color: geometry === g ? '#000' : (g === 'NONE' ? '#8a4a4a' : '#ff0a0a') },
                ]}
              >
                {GEOMETRY_LABEL[g]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginBottom: 16 },
  readout: {
    alignSelf: 'center',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginBottom: 8,
    backgroundColor: '#020402',
  },
  readoutText: { fontSize: 11, fontWeight: '800', letterSpacing: 1.5 },
  scope: {
    height: 260,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: { flex: 1, backgroundColor: '#000' },
  selectorRow: { marginTop: 8 },
  selectorLabel: {
    color: '#5a5a5a', fontSize: 8, letterSpacing: 2, fontWeight: '900',
    marginBottom: 4, paddingHorizontal: 2,
  },
  pillRow: { gap: 6, paddingVertical: 2 },
  pill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  pillActive: { backgroundColor: '#ff0a0a' },
  pillActiveDim: { backgroundColor: '#3a1a1a' },
  pillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
});
