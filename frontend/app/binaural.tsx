import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MirrorsIdBanner from '../src/MirrorsIdBanner';
import DisclaimerFooter from '../src/DisclaimerFooter';
import { WebView } from 'react-native-webview';
import { AudioEngine } from '../src/AudioEngine';
import ScopeNodePanel from '../src/ScopeNodePanel';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CANVAS_SIZE = Math.min(SCREEN_WIDTH - 32, 360);

interface BinauralPreset {
  name: string;
  carrier: number;
  beatHz: number;
  description: string;
  color: string;
}

const BINAURAL_PRESETS: BinauralPreset[] = [
  { name: 'CALM_ALPHA_432', carrier: 432, beatHz: 10, description: 'Relaxed focus • Alpha entrainment', color: '#00ffaa' },
  { name: 'THETA_SOOTHE_288', carrier: 288, beatHz: 6, description: 'Anxiety relief • Theta calm', color: '#6644ff' },
  { name: 'DELTA_RESTORE_216', carrier: 216, beatHz: 2, description: 'Deep sleep • Delta restoration', color: '#0088ff' },
  { name: 'GAMMA_PEAK_528', carrier: 528, beatHz: 40, description: 'Peak cognition • Gamma focus', color: '#ffaa00' },
  { name: 'SCHUMANN_7.83', carrier: 432, beatHz: 7.83, description: 'Earth resonance • Grounding', color: '#44ff44' },
  { name: 'PINEAL_936', carrier: 936, beatHz: 4, description: 'Pineal activation • Third eye', color: '#ff00ff' },
];

