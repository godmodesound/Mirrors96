import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform, ScrollView } from 'react-native';

import { skinStyles, SK, skinHtml } from './skins';

// Conditionally import WebView only on native
let WebView: any = null;
if (Platform.OS !== 'web') {
  WebView = require('react-native-webview').default;
}


// ════════════════════════════════════════════════════════════
// WEB IFRAME COMPONENT — renders iframes on web platform
// ════════════════════════════════════════════════════════════

function WebIframe({ html, uri, style, scrollEnabled = true }: { html?: string; uri?: string; style?: any; scrollEnabled?: boolean }) {
  if (Platform.OS === 'web') {
    const src = html
      ? `data:text/html;charset=utf-8,${encodeURIComponent(html)}`
      : uri || '';
    return (
      <iframe
        src={src}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          backgroundColor: SK('#000'),
          ...(scrollEnabled ? {} : { overflow: 'hidden' }),
        } as any}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; fullscreen"
        allowFullScreen
        referrerPolicy="no-referrer"
      />
    );
  }
  return null;
}

// ════════════════════════════════════════════════════════════
// CROSS-PLATFORM WEBVIEW — WebView on native, iframe on web
// ════════════════════════════════════════════════════════════

const CrossPlatformWebView = forwardRef<any, any>(
  ({ html, uri, style, scrollEnabled, javaScriptEnabled, bounces, overScrollMode, allowsInlineMediaPlayback, mediaPlaybackRequiresUserAction, domStorageEnabled, startInLoadingState, originWhitelist, mixedContentMode, renderLoading, ...rest }, ref) => {
    if (Platform.OS === 'web') {
      return <WebIframe html={html} uri={uri} style={style} scrollEnabled={scrollEnabled} />;
    }

    if (!WebView) return null;

    const source = html ? { html } : uri ? { uri } : undefined;
    return (
      <WebView
        ref={ref}
        source={source}
        style={[{ flex: 1, backgroundColor: SK('#000') }, style]}
        javaScriptEnabled={javaScriptEnabled !== false}
        scrollEnabled={scrollEnabled}
        bounces={bounces}
        overScrollMode={overScrollMode}
        allowsInlineMediaPlayback={allowsInlineMediaPlayback}
        mediaPlaybackRequiresUserAction={mediaPlaybackRequiresUserAction}
        domStorageEnabled={domStorageEnabled}
        startInLoadingState={startInLoadingState}
        originWhitelist={originWhitelist}
        mixedContentMode={mixedContentMode}
        renderLoading={renderLoading}
        {...rest}
      />
    );
  }
);

// ════════════════════════════════════════════════════════════
// PARTICLE LAB — Chakra spectrum, sound-reactive, iOS compatible
// ════════════════════════════════════════════════════════════

