import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { AudioEngine, ScopeFrame } from './AudioEngine';
import { chakraForFreq, mapOrbitGeometry, detectBeat } from './OrbitGeometry';

import { skinStyles, SK, skinHtml } from './skins';

// ═══════════════════════════════════════════════════════════
// SCOPE // NODE — combined T-800 visualizer panel
// One canvas, two faces. Tap SPIN to flip the scope over and
// reveal the HARMONIC NODE lattice on the back.
//   SCOPE face → cymatic hybrid oscilloscope (medium + geometry)
//   NODE face  → 1/3/6/7/9/13/26/33/96 harmonic-resonance orbs
//                arranged in sacred patterns; RESONATE plays the
//                real harmonic stack of the base frequency.
// ═══════════════════════════════════════════════════════════

export const MEDIUMS = ['STARS', 'CYMASCOPE', 'LASER', 'MIRRORS', 'CODON', 'GENUS', 'E8', 'CHLADNI', 'WATER', 'SAND', 'CYMATICS', 'MERCURY', 'GOLD', 'FIRE'] as const;
export type Medium = typeof MEDIUMS[number];

const MEDIUM_COLORS: Record<Medium, string> = {
  STARS: '#c86aff',
  CYMASCOPE: '#7fd4ff',
  LASER: '#ff2a5e',
  MIRRORS: '#e8ecf5',
  CODON: '#9be89b',
  GENUS: '#8fb0ff',
  E8: '#ffd21e',
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
  FLOWER: 'FLOWER', METATRON: 'METATRON', SRI: 'SRI', VESICA: 'VESICA', MERKABA: 'MERKABA',
  SPIRAL: 'SPIRAL', NGON: 'N-GON', LISSAJOUS: 'LISSAJOUS', PHASE: 'PHASE', JULIA: 'JULIA',
};

// Orb counts + sacred pattern names
export const ORB_COUNTS = [1, 3, 6, 7, 9, 13, 26, 33, 96] as const;
const PATTERN_NAME: Record<number, string> = {
  1: 'POINT', 3: 'TRINITY', 6: 'HEXAD', 7: 'SEED', 9: 'TESLA 3·6·9',
  13: 'FRUIT', 26: 'TWIN RING', 33: 'MASTER', 96: 'PHYLLOTAXIS',
};

// Chakra tone mapping imported from ./OrbitGeometry (shared with orbit map)

const HARMONIC_ID_BASE = 200; // reserved AudioEngine tone IDs 201..296
const MAX_AUDIBLE_HZ = 20000;

const PANEL_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:#000;overflow:hidden;}canvas{display:block;}</style>
</head><body>
<canvas id="c"></canvas>
<script>
var canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
// Guard: dynamic radii can transiently go negative during resize/flip — clamp all arcs
var __arc=CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc=function(x,y,r,a0,a1,ccw){return __arc.call(this,x,y,(isFinite(r)&&r>0)?r:0,a0,a1,ccw);};
var W=0,H=0,CX=0,CY=0,R0=0;
function resize(){W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H;CX=W/2;CY=H/2;R0=Math.min(W,H)*0.40;}
resize();window.addEventListener('resize',resize);
var cfg={freqs:[432],playing:false,medium:'CYMATICS',geometries:[],view:'SCOPE',orbs:[],resonating:false,baseFreq:432,pattern:'SEED',orbit:null,beat:0,layers:{darkFx:true,threeField:true,orbit:true,labels:true,waveRing:true}};
var LIVE={wave:new Array(128).fill(128),peak:0,ts:0,peaks:[]};
var PAL={
  STARS:{main:'#e2b8ff',glow:'#c86aff',dim:'rgba(200,106,255,0.08)'},
  CYMASCOPE:{main:'#a8e2ff',glow:'#3ec6ff',dim:'rgba(127,212,255,0.08)'},
  LASER:{main:'#ff88b0',glow:'#ff0a5e',dim:'rgba(255,42,94,0.10)'},
  MIRRORS:{main:'#eef0f6',glow:'#b8bfd6',dim:'rgba(232,236,245,0.10)'},
  CODON:{main:'#9be89b',glow:'#3aff6e',dim:'rgba(125,232,125,0.10)'},
  GENUS:{main:'#8fb0ff',glow:'#5b7bff',dim:'rgba(120,150,255,0.10)'},
  E8:{main:'#ffe08a',glow:'#ffd21e',dim:'rgba(255,215,94,0.10)'},
  CHLADNI:{main:'#9be89b',glow:'#3aff6e',dim:'rgba(125,232,125,0.10)'},
  WATER:{main:'#8fd8ff',glow:'#19b6ff',dim:'rgba(95,201,255,0.10)'},
  SAND:{main:'#eed9a6',glow:'#d9a441',dim:'rgba(232,200,125,0.10)'},
  CYMATICS:{main:'#a8f0a0',glow:'#4dff77',dim:'rgba(141,255,157,0.10)'},
  MERCURY:{main:'#eceef5',glow:'#aab4c8',dim:'rgba(216,220,232,0.10)'},
  GOLD:{main:'#ffe08a',glow:'#ffaa00',dim:'rgba(255,215,94,0.10)'},
  FIRE:{main:'#ff9a5a',glow:'#ff2a0a',dim:'rgba(255,90,42,0.10)'}
};
window.updateScope=function(c){try{if(typeof c==='string')c=JSON.parse(c);if(c.freqs)cfg.freqs=c.freqs;if(typeof c.playing==='boolean')cfg.playing=c.playing;if(c.medium)cfg.medium=c.medium;if(Array.isArray(c.geometries))cfg.geometries=c.geometries;if(c.view)cfg.view=c.view;if(Array.isArray(c.orbs))cfg.orbs=c.orbs;if(typeof c.resonating==='boolean')cfg.resonating=c.resonating;if(c.baseFreq)cfg.baseFreq=c.baseFreq;if(c.pattern)cfg.pattern=c.pattern;if(c.orbit!==undefined)cfg.orbit=c.orbit;if(typeof c.beat==='number')cfg.beat=c.beat;if(c.layers){cfg.layers.darkFx=!!c.layers.darkFx;cfg.layers.threeField=!!c.layers.threeField;cfg.layers.orbit=!!c.layers.orbit;cfg.layers.labels=!!c.layers.labels;cfg.layers.waveRing=!!c.layers.waveRing;}}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);if(w&&w.wave){LIVE.wave=w.wave;LIVE.peak=w.peak||0;LIVE.peaks=Array.isArray(w.peaks)?w.peaks:LIVE.peaks;LIVE.ts=performance.now();}}catch(e){}};
window.addEventListener('message',function(e){
  var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}}catch(_){}
  window.updateScope(d);
});
document.addEventListener('message',function(e){
  var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}}catch(_){}
  window.updateScope(d);
});

// ═══ INTERACTIVE TOUCH — tap/drag the scope to disturb the medium ═══
// Every touch spawns an expanding capillary ripple; in WATER the ripple
// front also splashes real particles along its ring (field disturbance).
var RIPPLES=[];
function addRipple(x,y){RIPPLES.push({x:x,y:y,t0:performance.now()});if(RIPPLES.length>7)RIPPLES.shift();}
var touchDown=false,lastRip=0;
document.addEventListener('pointerdown',function(e){touchDown=true;addRipple(e.clientX,e.clientY);},{passive:true});
document.addEventListener('pointermove',function(e){if(!touchDown)return;var nw=performance.now();if(nw-lastRip>70){addRipple(e.clientX,e.clientY);lastRip=nw;}},{passive:true});
document.addEventListener('pointerup',function(){touchDown=false;});
document.addEventListener('pointercancel',function(){touchDown=false;});
function rippleBoost(x,y,now){
  var b=0;
  for(var i=0;i<RIPPLES.length;i++){
    var rp=RIPPLES[i];var age=(now-rp.t0)/1000;if(age>1.8)continue;
    var ringR=age*R0*1.5;
    var dx=x-rp.x,dy=y-rp.y;var d=Math.sqrt(dx*dx+dy*dy);
    b+=Math.exp(-Math.pow((d-ringR)/(10+age*14),2))*(1-age/1.8);
  }
  return Math.min(1,b);
}
function drawRipples(p,now){
  for(var i=RIPPLES.length-1;i>=0;i--){
    var rp=RIPPLES[i];var age=(now-rp.t0)/1000;
    if(age>1.8){RIPPLES.splice(i,1);continue;}
    var k=age/1.8;
    ctx.save();ctx.strokeStyle=p.main;ctx.shadowColor=p.glow;ctx.shadowBlur=10*(1-k);
    ctx.globalAlpha=(1-k)*0.55;ctx.lineWidth=1.4*(1-k)+0.3;
    ctx.beginPath();ctx.arc(rp.x,rp.y,age*R0*1.5,0,6.2832);ctx.stroke();
    ctx.globalAlpha=(1-k)*0.30;
    ctx.beginPath();ctx.arc(rp.x,rp.y,age*R0*0.9,0,6.2832);ctx.stroke();
    ctx.restore();
  }
  ctx.globalAlpha=1;
}

