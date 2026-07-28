import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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

export const GEOMETRIES = ['FLOWER', 'METATRON', 'SRI', 'VESICA', 'MERKABA', 'SPIRAL', 'NGON', 'LISSAJOUS', 'PHASE', 'JULIA'] as const;
export type Geometry = typeof GEOMETRIES[number];

const GEOMETRY_LABEL: Record<Geometry, string> = {
  FLOWER: 'FLOWER',
  METATRON: 'METATRON',
  SRI: 'SRI',
  VESICA: 'VESICA',
  MERKABA: 'MERKABA',
  SPIRAL: 'SPIRAL',
  NGON: 'N-GON',
  LISSAJOUS: 'LISSAJOUS',
  PHASE: 'PHASE',
  JULIA: 'JULIA',
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
var cfg={freqs:[432],playing:false,medium:'CYMATICS',geometries:[]};
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
window.updateScope=function(c){try{if(typeof c==='string')c=JSON.parse(c);if(c.freqs)cfg.freqs=c.freqs;if(typeof c.playing==='boolean')cfg.playing=c.playing;if(c.medium)cfg.medium=c.medium;if(Array.isArray(c.geometries))cfg.geometries=c.geometries;}catch(e){}};
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

// PHASE — classic oscilloscope XY plot using two channels of live audio wave
function drawPhase(R,rot,pal,env){
  var N=LIVE.wave.length;
  ctx.save();
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.2;ctx.globalAlpha=0.6+env*0.4;
  ctx.shadowColor=pal.glow;ctx.shadowBlur=6+env*15;
  ctx.beginPath();
  // X = wave[i], Y = wave[(i+shift)%N] — classic Lissajous-style phase
  var shift=Math.floor(N/4);
  for(var i=0;i<N;i++){
    var x=CX+((LIVE.wave[i]-128)/128)*(R*0.85);
    var y=CY+((LIVE.wave[(i+shift)%N]-128)/128)*(R*0.85);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.stroke();
  // Cross hairs
  ctx.globalAlpha=0.18;ctx.lineWidth=0.5;
  ctx.beginPath();ctx.moveTo(CX-R,CY);ctx.lineTo(CX+R,CY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(CX,CY-R);ctx.lineTo(CX,CY+R);ctx.stroke();
  ctx.restore();
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

// LISSAJOUS — X/Y parametric using live audio wave for X and time-shifted wave for Y
function drawLissajous(R,rot,pal,env,freq){
  var N=LIVE.wave.length;
  var ratioA=1+Math.round(freq%7);
  var ratioB=2+Math.round(freq%9);
  var phase=rot;
  ctx.save();
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.4;ctx.globalAlpha=0.5+env*0.5;
  ctx.shadowColor=pal.glow;ctx.shadowBlur=8+env*18;
  ctx.beginPath();
  for(var i=0;i<N;i++){
    var t=i/N*6.2832;
    // Audio-driven Lissajous: two audio-modulated sine parametrics
    var wIdx=(i+Math.floor(freq/10))%N;
    var w1=(LIVE.wave[i]-128)/128;
    var w2=(LIVE.wave[wIdx]-128)/128;
    var x=CX+Math.sin(ratioA*t+phase)*(R*0.75)*(0.85+w1*0.35);
    var y=CY+Math.sin(ratioB*t)*(R*0.75)*(0.85+w2*0.35);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.stroke();
  // Second overlay curve — inverted ratios
  ctx.strokeStyle=pal.main;ctx.globalAlpha=0.35+env*0.35;
  ctx.beginPath();
  for(var j=0;j<N;j++){
    var t2=j/N*6.2832;
    var w=(LIVE.wave[j]-128)/128;
    var x2=CX+Math.sin(ratioB*t2+phase*2)*(R*0.55)*(0.9+w*0.25);
    var y2=CY+Math.cos(ratioA*t2)*(R*0.55)*(0.9+w*0.25);
    j===0?ctx.moveTo(x2,y2):ctx.lineTo(x2,y2);
  }
  ctx.stroke();
  ctx.restore();
}

// JULIA — quadratic complex-plane fractal with c-param driven by frequency + audio envelope
function drawJulia(R,rot,pal,env,freq){
  var cols=90,rows=54;
  var maxIter=Math.min(48,16+Math.floor(env*40));
  // c = seed derived from freq + slow phase + audio env
  var phase=rot*0.5;
  var cr=Math.cos(phase)*0.7885*(0.5+((freq%600)/600)*0.5);
  var ci=Math.sin(phase)*0.7885*(0.5+((freq%800)/800)*0.5)+env*0.08*Math.sin(phase*7);
  var scale=R*0.9;
  var stepX=(scale*2)/cols;
  var stepY=(scale*2)/rows;
  var baseR=(parseInt(pal.glow.slice(1,3),16))||150;
  var baseG=(parseInt(pal.glow.slice(3,5),16))||255;
  var baseB=(parseInt(pal.glow.slice(5,7),16))||150;
  for(var yi=0;yi<rows;yi++){
    for(var xi=0;xi<cols;xi++){
      var x0=(-scale+xi*stepX)/(scale*0.9);
      var y0=(-scale+yi*stepY)/(scale*0.9);
      var zx=x0,zy=y0,it=0;
      while(zx*zx+zy*zy<4&&it<maxIter){
        var xt=zx*zx-zy*zy+cr;
        zy=2*zx*zy+ci;
        zx=xt;
        it++;
      }
      if(it===maxIter)continue;
      var norm=it/maxIter;
      // Color grade toward palette main; interior stays background
      var alpha=0.28+norm*0.62+env*0.15;
      var r=Math.floor(baseR*norm);
      var g=Math.floor(baseG*norm);
      var b=Math.floor(baseB*norm);
      ctx.fillStyle='rgba('+r+','+g+','+b+','+alpha.toFixed(3)+')';
      var px=CX+(xi-cols/2)*stepX;
      var py=CY+(yi-rows/2)*stepY;
      ctx.fillRect(px,py,stepX+1,stepY+1);
    }
  }
  // Rim ring so it feels contained
  ctx.save();
  ctx.strokeStyle=pal.main;ctx.lineWidth=1.2;ctx.globalAlpha=0.5+env*0.4;
  ctx.beginPath();ctx.arc(CX,CY,R*0.9,0,6.2832);ctx.stroke();
  ctx.restore();
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

  // ═══ SACRED GEOMETRY OVERLAYS — layered (multiple can stack) ═══
  if(cfg.geometries && cfg.geometries.length){
    ctx.save();
    ctx.shadowColor=p.glow;ctx.shadowBlur=audioActive?12+envSmooth*18:6;
    var geomRot=spin*0.6;
    var geomR=R*0.92;
    for(var gi=0;gi<cfg.geometries.length;gi++){
      var g=cfg.geometries[gi];
      switch(g){
        case 'FLOWER':   drawFlower(geomR,geomRot,p,envSmooth);break;
        case 'METATRON': drawMetatron(geomR,geomRot,p,envSmooth);break;
        case 'SRI':      drawSri(geomR,geomRot,p,envSmooth);break;
        case 'VESICA':   drawVesica(geomR,geomRot,p,envSmooth);break;
        case 'MERKABA':  drawMerkaba(geomR,geomRot,p,envSmooth);break;
        case 'SPIRAL':   drawSpiral(geomR,geomRot,p,envSmooth);break;
        case 'NGON':     drawNgon(geomR,geomRot,p,envSmooth,f);break;
        case 'LISSAJOUS':drawLissajous(geomR,geomRot,p,envSmooth,f);break;
        case 'PHASE':    drawPhase(geomR,geomRot,p,envSmooth);break;
        case 'JULIA':    drawJulia(geomR,geomRot,p,envSmooth,f);break;
      }
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
  const [geometries, setGeometries] = useState<Set<Geometry>>(new Set());
  const [livePeak, setLivePeak] = useState(0);
  const [measuredHz, setMeasuredHz] = useState(0);
  const [geoPickerOpen, setGeoPickerOpen] = useState(false);
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
    pushConfig({ freqs: frequencies, playing, medium, geometries: Array.from(geometries) });
  }, [frequencies, playing, medium, geometries, pushConfig]);

  useEffect(() => {
    const unsub = AudioEngine.subscribeScope((frame) => {
      pushWave(frame);
      setLivePeak(frame.peak);
      if (typeof frame.measuredHz === 'number') setMeasuredHz(frame.measuredHz);
    });
    return unsub;
  }, [pushWave]);

  const color = MEDIUM_COLORS[medium];
  const mainFreq = frequencies[0] || 432;
  const audioActive = livePeak > 3;
  const measuredValid = audioActive && measuredHz > 5;

  const cycleMedium = () => {
    const idx = MEDIUMS.indexOf(medium);
    setMedium(MEDIUMS[(idx + 1) % MEDIUMS.length]);
  };
  const toggleGeometry = (g: Geometry) => {
    setGeometries(prev => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g); else next.add(g);
      return next;
    });
  };
  const geoSummary = geometries.size === 0
    ? '—'
    : geometries.size === 1
      ? GEOMETRY_LABEL[Array.from(geometries)[0]]
      : `${geometries.size}× LAYERED`;

  return (
    <View style={st.wrap}>
      {/* Compact readout header — Hz · MEASURED · MED · GEO · LIVE% */}
      <View style={[st.headerBar, { borderColor: color }]}>
        <View style={st.headerHz}>
          <Text style={[st.hzTxt, { color }]}>{mainFreq.toFixed(2)}</Text>
          <Text style={[st.hzUnit, { color }]}>Hz</Text>
          {measuredValid && (
            <>
              <Text style={st.measuredArrow}>→</Text>
              <Text style={[st.measuredVal, { color }]}>{measuredHz.toFixed(1)}</Text>
            </>
          )}
        </View>
        <TouchableOpacity onPress={cycleMedium} style={[st.cycler, { borderColor: color }]} activeOpacity={0.7}>
          <Text style={[st.cyclerLabel, { color: '#5a5a5a' }]}>MED</Text>
          <Text style={[st.cyclerVal, { color }]}>{medium}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setGeoPickerOpen(o => !o)}
          style={[st.cycler, { borderColor: geometries.size ? '#ff0a0a' : '#3a1a1a' }]}
          activeOpacity={0.7}
        >
          <Text style={[st.cyclerLabel, { color: '#5a5a5a' }]}>GEO</Text>
          <Text style={[st.cyclerVal, { color: geometries.size ? '#ff0a0a' : '#8a4a4a' }]}>{geoSummary}</Text>
        </TouchableOpacity>
        <View style={st.statePill}>
          <View style={[st.stateDot, { backgroundColor: audioActive ? color : '#3a1010' }]} />
          <Text style={[st.stateTxt, { color: audioActive ? color : '#5a5a5a' }]}>
            {audioActive ? `${Math.round((livePeak / 128) * 100)}%` : (playing ? 'ACT' : 'STBY')}
          </Text>
        </View>
      </View>

      {geoPickerOpen && (
        <View style={st.geoPicker}>
          {GEOMETRIES.map(g => {
            const isOn = geometries.has(g);
            return (
              <TouchableOpacity key={g} onPress={() => toggleGeometry(g)} style={[st.geoPill, isOn && st.geoPillActive]} activeOpacity={0.7}>
                <Text style={[st.geoPillText, isOn && st.geoPillTextActive]}>{GEOMETRY_LABEL[g]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Scope canvas */}
      <View style={[st.scope, { borderColor: `${color}40` }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: SCOPE_HTML,
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000' },
            onLoad: () => pushConfig({ freqs: frequencies, playing, medium, geometries: Array.from(geometries) }),
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html: SCOPE_HTML }}
            style={st.webview}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onLoadEnd={() => pushConfig({ freqs: frequencies, playing, medium, geometries: Array.from(geometries) })}
          />
        )}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: { marginBottom: 16 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 8,
    backgroundColor: '#020402',
  },
  headerHz: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginRight: 4 },
  hzTxt: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  hzUnit: { fontSize: 9, fontWeight: '800', letterSpacing: 1, opacity: 0.7 },
  measuredArrow: { color: '#5a5a5a', fontSize: 10, marginLeft: 4, marginRight: 2, fontWeight: '900' },
  measuredVal: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5, opacity: 0.9 },
  cycler: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#050705',
  },
  cyclerLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  cyclerVal: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  stateTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  scope: {
    height: 260,
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: { flex: 1, backgroundColor: '#000' },
  geoPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 8,
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#1a0808',
  },
  geoPill: {
    borderWidth: 1,
    borderColor: '#3a1a1a',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: '#0a0505',
  },
  geoPillActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#ff0a0a',
  },
  geoPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: '#8a4a4a' },
  geoPillTextActive: { color: '#000' },
});