const PARTICLE_HTML = `
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#000;overflow:hidden;touch-action:none}
canvas{display:block}</style></head><body>
<canvas id="c"></canvas>
<script>
const c=document.getElementById('c');const ctx=c.getContext('2d');
let W=window.innerWidth,H=window.innerHeight;c.width=W;c.height=H;
window.addEventListener('resize',()=>{W=window.innerWidth;H=window.innerHeight;c.width=W;c.height=H;buildGlyphTargets();});
let mode='sphere',paused=false,soundOn=false,speed=1.0,chaos=10;
let mx=W/2,my=H/2,touching=false;
const N=1200;let particles=[];

const CHAKRA_FREQS=[396,417,528,639,741,852,963];

let audioCtx=null,activeOscs=[];
function ensureAudio(){
  if(!audioCtx){audioCtx=new(window.AudioContext||window.webkitAudioContext)();}
  if(audioCtx.state==='suspended')audioCtx.resume();
}
function startTouchSound(freq){
  if(!soundOn)return;
  ensureAudio();
  stopTouchSound();
  const osc=audioCtx.createOscillator();
  const gain=audioCtx.createGain();
  osc.type='sine';
  osc.frequency.setValueAtTime(freq,audioCtx.currentTime);
  gain.gain.setValueAtTime(0,audioCtx.currentTime);
  gain.gain.linearRampToValueAtTime(0.2,audioCtx.currentTime+0.08);
  osc.connect(gain);gain.connect(audioCtx.destination);
  osc.start();
  activeOscs.push({osc,gain});
}
function updateTouchSound(freq,vol){
  if(!soundOn||activeOscs.length===0)return;
  const last=activeOscs[activeOscs.length-1];
  if(last&&last.osc){
    last.osc.frequency.setValueAtTime(freq,audioCtx.currentTime);
    last.gain.gain.setValueAtTime(Math.min(vol,0.25),audioCtx.currentTime);
  }
}
function stopTouchSound(){
  activeOscs.forEach(o=>{
    try{o.gain.gain.linearRampToValueAtTime(0,audioCtx.currentTime+0.1);}catch(e){}
    setTimeout(()=>{try{o.osc.stop();o.osc.disconnect();}catch(e){}},150);
  });
  activeOscs=[];
}

function getFreqFromX(x){
  const ratio=Math.max(0,Math.min(1,x/W));
  const idx=Math.floor(ratio*6.99);
  return CHAKRA_FREQS[idx];
}

function getChakraHue(x){
  const ratio=x/W;
  if(ratio<0.143)return 0;
  if(ratio<0.286)return 25;
  if(ratio<0.429)return 50;
  if(ratio<0.571)return 120;
  if(ratio<0.714)return 220;
  if(ratio<0.857)return 270;
  return 290;
}

// ═══ 13 // SIGNAL — Text-to-particle glyph targets ═══
let glyphTargets=[];
let glyphText='13';
function buildGlyphTargets(text){
  if(text)glyphText=text;
  const oc=document.createElement('canvas');
  const sz=Math.min(W,H);
  oc.width=W;oc.height=H;
  const ox=oc.getContext('2d');
  ox.fillStyle='#000';ox.fillRect(0,0,W,H);
  const fontSize=Math.floor(sz*0.6);
  ox.font='900 '+fontSize+'px Arial,Helvetica,sans-serif';
  ox.fillStyle='#fff';ox.textAlign='center';ox.textBaseline='middle';
  ox.fillText(glyphText,W/2,H/2);
  const imgData=ox.getImageData(0,0,W,H).data;
  const pts=[];
  const step=Math.max(2,Math.floor(sz/220));
  for(let y=0;y<H;y+=step){
    for(let x=0;x<W;x+=step){
      const idx=(y*W+x)*4;
      if(imgData[idx]>128){pts.push({x:x,y:y});}
    }
  }
  for(let i=pts.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const t=pts[i];pts[i]=pts[j];pts[j]=t;
  }
  glyphTargets=[];
  for(let i=0;i<N;i++){
    if(pts.length>0){
      glyphTargets.push(pts[i%pts.length]);
    } else {
      glyphTargets.push({x:W/2,y:H/2});
    }
  }
}
buildGlyphTargets('13');

// ═══ CYMATIC PATTERN GENERATORS ═══
// Generate geometric cymatic shapes mathematically
let cymaticTargets=[];
function buildCymaticTargets(freq){
  const pts=[];
  const sz=Math.min(W,H);
  const R=sz*0.38;
  const cx_c=W/2;const cy_c=H/2;
  if(freq===432){
    // 432 Hz: 6-fold mandala with nested rings — natural harmony
    const rings=6;const petals=6;
    for(let ring=1;ring<=rings;ring++){
      const rr=R*(ring/rings);
      const count=petals*ring*3;
      for(let j=0;j<count;j++){
        const angle=(j/count)*Math.PI*2;
        const wobble=Math.sin(angle*petals)*rr*0.15;
        pts.push({x:cx_c+(rr+wobble)*Math.cos(angle),y:cy_c+(rr+wobble)*Math.sin(angle)});
      }
    }
    // Central dot cluster
    for(let j=0;j<30;j++){
      const a=Math.random()*Math.PI*2;const d=Math.random()*R*0.08;
      pts.push({x:cx_c+d*Math.cos(a),y:cy_c+d*Math.sin(a)});
    }
    // Radial spokes
    for(let s=0;s<petals;s++){
      const sa=(s/petals)*Math.PI*2;
      for(let d=0;d<20;d++){
        const dr=R*0.1+d*(R*0.9/20);
        pts.push({x:cx_c+dr*Math.cos(sa),y:cy_c+dr*Math.sin(sa)});
      }
    }
  } else if(freq===528){
    // 528 Hz: Flower of Life — 7 overlapping circles, 6-fold symmetry
    const circR=R*0.33;
    const centers=[{x:cx_c,y:cy_c}];
    for(let k=0;k<6;k++){
      const a=(k/6)*Math.PI*2;
      centers.push({x:cx_c+circR*Math.cos(a),y:cy_c+circR*Math.sin(a)});
    }
    centers.forEach(function(ctr){
      const count=60;
      for(let j=0;j<count;j++){
        const a=(j/count)*Math.PI*2;
        pts.push({x:ctr.x+circR*Math.cos(a),y:ctr.y+circR*Math.sin(a)});
      }
    });
    // Outer ring
    for(let j=0;j<80;j++){
      const a=(j/80)*Math.PI*2;
      pts.push({x:cx_c+R*Math.cos(a),y:cy_c+R*Math.sin(a)});
    }
    // Second outer ring
    for(let j=0;j<60;j++){
      const a=(j/60)*Math.PI*2;
      pts.push({x:cx_c+R*0.66*Math.cos(a),y:cy_c+R*0.66*Math.sin(a)});
    }
  } else if(freq===963){
    // 963 Hz: 12-pointed star — sacred crown geometry
    const innerR=R*0.35;const outerR=R*0.9;const points=12;
    // Star outline
    for(let j=0;j<points*2;j++){
      const a=(j/(points*2))*Math.PI*2-Math.PI/2;
      const rr=j%2===0?outerR:innerR;
      const count=8;
      for(let k=0;k<count;k++){
        const na=((j+k/count)/(points*2))*Math.PI*2-Math.PI/2;
        const nrr=j%2===0?outerR:innerR;
        const nnrr=((j+1)%2===0)?outerR:innerR;
        const lerp=k/count;
        const lr=nrr+(nnrr-nrr)*lerp;
        pts.push({x:cx_c+lr*Math.cos(na),y:cy_c+lr*Math.sin(na)});
      }
    }
    // Concentric rings inside
    for(let ring=1;ring<=4;ring++){
      const rr=innerR*(ring/4);
      const count=ring*12;
      for(let j=0;j<count;j++){
        const a=(j/count)*Math.PI*2;
        pts.push({x:cx_c+rr*Math.cos(a),y:cy_c+rr*Math.sin(a)});
      }
    }
    // Center point
    for(let j=0;j<20;j++){
      const a=Math.random()*Math.PI*2;const d=Math.random()*R*0.05;
      pts.push({x:cx_c+d*Math.cos(a),y:cy_c+d*Math.sin(a)});
    }
  }
  // Shuffle
  for(let i=pts.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    const t=pts[i];pts[i]=pts[j];pts[j]=t;
  }
  cymaticTargets=[];
  for(let i=0;i<N;i++){
    if(pts.length>0){cymaticTargets.push(pts[i%pts.length]);}
    else{cymaticTargets.push({x:cx_c,y:cy_c});}
  }
}

// ═══ CYMATIC HEALING TONE — single pure frequency ═══
let cymaticOscs=[];let cymaticActive=false;
function startCymaticTone(freq){
  if(cymaticActive)return;
  cymaticActive=true;
  if(!emfAudioCtx)emfAudioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(emfAudioCtx.state==='suspended')emfAudioCtx.resume();
  const master=emfAudioCtx.createGain();
  master.gain.setValueAtTime(0.18,emfAudioCtx.currentTime);
  master.connect(emfAudioCtx.destination);
  // Primary tone
  const osc1=emfAudioCtx.createOscillator();const g1=emfAudioCtx.createGain();
  osc1.type='sine';osc1.frequency.setValueAtTime(freq,emfAudioCtx.currentTime);
  g1.gain.setValueAtTime(0,emfAudioCtx.currentTime);
  g1.gain.linearRampToValueAtTime(0.15,emfAudioCtx.currentTime+0.6);
  osc1.connect(g1);g1.connect(master);osc1.start();
  cymaticOscs.push({osc:osc1,gain:g1});
  // Sub-harmonic (octave below)
  const osc2=emfAudioCtx.createOscillator();const g2=emfAudioCtx.createGain();
  osc2.type='sine';osc2.frequency.setValueAtTime(freq/2,emfAudioCtx.currentTime);
  g2.gain.setValueAtTime(0,emfAudioCtx.currentTime);
  g2.gain.linearRampToValueAtTime(0.08,emfAudioCtx.currentTime+0.8);
  osc2.connect(g2);g2.connect(master);osc2.start();
  cymaticOscs.push({osc:osc2,gain:g2});
  // Overtone (octave above, soft)
  const osc3=emfAudioCtx.createOscillator();const g3=emfAudioCtx.createGain();
  osc3.type='triangle';osc3.frequency.setValueAtTime(freq*2,emfAudioCtx.currentTime);
  g3.gain.setValueAtTime(0,emfAudioCtx.currentTime);
  g3.gain.linearRampToValueAtTime(0.03,emfAudioCtx.currentTime+1.0);
  osc3.connect(g3);g3.connect(master);osc3.start();
  cymaticOscs.push({osc:osc3,gain:g3});
}
function stopCymaticTone(){
  cymaticActive=false;
  cymaticOscs.forEach(o=>{
    try{o.gain.gain.linearRampToValueAtTime(0,emfAudioCtx.currentTime+0.4);}catch(e){}
    setTimeout(()=>{try{o.osc.stop();o.osc.disconnect();}catch(e){}},500);
  });
  cymaticOscs=[];
}
let activeCymaticFreq=0;

// ═══ EMF BIOFIELD PROTOCOL @ 802.15.6 ═══
// Frequencies to negate harmful EMF / dirty electricity
// Based on Schumann resonance, solfeggio, and resonance harmonics
let emfAudioCtx=null;let emfOscs=[];let emfActive=false;
const EMF_STACK=[
  7.83,    // Schumann fundamental — Earth grounding
  14.3,    // Schumann 2nd harmonic
  20.8,    // Schumann 3rd harmonic
  33.8,    // Schumann 5th harmonic
  432,     // Natural tuning — cellular harmony
  528,     // Solfeggio DNA repair
  174,     // Solfeggio — pain relief, organ safety
  285,     // Solfeggio — tissue regeneration
  963,     // Solfeggio — pineal activation
  1550,    // EMF detox
  8025.6,  // 802.15.6 WBAN counter-resonance (÷10)
];
// ═══ LOCATION HARMONIZER — #13 ═══
// Frequencies for harmonizing a physical space / environment
const LOCALE_STACK=[
  7.83,    // Schumann fundamental — Earth anchor
  3.5,     // Delta deep ground — soil resonance
  10.0,    // Alpha wave — calm environment
  111,     // Sacred chamber resonance (Hypogeum, Malta)
  136.1,   // OM frequency — cosmic center
  256,     // C256 — Pythagorean middle C
  396,     // Solfeggio — liberation from negativity
  417,     // Solfeggio — facilitate change/cleansing
  528,     // Solfeggio — transformation + miracles
  741,     // Solfeggio — awakening intuition
  852,     // Solfeggio — return to spiritual order
];
let localeActive=false;let localeOscs=[];
function startEMFProtocol(){
  if(emfActive)return;
  emfActive=true;
  if(!emfAudioCtx)emfAudioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(emfAudioCtx.state==='suspended')emfAudioCtx.resume();
  const master=emfAudioCtx.createGain();
  master.gain.setValueAtTime(0.15,emfAudioCtx.currentTime);
  master.connect(emfAudioCtx.destination);
  EMF_STACK.forEach((freq,i)=>{
    const osc=emfAudioCtx.createOscillator();
    const gn=emfAudioCtx.createGain();
    osc.type=i<5?'sine':'triangle';
    osc.frequency.setValueAtTime(freq,emfAudioCtx.currentTime);
    const vol=freq<100?0.12:freq<1000?0.06:0.03;
    gn.gain.setValueAtTime(0,emfAudioCtx.currentTime);
    gn.gain.linearRampToValueAtTime(vol,emfAudioCtx.currentTime+0.5+i*0.15);
    osc.connect(gn);gn.connect(master);
    osc.start();
    emfOscs.push({osc,gain:gn});
  });
  try{window.ReactNativeWebView?.postMessage(JSON.stringify({emfActive:true}));}catch(e){}
}
function stopEMFProtocol(){
  emfActive=false;
  emfOscs.forEach(o=>{
    try{o.gain.gain.linearRampToValueAtTime(0,emfAudioCtx.currentTime+0.3);}catch(e){}
    setTimeout(()=>{try{o.osc.stop();o.osc.disconnect();}catch(e){}},400);
  });
  emfOscs=[];
  try{window.ReactNativeWebView?.postMessage(JSON.stringify({emfActive:false}));}catch(e){}
}
function startLocaleProtocol(){
  if(localeActive)return;
  localeActive=true;
  if(!emfAudioCtx)emfAudioCtx=new(window.AudioContext||window.webkitAudioContext)();
  if(emfAudioCtx.state==='suspended')emfAudioCtx.resume();
  const master=emfAudioCtx.createGain();
  master.gain.setValueAtTime(0.12,emfAudioCtx.currentTime);
  master.connect(emfAudioCtx.destination);
  LOCALE_STACK.forEach((freq,i)=>{
    const osc=emfAudioCtx.createOscillator();
    const gn=emfAudioCtx.createGain();
    osc.type='sine';
    osc.frequency.setValueAtTime(freq,emfAudioCtx.currentTime);
    const vol=freq<100?0.10:freq<500?0.05:0.03;
    gn.gain.setValueAtTime(0,emfAudioCtx.currentTime);
    gn.gain.linearRampToValueAtTime(vol,emfAudioCtx.currentTime+0.8+i*0.2);
    osc.connect(gn);gn.connect(master);
    osc.start();
    localeOscs.push({osc,gain:gn});
  });
  try{window.ReactNativeWebView?.postMessage(JSON.stringify({localeActive:true}));}catch(e){}
}
function stopLocaleProtocol(){
  localeActive=false;
  localeOscs.forEach(o=>{
    try{o.gain.gain.linearRampToValueAtTime(0,emfAudioCtx.currentTime+0.5);}catch(e){}
    setTimeout(()=>{try{o.osc.stop();o.osc.disconnect();}catch(e){}},600);
  });
  localeOscs=[];
  try{window.ReactNativeWebView?.postMessage(JSON.stringify({localeActive:false}));}catch(e){}
}

function init(){
  particles=[];
  for(let i=0;i<N;i++){
    particles.push({
      x:Math.random()*W,y:Math.random()*H,z:0,
      vx:0,vy:0,vz:0,
      r:Math.random()*2+0.5,
      a:Math.random()*Math.PI*2,
      b:Math.random()*Math.PI,
      t:Math.random()*Math.PI*2
    });
  }
}
init();

function getTarget(p,i,t){
  const r=Math.min(W,H)*0.38;const n=N;
  switch(mode){
    case'sphere':return{
      x:W/2+r*Math.sin(p.b+t*0.3)*Math.cos(p.a+t*0.2),
      y:H/2+r*Math.cos(p.b+t*0.3),
      z:r*Math.sin(p.b+t*0.3)*Math.sin(p.a+t*0.2)};
    case'spiral':{const a=i/n*Math.PI*8+t;const sr=r*(0.3+i/n*0.7);
      return{x:W/2+sr*Math.cos(a),y:H/2+sr*Math.sin(a),z:Math.sin(a*2)*50};}
    case'wave':{const wx=W*0.05+i/n*W*0.9;const wy=H/2+Math.sin(i/n*Math.PI*4+t*2)*r*0.5;
      return{x:wx,y:wy,z:Math.cos(i/n*Math.PI*4+t*2)*50};}
    case'dna':{const da=i/n*Math.PI*6+t;const dr=r*0.4;const s=i%2===0?1:-1;
      return{x:W/2+dr*Math.cos(da)*s,y:H*0.08+i/n*H*0.84,z:dr*Math.sin(da)*s};}
    case'vortex':{const va=i/n*Math.PI*12+t*2;const vr=r*(1-i/n)*0.8;
      return{x:W/2+vr*Math.cos(va),y:H/2+vr*Math.sin(va),z:Math.sin(va)*30};}
    case'grid':{const cols=Math.ceil(Math.sqrt(n));const row=Math.floor(i/cols);const col=i%cols;
      const gw=W*0.8/cols;const gh=H*0.8/cols;
      return{x:W*0.1+col*gw+Math.sin(t+row)*5,y:H*0.1+row*gh+Math.cos(t+col)*5,z:Math.sin(t+i*0.1)*20};}
    case'13signal':{
      const gt=glyphTargets[i]||{x:W/2,y:H/2};
      // Subtle organic breathing — particles drift gently around their glyph position
      const bx=Math.sin(t*0.5+i*0.01)*1.5;
      const by=Math.cos(t*0.4+i*0.013)*1.5;
      return{x:gt.x+bx,y:gt.y+by,z:Math.sin(t*0.3+i*0.02)*8};}
    case'96signal':{
      const gt=glyphTargets[i]||{x:W/2,y:H/2};
      const bx=Math.sin(t*0.4+i*0.012)*1.8;
      const by=Math.cos(t*0.35+i*0.015)*1.8;
      return{x:gt.x+bx,y:gt.y+by,z:Math.sin(t*0.25+i*0.018)*10};}
    case'cym432':case'cym528':case'cym963':{
      const ct=cymaticTargets[i]||{x:W/2,y:H/2};
      // Slow rotation of the whole pattern
      const rot=t*0.15;
      const dx=ct.x-W/2;const dy=ct.y-H/2;
      const rx=dx*Math.cos(rot)-dy*Math.sin(rot)+W/2;
      const ry=dx*Math.sin(rot)+dy*Math.cos(rot)+H/2;
      const bx=Math.sin(t*0.6+i*0.008)*1.2;
      const by=Math.cos(t*0.5+i*0.01)*1.2;
      return{x:rx+bx,y:ry+by,z:Math.sin(t*0.4+i*0.015)*6};}
    case'codon':{ // genetic-code wheel — 4 concentric base rings carved into codon wedges
      const rings=4;const per=Math.ceil(n/rings);const ring=Math.floor(i/per);const idx=i%per;
      const rr=r*(0.30+ring/(rings-1)*0.68);
      const a=idx/per*Math.PI*2+t*(0.1+ring*0.04)+ring*0.2;
      return{x:W/2+rr*Math.cos(a),y:H/2+rr*Math.sin(a),z:Math.sin(a*2+ring)*24};}
    case'genus':{ // high-genus manifold — N through-holes: small tori orbiting a ring
      const holes=6;const seg=i%holes;const per2=n/holes;const k=Math.floor(i/holes);
      const ha=seg/holes*Math.PI*2+t*0.15;
      const hx=W/2+Math.cos(ha)*r*0.52;const hy=H/2+Math.sin(ha)*r*0.52;
      const ta=k/per2*Math.PI*2*2+t*1.2;const tr=r*0.20;
      return{x:hx+tr*Math.cos(ta),y:hy+tr*Math.sin(ta),z:Math.sin(ta)*34};}
    case'e8':{ // Gosset / E8 root-system Petrie projection — 8 concentric rings
      const rings8=8;const per8=Math.ceil(n/rings8);const ring8=Math.floor(i/per8);const idx8=i%per8;
      const rr8=r*(0.12+ring8/(rings8-1)*0.86);
      const a8=idx8/per8*Math.PI*2+ring8*0.20+t*(0.05+ring8*0.02);
      return{x:W/2+rr8*Math.cos(a8),y:H/2+rr8*Math.sin(a8),z:Math.sin(a8*2)*20};}
    default:return{x:W/2,y:H/2,z:0};
  }
}

let time=0;
function draw(){
  if(paused){requestAnimationFrame(draw);return;}
  time+=0.016*speed;

  const isGlyphMode=mode==='13signal'||mode==='96signal'||mode==='cym432'||mode==='cym528'||mode==='cym963';

  // Glyph/cymatic modes use a deeper fade for crisp shapes
  ctx.fillStyle=isGlyphMode?'rgba(0,0,0,0.18)':'rgba(0,0,0,0.12)';
  ctx.fillRect(0,0,W,H);

  let closestDist=Infinity;
  const springK=isGlyphMode?0.08:0.03;
  const damping=isGlyphMode?0.85:0.92;

  for(let i=0;i<N;i++){
    const p=particles[i];
    const tgt=getTarget(p,i,time);
    const cx_f=chaos/100;

    p.vx+=(tgt.x-p.x)*springK;
    p.vy+=(tgt.y-p.y)*springK;
    p.vz+=((tgt.z||0)-p.z)*springK;

    if(touching){
      const dx=mx-p.x;const dy=my-p.y;
      const d=Math.sqrt(dx*dx+dy*dy)+1;
      if(d<closestDist)closestDist=d;
      const repulseR=isGlyphMode?100:150;
      const repulseF=isGlyphMode?2.5:4;
      if(d<repulseR){p.vx-=dx/d*repulseF;p.vy-=dy/d*repulseF;}
    }

    if(!isGlyphMode){
      p.vx+=(Math.random()-0.5)*cx_f*2;
      p.vy+=(Math.random()-0.5)*cx_f*2;
    } else {
      p.vx+=(Math.random()-0.5)*cx_f*0.3;
      p.vy+=(Math.random()-0.5)*cx_f*0.3;
    }

    p.vx*=damping;p.vy*=damping;p.vz*=damping;
    p.x+=p.vx;p.y+=p.vy;p.z+=p.vz;

    if(isGlyphMode){
      // Deep infrared / crimson palette
      const depth=(p.z+20)/40;
      const sz=p.r*(0.6+depth*0.4);
      const vel=Math.sqrt(p.vx*p.vx+p.vy*p.vy);
      const heat=Math.min(1,vel/3);
      // Base crimson, brighter when moving fast
      const red=Math.floor(100+heat*155);
      const green=Math.floor(5+heat*30);
      const blue=Math.floor(5+heat*15);
      const alpha=0.55+depth*0.45;
      ctx.beginPath();
      ctx.arc(p.x,p.y,Math.max(sz,0.4),0,Math.PI*2);
      ctx.fillStyle='rgba('+red+','+green+','+blue+','+alpha+')';
      ctx.fill();
      // Subtle glow on brighter particles
      if(heat>0.3){
        ctx.beginPath();
        ctx.arc(p.x,p.y,sz*2.5,0,Math.PI*2);
        ctx.fillStyle='rgba('+red+','+Math.floor(green*0.5)+',0,'+(heat*0.08)+')';
        ctx.fill();
      }
    } else {
      const depth=(p.z+100)/200;
      const sz=p.r*(0.5+depth);
      const hue=getChakraHue(p.x);
      const lum=35+depth*35;
      const alpha=0.5+depth*0.5;
      ctx.beginPath();
      ctx.arc(p.x,p.y,Math.max(sz,0.3),0,Math.PI*2);
      ctx.fillStyle='hsla('+hue+',100%,'+lum+'%,'+alpha+')';
      ctx.fill();
    }
  }

  if(soundOn&&touching){
    const freq=getFreqFromX(mx);
    const prox=Math.max(0,1-closestDist/200);
    updateTouchSound(freq,prox*0.25);
  }

  requestAnimationFrame(draw);
}
draw();

c.addEventListener('touchstart',function(e){
  e.preventDefault();touching=true;
  mx=e.touches[0].clientX;my=e.touches[0].clientY;
  if(soundOn){startTouchSound(getFreqFromX(mx));}
  if(mode==='96signal')startEMFProtocol();
  if(mode==='13signal')startLocaleProtocol();
  if(mode==='cym432'){activeCymaticFreq=432;startCymaticTone(432);}
  if(mode==='cym528'){activeCymaticFreq=528;startCymaticTone(528);}
  if(mode==='cym963'){activeCymaticFreq=963;startCymaticTone(963);}
},{passive:false});
c.addEventListener('touchmove',function(e){
  e.preventDefault();
  mx=e.touches[0].clientX;my=e.touches[0].clientY;
},{passive:false});
c.addEventListener('touchend',function(e){
  e.preventDefault();touching=false;stopTouchSound();
  if(mode==='96signal')stopEMFProtocol();
  if(mode==='13signal')stopLocaleProtocol();
  if(activeCymaticFreq){stopCymaticTone();activeCymaticFreq=0;}
},{passive:false});
c.addEventListener('mousedown',function(e){
  mx=e.clientX;my=e.clientY;touching=true;
  if(soundOn)startTouchSound(getFreqFromX(mx));
  if(mode==='96signal')startEMFProtocol();
  if(mode==='13signal')startLocaleProtocol();
  if(mode==='cym432'){activeCymaticFreq=432;startCymaticTone(432);}
  if(mode==='cym528'){activeCymaticFreq=528;startCymaticTone(528);}
  if(mode==='cym963'){activeCymaticFreq=963;startCymaticTone(963);}
});
c.addEventListener('mousemove',function(e){if(touching){mx=e.clientX;my=e.clientY;}});
c.addEventListener('mouseup',function(){touching=false;stopTouchSound();if(mode==='96signal')stopEMFProtocol();if(mode==='13signal')stopLocaleProtocol();if(activeCymaticFreq){stopCymaticTone();activeCymaticFreq=0;}});
c.addEventListener('mouseleave',function(){touching=false;stopTouchSound();if(mode==='96signal')stopEMFProtocol();if(mode==='13signal')stopLocaleProtocol();if(activeCymaticFreq){stopCymaticTone();activeCymaticFreq=0;}});

function handleMsg(e){try{const d=JSON.parse(e.data);
  if(d.mode){mode=d.mode;
    if(mode==='13signal'){buildGlyphTargets('13');}
    else if(mode==='96signal'){buildGlyphTargets('96');}
    else if(mode==='cym432'){buildCymaticTargets(432);}
    else if(mode==='cym528'){buildCymaticTargets(528);}
    else if(mode==='cym963'){buildCymaticTargets(963);}
    init();}
  if(d.paused!==undefined)paused=d.paused;
  if(d.speed!==undefined)speed=d.speed;
  if(d.chaos!==undefined)chaos=d.chaos;
  if(d.soundOn!==undefined){soundOn=d.soundOn;if(!soundOn)stopTouchSound();}
}catch(ex){}}
window.addEventListener('message',handleMsg);
document.addEventListener('message',handleMsg);
</script></body></html>`;