// ═════════ SCOPE FACE (cymatic hybrid oscilloscope) ═════════
function polarGrid(p){
  ctx.strokeStyle=p.dim;ctx.lineWidth=0.5;
  for(var i=0;i<24;i++){var a=i*Math.PI/12;ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(CX+Math.cos(a)*R0*1.22,CY+Math.sin(a)*R0*1.22);ctx.stroke();}
  for(var k=1;k<=4;k++){ctx.beginPath();ctx.arc(CX,CY,R0*1.15*k/4,0,6.2832);ctx.stroke();}
}
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
  circleAt(CX,CY,r);
  for(var i=0;i<6;i++){var a=rot+i*Math.PI/3;circleAt(CX+Math.cos(a)*r,CY+Math.sin(a)*r,r);}
  ctx.globalAlpha=0.22+env*0.45;
  for(var j=0;j<12;j++){var a2=rot+j*Math.PI/6;var d=r*Math.sqrt(3);circleAt(CX+Math.cos(a2)*d,CY+Math.sin(a2)*d,r);}
  ctx.globalAlpha=0.5+env*0.5;
  circleAt(CX,CY,R);
}
function drawMetatron(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1;ctx.globalAlpha=0.55+env*0.4;
  var r=R*0.13;
  var pts=[[CX,CY]];
  for(var i=0;i<6;i++){var a=rot+i*Math.PI/3;pts.push([CX+Math.cos(a)*R*0.28,CY+Math.sin(a)*R*0.28]);}
  for(var j=0;j<6;j++){var a2=rot+Math.PI/6+j*Math.PI/3;pts.push([CX+Math.cos(a2)*R*0.56,CY+Math.sin(a2)*R*0.56]);}
  for(var k=0;k<pts.length;k++){circleAt(pts[k][0],pts[k][1],r);}
  ctx.globalAlpha=0.15+env*0.4;
  ctx.strokeStyle=pal.main;
  for(var a1=0;a1<pts.length;a1++){for(var b=a1+1;b<pts.length;b++){starLine(pts[a1][0],pts[a1][1],pts[b][0],pts[b][1]);}}
}
function drawSri(R,rot,pal,env){
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.2;ctx.globalAlpha=0.55+env*0.4;
  var scales=[1.0,0.85,0.72,0.60,0.48];
  for(var i=0;i<scales.length;i++){polygon(CX,CY,R*scales[i]*0.72,3,rot+(i%2?Math.PI:0)+i*0.08);}
  ctx.strokeStyle=pal.main;ctx.globalAlpha=0.35+env*0.5;
  polygon(CX,CY,R*0.90*0.72,3,rot);
  polygon(CX,CY,R*0.90*0.72,3,rot+Math.PI);
  ctx.globalAlpha=0.25+env*0.4;
  for(var p=0;p<16;p++){var pa=rot+p*Math.PI/8;ctx.beginPath();ctx.arc(CX+Math.cos(pa)*R*0.86,CY+Math.sin(pa)*R*0.86,R*0.09,0,6.2832);ctx.stroke();}
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
function drawPhase(R,rot,pal,env){
  var N=LIVE.wave.length;
  ctx.save();
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.2;ctx.globalAlpha=0.6+env*0.4;
  ctx.shadowColor=pal.glow;ctx.shadowBlur=6+env*15;
  ctx.beginPath();
  var shift=Math.floor(N/4);
  for(var i=0;i<N;i++){
    var x=CX+((LIVE.wave[i]-128)/128)*(R*0.85);
    var y=CY+((LIVE.wave[(i+shift)%N]-128)/128)*(R*0.85);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.closePath();ctx.stroke();
  ctx.globalAlpha=0.18;ctx.lineWidth=0.5;
  ctx.beginPath();ctx.moveTo(CX-R,CY);ctx.lineTo(CX+R,CY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(CX,CY-R);ctx.lineTo(CX,CY+R);ctx.stroke();
  ctx.restore();
}
function drawNgon(R,rot,pal,env,freq){
  var n=3+Math.round((freq%20)+1);
  if(n>24)n=24;if(n<3)n=3;
  ctx.strokeStyle=pal.glow;ctx.lineWidth=1.4;ctx.globalAlpha=0.55+env*0.45;
  polygon(CX,CY,R*0.85,n,rot);
  ctx.globalAlpha=0.35+env*0.4;
  polygon(CX,CY,R*0.60,n,rot+Math.PI/n);
  polygon(CX,CY,R*0.35,n,rot);
  ctx.strokeStyle=pal.main;ctx.globalAlpha=0.25+env*0.35;
  ctx.beginPath();
  var step=Math.max(2,Math.floor(n/2));
  for(var i=0;i<=n;i++){var a=rot+i*step*6.2832/n;var x=CX+Math.cos(a)*R*0.85,y=CY+Math.sin(a)*R*0.85;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.stroke();
}
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
    var wIdx=(i+Math.floor(freq/10))%N;
    var w1=(LIVE.wave[i]-128)/128;
    var w2=(LIVE.wave[wIdx]-128)/128;
    var x=CX+Math.sin(ratioA*t+phase)*(R*0.75)*(0.85+w1*0.35);
    var y=CY+Math.sin(ratioB*t)*(R*0.75)*(0.85+w2*0.35);
    i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);
  }
  ctx.stroke();
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
// ═══ CODON — genetic-code wheel. Concentric base rings (A/G/C/U) carved into
// radial codon wedges, driven by the carrier; a living rendition of the standard
// codon table (image ref). Zero-latency wobble on the audio env.
function drawCodon(R,rot,pal,env){
  var BASE=[['A','rgba(247,169,196,X)'],['G','rgba(151,220,151,X)'],['C','rgba(247,225,141,X)'],['U','rgba(150,206,235,X)']];
  var rings=[0.34,0.56,0.78,0.98];
  ctx.save();
  ctx.lineWidth=1;
  // radial dividers
  ctx.strokeStyle=pal.dim;
  for(var s=0;s<16;s++){var a=rot+s*6.2832/16;ctx.beginPath();ctx.moveTo(CX+Math.cos(a)*R*0.30,CY+Math.sin(a)*R*0.30);ctx.lineTo(CX+Math.cos(a)*R,CY+Math.sin(a)*R);ctx.stroke();}
  for(var ri=0;ri<rings.length;ri++){
    var r1=R*(ri===0?0.30:rings[ri-1]);
    var r2=R*rings[ri];
    var segs=(ri+1)*4; // 4,8,12,16 wedges → nested base structure
    if(segs>16)segs=16;
    for(var k=0;k<segs;k++){
      var a0=rot+k*6.2832/segs, a1=a0+6.2832/segs;
      var base=BASE[k%4];
      var alpha=(0.14+env*0.5)*(0.55+0.45*Math.sin(rot*2+k+ri));
      ctx.fillStyle=base[1].replace('X',alpha.toFixed(3));
      ctx.beginPath();
      ctx.arc(CX,CY,r2,a0,a1);
      ctx.arc(CX,CY,r1,a1,a0,true);
      ctx.closePath();ctx.fill();
      // base glyph
      if(ri>=1){
        var am=(a0+a1)/2, rm=(r1+r2)/2;
        ctx.fillStyle='rgba(20,20,24,'+(0.5+env*0.4).toFixed(3)+')';
        ctx.font='bold '+Math.max(7,Math.floor(R*0.05))+'px monospace';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(base[0],CX+Math.cos(am)*rm,CY+Math.sin(am)*rm);
      }
    }
    ctx.strokeStyle=pal.glow;ctx.globalAlpha=0.35+env*0.4;
    ctx.beginPath();ctx.arc(CX,CY,r2,0,6.2832);ctx.stroke();ctx.globalAlpha=1;
  }
  // 5' hub
  ctx.fillStyle=pal.glow;ctx.globalAlpha=0.9;
  ctx.beginPath();ctx.arc(CX,CY,3+env*3,0,6.2832);ctx.fill();ctx.globalAlpha=1;
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  ctx.restore();
}

// ═══ GENUS — smooth high-genus manifold (gyroid/Seifert blob, image ref).
// An organic superformula body with N circular through-holes; iridescent rim
// light sweeps the tube edges. Holes orbit slowly, breathing with the env.
function drawGenus(R,rot,pal,env){
  ctx.save();
  ctx.beginPath();ctx.arc(CX,CY,R,0,6.2832);ctx.clip();
  // Organic body — superformula outline filled with a cool iridescent gradient
  var m=6, n1=0.3, n2=1.7, n3=1.7, a=1, b=1;
  function superR(th){
    var t1=Math.pow(Math.abs(Math.cos(m*th/4)/a),n2);
    var t2=Math.pow(Math.abs(Math.sin(m*th/4)/b),n3);
    return Math.pow(t1+t2,-1/n1);
  }
  var maxr=0; for(var s=0;s<64;s++){var rr=superR(s/64*6.2832);if(rr>maxr)maxr=rr;}
  var scale=R*0.95/maxr;
  var bodyGrad=ctx.createRadialGradient(CX-R*0.2,CY-R*0.2,0,CX,CY,R);
  bodyGrad.addColorStop(0,'rgba(90,120,255,'+(0.30+env*0.25).toFixed(3)+')');
  bodyGrad.addColorStop(0.5,'rgba(60,60,180,'+(0.22+env*0.20).toFixed(3)+')');
  bodyGrad.addColorStop(1,'rgba(20,15,60,'+(0.10+env*0.10).toFixed(3)+')');
  ctx.fillStyle=bodyGrad;
  ctx.beginPath();
  for(var i=0;i<=128;i++){var th=i/128*6.2832;var rr2=superR(th)*scale*(1+0.04*Math.sin(th*3+rot*2)*env);var x=CX+Math.cos(th+rot*0.3)*rr2,y=CY+Math.sin(th+rot*0.3)*rr2;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
  ctx.closePath();ctx.fill();
  // rim light
  ctx.strokeStyle='rgba(150,190,255,'+(0.5+env*0.4).toFixed(3)+')';ctx.lineWidth=1.5;ctx.shadowColor='rgba(120,160,255,0.9)';ctx.shadowBlur=10+env*14;ctx.stroke();ctx.shadowBlur=0;
  // Through-holes — dark cores with warm golden lens rims (matches ref)
  var holes=7;
  ctx.globalCompositeOperation='source-over';
  for(var h=0;h<holes;h++){
    var ha=rot*0.4+h*6.2832/holes;
    var hd=R*(0.12+0.34*((h%3)/2));
    var hx=CX+Math.cos(ha)*hd, hy=CY+Math.sin(ha)*hd;
    var hr=R*(0.10+0.05*Math.sin(rot*2+h)+env*0.03);
    var hg=ctx.createRadialGradient(hx,hy,0,hx,hy,hr);
    hg.addColorStop(0,'rgba(2,2,10,0.96)');
    hg.addColorStop(0.7,'rgba(8,10,26,0.85)');
    hg.addColorStop(0.9,'rgba(255,180,80,'+(0.35+env*0.4).toFixed(3)+')');
    hg.addColorStop(1,'rgba(120,150,255,0)');
    ctx.fillStyle=hg;ctx.beginPath();ctx.arc(hx,hy,hr,0,6.2832);ctx.fill();
    ctx.strokeStyle='rgba(255,200,120,'+(0.3+env*0.4).toFixed(3)+')';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(hx,hy,hr*0.92,0,6.2832);ctx.stroke();
  }
  // central hole
  var cr=R*(0.07+env*0.03);
  var cg=ctx.createRadialGradient(CX,CY,0,CX,CY,cr);
  cg.addColorStop(0,'rgba(2,2,10,0.96)');cg.addColorStop(0.85,'rgba(255,170,70,'+(0.3+env*0.4).toFixed(3)+')');cg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=cg;ctx.beginPath();ctx.arc(CX,CY,cr,0,6.2832);ctx.fill();
  ctx.restore();
}

// ═══ E8 — Gosset polytope / E8 root-system Petrie projection (image ref).
// 8 concentric rings of 30 vertices (240 roots) with the dense all-pairs chord
// lattice; vertices hued by ring, whole figure slow-rotates + breathes.
function drawE8(R,rot,pal,env){
  var rings=8, per=30;
  var pts=[];
  for(var ri=0;ri<rings;ri++){
    var rr=R*(0.12+ri/(rings-1)*0.86);
    var off=ri*0.20+rot*(0.25+ri*0.03);
    for(var k=0;k<per;k++){
      var a=off+k*6.2832/per;
      pts.push({x:CX+Math.cos(a)*rr,y:CY+Math.sin(a)*rr,ring:ri});
    }
  }
  ctx.save();
  // Chord lattice — connect each vertex to a stride set of others (kept sparse for perf but dense-looking)
  ctx.strokeStyle='rgba(200,210,230,'+(0.05+env*0.06).toFixed(3)+')';
  ctx.lineWidth=0.4;
  var Np=pts.length;
  ctx.beginPath();
  for(var i=0;i<Np;i+=1){
    var strides=[per-1,per,per+1,73,120];
    for(var sI=0;sI<strides.length;sI++){
      var j=(i+strides[sI])%Np;
      ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);
    }
  }
  ctx.stroke();
  // Vertices — ring-hued orbs
  var HUES=['#ff3b3b','#ff8a1e','#ffd21e','#7be03a','#2ec5b6','#2e8bff','#8b5bff','#e05be0'];
  for(var v=0;v<Np;v++){
    var col=HUES[pts[v].ring%HUES.length];
    var sz=2.0+env*1.6;
    var g=ctx.createRadialGradient(pts[v].x,pts[v].y,0,pts[v].x,pts[v].y,sz*2.4);
    g.addColorStop(0,col);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.globalAlpha=0.9;
    ctx.beginPath();ctx.arc(pts[v].x,pts[v].y,sz*2.4,0,6.2832);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#ffffff';
    ctx.beginPath();ctx.arc(pts[v].x,pts[v].y,Math.max(1,sz*0.6),0,6.2832);ctx.fill();
  }
  // center singularity
  ctx.fillStyle='#ffffff';ctx.globalAlpha=0.9;
  ctx.beginPath();ctx.arc(CX,CY,1.6+env*2,0,6.2832);ctx.fill();ctx.globalAlpha=1;
  ctx.restore();
}

function drawJulia(R,rot,pal,env,freq){
  // Clip to the circular scope — pure round cymatic field, never a square block
  ctx.save();
  ctx.beginPath();ctx.arc(CX,CY,R*0.9,0,6.2832);ctx.clip();
  var cols=90,rows=54;
  var maxIter=Math.min(48,16+Math.floor(env*40));
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
  ctx.restore(); // release circular clip
  ctx.save();
  ctx.strokeStyle=pal.main;ctx.lineWidth=1.2;ctx.globalAlpha=0.5+env*0.4;
  ctx.beginPath();ctx.arc(CX,CY,R*0.9,0,6.2832);ctx.stroke();
  ctx.restore();
}

// ═══ CYMASCOPE — physically-modeled circular water membrane ═══
// Standing capillary (Faraday) waves: radial wavenumber k ∝ f^(2/3)
// (deep-water capillary dispersion), angular mode n ∝ √(f/432),
// Bessel-like radial decay + meniscus rim damping. Driven by the
// LIVE multi-peak FFT of the master bus — every sounding partial
// contributes its own interference mode in real time.
// ═══ THREE-FIELD SEQUENCE — I·POTENTIAL → II·BIOFIELD → III·COHERENCE ═══
// Signal-driven, zero latency: each field arms from the LIVE analyser frames.
//   I   POTENTIAL — signal detected on the master bus (instant)
//   II  BIOFIELD  — stable FFT lock held (peaks resolved > 0.9s)
//   III COHERENCE — beat/sideband sync achieved (scalar pair or sustained lock)
var FLD={p:0,b:0,c:0,on:0};
function drawFields(t,env,R){
  var now=performance.now();
  var sig=env>0.03;
  if(sig){if(!FLD.on)FLD.on=now;}else FLD.on=0;
  var held=FLD.on?now-FLD.on:0;
  var freshPk=(now-LIVE.ts)<700&&LIVE.peaks&&LIVE.peaks.length>0;
  var tp=sig?1:0;
  var tb=(sig&&freshPk&&held>900)?1:0;
  var tc=(tb&&(cfg.beat>0||held>2400))?1:0;
  FLD.p+=(tp-FLD.p)*0.10;FLD.b+=(tb-FLD.b)*0.07;FLD.c+=(tc-FLD.c)*0.06;
  var rot=t*0.00025;
  // I · POTENTIAL — outer golden seed ring
  if(FLD.p>0.02){
    var aP=FLD.p*(0.30+env*0.5);
    ctx.save();
    ctx.strokeStyle='rgba(255,215,94,'+aP.toFixed(3)+')';
    ctx.lineWidth=1.1;ctx.shadowColor='rgba(255,215,94,0.9)';ctx.shadowBlur=8*FLD.p;
    ctx.setLineDash([2,6]);
    ctx.beginPath();ctx.arc(CX,CY,R*0.955,0,6.2832);ctx.stroke();
    ctx.setLineDash([]);
    for(var i=0;i<6;i++){var a=rot+i*1.0472;ctx.beginPath();ctx.arc(CX+Math.cos(a)*R*0.80,CY+Math.sin(a)*R*0.80,R*0.10,0,6.2832);ctx.stroke();}
    ctx.restore();
  }
  // II · BIOFIELD — mid teal flower torus (counter-rotating)
  if(FLD.b>0.02){
    var aB=FLD.b*(0.30+env*0.5);
    ctx.save();
    ctx.strokeStyle='rgba(61,255,171,'+aB.toFixed(3)+')';
    ctx.lineWidth=1.0;ctx.shadowColor='rgba(61,255,171,0.9)';ctx.shadowBlur=9*FLD.b;
    var r2=R*0.52;
    ctx.beginPath();ctx.arc(CX,CY,r2,0,6.2832);ctx.stroke();
    for(var j=0;j<6;j++){var a2=-rot*1.4+j*1.0472;ctx.beginPath();ctx.arc(CX+Math.cos(a2)*r2*0.5,CY+Math.sin(a2)*r2*0.5,r2*0.5,0,6.2832);ctx.stroke();}
    ctx.restore();
  }
  // III · COHERENCE — core violet-white merkaba, pulse-locked to the beat
  if(FLD.c>0.02){
    var beatPulse=1;if(cfg.beat>0){var bD=cfg.beat;while(bD>16)bD/=2;beatPulse=0.82+0.18*Math.sin(t*0.001*6.2832*bD);}
    var aC=FLD.c*(0.40+env*0.5)*beatPulse;
    ctx.save();
    ctx.strokeStyle='rgba(240,240,255,'+aC.toFixed(3)+')';
    ctx.lineWidth=1.2;ctx.shadowColor='rgba(200,160,255,1)';ctx.shadowBlur=12*FLD.c;
    var r3=R*0.30*beatPulse;
    polygon(CX,CY,r3,3,rot*2);
    polygon(CX,CY,r3,3,rot*2+Math.PI);
    ctx.fillStyle='rgba(255,255,255,'+(aC*0.9).toFixed(3)+')';
    ctx.beginPath();ctx.arc(CX,CY,2.5+FLD.c*3.5,0,6.2832);ctx.fill();
    ctx.restore();
  }
}
function drawFieldLabels(){
  var names=['I \u00B7 POTENTIAL','II \u00B7 BIOFIELD','III \u00B7 COHERENCE'];
  var cols=['255,215,94','61,255,171','220,190,255'];
  var vals=[FLD.p,FLD.b,FLD.c];
  ctx.save();
  ctx.font='bold 7px monospace';ctx.textAlign='center';
  for(var i=0;i<3;i++){
    var x=W*(0.20+i*0.30);
    var lit=vals[i];
    ctx.fillStyle=lit>0.5?'rgba('+cols[i]+',1)':'rgba('+cols[i]+',0.18)';
    ctx.beginPath();ctx.arc(x,7,2,0,6.2832);ctx.fill();
    ctx.fillStyle='rgba('+cols[i]+','+(0.28+lit*0.72).toFixed(3)+')';
    ctx.fillText(names[i],x,18);
  }
  ctx.textAlign='left';
  ctx.restore();
}

var cymaCv=null,cymaCtx=null,CYS=144,cymaFrame=0,cymaAmp=[0,0,0,0,0,0];
function drawCymascope(t,env,R){
  if(!cymaCv){cymaCv=document.createElement('canvas');cymaCv.width=CYS;cymaCv.height=CYS;cymaCtx=cymaCv.getContext('2d');}
  cymaFrame++;
  if(cymaFrame%2===0){ // render field at ~15fps, blit every frame
    var img=cymaCtx.createImageData(CYS,CYS);
    var d=img.data;
    // Drivers: measured FFT peaks (accurate) — fallback to configured freqs
    var drv=[];
    var freshP=(performance.now()-LIVE.ts)<500;
    if(freshP&&LIVE.peaks&&LIVE.peaks.length){
      for(var i=0;i<LIVE.peaks.length&&i<6;i++){drv.push({f:LIVE.peaks[i].hz,a:Math.min(1,LIVE.peaks[i].mag/190)});}
    } else {
      for(var j=0;j<cfg.freqs.length&&j<4;j++){drv.push({f:cfg.freqs[j],a:cfg.playing?0.5:0.16});}
    }
    // Temporal smoothing per driver slot — kills FFT flicker so songs read as clean, steady patterns
    for(var sm=0;sm<6;sm++){var tgt=sm<drv.length?drv[sm].a:0;cymaAmp[sm]=cymaAmp[sm]*0.62+tgt*0.38;if(sm<drv.length)drv[sm].a=cymaAmp[sm];}
    for(var q=0;q<drv.length;q++){
      var f=Math.max(drv[q].f,1);
      drv[q].k=6.2832*4.6*Math.pow(f/432,0.6667);           // capillary Faraday scaling
      drv[q].n=Math.max(3,Math.round(Math.sqrt(f/432)*6));   // angular symmetry
      drv[q].ph=t*0.001*(0.7+(f%7)*0.4);                     // ripple phase
    }
    var amp=0.32+env*0.90;
    var half=CYS/2;
    for(var y=0;y<CYS;y++){
      for(var x=0;x<CYS;x++){
        var dx=(x-half)/half,dy=(y-half)/half;
        var r=Math.sqrt(dx*dx+dy*dy);
        var idx=(y*CYS+x)*4;
        if(r>1){d[idx+3]=0;continue;}
        var th=Math.atan2(dy,dx);
        var z=0;
        for(var q2=0;q2<drv.length;q2++){
          var D=drv[q2];
          var radial=Math.cos(D.k*r-D.ph)/Math.sqrt(1+D.k*r*0.30);
          var angular=Math.cos(D.n*th+D.ph*0.25);
          z+=D.a*radial*angular;
        }
        z*=amp*(1-Math.pow(r,6)); // meniscus rim damping
        var I=Math.min(1,Math.pow(Math.abs(z)*2.2,0.92)); // soft gamma — crisper node/antinode separation
        var rr,gg,bb;
        if(I<0.5){var u=I*2;rr=2+u*12;gg=14+u*130;bb=38+u*174;}
        else{var u2=(I-0.5)*2;rr=14+u2*228;gg=144+u2*111;bb=212+u2*43;}
        d[idx]=rr;d[idx+1]=gg;d[idx+2]=bb;d[idx+3]=Math.floor(255*(0.28+I*0.72));
      }
    }
    cymaCtx.putImageData(img,0,0);
  }
  ctx.save();
  ctx.beginPath();ctx.arc(CX,CY,R,0,6.2832);ctx.clip();
  ctx.imageSmoothingEnabled=true;
  ctx.drawImage(cymaCv,CX-R,CY-R,R*2,R*2);

  // ═══ DARK FX GATE — cosmic overlays only bloom with live signal, keeping the membrane clean at rest and readable under songs.
  var fx=Math.max(0,Math.min(1,(env-0.05)*2.0));
  if(fx>0.02 && cfg.layers.darkFx){
  // ═══ DARK MATTER — slow-drifting invisible clumps that absorb light with a faint gravitational-lensing blue rim.
  var dmT=t*0.00042;
  for(var m=0;m<3;m++){
    var mx=CX+Math.cos(dmT+m*2.0944)*R*0.58;
    var my=CY+Math.sin(dmT*0.72+m*1.11)*R*0.58;
    var mr=R*(0.11+0.025*Math.sin(dmT*2+m));
    var grd=ctx.createRadialGradient(mx,my,0,mx,my,mr);
    grd.addColorStop(0,'rgba(0,0,0,'+(0.60*fx).toFixed(3)+')');           // absorbing core
    grd.addColorStop(0.55,'rgba(4,8,22,'+(0.34*fx).toFixed(3)+')');        // deep void
    grd.addColorStop(0.82,'rgba(60,110,220,'+(0.16*fx).toFixed(3)+')');    // gravitational lens rim
    grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.arc(mx,my,mr,0,6.2832);ctx.fill();
  }

  // ═══ DARK ENERGY — radial expansion aurora. Magenta/violet filaments that flow outward, amplified by audio env.
  ctx.globalCompositeOperation='lighter';
  var det=t*0.00072;
  var eCount=12;
  for(var e=0;e<eCount;e++){
    var ang=(e/eCount)*6.2832+det*0.4+Math.sin(det+e)*0.15;
    var phase=(det*R*0.36+e*R*0.055)%(R*0.94);
    var ex=CX+Math.cos(ang)*phase;
    var ey=CY+Math.sin(ang)*phase;
    var er=R*0.05+env*R*0.09;
    var falloff=1-phase/(R*0.94);
    var alpha=(0.12+env*0.40)*falloff*fx;
    var eg=ctx.createRadialGradient(ex,ey,0,ex,ey,er);
    eg.addColorStop(0,'rgba(220,100,255,'+alpha.toFixed(3)+')');
    eg.addColorStop(0.45,'rgba(160,50,200,'+(alpha*0.55).toFixed(3)+')');
    eg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=eg;
    ctx.beginPath();ctx.arc(ex,ey,er,0,6.2832);ctx.fill();
  }
  // Central singularity glow — pulses with the beat
  var sgR=R*(0.16+env*0.10);
  var sgG=ctx.createRadialGradient(CX,CY,0,CX,CY,sgR);
  sgG.addColorStop(0,'rgba(255,200,255,'+((0.10+env*0.32)*fx).toFixed(3)+')');
  sgG.addColorStop(0.6,'rgba(140,40,200,'+((0.06+env*0.18)*fx).toFixed(3)+')');
  sgG.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=sgG;
  ctx.beginPath();ctx.arc(CX,CY,sgR,0,6.2832);ctx.fill();
  ctx.globalCompositeOperation='source-over';
  }

  // ═══ THREE-FIELD ACTIVATION — sequential POTENTIAL → BIOFIELD → COHERENCE overlay ═══
  if(cfg.layers.threeField) drawFields(t,env,R);

  ctx.restore();
  if(cfg.layers.labels) drawFieldLabels();
}

// ═══ LASER — swept-coherent light medium. Scanning laser lines carve
// the field along the top spectral peaks; interference speckles pulse
// in step with the audio envelope. Deep-red/magenta on black.
function drawLaser(t,env,R){
  ctx.save();
  ctx.beginPath();ctx.arc(CX,CY,R,0,6.2832);ctx.clip();
  // Base dark chamber gradient
  var bg=ctx.createRadialGradient(CX,CY,0,CX,CY,R);
  bg.addColorStop(0,'rgba(20,2,10,1)');
  bg.addColorStop(0.7,'rgba(4,0,4,1)');
  bg.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle=bg;ctx.beginPath();ctx.arc(CX,CY,R,0,6.2832);ctx.fill();

  // Peaks (spectrum) become laser beams sweeping through the chamber
  var freshP=(performance.now()-LIVE.ts)<500;
  var beams=[];
  if(freshP&&LIVE.peaks&&LIVE.peaks.length){
    for(var i=0;i<LIVE.peaks.length&&i<6;i++){beams.push({f:LIVE.peaks[i].hz,a:Math.min(1,LIVE.peaks[i].mag/220)});}
  } else {
    for(var j=0;j<cfg.freqs.length&&j<4;j++){beams.push({f:cfg.freqs[j],a:cfg.playing?0.55:0.16});}
  }
  ctx.globalCompositeOperation='lighter';
  for(var b=0;b<beams.length;b++){
    var f=Math.max(beams[b].f,1);
    var amp=beams[b].a;
    var swAng=(t*0.001*(0.35+((f%13)/13)*1.1)+b*1.1)%(6.2832);
    var col=b===0?'rgba(255,20,80,':b<3?'rgba(255,60,140,':'rgba(255,140,180,';
    // Laser beam as long thin gradient rectangle from CX,CY outward
    var bx=CX+Math.cos(swAng)*R*1.02;
    var by=CY+Math.sin(swAng)*R*1.02;
    var grd=ctx.createLinearGradient(CX,CY,bx,by);
    grd.addColorStop(0,col+(0.02+amp*0.15).toFixed(3)+')');
    grd.addColorStop(0.5,col+(0.55+amp*0.4).toFixed(3)+')');
    grd.addColorStop(1,col+'0)');
    ctx.strokeStyle=grd;
    ctx.lineWidth=1.4+amp*3.6+env*2.5;
    ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(bx,by);ctx.stroke();
    // Bloom endpoint
    var eg=ctx.createRadialGradient(bx,by,0,bx,by,10+amp*10);
    eg.addColorStop(0,col+(0.85+env*0.15).toFixed(3)+')');
    eg.addColorStop(1,col+'0)');
    ctx.fillStyle=eg;ctx.beginPath();ctx.arc(bx,by,10+amp*10,0,6.2832);ctx.fill();
  }
  // Coherent speckles — random scattered dots that flicker with env
  var spec=Math.floor(120+env*260);
  for(var s=0;s<spec;s++){
    var sa=Math.random()*6.2832,sr=Math.sqrt(Math.random())*R*0.98;
    var sx=CX+Math.cos(sa)*sr,sy=CY+Math.sin(sa)*sr;
    var si=Math.random()*(0.35+env*0.65);
    ctx.fillStyle='rgba(255,'+Math.floor(60+si*180)+','+Math.floor(120+si*80)+','+si.toFixed(3)+')';
    ctx.fillRect(sx,sy,1.2,1.2);
  }
  ctx.globalCompositeOperation='source-over';
  // Chamber rim
  ctx.strokeStyle='rgba(255,50,110,0.55)';ctx.lineWidth=1.6;
  ctx.beginPath();ctx.arc(CX,CY,R*0.985,0,6.2832);ctx.stroke();
  ctx.restore();
}

// ═══ MIRRORS — kaleidoscope reflection medium. Live waveform trace is
// mirrored across N radial axes to produce a symmetric mirror-flower.
// Chrome/silver palette, dark obsidian ground. "One display" clean.
function drawMirrors(t,env,R){
  ctx.save();
  ctx.beginPath();ctx.arc(CX,CY,R,0,6.2832);ctx.clip();
  // Polished obsidian base
  var bg=ctx.createRadialGradient(CX,CY,0,CX,CY,R);
  bg.addColorStop(0,'rgba(20,22,28,1)');
  bg.addColorStop(0.6,'rgba(6,7,10,1)');
  bg.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle=bg;ctx.beginPath();ctx.arc(CX,CY,R,0,6.2832);ctx.fill();

  // Symmetry axes count driven by carrier
  var f=(cfg.freqs&&cfg.freqs[0])||432;
  var seg=Math.max(4,Math.min(24,3+Math.round(Math.sqrt(f/40))));
  var seed=t*0.001;
  var pts=[];
  var N=LIVE.wave&&LIVE.wave.length?LIVE.wave.length:64;
  // Build a wedge shape from the live waveform (radial extrusion) — this wedge is mirrored around
  for(var i=0;i<N;i++){
    var wv=(LIVE.wave[i%N]-128)/128;
    var rr=R*(0.10+0.85*(i/N))+wv*R*0.10*(0.4+env*1.4);
    pts.push(rr);
  }
  // Draw N mirrored wedges with chrome gradient
  var beatMod=1;if(cfg.beat>0){var bD=cfg.beat;while(bD>16)bD/=2;beatMod=0.85+0.15*Math.sin(t*0.001*6.2832*bD);}
  ctx.globalCompositeOperation='lighter';
  for(var k=0;k<seg;k++){
    var a0=(k/seg)*6.2832+seed*0.15;
    var flip=k%2===0?1:-1;
    ctx.save();
    ctx.translate(CX,CY);
    ctx.rotate(a0);
    ctx.scale(1,flip);
    // Wedge fill
    var grd=ctx.createLinearGradient(0,0,R,0);
    grd.addColorStop(0,'rgba(255,255,255,'+(0.02+env*0.05).toFixed(3)+')');
    grd.addColorStop(0.5,'rgba(200,210,225,'+(0.20+env*0.35).toFixed(3)+')');
    grd.addColorStop(1,'rgba(90,100,120,0)');
    ctx.fillStyle=grd;
    ctx.beginPath();ctx.moveTo(0,0);
    var wedge=6.2832/seg*0.98;
    for(var ii=0;ii<pts.length;ii++){
      var pa=(ii/pts.length)*wedge;
      var pr=pts[ii]*beatMod;
      ctx.lineTo(Math.cos(pa)*pr,Math.sin(pa)*pr);
    }
    ctx.closePath();ctx.fill();
    // Reflective edge outline
    ctx.strokeStyle='rgba(240,245,255,'+(0.35+env*0.45).toFixed(3)+')';
    ctx.lineWidth=1;
    ctx.stroke();
    ctx.restore();
  }
  ctx.globalCompositeOperation='source-over';
  // Central mirror pupil — reflects a bright specular highlight
  var pR=R*(0.10+env*0.06);
  var pg=ctx.createRadialGradient(CX-pR*0.3,CY-pR*0.3,0,CX,CY,pR);
  pg.addColorStop(0,'rgba(255,255,255,0.95)');
  pg.addColorStop(0.4,'rgba(210,220,235,0.55)');
  pg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=pg;ctx.beginPath();ctx.arc(CX,CY,pR,0,6.2832);ctx.fill();
  // Fine chrome rim
  ctx.strokeStyle='rgba(220,225,235,0.75)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.arc(CX,CY,R*0.985,0,6.2832);ctx.stroke();
  ctx.restore();
}

// ═══ STARS — planet-frequency star cymatics (image ref: Sirius/Earth/Sun/
// Moon/Mercury/Venus/Mars/Jupiter…). Every frequency tone sounding anywhere
// in the app (live master-bus FFT peaks) renders its own star mandala:
// spiky flame rim + petal wheel + n-pointed star + concentric rings + core.
// Fold symmetry n and hue are deterministic functions of the frequency, so
// each tone always produces the SAME recognizable star pattern. ═══
var starAmp=[0,0,0,0];
function starHue(f){var o=Math.log(Math.max(f,1)/32)/Math.LN2;return (((o%1)+1)%1)*360;}
function drawStarMandala(cx,cy,R,f,a,t){
  var n=5+Math.round(f)%8;                       // fold symmetry from Hz
  var hue=Math.round(starHue(f));                // octave position → color wheel
  var rot=t*0.00012*(1+(f%5)*0.3);
  var main='hsla('+hue+',95%,72%,';
  var glow='hsla('+hue+',100%,65%,0.9)';
  ctx.save();
  ctx.translate(cx,cy);
  ctx.shadowColor=glow;ctx.shadowBlur=10+a*14;
  // 1 · outer flame-spike rim — wobbles with the live waveform
  var spikes=n*4;
  ctx.strokeStyle=main+(0.25+a*0.6).toFixed(3)+')';
  ctx.lineWidth=1.1;
  ctx.beginPath();
  for(var i=0;i<=spikes;i++){
    var th=rot+i*6.2832/spikes;
    var wv=Math.abs(LIVE.wave[Math.floor(i/spikes*127)%128]-128)/128;
    var len=R*(0.84+0.10*Math.sin(i*n)+wv*0.16*a+0.04*Math.sin(t*0.004+i));
    var px=Math.cos(th)*len,py=Math.sin(th)*len;
    i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);
  }
  ctx.closePath();ctx.stroke();
  // 2 · petal wheel — n counter-rotating circles (flower ring)
  ctx.strokeStyle=main+(0.30+a*0.55).toFixed(3)+')';
  ctx.lineWidth=1.0;
  for(var p2=0;p2<n;p2++){
    var a2=-rot*1.6+p2*6.2832/n;
    ctx.beginPath();ctx.arc(Math.cos(a2)*R*0.52,Math.sin(a2)*R*0.52,R*0.24,0,6.2832);ctx.stroke();
  }
  // 3 · n-pointed star polygon
  ctx.strokeStyle=main+(0.45+a*0.5).toFixed(3)+')';
  ctx.beginPath();
  for(var s2=0;s2<=n*2;s2++){
    var a3=rot*0.8+s2*Math.PI/n;
    var rr=(s2%2===0)?R*0.44:R*0.19;
    var sx=Math.cos(a3)*rr,sy=Math.sin(a3)*rr;
    s2===0?ctx.moveTo(sx,sy):ctx.lineTo(sx,sy);
  }
  ctx.closePath();ctx.stroke();
  // 4 · concentric breathing rings
  ctx.lineWidth=0.8;
  for(var r3=1;r3<=4;r3++){
    ctx.strokeStyle=main+(0.10+a*0.28*(1-r3*0.15)).toFixed(3)+')';
    ctx.beginPath();ctx.arc(0,0,R*(0.14+r3*0.17)*(1+0.02*Math.sin(t*0.003+r3)),0,6.2832);ctx.stroke();
  }
  // 5 · luminous core
  var cg=ctx.createRadialGradient(0,0,0,0,0,Math.max(R*0.14,1));
  cg.addColorStop(0,'hsla('+hue+',100%,92%,'+(0.5+a*0.5).toFixed(3)+')');
  cg.addColorStop(1,'hsla('+hue+',100%,60%,0)');
  ctx.fillStyle=cg;ctx.beginPath();ctx.arc(0,0,R*0.14,0,6.2832);ctx.fill();
  // Hz label
  ctx.shadowBlur=0;ctx.font='bold 8px monospace';ctx.textAlign='center';
  ctx.fillStyle=main+(0.5+a*0.5).toFixed(3)+')';
  ctx.fillText(f.toFixed(1)+' Hz',0,R+12);
  ctx.restore();
}
function drawStars(t,env,R){
  // Drivers: live FFT peaks of the master bus — every sounding tone app-wide
  var drv=[];var freshP=(performance.now()-LIVE.ts)<500;
  if(freshP&&LIVE.peaks&&LIVE.peaks.length){
    for(var i=0;i<LIVE.peaks.length&&i<4;i++)drv.push({f:LIVE.peaks[i].hz,a:Math.min(1,LIVE.peaks[i].mag/190)});
  } else {
    for(var j=0;j<cfg.freqs.length&&j<4;j++)drv.push({f:cfg.freqs[j],a:cfg.playing?0.5:0.14});
  }
  // Temporal smoothing per slot — steady, non-flickering mandalas
  for(var s=0;s<4;s++){var tgt=s<drv.length?drv[s].a:0;starAmp[s]=starAmp[s]*0.7+tgt*0.3;if(s<drv.length)drv[s].a=Math.min(1,starAmp[s]*(0.4+env*1.2)+0.08);}
  if(!drv.length)drv.push({f:432,a:0.10});
  var k=drv.length,lay;
  if(k===1)lay=[[CX,CY,R*0.92]];
  else if(k===2)lay=[[CX-R*0.52,CY,R*0.5],[CX+R*0.52,CY,R*0.5]];
  else if(k===3)lay=[[CX,CY-R*0.46,R*0.44],[CX-R*0.52,CY+R*0.42,R*0.44],[CX+R*0.52,CY+R*0.42,R*0.44]];
  else lay=[[CX-R*0.5,CY-R*0.46,R*0.42],[CX+R*0.5,CY-R*0.46,R*0.42],[CX-R*0.5,CY+R*0.46,R*0.42],[CX+R*0.5,CY+R*0.46,R*0.42]];
  for(var m2=0;m2<k;m2++)drawStarMandala(lay[m2][0],lay[m2][1],lay[m2][2],drv[m2].f,drv[m2].a,t);
}

function drawScopeFace(t,envSmooth){
  var now2=performance.now();
  var isStars=cfg.medium==='STARS';
  var isCyma=cfg.medium==='CYMASCOPE';
  var isLaser=cfg.medium==='LASER';
  var isMirrors=cfg.medium==='MIRRORS';
  var isCodon=cfg.medium==='CODON';
  var isGenus=cfg.medium==='GENUS';
  var isE8=cfg.medium==='E8';
  // "One display at a time" — cyma-family mediums render exclusively (no polar grid, particles, FFT ring or stacked geometries)
  var exclusive=isStars||isCyma||isLaser||isMirrors||isCodon||isGenus||isE8;
  if(exclusive){ctx.fillStyle='#010409';ctx.fillRect(0,0,W,H);}
  else{ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(0,0,W,H);}
  var p=PAL[cfg.medium]||PAL.CYMATICS;
  // Pure cymatics — no instrument grid over the scope
  var audioActive=envSmooth>0.02;
  var f=(cfg.freqs&&cfg.freqs[0])||432;
  var n=2+Math.round(f%12);
  var m=3+Math.round((f/100)%9);
  var spin=audioActive?t*0.00045*(1+(f%7)*0.25)*(0.4+envSmooth*1.6):0;
  // Static radius — the scope no longer breathes. The active signal is
  // conveyed through in-medium motion (ripples, star bursts, waveform ring)
  // instead of expanding/contracting the outer field.
  var R=R0;
  var med=cfg.medium;
  var fresh=(performance.now()-LIVE.ts)<700;
  if(isStars){
    drawStars(t,envSmooth,R);
  } else if(isCyma){
    drawCymascope(t,envSmooth,R);
  } else if(isLaser){
    drawLaser(t,envSmooth,R);
  } else if(isMirrors){
    drawMirrors(t,envSmooth,R);
  } else if(isCodon){
    drawCodon(R,t*0.0002+spin,p,envSmooth);
  } else if(isGenus){
    drawGenus(R,t*0.0003+spin,p,envSmooth);
  } else if(isE8){
    drawE8(R,t*0.00016+spin,p,envSmooth);
  } else {
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
    else if(med==='WATER'){var w=Math.abs(Math.sin(m*Math.PI*r-(audioActive?t*0.004:0)));hit=w>0.9;alpha=0.30+0.4*w;size=1.6+envSmooth*2;
      if(!hit&&RIPPLES.length){var px3=CX+Math.cos(th)*r*R,py3=CY+Math.sin(th)*r*R;var rb=rippleBoost(px3,py3,now2);if(rb>0.30&&Math.random()<rb){hit=true;alpha=0.35+0.55*rb;size=1.8+rb*2;}}}
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
  }
  ctx.globalAlpha=1;
  if(fresh && cfg.layers.waveRing && (!exclusive || isCyma)){
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
  // ═══ BINAURAL BEAT SYNC — pulse locked to the beat frequency ═══
  var beatMod=1;
  if(cfg.beat>0){var bD=cfg.beat;while(bD>16)bD/=2;beatMod=0.78+0.22*Math.sin(t*0.001*6.2832*bD);}
  var geoEnv=Math.min(1,envSmooth*beatMod+(cfg.beat>0&&audioActive?0.05:0));
  if(!exclusive && cfg.geometries && cfg.geometries.length){
    ctx.save();
    ctx.shadowColor=p.glow;ctx.shadowBlur=audioActive?12+envSmooth*18:6;
    var geomRot=spin*0.6;
    var geomR=R*0.92*(cfg.beat>0&&audioActive?(0.97+0.03*beatMod):1);
    for(var gi=0;gi<cfg.geometries.length;gi++){
      var g=cfg.geometries[gi];
      switch(g){
        case 'FLOWER':   drawFlower(geomR,geomRot,p,geoEnv);break;
        case 'METATRON': drawMetatron(geomR,geomRot,p,geoEnv);break;
        case 'SRI':      drawSri(geomR,geomRot,p,geoEnv);break;
        case 'VESICA':   drawVesica(geomR,geomRot,p,geoEnv);break;
        case 'MERKABA':  drawMerkaba(geomR,geomRot,p,geoEnv);break;
        case 'SPIRAL':   drawSpiral(geomR,geomRot,p,geoEnv);break;
        case 'NGON':     drawNgon(geomR,geomRot,p,geoEnv,f);break;
        case 'LISSAJOUS':drawLissajous(geomR,geomRot,p,geoEnv,f);break;
        case 'PHASE':    drawPhase(geomR,geomRot,p,geoEnv);break;
        case 'JULIA':    drawJulia(geomR,geomRot,p,geoEnv,f);break;
      }
    }
    ctx.restore();
    ctx.globalAlpha=1;
  }
  // ═══ ORBIT — planet marker locked to the carrier's cosmic-octave orbit tone ═══
  if(cfg.orbit && cfg.layers.orbit){
    var oc=cfg.orbit;
    var orad=R*1.10;
    ctx.save();
    ctx.setLineDash([3,5]);
    ctx.strokeStyle=oc.color;ctx.lineWidth=1;ctx.globalAlpha=0.20+envSmooth*0.30;
    ctx.beginPath();ctx.arc(CX,CY,orad,0,6.2832);ctx.stroke();
    ctx.setLineDash([]);
    var rev=oc.hz/1024;
    var pa=-Math.PI/2+t*0.001*6.2832*rev;
    var px=CX+Math.cos(pa)*orad,py=CY+Math.sin(pa)*orad;
    var pr=(3.5+envSmooth*3)*beatMod;
    var pg=ctx.createRadialGradient(px,py,0,px,py,pr*3.2);
    pg.addColorStop(0,oc.color);pg.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=0.85;ctx.fillStyle=pg;
    ctx.beginPath();ctx.arc(px,py,pr*3.2,0,6.2832);ctx.fill();
    ctx.globalAlpha=1;ctx.fillStyle='#ffffff';
    ctx.beginPath();ctx.arc(px,py,Math.max(1.6,pr*0.55),0,6.2832);ctx.fill();
    ctx.font='bold 11px monospace';ctx.fillStyle=oc.color;ctx.globalAlpha=0.95;ctx.textAlign='center';
    ctx.fillText(oc.symbol,px,py-8);
    ctx.font='bold 8px monospace';ctx.globalAlpha=0.8;
    ctx.fillText(oc.symbol+' '+oc.planet+' '+oc.hz.toFixed(2)+'Hz'+(cfg.beat>0?(' \\u00B7 BEAT '+cfg.beat.toFixed(1)+'Hz SYNC'):''),CX,H-8);
    ctx.globalAlpha=1;ctx.textAlign='left';
    ctx.restore();
  }
  ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=audioActive?18+envSmooth*22:8;
  ctx.strokeStyle=p.glow;ctx.lineWidth=audioActive?2:1;ctx.globalAlpha=audioActive?0.85:0.4;
  ctx.beginPath();
  for(var a2=0;a2<=6.2832;a2+=0.05){
    var wob=1+(audioActive?(0.02+0.05*envSmooth)*Math.sin(n*a2+spin*3):0.006*Math.sin(n*a2));
    var rx=CX+Math.cos(a2)*R*wob,ry=CY+Math.sin(a2)*R*wob;
    a2===0?ctx.moveTo(rx,ry):ctx.lineTo(rx,ry);
  }
  ctx.closePath();ctx.stroke();ctx.restore();
  ctx.globalAlpha=audioActive?0.95:0.5;ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=14+envSmooth*20;
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(CX,CY,audioActive?(2.6+envSmooth*4):1.8,0,6.2832);ctx.fill();ctx.restore();
  ctx.globalAlpha=1;
  // Interactive-touch ripples render on top of every medium
  drawRipples(p,now2);
}

// ═════════ NODE FACE (harmonic-resonance orbs, T-800 HUD) ═════════
var particles=[];
function orbPositions(N,spin){
  var pts=[];
  var R=R0*1.05;
  function ring(cnt,r,rotOff){
    for(var i=0;i<cnt;i++){
      var a=-Math.PI/2+rotOff+spin+i*6.2832/cnt;
      pts.push({x:CX+Math.cos(a)*r,y:CY+Math.sin(a)*r});
    }
  }
  if(N===1){pts.push({x:CX,y:CY});}
  else if(N===3){ring(3,R*0.52,0);}
  else if(N===6){ring(6,R*0.60,0);}
  else if(N===7){pts.push({x:CX,y:CY});ring(6,R*0.56,0);}
  else if(N===9){ring(3,R*0.28,0);ring(6,R*0.64,Math.PI/6);}
  else if(N===13){pts.push({x:CX,y:CY});ring(12,R*0.62,0);}
  else if(N===26){ring(13,R*0.38,0);ring(13,R*0.72,Math.PI/13);}
  else if(N===33){pts.push({x:CX,y:CY});ring(8,R*0.35,0);ring(24,R*0.72,0);}
  else {
    var GA=2.39996323;
    for(var i=0;i<N;i++){
      var r=R*0.80*Math.sqrt((i+0.5)/N);
      var a=i*GA+spin*0.4;
      pts.push({x:CX+Math.cos(a)*r,y:CY+Math.sin(a)*r});
    }
  }
  return pts;
}
function drawHud(env){
  // gunmetal base
  ctx.fillStyle='#05070a';ctx.fillRect(0,0,W,H);
  // scanlines
  ctx.fillStyle='rgba(255,10,10,0.025)';
  for(var y=0;y<H;y+=4){ctx.fillRect(0,y,W,1);}
  // steel grid
  ctx.strokeStyle='rgba(150,165,185,0.05)';ctx.lineWidth=1;
  var step=44;
  for(var x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(var yy=0;yy<H;yy+=step){ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(W,yy);ctx.stroke();}
  // targeting rings
  ctx.strokeStyle='rgba(255,10,10,'+(0.06+env*0.10)+')';
  for(var k=1;k<=3;k++){ctx.beginPath();ctx.arc(CX,CY,R0*0.42*k,0,6.2832);ctx.stroke();}
  // corner reticles
  ctx.strokeStyle='rgba(255,10,10,0.5)';ctx.lineWidth=1.4;
  var m=10,L=16;
  ctx.beginPath();ctx.moveTo(m,m+L);ctx.lineTo(m,m);ctx.lineTo(m+L,m);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W-m-L,m);ctx.lineTo(W-m,m);ctx.lineTo(W-m,m+L);ctx.stroke();
  ctx.beginPath();ctx.moveTo(m,H-m-L);ctx.lineTo(m,H-m);ctx.lineTo(m+L,H-m);ctx.stroke();
  ctx.beginPath();ctx.moveTo(W-m-L,H-m);ctx.lineTo(W-m,H-m);ctx.lineTo(W-m,H-m-L);ctx.stroke();
  // crosshair ticks
  ctx.strokeStyle='rgba(255,10,10,'+(0.25+env*0.4)+')';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(CX-8,CY);ctx.lineTo(CX+8,CY);ctx.stroke();
  ctx.beginPath();ctx.moveTo(CX,CY-8);ctx.lineTo(CX,CY+8);ctx.stroke();
}
function drawOrb(x,y,color,glow,size,intensity,active,audible){
  if(!audible){
    ctx.globalAlpha=0.25;
    ctx.strokeStyle='#5a646f';ctx.lineWidth=1;
    ctx.beginPath();ctx.arc(x,y,size,0,6.2832);ctx.stroke();
    ctx.globalAlpha=1;
    return;
  }
  var haloR=size*2.2+intensity*size*2.4;
  var grad=ctx.createRadialGradient(x,y,0,x,y,haloR);
  grad.addColorStop(0,glow);
  grad.addColorStop(0.4,color);
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=0.9;
  ctx.fillStyle=grad;
  ctx.beginPath();ctx.arc(x,y,haloR,0,6.2832);ctx.fill();
  ctx.globalAlpha=1;
  ctx.fillStyle='#ffffff';
  ctx.beginPath();ctx.arc(x,y,active?Math.max(2,size*0.42+intensity*2):Math.max(1.4,size*0.3),0,6.2832);ctx.fill();
  ctx.strokeStyle=color;ctx.lineWidth=1.1;
  ctx.beginPath();ctx.arc(x,y,size*0.9+intensity*2,0,6.2832);ctx.stroke();
}
function spawnParticles(x,y,color,intensity){
  var n=Math.floor(intensity*3);
  for(var i=0;i<n;i++){
    particles.push({x:x,y:y,vx:(Math.random()-0.5)*1.4,vy:(Math.random()-0.5)*1.4,life:1,color:color,size:1+Math.random()*1.6});
  }
  if(particles.length>180)particles.splice(0,particles.length-180);
}
function drawParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;
    p.life-=0.025;
    if(p.life<=0){particles.splice(i,1);continue;}
    ctx.globalAlpha=p.life*0.85;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
  }
  ctx.globalAlpha=1;
}
function drawNodeFace(t,envSmooth){
  drawHud(envSmooth);
  var orbs=cfg.orbs||[];
  var N=orbs.length;
  if(!N)return;
  var spin=(cfg.resonating||cfg.playing)?t*0.00012*(1+envSmooth*2):t*0.00004;
  var pts=orbPositions(N,spin);
  var size=N<=7?10:(N<=13?7.5:(N<=33?5:3));
  var act=cfg.resonating||cfg.playing;
  // connections
  ctx.globalAlpha=0.5;
  if(N<=13){
    for(var i=0;i<N;i++){
      for(var j=i+1;j<N;j++){
        var a=pts[i],b=pts[j];
        var g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
        g.addColorStop(0,orbs[i].c);g.addColorStop(1,orbs[j].c);
        ctx.strokeStyle=g;ctx.lineWidth=0.9;
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
      }
    }
  } else {
    for(var k=0;k<N-1;k++){
      var a2=pts[k],b2=pts[k+1];
      var g2=ctx.createLinearGradient(a2.x,a2.y,b2.x,b2.y);
      g2.addColorStop(0,orbs[k].c);g2.addColorStop(1,orbs[k+1].c);
      ctx.strokeStyle=g2;ctx.lineWidth=0.7;
      ctx.beginPath();ctx.moveTo(a2.x,a2.y);ctx.lineTo(b2.x,b2.y);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
  // orbs
  for(var oi=0;oi<N;oi++){
    var o=orbs[oi],p=pts[oi];
    var phaseP=Math.sin(t*0.002+oi*0.7)*0.5+0.5;
    var inten=act&&o.a?(envSmooth*0.8+phaseP*0.3):(0.12+phaseP*0.08);
    drawOrb(p.x,p.y,o.c,o.g,size,inten,act&&o.a,o.a);
    if(act&&o.a&&envSmooth>0.15&&N<=33)spawnParticles(p.x,p.y,o.g,inten);
    if(N<=13&&o.a){
      ctx.font='bold 9px monospace';
      ctx.fillStyle='#c9d2dd';ctx.globalAlpha=0.85;ctx.textAlign='center';
      var hz=o.f;
      var label=hz>=1000?(hz/1000).toFixed(hz>=10000?1:2)+'k':hz.toFixed(hz<100?1:0);
      ctx.fillText(label,p.x,p.y+size*2.6+8);
      ctx.globalAlpha=1;ctx.textAlign='left';
    }
  }
  drawParticles();
  // center readout
  ctx.textAlign='center';
  ctx.font='bold 30px monospace';
  ctx.fillStyle=act?'#ff2a2a':'#8a94a2';
  ctx.globalAlpha=0.92;
  ctx.fillText(String(N),CX,CY-6);
  ctx.font='bold 7px monospace';
  ctx.fillStyle='#8a94a2';
  ctx.globalAlpha=0.8;
  ctx.fillText(cfg.pattern||'',CX,CY+8);
  ctx.fillText((cfg.baseFreq||432).toFixed(1)+' HZ BASE',CX,CY+18);
  ctx.globalAlpha=1;ctx.textAlign='left';
}

// ═════════ SPIN FLIP + MAIN LOOP ═════════
var flip=0; // 0 = SCOPE, 1 = NODE
var envSmooth=0;
function draw(t){
try{
  var target=cfg.view==='NODE'?1:0;
  flip+=(target-flip)*0.14;
  if(Math.abs(target-flip)<0.002)flip=target;
  // ═══ ZERO-LATENCY ENVELOPE ═══
  // Peak deviation from 128 rarely exceeds 45-60 for typical listening; a divisor
  // of 55 gives the CymaScope a lively, musically-responsive envelope while still
  // clamping at 1.0 for loud transients. The fresh window is widened to 700ms
  // to survive brief RN bridge congestion without visually dropping to STBY. When
  // audio is present the smoothing tracks fast (attack 0.55) and decays slow
  // (release 0.14) — classic audio VU behavior for a clean, breathing feedback.
  var live=Math.min(1,(LIVE.peak||0)/55);
  var fresh=(performance.now()-LIVE.ts)<700;
  var env=fresh?live:(cfg.playing?0.35:0);
  var attack=env>envSmooth?0.55:0.14;
  envSmooth=envSmooth*(1-attack)+env*attack;
  var sx=Math.cos(Math.PI*flip);
  var showNode=flip>0.5;
  var mag=Math.max(0.03,Math.abs(sx));
  ctx.setTransform(1,0,0,1,0,0);
  if(mag<0.999){
    // mid-flip: hard clear + squash
    ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
    ctx.setTransform(mag,0,0,1,CX*(1-mag),0);
  }
  if(showNode)drawNodeFace(t,envSmooth);
  else drawScopeFace(t,envSmooth);
  ctx.setTransform(1,0,0,1,0,0);
  // flip edge glint
  if(mag<0.97){
    ctx.fillStyle='rgba(255,10,10,'+(0.25*(1-mag))+')';
    ctx.fillRect(CX-1,0,2,H);
  }
}catch(e){/* never let a bad frame kill the realtime feedback loop */}
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
</script></body></html>`;

interface Props {
  frequencies: number[];
  playing: boolean;
  scalarBeatHz?: number; // scalar resonator pulse (e.g. 7.83) when engaged
}

export default function ScopeNodePanel({ frequencies, playing, scalarBeatHz = 0 }: Props) {
  const [view, setView] = useState<'SCOPE' | 'NODE'>('SCOPE');
  const [medium, setMedium] = useState<Medium>('WATER');
  const [geometries, setGeometries] = useState<Set<Geometry>>(new Set(['MERKABA']));
  // Default GEO = MERKABA (brand identity). AUTO·orbit mode is opt-in so the
  // scope always opens on the merkaba until the user cycles the ORB pill.
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [orbCount, setOrbCount] = useState<number>(7);
  const [resonating, setResonating] = useState(false);
  const [livePeak, setLivePeak] = useState(0);
  const [measuredHz, setMeasuredHz] = useState(0);
  const [livePeaks, setLivePeaks] = useState<number[]>([]);
  const [tuningA, setTuningA] = useState<432 | 440>(AudioEngine.getTuning());
  // ═══ CYMASCOPE LAYER TOGGLES — separate each overlay for cleaner cymatic
  //     response. Base water field always renders; each layer can be muted
  //     independently for a stripped-down or maximal cosmic view. ═══
  const [layers, setLayers] = useState({
    darkFx: false,      // Dark matter clumps + dark energy filaments (cosmic bloom)
    threeField: false,  // Potential → Biofield → Coherence sequential rings
    orbit: true,        // Planet marker orbit
    labels: false,      // Field side labels
    waveRing: false,    // Outer waveform overlay ring
  });
  const toggleLayer = (k: keyof typeof layers) => setLayers(prev => ({ ...prev, [k]: !prev[k] }));
  const lastPeaksTs = useRef(0);
  const [geoPickerOpen, setGeoPickerOpen] = useState(false);
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  // Subscribe to global tuning changes so multiple pills stay in sync
  useEffect(() => AudioEngine.subscribeTuning(setTuningA), []);
  const toggleTuning = () => AudioEngine.setTuning(tuningA === 432 ? 440 : 432);

  const baseFreq = frequencies[0] || 432;

  // ═══ ORBIT GEOMETRY — exact Tone + Orbit pair for the current preset/codes ═══
  // Canvas markup re-colored for the active skin (tree remounts on skin change)
  const skinnedHtml = useMemo(() => skinHtml(PANEL_HTML), []);
  const orbitInfo = useMemo(() => mapOrbitGeometry(baseFreq), [baseFreq]);
  const beatHz = useMemo(() => detectBeat(frequencies, scalarBeatHz), [frequencies, scalarBeatHz]);

  // Auto-select the orbit's sacred geometry whenever the preset/codes change
  useEffect(() => {
    if (autoOrbit) setGeometries(new Set([orbitInfo.geometry as Geometry]));
  }, [autoOrbit, orbitInfo.geometry]);

  // Harmonic orb data — n-th orb = n-th harmonic of the base frequency
  const orbs = useMemo(() => {
    const out: { f: number; c: string; g: string; a: boolean }[] = [];
    for (let n = 1; n <= orbCount; n++) {
      const f = Math.round(baseFreq * n * 10) / 10;
      const ch = chakraForFreq(f);
      out.push({ f, c: ch.color, g: ch.glow, a: f <= MAX_AUDIBLE_HZ });
    }
    return out;
  }, [orbCount, baseFreq]);

  const audibleCount = useMemo(() => orbs.filter(o => o.a).length, [orbs]);

  // ─── Harmonic resonance audio stack ───
  const startedIdsRef = useRef<number[]>([]);
  const harmonicGain = useCallback((n: number, total: number) =>
    Math.min(0.22, 0.6 / Math.sqrt(Math.max(1, total)) / Math.pow(n, 0.55)), []);

  const stopHarmonics = useCallback(() => {
    startedIdsRef.current.forEach(id => AudioEngine.stopTone(id));
    startedIdsRef.current = [];
  }, []);

  const startHarmonics = useCallback((count: number, base: number) => {
    stopHarmonics();
    const ids: number[] = [];
    let audible = 0;
    for (let n = 1; n <= count; n++) if (base * n <= MAX_AUDIBLE_HZ) audible++;
    for (let n = 1; n <= count; n++) {
      const f = base * n;
      if (f > MAX_AUDIBLE_HZ) continue;
      const id = HARMONIC_ID_BASE + n;
      AudioEngine.startTone(id, Math.round(f * 10) / 10, harmonicGain(n, audible));
      ids.push(id);
    }
    startedIdsRef.current = ids;
  }, [stopHarmonics, harmonicGain]);

  const toggleResonate = () => {
    if (resonating) {
      stopHarmonics();
      setResonating(false);
    } else {
      startHarmonics(orbCount, baseFreq);
      setResonating(true);
    }
  };

  const selectOrbCount = (n: number) => {
    setOrbCount(n);
    if (resonating) startHarmonics(n, baseFreq);
  };

  // Retune live when base frequency sweeps while resonating
  const resonatingRef = useRef(resonating);
  resonatingRef.current = resonating;
  useEffect(() => {
    if (!resonatingRef.current) return;
    startedIdsRef.current.forEach(id => {
      const n = id - HARMONIC_ID_BASE;
      const f = baseFreq * n;
      if (f <= MAX_AUDIBLE_HZ) AudioEngine.updateFreq(id, Math.round(f * 10) / 10);
    });
  }, [baseFreq]);

  // Main STOP (stopAll) kills every oscillator — sync resonate state off
  const prevPlayingRef = useRef(playing);
  useEffect(() => {
    if (prevPlayingRef.current && !playing && resonatingRef.current) {
      startedIdsRef.current = [];
      setResonating(false);
    }
    prevPlayingRef.current = playing;
  }, [playing]);

  // Cleanup on unmount
  useEffect(() => () => { stopHarmonics(); }, [stopHarmonics]);

  // ─── Canvas bridge ───
  const pushConfig = useCallback((cfg: object) => {
    const json = JSON.stringify(cfg);
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.updateScope?.(json); } catch {}
    } else {
      webRef.current?.injectJavaScript(`window.updateScope(${JSON.stringify(json)}); true;`);
    }
  }, []);

  const lastPushTs = useRef(0);
  const pushWave = useCallback((frame: ScopeFrame) => {
    if (Platform.OS === 'web') {
      // Iframe on web: direct function call, negligible cost — push every frame
      const payload = JSON.stringify({ __wave: true, wave: frame.wave, peak: frame.peak, peaks: frame.peaks || [] });
      try { iframeRef.current?.contentWindow?.pushWave?.(payload); } catch {}
      return;
    }
    // Native: injectJavaScript is expensive; cap at ~30fps + trim payload so
    // the RN bridge doesn't back up under sustained playback. Loud peaks
    // (transients) always get through by piggybacking their high-peak frames.
    const now = Date.now();
    const isTransient = frame.peak > 40;
    if (!isTransient && now - lastPushTs.current < 33) return;
    lastPushTs.current = now;
    const trimmedPeaks = (frame.peaks || []).slice(0, 4);
    const payload = JSON.stringify({ __wave: true, wave: frame.wave, peak: frame.peak, peaks: trimmedPeaks });
    const safe = payload.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    webRef.current?.injectJavaScript(`window.pushWave&&window.pushWave('${safe}');true;`);
  }, []);

  const fullConfig = useCallback(() => ({
    freqs: frequencies,
    playing,
    medium,
    geometries: Array.from(geometries),
    view,
    orbs,
    resonating,
    baseFreq,
    pattern: PATTERN_NAME[orbCount] || '',
    orbit: autoOrbit ? { planet: orbitInfo.planet, symbol: orbitInfo.symbol, color: orbitInfo.color, hz: orbitInfo.orbitHz } : null,
    beat: beatHz,
    layers,
  }), [frequencies, playing, medium, geometries, view, orbs, resonating, baseFreq, orbCount, autoOrbit, orbitInfo, beatHz, layers]);

  useEffect(() => {
    pushConfig(fullConfig());
  }, [fullConfig, pushConfig]);

  useEffect(() => {
    const unsub = AudioEngine.subscribeScope((frame) => {
      pushWave(frame);
      setLivePeak(frame.peak);
      if (typeof frame.measuredHz === 'number') setMeasuredHz(frame.measuredHz);
      const now = Date.now();
      if (now - lastPeaksTs.current > 450) {
        lastPeaksTs.current = now;
        const next = (frame.peaks || []).slice(0, 4).map(p => Math.round(p.hz * 10) / 10);
        setLivePeaks(prev => (prev.join(',') === next.join(',') ? prev : next));
      }
    });
    return unsub;
  }, [pushWave]);

  const color = view === 'NODE' ? SK('#ff0a0a') : SK(MEDIUM_COLORS[medium]);
  const audioActive = livePeak > 1.5;
  const measuredValid = audioActive && measuredHz > 5;

  const cycleMedium = () => {
    const idx = MEDIUMS.indexOf(medium);
    setMedium(MEDIUMS[(idx + 1) % MEDIUMS.length]);
  };
  const toggleGeometry = (g: Geometry) => {
    setAutoOrbit(false); // manual geometry edits release the auto orbit lock
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
      {/* ── T-800 header: SPIN toggle + readout ── */}
      <View style={[st.headerBar, { borderColor: view === 'NODE' ? SK('#ff0a0a') : `${color}70` }]}>
        {/* SPIN toggle switch */}
        <View style={st.spinSwitch}>
          <TouchableOpacity
            style={[st.spinSeg, view === 'SCOPE' && st.spinSegActive]}
            onPress={() => setView('SCOPE')}
            activeOpacity={0.7}
          >
            <Text style={[st.spinSegTxt, view === 'SCOPE' && st.spinSegTxtActive]}>SCOPE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.spinBtn}
            onPress={() => setView(v => (v === 'SCOPE' ? 'NODE' : 'SCOPE'))}
            activeOpacity={0.7}
          >
            <Text style={st.spinBtnTxt}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.spinSeg, view === 'NODE' && st.spinSegActiveRed]}
            onPress={() => setView('NODE')}
            activeOpacity={0.7}
          >
            <Text style={[st.spinSegTxt, view === 'NODE' && st.spinSegTxtActive]}>NODE</Text>
          </TouchableOpacity>
        </View>

        <View style={st.headerHz}>
          <Text style={[st.hzTxt, { color }]}>{baseFreq.toFixed(1)}</Text>
          <Text style={[st.hzUnit, { color }]}>Hz</Text>
          {measuredValid && (
            <>
              <Text style={st.measuredArrow}>→</Text>
              <Text style={[st.measuredVal, { color }]}>{measuredHz.toFixed(1)}</Text>
            </>
          )}
        </View>

        <View style={st.statePill}>
          <View style={[st.stateDot, { backgroundColor: audioActive ? color : SK('#2a1010') }]} />
          <Text style={[st.stateTxt, { color: audioActive ? color : SK('#5a646f') }]}>
            {audioActive ? `${Math.min(100, Math.round((livePeak / 55) * 100))}%` : (playing || resonating ? 'ACT' : 'STBY')}
          </Text>
        </View>

        {/* ── REF-A tuning pill (432/440) — global multiplicative scale ── */}
        <TouchableOpacity
          onPress={toggleTuning}
          style={[st.tunePill, tuningA === 432 ? st.tunePill432 : st.tunePill440]}
          activeOpacity={0.7}
        >
          <Text style={[st.tuneLabel, tuningA === 432 ? st.tuneLabel432 : st.tuneLabel440]}>A</Text>
          <Text style={[st.tuneVal, tuningA === 432 ? st.tuneVal432 : st.tuneVal440]}>{tuningA}</Text>
        </TouchableOpacity>
      </View>

      {/* ── Face-specific control strip ── */}
      {view === 'SCOPE' ? (
        <View style={st.faceRow}>
          <TouchableOpacity
            onPress={() => setAutoOrbit(o => !o)}
            style={[st.cycler, { borderColor: autoOrbit ? orbitInfo.color : SK('#2a3340') }]}
            activeOpacity={0.7}
          >
            <Text style={st.cyclerLabel}>ORB</Text>
            <Text style={[st.cyclerVal, { color: autoOrbit ? orbitInfo.color : SK('#7d8794') }]} numberOfLines={1}>
              {autoOrbit ? `${orbitInfo.symbol} ${orbitInfo.planet}` : 'MANUAL'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={cycleMedium} style={[st.cycler, { borderColor: `${color}60` }]} activeOpacity={0.7}>
            <Text style={st.cyclerLabel}>MED</Text>
            <Text style={[st.cyclerVal, { color }]}>{medium}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setGeoPickerOpen(o => !o)}
            style={[st.cycler, { borderColor: geometries.size ? SK('#ff0a0a') : SK('#2a3340') }]}
            activeOpacity={0.7}
          >
            <Text style={st.cyclerLabel}>GEO</Text>
            <Text style={[st.cyclerVal, { color: geometries.size ? SK('#ff0a0a') : SK('#7d8794') }]}>
              {autoOrbit ? `AUTO·${geoSummary}` : geoSummary}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={st.faceRow}>
          <View style={st.orbChips}>
            {ORB_COUNTS.map(n => (
              <TouchableOpacity
                key={n}
                style={[st.orbChip, orbCount === n && st.orbChipActive]}
                onPress={() => selectOrbCount(n)}
                activeOpacity={0.7}
              >
                <Text style={[st.orbChipTxt, orbCount === n && st.orbChipTxtActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={[st.resonateBtn, resonating && st.resonateBtnActive]}
            onPress={toggleResonate}
            activeOpacity={0.7}
          >
            <Text style={[st.resonateTxt, resonating && st.resonateTxtActive]}>
              {resonating ? '◈ RSN' : '◇ RSN'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {view === 'NODE' && (
        <Text style={st.patternMeta}>
          {PATTERN_NAME[orbCount]} · {audibleCount}/{orbCount} AUDIBLE HARMONICS OF {baseFreq.toFixed(1)} Hz
        </Text>
      )}

      {view === 'SCOPE' && medium === 'CYMASCOPE' && (
        <View style={st.layerRow}>
          <Text style={st.layerRowLabel}>LYR</Text>
          {([
            ['FX·DK', 'darkFx'],
            ['3·FLD', 'threeField'],
            ['ORB',   'orbit'],
            ['LBL',   'labels'],
            ['WAV',   'waveRing'],
          ] as [string, keyof typeof layers][]).map(([label, key]) => {
            const on = layers[key];
            return (
              <TouchableOpacity
                key={key}
                onPress={() => toggleLayer(key)}
                style={[st.layerChip, on && st.layerChipOn]}
                activeOpacity={0.7}
              >
                <Text style={[st.layerChipTxt, on && st.layerChipTxtOn]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {view === 'SCOPE' && medium === 'CYMASCOPE' && (
        <Text style={st.patternMeta}>
          ≋ CYMASCOPE · A={tuningA} · ZERO-LATENCY FFT · {livePeaks.length > 0 ? `LIVE ${livePeaks.join(' · ')} Hz` : 'AWAITING SIGNAL — WATER AT REST'}
        </Text>
      )}

      {view === 'SCOPE' && autoOrbit && (
        <Text style={st.patternMeta}>
          {orbitInfo.symbol} {orbitInfo.planet} ORBIT {orbitInfo.orbitHz.toFixed(2)} Hz ({orbitInfo.cents}¢) · TONE {orbitInfo.tone.note} · {orbitInfo.geometry}
          {beatHz > 0 ? ` · BEAT ${beatHz.toFixed(1)} Hz SYNC` : ''}
        </Text>
      )}

      {view === 'SCOPE' && geoPickerOpen && (
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

      {/* ── Shared flip canvas ── */}
      <View style={[st.scope, { borderColor: view === 'NODE' ? SK('#3a4450') : `${color}40` }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: skinnedHtml,
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: SK('#000') },
            onLoad: () => pushConfig(fullConfig()),
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html: skinnedHtml }}
            style={st.webview}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onLoadEnd={() => pushConfig(fullConfig())}
          />
        )}
      </View>
    </View>
  );
}

const st = skinStyles({
  wrap: { marginBottom: 16 },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 6,
    backgroundColor: '#0b0e12',
  },
  spinSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#070a0e',
  },
  spinSeg: { paddingVertical: 5, paddingHorizontal: 8 },
  spinSegActive: { backgroundColor: '#c9d2dd' },
  spinSegActiveRed: { backgroundColor: '#ff0a0a' },
  spinSegTxt: { color: '#7d8794', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  spinSegTxtActive: { color: '#000' },
  spinBtn: {
    paddingVertical: 4,
    paddingHorizontal: 7,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#2a3340',
  },
  spinBtnTxt: { color: '#ff0a0a', fontSize: 11, fontWeight: '900' },
  headerHz: { flexDirection: 'row', alignItems: 'baseline', gap: 3, flex: 1, justifyContent: 'center' },
  hzTxt: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  hzUnit: { fontSize: 8, fontWeight: '800', letterSpacing: 1, opacity: 0.7 },
  measuredArrow: { color: '#5a646f', fontSize: 9, marginLeft: 3, marginRight: 1, fontWeight: '900' },
  measuredVal: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5, opacity: 0.9 },
  statePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  stateTxt: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  // REF-A tuning pill (432 / 440)
  tunePill: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: '#070a0e',
  },
  tunePill432: { borderColor: '#ff0a0a' },
  tunePill440: { borderColor: '#3a4450' },
  tuneLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  tuneLabel432: { color: '#ff0a0a' },
  tuneLabel440: { color: '#7d8794' },
  tuneVal: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  tuneVal432: { color: '#ff2a2a' },
  tuneVal440: { color: '#c9d2dd' },
  // ═══ CYMASCOPE layer toggle chips ═══
  layerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#1a2028',
    borderRadius: 4,
    backgroundColor: '#050709',
  },
  layerRowLabel: {
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.4,
    color: '#5a646f',
    marginRight: 2,
  },
  layerChip: {
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  layerChipOn: {
    borderColor: '#7fd4ff',
    backgroundColor: 'rgba(127,212,255,0.12)',
  },
  layerChipTxt: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 0.8,
    color: '#5a646f',
  },
  layerChipTxtOn: {
    color: '#a8e2ff',
  },
  faceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  cycler: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 6,
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#070a0e',
  },
  cyclerLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 1.5, color: '#5a646f' },
  cyclerVal: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  orbChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
  },
  orbChip: {
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: '#070a0e',
    minWidth: 30,
    alignItems: 'center',
  },
  orbChipActive: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  orbChipTxt: { color: '#7d8794', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  orbChipTxtActive: { color: '#000' },
  resonateBtn: {
    borderWidth: 1,
    borderColor: '#8a4040',
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#0b0e12',
  },
  resonateBtnActive: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  resonateTxt: { color: '#c9a0a0', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  resonateTxtActive: { color: '#000' },
  patternMeta: {
    color: '#5a646f',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 6,
    textAlign: 'center',
  },
  scope: {
    height: 300,
    borderWidth: 0,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  webview: { flex: 1, backgroundColor: '#000' },
  geoPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
    padding: 6,
    borderRadius: 4,
    backgroundColor: '#070a0e',
    borderWidth: 1,
    borderColor: '#1c232d',
  },
  geoPill: {
    borderWidth: 1,
    borderColor: '#2a3340',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    backgroundColor: '#0b0e12',
  },
  geoPillActive: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  geoPillText: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: '#7d8794' },
  geoPillTextActive: { color: '#000' },
});