// ═══════════════════════════════════════════════════════
// PINEAL HEAD MODEL — CANVAS HTML
// Interactive 3D-like head with Eye of Horus pineal gland
// Dolby Atmos spatial frequency node placement
// ═══════════════════════════════════════════════════════
const HEAD_MODEL_HTML = `
<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden;touch-action:none;}
body{background:#000;display:flex;justify-content:center;align-items:center;height:100vh;}
canvas{display:block;}</style>
</head><body>
<canvas id="c"></canvas>
<script>
const c=document.getElementById('c');
const ctx=c.getContext('2d');
const S=${CANVAS_SIZE};
c.width=S;c.height=S;
const cx=S/2,cy=S/2;
let t=0;
let carrier=432,beat=10,playing=false;

// Frequency nodes that users can drag around the head
let nodes=[
  {x:cx-90,y:cy,freq:432,label:'L',color:'#ff0a0a',dragging:false},
  {x:cx+90,y:cy,freq:442,label:'R',color:'#ff3040',dragging:false},
];
let activeNode=-1;
let pinealGlow=0;

function draw(){
  ctx.clearRect(0,0,S,S);
  t+=0.016;

  // ═══ SPATIAL GRID (Dolby Atmos rings) ═══
  const rings=[0.38,0.52,0.68,0.85];
  rings.forEach((r,i)=>{
    ctx.beginPath();
    ctx.arc(cx,cy,S*r/2,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,10,10,'+(0.03+i*0.01)+')';
    ctx.lineWidth=0.5;
    ctx.setLineDash([2,6]);
    ctx.stroke();
    ctx.setLineDash([]);
  });

  // Cross-hairs
  ctx.beginPath();
  ctx.moveTo(cx,cy-S*0.42);ctx.lineTo(cx,cy+S*0.42);
  ctx.moveTo(cx-S*0.42,cy);ctx.lineTo(cx+S*0.42,cy);
  ctx.strokeStyle='rgba(255,10,10,0.04)';
  ctx.lineWidth=0.5;
  ctx.stroke();

  // ═══ HEAD SILHOUETTE ═══
  drawHead();

  // ═══ BRAIN ═══
  drawBrain();

  // ═══ PINEAL GLAND (Eye of Horus) ═══
  drawPinealGland();

  // ═══ SOUND WAVES from nodes to ears ═══
  drawSoundWaves();

  // ═══ FREQUENCY NODES ═══
  drawNodes();

  // ═══ EAR INDICATORS ═══
  drawEars();

  // ═══ INFO OVERLAY ═══
  drawInfo();

  requestAnimationFrame(draw);
}

function drawHead(){
  ctx.save();
  // Outer head shape (front view, slightly translucent)
  ctx.beginPath();
  // Skull top
  ctx.moveTo(cx-55,cy+60);
  ctx.bezierCurveTo(cx-70,cy+20,cx-75,cy-30,cx-65,cy-65);
  ctx.bezierCurveTo(cx-55,cy-90,cx-30,cy-105,cx,cy-108);
  ctx.bezierCurveTo(cx+30,cy-105,cx+55,cy-90,cx+65,cy-65);
  ctx.bezierCurveTo(cx+75,cy-30,cx+70,cy+20,cx+55,cy+60);
  // Jaw
  ctx.bezierCurveTo(cx+48,cy+85,cx+30,cy+100,cx,cy+105);
  ctx.bezierCurveTo(cx-30,cy+100,cx-48,cy+85,cx-55,cy+60);
  ctx.closePath();

  // Ghostly fill
  const headGrad=ctx.createRadialGradient(cx,cy-20,10,cx,cy,120);
  headGrad.addColorStop(0,'rgba(40,8,8,0.15)');
  headGrad.addColorStop(0.6,'rgba(25,5,5,0.12)');
  headGrad.addColorStop(1,'rgba(15,3,3,0.05)');
  ctx.fillStyle=headGrad;
  ctx.fill();

  // Head outline
  ctx.strokeStyle='rgba(255,10,10,0.2)';
  ctx.lineWidth=1.5;
  ctx.stroke();

  // Subtle wireframe lines for 3D depth
  for(let i=0;i<5;i++){
    ctx.beginPath();
    const yOff=-80+i*40;
    ctx.ellipse(cx,cy+yOff,60-Math.abs(yOff)*0.15,8,0,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,10,10,0.04)';
    ctx.lineWidth=0.5;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBrain(){
  ctx.save();
  // Left hemisphere
  ctx.beginPath();
  ctx.moveTo(cx-2,cy-80);
  ctx.bezierCurveTo(cx-45,cy-75,cx-55,cy-50,cx-52,cy-25);
  ctx.bezierCurveTo(cx-50,cy,cx-45,cy+20,cx-30,cy+35);
  ctx.bezierCurveTo(cx-15,cy+45,cx-5,cy+40,cx-2,cy+35);
  ctx.strokeStyle='rgba(255,48,64,0.15)';
  ctx.lineWidth=1;
  ctx.stroke();

  // Left brain wrinkles (sulci)
  for(let i=0;i<4;i++){
    ctx.beginPath();
    const y0=cy-65+i*25;
    ctx.moveTo(cx-10,y0);
    ctx.bezierCurveTo(cx-25,y0+5+Math.sin(t+i)*2,cx-40,y0-3,cx-48,y0+8);
    ctx.strokeStyle='rgba(255,48,64,0.08)';
    ctx.lineWidth=0.7;
    ctx.stroke();
  }

  // Right hemisphere
  ctx.beginPath();
  ctx.moveTo(cx+2,cy-80);
  ctx.bezierCurveTo(cx+45,cy-75,cx+55,cy-50,cx+52,cy-25);
  ctx.bezierCurveTo(cx+50,cy,cx+45,cy+20,cx+30,cy+35);
  ctx.bezierCurveTo(cx+15,cy+45,cx+5,cy+40,cx+2,cy+35);
  ctx.strokeStyle='rgba(255,48,64,0.15)';
  ctx.lineWidth=1;
  ctx.stroke();

  // Right brain wrinkles
  for(let i=0;i<4;i++){
    ctx.beginPath();
    const y0=cy-65+i*25;
    ctx.moveTo(cx+10,y0);
    ctx.bezierCurveTo(cx+25,y0+5+Math.sin(t+i+2)*2,cx+40,y0-3,cx+48,y0+8);
    ctx.strokeStyle='rgba(255,48,64,0.08)';
    ctx.lineWidth=0.7;
    ctx.stroke();
  }

  // Corpus callosum (bridge between hemispheres)
  ctx.beginPath();
  ctx.moveTo(cx-8,cy-50);
  ctx.bezierCurveTo(cx-3,cy-55,cx+3,cy-55,cx+8,cy-50);
  ctx.bezierCurveTo(cx+5,cy-40,cx-5,cy-40,cx-8,cy-50);
  ctx.strokeStyle='rgba(255,48,64,0.12)';
  ctx.lineWidth=0.8;
  ctx.stroke();

  // Brain stem
  ctx.beginPath();
  ctx.moveTo(cx-6,cy+35);
  ctx.bezierCurveTo(cx-8,cy+55,cx-5,cy+70,cx,cy+80);
  ctx.bezierCurveTo(cx+5,cy+70,cx+8,cy+55,cx+6,cy+35);
  ctx.strokeStyle='rgba(255,48,64,0.12)';
  ctx.lineWidth=0.8;
  ctx.stroke();

  ctx.restore();
}

function drawPinealGland(){
  ctx.save();
  const px=cx,py=cy-15;
  const glowPhase=Math.sin(t*2)*0.5+0.5;
  pinealGlow+=(playing?1:0.3-pinealGlow)*0.02;

  // Outer glow halo
  const outerR=25+glowPhase*8;
  const outerGrad=ctx.createRadialGradient(px,py,0,px,py,outerR);
  outerGrad.addColorStop(0,'rgba(255,10,10,'+(0.3*pinealGlow)+')');
  outerGrad.addColorStop(0.5,'rgba(255,10,10,'+(0.1*pinealGlow)+')');
  outerGrad.addColorStop(1,'rgba(255,10,10,0)');
  ctx.fillStyle=outerGrad;
  ctx.beginPath();
  ctx.arc(px,py,outerR,0,Math.PI*2);
  ctx.fill();

  // Eye of Horus pattern
  drawEyeOfHorus(px,py,glowPhase);

  // Core pineal gland
  const coreR=6+glowPhase*2;
  const coreGrad=ctx.createRadialGradient(px,py,0,px,py,coreR);
  coreGrad.addColorStop(0,'rgba(255,255,255,'+(0.9*pinealGlow)+')');
  coreGrad.addColorStop(0.3,'rgba(255,60,80,'+(0.8*pinealGlow)+')');
  coreGrad.addColorStop(0.7,'rgba(255,10,10,'+(0.5*pinealGlow)+')');
  coreGrad.addColorStop(1,'rgba(255,10,10,0)');
  ctx.fillStyle=coreGrad;
  ctx.beginPath();
  ctx.arc(px,py,coreR,0,Math.PI*2);
  ctx.fill();

  // Pulsing ring
  if(playing){
    const pulseR=10+Math.sin(t*beat*0.3)*5+glowPhase*15;
    ctx.beginPath();
    ctx.arc(px,py,pulseR,0,Math.PI*2);
    ctx.strokeStyle='rgba(255,10,10,'+(0.3*(1-pulseR/30))+')';
    ctx.lineWidth=1;
    ctx.stroke();
  }

  ctx.restore();
}

function drawEyeOfHorus(px,py,phase){
  ctx.save();
  const a=0.15+phase*0.1;

  // Eye shape
  ctx.beginPath();
  ctx.moveTo(px-20,py);
  ctx.bezierCurveTo(px-12,py-12,px+12,py-12,px+20,py);
  ctx.bezierCurveTo(px+12,py+8,px-12,py+8,px-20,py);
  ctx.strokeStyle='rgba(255,10,10,'+a+')';
  ctx.lineWidth=1;
  ctx.stroke();

  // Eyebrow arch (Horus style)
  ctx.beginPath();
  ctx.moveTo(px-22,py-2);
  ctx.bezierCurveTo(px-15,py-16,px+15,py-16,px+25,py-5);
  ctx.strokeStyle='rgba(255,10,10,'+(a*0.7)+')';
  ctx.lineWidth=0.8;
  ctx.stroke();

  // Teardrop line (descending from eye)
  ctx.beginPath();
  ctx.moveTo(px-5,py+8);
  ctx.bezierCurveTo(px-8,py+18,px-6,py+28,px-3,py+35);
  ctx.strokeStyle='rgba(255,10,10,'+(a*0.6)+')';
  ctx.lineWidth=0.8;
  ctx.stroke();

  // Spiral (inner ear/cochlea reference)
  ctx.beginPath();
  for(let i=0;i<3;i++){
    const r=3+i*3;
    const startA=t*0.5+i*0.8;
    ctx.arc(px-3,py+35,r,startA,startA+Math.PI*1.2);
  }
  ctx.strokeStyle='rgba(255,10,10,'+(a*0.4)+')';
  ctx.lineWidth=0.6;
  ctx.stroke();

  ctx.restore();
}

function drawSoundWaves(){
  if(!playing)return;
  ctx.save();

  nodes.forEach((node,ni)=>{
    // Waves from node toward the center (pineal)
    const dx=cx-node.x;
    const dy=(cy-15)-node.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    const angle=Math.atan2(dy,dx);

    for(let w=0;w<3;w++){
      const progress=(t*0.8+w*0.33)%1;
      const wx=node.x+dx*progress;
      const wy=node.y+dy*progress;
      const wAlpha=(1-progress)*0.3;
      const wSize=4+progress*6;

      ctx.beginPath();
      ctx.arc(wx,wy,wSize,angle-0.5,angle+0.5);
      ctx.strokeStyle=node.color.replace(')',','+wAlpha+')').replace('rgb','rgba').replace('#','')||'rgba(255,10,10,'+wAlpha+')';

      // Parse hex color for rgba
      const r=parseInt(node.color.slice(1,3),16)||255;
      const g=parseInt(node.color.slice(3,5),16)||10;
      const b=parseInt(node.color.slice(5,7),16)||10;
      ctx.strokeStyle='rgba('+r+','+g+','+b+','+wAlpha+')';
      ctx.lineWidth=1.5;
      ctx.stroke();
    }
  });

  ctx.restore();
}

function drawNodes(){
  nodes.forEach((node,i)=>{
    ctx.save();
    const pulse=Math.sin(t*3+i)*0.3+0.7;
    const r=playing?14+pulse*4:12;

    // Outer glow
    const glow=ctx.createRadialGradient(node.x,node.y,0,node.x,node.y,r*2);
    glow.addColorStop(0,node.color+'60');
    glow.addColorStop(1,node.color+'00');
    ctx.fillStyle=glow;
    ctx.beginPath();
    ctx.arc(node.x,node.y,r*2,0,Math.PI*2);
    ctx.fill();

    // Node body
    ctx.beginPath();
    ctx.arc(node.x,node.y,r,0,Math.PI*2);
    ctx.fillStyle=node.color+'30';
    ctx.fill();
    ctx.strokeStyle=node.color;
    ctx.lineWidth=activeNode===i?2.5:1.5;
    ctx.stroke();

    // Frequency label
    ctx.fillStyle=node.color;
    ctx.font='bold 9px monospace';
    ctx.textAlign='center';
    ctx.fillText(Math.round(node.freq)+'Hz',node.x,node.y-r-6);

    // L/R label
    ctx.font='bold 10px monospace';
    ctx.fillText(node.label,node.x,node.y+4);

    // Spatial position indicator (distance from center)
    const distFromCenter=Math.sqrt((node.x-cx)**2+(node.y-cy)**2);
    const maxDist=S*0.4;
    const panning=Math.max(-1,Math.min(1,(node.x-cx)/(maxDist)));

    ctx.restore();
  });
}

function drawEars(){
  ctx.save();
  // Left ear
  const leX=cx-68,leY=cy;
  ctx.beginPath();
  ctx.ellipse(leX,leY,6,14,0,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,10,10,0.25)';
  ctx.lineWidth=1.5;
  ctx.stroke();
  ctx.fillStyle='rgba(255,10,10,0.03)';
  ctx.fill();
  ctx.font='7px monospace';
  ctx.fillStyle='rgba(255,10,10,0.4)';
  ctx.textAlign='center';
  ctx.fillText('L',leX,leY+25);

  // Right ear
  const reX=cx+68,reY=cy;
  ctx.beginPath();
  ctx.ellipse(reX,reY,6,14,0,0,Math.PI*2);
  ctx.strokeStyle='rgba(255,48,64,0.25)';
  ctx.lineWidth=1.5;
  ctx.stroke();
  ctx.fillStyle='rgba(255,48,64,0.03)';
  ctx.fill();
  ctx.fillStyle='rgba(255,48,64,0.4)';
  ctx.fillText('R',reX,reY+25);

  ctx.restore();
}

function drawInfo(){
  ctx.save();
  // Top label
  ctx.font='9px monospace';
  ctx.fillStyle='rgba(255,10,10,0.5)';
  ctx.textAlign='center';
  ctx.fillText('PINEAL SPATIAL FIELD',cx,16);

  // Bottom status
  if(playing){
    ctx.fillStyle='rgba(255,10,10,0.4)';
    ctx.fillText('BINAURAL ACTIVE • DRAG NODES TO POSITION',cx,S-8);
  }else{
    ctx.fillStyle='rgba(90,26,26,0.6)';
    ctx.fillText('TAP TO PLACE • DRAG TO POSITION',cx,S-8);
  }
  ctx.restore();
}

// ═══ TOUCH HANDLING ═══
let touchStartX=0,touchStartY=0;

c.addEventListener('touchstart',e=>{
  e.preventDefault();
  const touch=e.touches[0];
  const rect=c.getBoundingClientRect();
  const x=touch.clientX-rect.left;
  const y=touch.clientY-rect.top;
  touchStartX=x;touchStartY=y;

  // Check if touching a node
  activeNode=-1;
  nodes.forEach((node,i)=>{
    const d=Math.sqrt((x-node.x)**2+(y-node.y)**2);
    if(d<25){
      activeNode=i;
      node.dragging=true;
    }
  });
},{passive:false});

c.addEventListener('touchmove',e=>{
  e.preventDefault();
  if(activeNode>=0){
    const touch=e.touches[0];
    const rect=c.getBoundingClientRect();
    const x=Math.max(20,Math.min(S-20,touch.clientX-rect.left));
    const y=Math.max(20,Math.min(S-20,touch.clientY-rect.top));
    nodes[activeNode].x=x;
    nodes[activeNode].y=y;
    updateFromNodes();
  }
},{passive:false});

c.addEventListener('touchend',e=>{
  if(activeNode>=0){
    nodes[activeNode].dragging=false;
    activeNode=-1;
    sendNodeUpdate();
  }
},{passive:false});

// Mouse events for web
c.addEventListener('mousedown',e=>{
  const rect=c.getBoundingClientRect();
  const x=e.clientX-rect.left;
  const y=e.clientY-rect.top;
  activeNode=-1;
  nodes.forEach((node,i)=>{
    const d=Math.sqrt((x-node.x)**2+(y-node.y)**2);
    if(d<25){activeNode=i;node.dragging=true;}
  });
});

c.addEventListener('mousemove',e=>{
  if(activeNode>=0){
    const rect=c.getBoundingClientRect();
    const x=Math.max(20,Math.min(S-20,e.clientX-rect.left));
    const y=Math.max(20,Math.min(S-20,e.clientY-rect.top));
    nodes[activeNode].x=x;
    nodes[activeNode].y=y;
    updateFromNodes();
  }
});

c.addEventListener('mouseup',()=>{
  if(activeNode>=0){
    nodes[activeNode].dragging=false;
    activeNode=-1;
    sendNodeUpdate();
  }
});

function updateFromNodes(){
  // Calculate carrier and beat based on node positions
  // Distance from center affects frequency intensity
  // Left-right position affects channel panning
  const l=nodes[0],r=nodes[1];
  const lDist=Math.sqrt((l.x-cx)**2+(l.y-cy)**2);
  const rDist=Math.sqrt((r.x-cx)**2+(r.y-cy)**2);

  // Update frequencies based on position
  l.freq=carrier;
  r.freq=carrier+beat;
}

function sendNodeUpdate(){
  const l=nodes[0],r=nodes[1];
  const lPan=(l.x-cx)/(S/2);
  const rPan=(r.x-cx)/(S/2);
  const lDist=Math.sqrt((l.x-cx)**2+(l.y-(cy-15))**2);
  const rDist=Math.sqrt((r.x-cx)**2+(r.y-(cy-15))**2);

  window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(JSON.stringify({
    type:'nodeUpdate',
    leftPan:lPan,rightPan:rPan,
    leftDist:lDist,rightDist:rDist,
    leftX:l.x/S,leftY:l.y/S,
    rightX:r.x/S,rightY:r.y/S,
  }));
}

// Receive updates from React Native
window.addEventListener('message',e=>{
  try{
    const d=JSON.parse(e.data);
    if(d.type==='updateFreqs'){
      carrier=d.carrier;
      beat=d.beat;
      nodes[0].freq=carrier;
      nodes[1].freq=carrier+beat;
    }
    if(d.type==='setPlaying'){
      playing=d.playing;
    }
    if(d.type==='setPreset'){
      carrier=d.carrier;
      beat=d.beat;
      nodes[0].freq=carrier;
      nodes[1].freq=carrier+beat;
      if(d.color){
        nodes[0].color=d.color;
        nodes[1].color=d.color;
      }
    }
  }catch(e){}
});

draw();
</script></body></html>
`;