const MODES = ['sphere', 'spiral', 'wave', 'dna', 'codon', 'genus', 'e8', '96signal', '13signal', 'cym432', 'cym528', 'cym963'];

const MODE_LABELS: Record<string, string> = {
  sphere: 'SPHERE',
  spiral: 'SPIRAL',
  wave: 'WAVE',
  dna: 'DNA',
  codon: 'CODON',
  genus: 'GENUS',
  e8: 'E8',
  '96signal': '#96 BIOFIELD',
  '13signal': '#13 LOCALE',
  cym432: '432 Hz',
  cym528: '528 Hz',
  cym963: '963 Hz',
};

const CHAKRA_LEGEND = [
  { name: 'Root', freq: 396, color: '#ff0000' },
  { name: 'Sacral', freq: 417, color: '#ff6600' },
  { name: 'Solar', freq: 528, color: '#ffcc00' },
  { name: 'Heart', freq: 639, color: '#00cc00' },
  { name: 'Throat', freq: 741, color: '#0066ff' },
  { name: '3rd Eye', freq: 852, color: '#4400cc' },
  { name: 'Crown', freq: 963, color: '#9900ff' },
];

interface ParticleLabProps {
  height?: number;
  activeFrequency?: number;
  activeColor?: string;
  soundEnabled?: boolean;
}

export const ParticleLab = forwardRef<any, ParticleLabProps>(
  ({ height = 350, activeFrequency = 0, activeColor, soundEnabled = false }, ref) => {
  const wvRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [currentMode, setCurrentMode] = useState('sphere');
  const [isPaused, setIsPaused] = useState(false);
  const [localSound, setLocalSound] = useState(soundEnabled);
  const [speedVal, setSpeedVal] = useState(1.0);
  const trackW = useRef(0); // measured slider width — reflows on fold/unfold
  const [chaosVal, setChaosVal] = useState(10);

  const sendMsg = (data: object) => {
    if (Platform.OS === 'web') {
      // Send message to iframe
      try {
        const iframe = document.querySelector('iframe[data-particle-lab]') as HTMLIFrameElement;
        if (iframe && iframe.contentWindow) {
          iframe.contentWindow.postMessage(JSON.stringify(data), '*');
        }
      } catch (e) {}
    } else {
      wvRef.current?.postMessage(JSON.stringify(data));
    }
  };

  useEffect(() => {
    setLocalSound(soundEnabled);
    sendMsg({ soundOn: soundEnabled });
  }, [soundEnabled]);

  const toggleSound = () => {
    const next = !localSound;
    setLocalSound(next);
    sendMsg({ soundOn: next });
  };

  const changeMode = (m: string) => {
    setCurrentMode(m);
    sendMsg({ mode: m });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.particleSub}>Click & drag particles to play chakra frequencies</Text>

      <View style={styles.controlsTopRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.modeScrollContent}
          style={styles.modeScroll}
          decelerationRate="fast"
          snapToInterval={0}
        >
          {MODES.map(m => {
            const label = MODE_LABELS[m] || m.toUpperCase();
            const isActive = currentMode === m;
            const isGlyph = m === '13signal' || m === '96signal';
            const isCymatic = m.startsWith('cym');
            return (
              <TouchableOpacity
                key={m}
                style={[
                  styles.modeBtn,
                  isActive && styles.modeBtnActive,
                  (isGlyph || isCymatic) && !isActive && styles.mode13Btn,
                  (isGlyph || isCymatic) && isActive && styles.mode13BtnActive,
                ]}
                onPress={() => changeMode(m)}
              >
                <Text style={[
                  styles.modeBtnText,
                  isActive && styles.modeBtnTextActive,
                  (isGlyph || isCymatic) && styles.mode13Text,
                  (isGlyph || isCymatic) && isActive && styles.mode13TextActive,
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={styles.rightControls}>
          <TouchableOpacity
            style={[styles.modeBtn, localSound && styles.soundOnBtn]}
            onPress={toggleSound}
          >
            <Text style={[styles.modeBtnText, localSound && styles.soundOnText]}>
              {localSound ? 'SOUND ON' : 'SOUND OFF'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modeBtn}
            onPress={() => { setIsPaused(!isPaused); sendMsg({ paused: !isPaused }); }}
          >
            <Text style={styles.modeBtnText}>{isPaused ? 'PLAY' : 'PAUSE'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.canvasWrap, { height }]}>
        {Platform.OS === 'web' ? (
          <iframe
            data-particle-lab="true"
            srcDoc={skinHtml(PARTICLE_HTML)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: SK('#000'),
            } as any}
            allow="autoplay"
          />
        ) : WebView ? (
          <WebView
            ref={wvRef}
            source={{ html: skinHtml(PARTICLE_HTML) }}
            style={styles.webview}
            javaScriptEnabled={true}
            scrollEnabled={false}
            bounces={false}
            overScrollMode="never"
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
          />
        ) : null}
        <Text style={styles.particleCount}>1200 PARTICLES — {MODE_LABELS[currentMode] || currentMode.toUpperCase()}</Text>
        {localSound && <Text style={styles.soundReactiveBadge}>SOUND REACTIVE</Text>}
        {currentMode === '96signal' && (
          <Text style={styles.emfBadge}>◉ 802.15.6 BIOFIELD HARMONIZER — TOUCH #96 TO SHIELD FROM EMF</Text>
        )}
        {currentMode === '13signal' && (
          <Text style={styles.emfBadge}>◉ LOCATION HARMONIZER — TOUCH #13 TO CLEAR & HARMONIZE SPACE</Text>
        )}
        {currentMode === 'cym432' && (
          <Text style={styles.emfBadge}>◉ 432 Hz CYMATIC — TOUCH PATTERN TO HEAL — NATURAL TUNING</Text>
        )}
        {currentMode === 'cym528' && (
          <Text style={styles.emfBadge}>◉ 528 Hz CYMATIC — TOUCH PATTERN TO HEAL — DNA REPAIR</Text>
        )}
        {currentMode === 'cym963' && (
          <Text style={styles.emfBadge}>◉ 963 Hz CYMATIC — TOUCH PATTERN TO HEAL — PINEAL ACTIVATION</Text>
        )}
        {currentMode !== '13signal' && currentMode !== '96signal' && !currentMode.startsWith('cym') && (
          <View style={styles.chakraLegend}>
            {CHAKRA_LEGEND.map(ch => (
              <View key={ch.name} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: ch.color }]} />
                <Text style={styles.legendFreq}>{ch.freq}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {currentMode === '13signal' || currentMode === '96signal' || currentMode.startsWith('cym') ? (
        <View style={styles.spectrumBar}>
          <View style={[styles.spectrumSegment, { backgroundColor: SK('#1a0000') }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: SK('#3a0000') }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: SK('#6b0000') }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: SK('#8b0000') }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: SK('#ff0a0a') }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: SK('#8b0000') }]} />
          <View style={[styles.spectrumSegment, { backgroundColor: SK('#3a0000') }]} />
        </View>
      ) : (
        <View style={styles.spectrumBar}>
          {CHAKRA_LEGEND.map(ch => (
            <View key={ch.name} style={[styles.spectrumSegment, { backgroundColor: ch.color }]} />
          ))}
        </View>
      )}

      <View style={styles.sliderRow}>
        <View style={styles.sliderGroup}>
          <Text style={styles.sliderLabel}>SPEED: {speedVal.toFixed(1)}x</Text>
          <View
            style={styles.sliderTrack}
            onLayout={e => { trackW.current = e.nativeEvent.layout.width; }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackW.current || 1)));
              const v = Math.round(ratio * 30) / 10;
              setSpeedVal(Math.max(0.1, Math.min(3, v)));
              sendMsg({ speed: Math.max(0.1, Math.min(3, v)) });
            }}
            onResponderMove={(e) => {
              const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackW.current || 1)));
              const v = Math.round(ratio * 30) / 10;
              setSpeedVal(Math.max(0.1, Math.min(3, v)));
              sendMsg({ speed: Math.max(0.1, Math.min(3, v)) });
            }}
          >
            <View style={[styles.sliderBtn, { left: `${(speedVal / 3) * 100}%` }]} />
            <View style={[styles.sliderFill, { width: `${(speedVal / 3) * 100}%` }]} />
          </View>
        </View>
        <View style={styles.sliderGroup}>
          <Text style={styles.sliderLabel}>CHAOS: {chaosVal}%</Text>
          <View
            style={styles.sliderTrack}
            onLayout={e => { trackW.current = e.nativeEvent.layout.width; }}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) => {
              const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackW.current || 1)));
              const v = Math.round(ratio * 100);
              setChaosVal(v);
              sendMsg({ chaos: v });
            }}
            onResponderMove={(e) => {
              const ratio = Math.max(0, Math.min(1, e.nativeEvent.locationX / (trackW.current || 1)));
              const v = Math.round(ratio * 100);
              setChaosVal(v);
              sendMsg({ chaos: v });
            }}
          >
            <View style={[styles.sliderBtn, { left: `${chaosVal}%` }]} />
            <View style={[styles.sliderFill, { width: `${chaosVal}%`, backgroundColor: SK('#ffffff40') }]} />
          </View>
        </View>
      </View>

      <Text style={styles.hint}>
        {currentMode === '13signal'
          ? '#13 LOCALE — Touch to activate location harmonizer — Schumann + OM + Sacred Chamber + Solfeggio cleansing stack'
          : currentMode === '96signal'
          ? '#96 BIOFIELD — Touch to activate 802.15.6 EMF shield — Schumann + DNA repair + EMF detox + WBAN counter-resonance'
          : currentMode === 'cym432'
          ? '432 Hz CYMATIC — Touch the sacred geometry to emit 432 Hz natural tuning — Cellular harmony + sub-harmonic resonance'
          : currentMode === 'cym528'
          ? '528 Hz CYMATIC — Touch the Flower of Life to emit 528 Hz — DNA repair + miracle tone + harmonic overtones'
          : currentMode === 'cym963'
          ? '963 Hz CYMATIC — Touch the 12-fold star to emit 963 Hz — Pineal gland activation + crown chakra resonance'
          : 'Click & drag on particles to play frequencies — Left=Root 396Hz, Right=Crown 963Hz — Chakra spectrum colors'}
      </Text>
    </View>
  );
});