export default function BinauralScreen() {
  const [carrierFreq, setCarrierFreq] = useState(432);
  const [beatFreq, setBeatFreq] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>('CALM_ALPHA_432');
  const [duration, setDuration] = useState(10);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const webViewRef = useRef<WebView | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return () => {
      // Audio persists across pages for universal sync (harmonic layering).
      // Only clear the on-screen timer; keep binaural running.
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Sync canvas when freq changes
  useEffect(() => {
    webViewRef.current?.injectJavaScript(`
      try{
        carrier=${carrierFreq};beat=${beatFreq};
        nodes[0].freq=${carrierFreq};nodes[1].freq=${carrierFreq + beatFreq};
      }catch(e){}
      true;
    `);
  }, [carrierFreq, beatFreq]);

  const handlePlay = () => {
    if (isPlaying) {
      AudioEngine.stopBinaural();
      setIsPlaying(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setElapsedTime(0);
      webViewRef.current?.injectJavaScript(`playing=false;true;`);
    } else {
      AudioEngine.startBinaural(carrierFreq, beatFreq);
      setIsPlaying(true);
      setElapsedTime(0);
      webViewRef.current?.injectJavaScript(`playing=true;true;`);
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => {
          if (prev >= duration * 60) {
            AudioEngine.stopBinaural();
            setIsPlaying(false);
            if (timerRef.current) clearInterval(timerRef.current);
            webViewRef.current?.injectJavaScript(`playing=false;true;`);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
  };

  const handlePreset = (preset: BinauralPreset) => {
    setCarrierFreq(preset.carrier);
    setBeatFreq(preset.beatHz);
    setActivePreset(preset.name);
    if (isPlaying) AudioEngine.updateBinaural(preset.carrier, preset.beatHz);
    webViewRef.current?.injectJavaScript(`
      carrier=${preset.carrier};beat=${preset.beatHz};
      nodes[0].freq=${preset.carrier};nodes[1].freq=${preset.carrier + preset.beatHz};
      nodes[0].color='${preset.color}';nodes[1].color='${preset.color}';
      true;
    `);
  };

  const handleCarrierChange = (v: number) => {
    setCarrierFreq(v);
    setActivePreset(null);
    if (isPlaying) AudioEngine.updateBinaural(v, beatFreq);
  };

  const handleBeatChange = (v: number) => {
    setBeatFreq(v);
    setActivePreset(null);
    if (isPlaying) AudioEngine.updateBinaural(carrierFreq, v);
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'nodeUpdate') {
        // Nodes were repositioned — spatial data available
        // Could adjust stereo panning based on node positions
      }
    } catch (e) {}
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getBrainwaveState = () => {
    if (beatFreq <= 4) return { name: 'DELTA', color: '#0088ff' };
    if (beatFreq <= 8) return { name: 'THETA', color: '#6644ff' };
    if (beatFreq <= 13) return { name: 'ALPHA', color: '#00ffaa' };
    if (beatFreq <= 30) return { name: 'BETA', color: '#ffaa00' };
    return { name: 'GAMMA', color: '#ff4400' };
  };

  const brainwave = getBrainwaveState();

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <MirrorsIdBanner />
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>BI-NAURAL FIELD</Text>
            <Text style={styles.headerSub}>PINEAL SPATIAL ENTRAINMENT</Text>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>◈ STEREO HEADPHONES REQUIRED ◈</Text>
          </View>

          {/* ═══ HEAD MODEL CANVAS ═══ */}
          <View style={[styles.canvasContainer, { width: CANVAS_SIZE, height: CANVAS_SIZE }]}>
            {Platform.OS === 'web' ? (
              <iframe
                srcDoc={HEAD_MODEL_HTML}
                style={{
                  width: CANVAS_SIZE,
                  height: CANVAS_SIZE,
                  border: 'none',
                  backgroundColor: '#000',
                  borderRadius: 8,
                }}
              />
            ) : (
              <WebView
                ref={webViewRef}
                source={{ html: HEAD_MODEL_HTML }}
                style={{ width: CANVAS_SIZE, height: CANVAS_SIZE, backgroundColor: '#000' }}
                scrollEnabled={false}
                bounces={false}
                onMessage={handleWebViewMessage}
                javaScriptEnabled
                originWhitelist={['*']}
              />
            )}
            {/* Corner labels */}
            <View style={styles.canvasCornerTL}>
              <Text style={styles.cornerLabel}>DOLBY ATMOS SPATIAL</Text>
            </View>
            <View style={styles.canvasCornerTR}>
              <Text style={styles.cornerLabel}>{brainwave.name}</Text>
            </View>
          </View>

          {/* ═══ FREQUENCY DISPLAY ═══ */}
          <View style={styles.freqDisplay}>
            <View style={styles.freqChannel}>
              <Text style={styles.freqChLabel}>L CHANNEL</Text>
              <Text style={styles.freqChValue}>{carrierFreq.toFixed(0)} Hz</Text>
            </View>
            <View style={styles.freqCenter}>
              <Text style={styles.freqBeatLabel}>BEAT</Text>
              <Text style={styles.freqBeatValue}>{beatFreq.toFixed(1)}</Text>
              <Text style={styles.freqBeatUnit}>Hz</Text>
            </View>
            <View style={styles.freqChannel}>
              <Text style={styles.freqChLabel}>R CHANNEL</Text>
              <Text style={styles.freqChValue}>{(carrierFreq + beatFreq).toFixed(0)} Hz</Text>
            </View>
          </View>

          {/* ═══ CYMASCOPE — live master-bus FFT drive (zero-latency: frames stream
              straight from the audio analyser, not from React state) ═══ */}
          <View style={styles.scopeSection}>
            <ScopeNodePanel
              frequencies={[carrierFreq, carrierFreq + beatFreq]}
              playing={isPlaying}
              scalarBeatHz={isPlaying ? beatFreq : 0}
            />
          </View>

          {/* Timer */}
          {isPlaying && (
            <View style={styles.timerContainer}>
              <Text style={styles.timerValue}>{formatTime(elapsedTime)} / {formatTime(duration * 60)}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(elapsedTime / (duration * 60)) * 100}%` }]} />
              </View>
            </View>
          )}

          {/* ═══ CONTROLS ═══ */}
          <View style={styles.controlsSection}>
            <View style={styles.sliderRow}>
              <Text style={styles.sliderLabel}>CARRIER</Text>
              <Text style={styles.sliderValue}>{carrierFreq.toFixed(0)} Hz</Text>
            </View>
            <View style={styles.sliderTrack}>
              <TouchableOpacity
                style={styles.sliderMinus}
                onPress={() => handleCarrierChange(Math.max(100, carrierFreq - 10))}
              >
                <Text style={styles.sliderBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderBarWrap}>
                <View style={[styles.sliderBarFill, { width: `${((carrierFreq - 100) / 900) * 100}%` }]} />
              </View>
              <TouchableOpacity
                style={styles.sliderPlus}
                onPress={() => handleCarrierChange(Math.min(1000, carrierFreq + 10))}
              >
                <Text style={styles.sliderBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.sliderRow, { marginTop: 14 }]}>
              <Text style={styles.sliderLabel}>BEAT FREQUENCY</Text>
              <Text style={styles.sliderValue}>{beatFreq.toFixed(1)} Hz</Text>
            </View>
            <View style={styles.sliderTrack}>
              <TouchableOpacity
                style={styles.sliderMinus}
                onPress={() => handleBeatChange(Math.max(0.5, beatFreq - 0.5))}
              >
                <Text style={styles.sliderBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderBarWrap}>
                <View style={[styles.sliderBarFill, { width: `${((beatFreq - 0.5) / 39.5) * 100}%`, backgroundColor: '#ff3040' }]} />
              </View>
              <TouchableOpacity
                style={styles.sliderPlus}
                onPress={() => handleBeatChange(Math.min(40, beatFreq + 0.5))}
              >
                <Text style={styles.sliderBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.sliderRow, { marginTop: 14 }]}>
              <Text style={styles.sliderLabel}>DURATION</Text>
              <Text style={styles.sliderValue}>{duration} MIN</Text>
            </View>
            <View style={styles.sliderTrack}>
              <TouchableOpacity
                style={styles.sliderMinus}
                onPress={() => setDuration(Math.max(1, duration - 1))}
              >
                <Text style={styles.sliderBtnText}>−</Text>
              </TouchableOpacity>
              <View style={styles.sliderBarWrap}>
                <View style={[styles.sliderBarFill, { width: `${((duration - 1) / 59) * 100}%`, backgroundColor: '#880505' }]} />
              </View>
              <TouchableOpacity
                style={styles.sliderPlus}
                onPress={() => setDuration(Math.min(60, duration + 1))}
              >
                <Text style={styles.sliderBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ═══ PLAY/STOP ═══ */}
          <View style={styles.playContainer}>
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.playButtonActive]}
              onPress={handlePlay}
            >
              <Text style={[styles.playIcon, isPlaying && styles.playIconActive]}>
                {isPlaying ? '◼' : '▶'}
              </Text>
              <Text style={[styles.playText, isPlaying && styles.playTextActive]}>
                {isPlaying ? 'TERMINATE' : 'INITIATE'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ═══ PRESETS ═══ */}
          <View style={styles.presetsSection}>
            <Text style={styles.sectionTitle}>◈ PRESET PROTOCOLS</Text>
            <View style={styles.presetGrid}>
              {BINAURAL_PRESETS.map(preset => (
                <TouchableOpacity
                  key={preset.name}
                  style={[
                    styles.presetCard,
                    activePreset === preset.name && styles.presetCardActive,
                    activePreset === preset.name && { borderColor: preset.color },
                  ]}
                  onPress={() => handlePreset(preset)}
                >
                  <View style={[styles.presetDot, { backgroundColor: preset.color }]} />
                  <Text style={styles.presetName}>
                    {preset.name.replace(/_/g, ' ')}
                  </Text>
                  <Text style={styles.presetFreqs}>
                    {preset.carrier}Hz + {preset.beatHz}Hz
                  </Text>
                  <Text style={styles.presetDesc}>{preset.description}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ═══ GUIDE ═══ */}
          <View style={styles.guideSection}>
            <Text style={styles.guideTitle}>◈ HOW IT WORKS</Text>
            <Text style={styles.guideText}>
              Drag the L and R frequency nodes around the head model to position
              them spatially. The pineal gland (center) represents your perception
              point. Frequencies placed closer to the ears create stronger stereo
              separation. The Eye of Horus pattern activates during entrainment,
              visualizing the binaural beat convergence at the pineal center.
            </Text>
          </View>
          <DisclaimerFooter />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },

  // Header
  header: { paddingTop: 16, alignItems: 'center' },
  headerTitle: {
    color: '#ff0a0a', fontSize: 18, fontWeight: '700', letterSpacing: 4,
  },
  headerSub: {
    color: '#5a1a1a', fontSize: 9, letterSpacing: 2, marginTop: 4,
  },
  warningBox: {
    marginTop: 10, padding: 6, borderWidth: 1,
    borderColor: '#ff304060', backgroundColor: '#0a0505',
  },
  warningText: {
    color: '#ff3040', fontSize: 9, textAlign: 'center', letterSpacing: 1,
  },

  // Canvas
  canvasContainer: {
    alignSelf: 'center', marginTop: 14,
    borderWidth: 1, borderColor: '#1a0808', borderRadius: 8,
    overflow: 'hidden', backgroundColor: '#000',
    position: 'relative',
  },
  canvasCornerTL: { position: 'absolute', top: 4, left: 8 },
  canvasCornerTR: { position: 'absolute', top: 4, right: 8 },
  cornerLabel: {
    color: '#5a1a1a', fontSize: 7, letterSpacing: 1,
  },

  // Freq Display
  freqDisplay: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, padding: 12, borderWidth: 1,
    borderColor: '#2a0a0a', backgroundColor: '#0a0505',
  },
  freqChannel: { alignItems: 'center', flex: 1 },
  freqChLabel: { color: '#5a1a1a', fontSize: 8, letterSpacing: 1 },
  freqChValue: { color: '#ff0a0a', fontSize: 18, fontWeight: '700', marginTop: 2 },
  freqCenter: { alignItems: 'center', paddingHorizontal: 16 },
  freqBeatLabel: { color: '#5a1a1a', fontSize: 7, letterSpacing: 1 },
  freqBeatValue: { color: '#ff3040', fontSize: 28, fontWeight: '700' },
  freqBeatUnit: { color: '#5a1a1a', fontSize: 8 },

  // Timer
  timerContainer: {
    marginTop: 10, padding: 10, borderWidth: 1,
    borderColor: '#2a0a0a', backgroundColor: '#0a0505', alignItems: 'center',
  },
  timerValue: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  progressBar: { width: '100%', height: 3, backgroundColor: '#1a0808', marginTop: 8 },
  progressFill: { height: '100%', backgroundColor: '#ff0a0a' },

  // Controls
  controlsSection: { marginTop: 18 },
  sliderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  sliderLabel: { color: '#5a1a1a', fontSize: 9, letterSpacing: 1 },
  sliderValue: { color: '#ff0a0a', fontSize: 10, fontWeight: '700' },
  sliderTrack: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6,
  },
  sliderMinus: {
    width: 36, height: 36, borderWidth: 1, borderColor: '#2a0a0a',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0505',
  },
  sliderPlus: {
    width: 36, height: 36, borderWidth: 1, borderColor: '#2a0a0a',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#0a0505',
  },
  sliderBtnText: { color: '#ff0a0a', fontSize: 18, fontWeight: '700' },
  sliderBarWrap: {
    flex: 1, height: 6, backgroundColor: '#1a0808', borderRadius: 3, overflow: 'hidden',
  },
  sliderBarFill: {
    height: '100%', backgroundColor: '#ff0a0a', borderRadius: 3,
  },

  // Play
  playContainer: { alignItems: 'center', marginTop: 18 },
  playButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 2, borderColor: '#ff0a0a',
    paddingHorizontal: 36, paddingVertical: 14,
    backgroundColor: '#0a0505',
  },
  playButtonActive: { borderColor: '#ff3040', backgroundColor: '#1a0505' },
  playIcon: { color: '#ff0a0a', fontSize: 16 },
  playIconActive: { color: '#ff3040' },
  playText: { color: '#ff0a0a', fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  playTextActive: { color: '#ff3040' },

  // Presets
  presetsSection: { marginTop: 28 },
  sectionTitle: {
    color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 12,
  },
  presetGrid: { gap: 8 },
  presetCard: {
    padding: 12, borderWidth: 1, borderColor: '#1a0808',
    backgroundColor: '#050303', flexDirection: 'row', alignItems: 'center',
    flexWrap: 'wrap', gap: 8,
  },
  presetCardActive: { backgroundColor: '#0a0505' },
  presetDot: { width: 8, height: 8, borderRadius: 4 },
  presetName: { color: '#ff3040', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  presetFreqs: { color: '#5a1a1a', fontSize: 9 },
  presetDesc: { color: '#3a1010', fontSize: 8, width: '100%', marginTop: 2 },

  // Guide
  guideSection: {
    marginTop: 24, padding: 12, borderWidth: 1,
    borderColor: '#1a0808', backgroundColor: '#050303',
  },
  guideTitle: {
    color: '#5a1a1a', fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 6,
  },
  guideText: {
    color: '#3a1010', fontSize: 9, lineHeight: 14,
  },
});