// ════════════════════════════════════════════════════════════
// GODMODE EARTH — CesiumJS 3D Globe (same engine as Google Earth)
// Loaded as HTML in WebView — works on iOS WKWebView
// ════════════════════════════════════════════════════════════

const EARTH_3D_HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#000;overflow:hidden}
#map{width:100%;height:100vh;background:#000}
.leaflet-control-zoom a{background:#0a0505!important;color:#ff0a0a!important;border-color:#2a0a0a!important;font-size:18px!important;width:36px!important;height:36px!important;line-height:36px!important}
.leaflet-control-zoom a:hover{background:#150505!important}
.leaflet-control-attribution{display:none!important}
.leaflet-container{background:#000!important}
.leaflet-popup-content-wrapper{background:#0a0505!important;border:1px solid #ff0a0a!important;border-radius:0!important}
.leaflet-popup-tip{border-top-color:#0a0505!important}
.leaflet-popup-content{color:#ff0a0a;font-family:monospace;font-size:12px;margin:8px 12px}
.search-marker{width:16px;height:16px;background:#ff0a0a;border-radius:50%;border:2px solid #fff;
box-shadow:0 0 20px #ff0a0a,0 0 40px rgba(255,10,10,0.5)}
.freq-ring{position:absolute;border:2px solid #ff0a0a;border-radius:50%;pointer-events:none;
animation:freqPulse 2s ease-out forwards;opacity:0}
@keyframes freqPulse{0%{transform:scale(0.2);opacity:0.9}100%{transform:scale(4);opacity:0}}
#freqOverlay{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;display:none;z-index:1000}
#freqLabel{position:fixed;bottom:60px;left:50%;transform:translateX(-50%);background:#0a0505;
border:1px solid #ff0a0a;color:#ff0a0a;font-family:monospace;font-size:11px;padding:6px 16px;
display:none;z-index:1001;text-align:center;white-space:nowrap}
</style>
</head><body>
<div id="map"></div>
<div id="freqOverlay">
<div class="freq-ring" style="width:80px;height:80px;margin:-40px 0 0 -40px"></div>
<div class="freq-ring" style="width:80px;height:80px;margin:-40px 0 0 -40px;animation-delay:0.4s"></div>
<div class="freq-ring" style="width:80px;height:80px;margin:-40px 0 0 -40px;animation-delay:0.8s"></div>
<div class="freq-ring" style="width:80px;height:80px;margin:-40px 0 0 -40px;animation-delay:1.2s"></div>
</div>
<div id="freqLabel"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var map=L.map('map',{center:[40.7831,-73.9712],zoom:12,zoomControl:true,attributionControl:false,maxZoom:19,minZoom:2});

L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19}).addTo(map);
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,opacity:0.8}).addTo(map);

var marker=null;
var freqOverlay=document.getElementById('freqOverlay');
var freqLabel=document.getElementById('freqLabel');

var CHAKRAS=[
{name:'Root',freq:396,color:'#ff0000'},
{name:'Heart',freq:639,color:'#00cc00'},
{name:'Throat',freq:741,color:'#0066ff'},
{name:'Crown',freq:963,color:'#9900ff'}
];

function flyTo(lat,lng,name){
  if(marker)map.removeLayer(marker);
  map.flyTo([lat,lng],14,{duration:2});
  var icon=L.divIcon({className:'search-marker',iconSize:[16,16],iconAnchor:[8,8]});
  marker=L.marker([lat,lng],{icon:icon}).addTo(map);
  if(name){
    marker.bindPopup('<b>'+name+'</b><br><span style="color:#5a1a1a;font-size:10px">Tap to send frequency</span>').openPopup();
  }
  // Show frequency pulse
  showFreqPulse(name||'Location');
}

function showFreqPulse(name){
  var chakra=CHAKRAS[Math.floor(Math.random()*CHAKRAS.length)];
  freqOverlay.style.display='block';
  freqLabel.style.display='block';
  freqLabel.innerHTML='SENDING '+chakra.freq+'Hz ('+chakra.name+') → '+name.toUpperCase();
  var rings=freqOverlay.querySelectorAll('.freq-ring');
  rings.forEach(function(r){r.style.borderColor=chakra.color;r.style.animation='none';r.offsetHeight;r.style.animation='';});
  setTimeout(function(){
    freqOverlay.style.display='none';
    freqLabel.style.display='none';
  },4000);
}

function searchLocation(query){
  fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(query)+'&format=json&limit=1')
    .then(function(r){return r.json()})
    .then(function(data){
      if(data&&data.length>0){
        flyTo(parseFloat(data[0].lat),parseFloat(data[0].lon),data[0].display_name.split(',')[0]);
      }
    }).catch(function(){});
}

function handleMsg(e){try{var d=JSON.parse(e.data);if(d.search)searchLocation(d.search);}catch(ex){}}
window.addEventListener('message',handleMsg);
document.addEventListener('message',handleMsg);

flyTo(40.7831,-73.9712,'New York City');
</script>
</body></html>`;

interface GodmodeEarthProps {
  height?: number;
}

export function GodmodeEarth({ height = 450 }: GodmodeEarthProps) {
  const wvRef = useRef<any>(null);
  const [searchText, setSearchText] = useState('');

  const handleSearch = () => {
    if (!searchText.trim()) return;
    const msg = JSON.stringify({ search: searchText.trim() });
    if (Platform.OS === 'web') {
      try {
        const iframe = document.querySelector('iframe[data-earth]') as HTMLIFrameElement;
        if (iframe?.contentWindow) {
          iframe.contentWindow.postMessage(msg, '*');
        }
      } catch (e) {}
    } else {
      wvRef.current?.postMessage(msg);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search location..."
          placeholderTextColor={SK('#4a1515')}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="go"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>GO</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.canvasWrap, { height }]}>
        {Platform.OS === 'web' ? (
          <iframe
            data-earth="true"
            srcDoc={skinHtml(EARTH_3D_HTML)}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: SK('#000'),
            } as any}
            allow="fullscreen; geolocation; webgl"
            allowFullScreen
          />
        ) : WebView ? (
          <WebView
            ref={wvRef}
            source={{ html: skinHtml(EARTH_3D_HTML) }}
            style={styles.webview}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            scrollEnabled={true}
            bounces={false}
            allowsInlineMediaPlayback={true}
            originWhitelist={['*']}
            mixedContentMode="always"
            onShouldStartLoadWithRequest={() => true}
          />
        ) : null}
        <View style={styles.liveTag}>
          <Text style={styles.liveTagText}>LIVE</Text>
        </View>
      </View>

      <Text style={styles.hint}>Search any city, landmark, or address — Drag to rotate globe — Pinch to zoom — Send frequencies</Text>
    </View>
  );
}

// ════════════════════════════════════════════════════════════
// STYLES
// ════════════════════════════════════════════════════════════

const styles = skinStyles({
  container: {},
  particleSub: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  controlsTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    flexWrap: 'wrap',
    gap: 4,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  modeScroll: {
    maxHeight: 34,
  },
  modeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingRight: 16,
  },
  rightControls: {
    flexDirection: 'row',
    gap: 4,
  },
  modeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
  },
  modeBtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#150505',
  },
  modeBtnText: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  modeBtnTextActive: {
    color: '#ff0a0a',
  },
  soundOnBtn: {
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0505',
  },
  soundOnText: {
    color: '#ff0a0a',
  },
  mode13Btn: {
    borderColor: '#4a0a0a',
    backgroundColor: '#0a0303',
  },
  mode13BtnActive: {
    borderColor: '#ff0a0a',
    backgroundColor: '#1a0000',
  },
  mode13Text: {
    color: '#8b0000',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1,
  },
  mode13TextActive: {
    color: '#ff0a0a',
  },
  canvasWrap: {
    borderWidth: 1,
    borderColor: '#ff0a0a20',
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  particleCount: {
    position: 'absolute',
    top: 8,
    left: 8,
    color: '#ff0a0a',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    backgroundColor: '#000000CC',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  soundReactiveBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    color: '#ff0a0a',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    backgroundColor: '#000000CC',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  emfBadge: {
    position: 'absolute',
    top: 8,
    left: 6,
    right: 6,
    color: '#ff3040',
    fontSize: 6,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
    textAlign: 'center',
    backgroundColor: '#000000CC',
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  chakraLegend: {
    position: 'absolute',
    right: 6,
    top: 28,
    gap: 3,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  legendDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legendFreq: {
    color: '#ffffff80',
    fontSize: 6,
    fontFamily: 'TerminatorRealNFI',
  },
  spectrumBar: {
    flexDirection: 'row',
    height: 3,
    marginTop: 2,
  },
  spectrumSegment: {
    flex: 1,
  },
  sliderRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  sliderGroup: {
    flex: 1,
  },
  sliderLabel: {
    color: '#ff0a0a',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    marginBottom: 4,
  },
  sliderTrack: {
    height: 8,
    backgroundColor: '#1a0808',
    borderRadius: 4,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#ff0a0a',
    borderRadius: 4,
  },
  sliderBtn: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ff0a0a',
    top: -4,
    marginLeft: -8,
    zIndex: 2,
    borderWidth: 2,
    borderColor: '#000',
  },
  hint: {
    color: '#3a1010',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 11,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
    color: '#ff3040',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
  },
  searchBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ff0a0a',
    backgroundColor: '#150505',
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  liveTag: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#000000CC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  liveTagText: {
    color: '#ff0a0a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
    marginTop: 8,
  },
  loadingSubText: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    marginTop: 4,
  },
});
