import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { AudioEngine, ScopeFrame } from './AudioEngine';

// ═══════════════════════════════════════════════════════════
// NODE CONSTELLATION — cosmic lattice view of the CODES LAB
// Renders each Layer/Node as a chakra-colored orb positioned
// on a circular lattice, connected by rainbow gradient lines.
// Emitting nodes get nested rings + particle dust.
// The center displays the node count as the "harmony key".
// Live audio (from AudioEngine.subscribeScope) modulates the
// pulse of active nodes and the intensity of the lattice.
// ═══════════════════════════════════════════════════════════

// Chakra color per chromatic-note index (0=A, 1=A#, ..., 11=G#)
// Consistent with the MIRRORS WHEEL palette.
const NOTE_TO_CHAKRA: { name: string; color: string; glow: string }[] = [
  { name: 'A',  color: '#673AB7', glow: '#9575CD' }, // Third Eye
  { name: 'A#', color: '#9C27B0', glow: '#BA68C8' }, // Violet
  { name: 'B',  color: '#E040FB', glow: '#F48FFF' }, // Crown
  { name: 'C',  color: '#FF1A1A', glow: '#FF6969' }, // Root
  { name: 'C#', color: '#FF5722', glow: '#FF8A65' }, // Red-Orange
  { name: 'D',  color: '#FF9500', glow: '#FFB74D' }, // Sacral
  { name: 'D#', color: '#FFC400', glow: '#FFD54F' }, // Yellow-Orange
  { name: 'E',  color: '#FFEB00', glow: '#FFF176' }, // Solar
  { name: 'F',  color: '#4CAF50', glow: '#81C784' }, // Heart
  { name: 'F#', color: '#00BCD4', glow: '#4DD0E1' }, // Cyan
  { name: 'G',  color: '#2196F3', glow: '#64B5F6' }, // Throat
  { name: 'G#', color: '#3F51B5', glow: '#7986CB' }, // Blue-Indigo
];

function noteFromFreq(freq: number) {
  if (!freq || freq <= 0) return NOTE_TO_CHAKRA[0];
  const semis = 12 * Math.log2(freq / 432);
  const idx = ((Math.round(semis) % 12) + 12) % 12;
  return NOTE_TO_CHAKRA[idx];
}

const HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<style>html,body{margin:0;padding:0;background:#03071A;overflow:hidden;}canvas{display:block;}</style>
</head><body>
<canvas id="c"></canvas>
<script>
var canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
var W=0,H=0,CX=0,CY=0,R0=0;
function resize(){W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H;CX=W/2;CY=H/2;R0=Math.min(W,H)*0.36;}
resize();window.addEventListener('resize',resize);
var STATE={nodes:[],playing:false,activeIds:[]};
var LIVE={wave:new Array(128).fill(128),peak:0,ts:0};
var particles=[];
window.updateStars=function(s){try{if(typeof s==='string')s=JSON.parse(s);if(s.nodes)STATE.nodes=s.nodes;if(typeof s.playing==='boolean')STATE.playing=s.playing;if(s.activeIds)STATE.activeIds=s.activeIds;}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);if(w&&w.wave){LIVE.wave=w.wave;LIVE.peak=w.peak||0;LIVE.ts=performance.now();}}catch(e){}};
window.addEventListener('message',function(e){var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}}catch(_){}window.updateStars(d);});
document.addEventListener('message',function(e){var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}}catch(_){}window.updateStars(d);});

function nodePositions(){
  var n=STATE.nodes.length;
  if(n===0)return [];
  var out=[];
  var offset=-Math.PI/2; // start at top
  for(var i=0;i<n;i++){
    var a=offset+(i/n)*Math.PI*2;
    var wobble=Math.sin(performance.now()*0.0007+i)*0.02;
    out.push({x:CX+Math.cos(a+wobble)*R0,y:CY+Math.sin(a+wobble)*R0,angle:a});
  }
  return out;
}

function drawBgGrid(){
  ctx.fillStyle='#03071A';ctx.fillRect(0,0,W,H);
  // faint sacred grid + hairline circles
  ctx.strokeStyle='rgba(120,140,200,0.06)';ctx.lineWidth=1;
  var step=42;
  for(var x=0;x<W;x+=step){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(var y=0;y<H;y+=step){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.strokeStyle='rgba(160,180,240,0.05)';
  for(var k=1;k<=4;k++){ctx.beginPath();ctx.arc(CX,CY,R0*0.4*k,0,6.2832);ctx.stroke();}
  // random cosmic dust
  ctx.fillStyle='rgba(200,220,255,0.4)';
  for(var d=0;d<40;d++){ctx.fillRect(Math.random()*W,Math.random()*H,1,1);}
}

function drawConnections(pts){
  // Draw a line between every pair with gradient between their colors
  for(var i=0;i<pts.length;i++){
    for(var j=i+1;j<pts.length;j++){
      var a=pts[i],b=pts[j];
      var g=ctx.createLinearGradient(a.x,a.y,b.x,b.y);
      g.addColorStop(0,a.color);
      g.addColorStop(1,b.color);
      ctx.strokeStyle=g;
      ctx.globalAlpha=0.55;
      ctx.lineWidth=1.1;
      ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
}

function drawRings(x,y,color,intensity){
  // 3 nested rings with rotation
  var t=performance.now()*0.0004;
  for(var k=0;k<3;k++){
    var r=14+k*7+intensity*4;
    ctx.strokeStyle=color;
    ctx.globalAlpha=(0.55-k*0.15)*(0.5+intensity);
    ctx.lineWidth=1.1;
    ctx.beginPath();
    ctx.ellipse(x,y,r*1.4,r*0.6,t+k*0.5,0,6.2832);
    ctx.stroke();
  }
  ctx.globalAlpha=1;
}

function spawnParticles(x,y,color,intensity){
  var n=Math.floor(intensity*4);
  for(var i=0;i<n;i++){
    particles.push({
      x:x,y:y,
      vx:(Math.random()-0.5)*1.5,
      vy:(Math.random()-0.5)*1.5,
      life:1,
      color:color,
      size:1+Math.random()*2
    });
  }
  if(particles.length>200)particles.splice(0,particles.length-200);
}

function drawParticles(){
  for(var i=particles.length-1;i>=0;i--){
    var p=particles[i];
    p.x+=p.vx;p.y+=p.vy;
    p.life-=0.02;
    if(p.life<=0){particles.splice(i,1);continue;}
    ctx.globalAlpha=p.life*0.9;
    ctx.fillStyle=p.color;
    ctx.fillRect(p.x,p.y,p.size,p.size);
  }
  ctx.globalAlpha=1;
}

function drawOrb(x,y,color,glow,intensity,isActive){
  // Halo
  var haloR=18+intensity*22;
  var grad=ctx.createRadialGradient(x,y,0,x,y,haloR);
  grad.addColorStop(0,glow);
  grad.addColorStop(0.4,color);
  grad.addColorStop(1,'rgba(0,0,0,0)');
  ctx.globalAlpha=0.9;
  ctx.fillStyle=grad;
  ctx.beginPath();ctx.arc(x,y,haloR,0,6.2832);ctx.fill();
  // Bright core
  ctx.globalAlpha=1;
  ctx.fillStyle='#ffffff';
  ctx.beginPath();ctx.arc(x,y,isActive?4+intensity*2.5:2.5,0,6.2832);ctx.fill();
  // Colored ring
  ctx.strokeStyle=color;ctx.lineWidth=1.2;
  ctx.beginPath();ctx.arc(x,y,7+intensity*2,0,6.2832);ctx.stroke();
}

function drawLabel(x,y,text,color){
  ctx.font='bold 13px system-ui, sans-serif';
  ctx.fillStyle='#dfe8ff';
  ctx.textAlign='center';
  ctx.fillText(text,x,y);
  ctx.font='bold 10px system-ui, sans-serif';
  ctx.fillStyle=color;
  ctx.globalAlpha=0.85;
  ctx.fillText(text,x,y+13);
  ctx.globalAlpha=1;
  ctx.textAlign='left';
}

function drawCenter(count,intensity){
  // Center glyph — big number showing node count
  ctx.textAlign='center';
  ctx.font='bold 44px system-ui, sans-serif';
  ctx.fillStyle='#ffffff';
  ctx.globalAlpha=0.9;
  ctx.fillText(String(count),CX,CY+16);
  ctx.font='bold 8px system-ui, sans-serif';
  ctx.fillStyle='#8090c0';
  ctx.globalAlpha=0.7;
  ctx.fillText('NODES',CX,CY+34);
  ctx.globalAlpha=1;
  ctx.textAlign='left';
}

var envSmooth=0;
function draw(){
  drawBgGrid();
  var pts=nodePositions();
  var live=Math.min(1,(LIVE.peak||0)/110);
  var fresh=(performance.now()-LIVE.ts)<400;
  var env=fresh?live:(STATE.playing?0.35:0);
  envSmooth=envSmooth*0.75+env*0.25;

  // Attach node data to pts
  for(var i=0;i<pts.length;i++){
    var node=STATE.nodes[i];
    pts[i].color=node.color;
    pts[i].glow=node.glow;
    pts[i].freq=node.freq;
    pts[i].active=STATE.activeIds.indexOf(node.id)>=0;
    pts[i].intensity=pts[i].active?envSmooth:envSmooth*0.35;
  }

  // Lattice connections
  drawConnections(pts);

  // Rings + particles for active nodes
  for(var j=0;j<pts.length;j++){
    var p=pts[j];
    if(p.active){
      drawRings(p.x,p.y,p.color,p.intensity);
      spawnParticles(p.x,p.y,p.glow,p.intensity);
    }
  }
  drawParticles();

  // Orbs + labels
  for(var k=0;k<pts.length;k++){
    var q=pts[k];
    drawOrb(q.x,q.y,q.color,q.glow,q.intensity,q.active);
    // Offset label outward
    var lr=R0+18;
    var lx=CX+Math.cos(q.angle)*lr;
    var ly=CY+Math.sin(q.angle)*lr;
    var hz=q.freq;
    var label=hz>=1000?(hz/1000).toFixed(hz>=10000?1:2)+'k':hz.toFixed(hz<100?1:0);
    drawLabel(lx,ly,label,q.color);
  }

  drawCenter(pts.length,envSmooth);
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
</script></body></html>`;

interface Props {
  layers: { id: number; frequency: number; isPlaying: boolean }[];
  playing: boolean;
}

export default function NodeConstellation({ layers, playing }: Props) {
  const webRef = useRef<WebView>(null);
  const iframeRef = useRef<any>(null);

  const nodes = useMemo(() => {
    return layers.map(l => {
      const ch = noteFromFreq(l.frequency);
      return { id: l.id, freq: l.frequency, note: ch.name, color: ch.color, glow: ch.glow };
    });
  }, [layers]);

  const activeIds = useMemo(() => layers.filter(l => l.isPlaying || playing).map(l => l.id), [layers, playing]);

  const pushConfig = (cfg: object) => {
    const json = JSON.stringify(cfg);
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.updateStars?.(json); } catch {}
    } else {
      webRef.current?.injectJavaScript(`window.updateStars(${JSON.stringify(json)}); true;`);
    }
  };
  const pushWave = (frame: ScopeFrame) => {
    const payload = JSON.stringify({ __wave: true, wave: frame.wave, peak: frame.peak });
    if (Platform.OS === 'web') {
      try { iframeRef.current?.contentWindow?.pushWave?.(payload); } catch {}
    } else {
      const safe = payload.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
      webRef.current?.injectJavaScript(`window.pushWave&&window.pushWave('${safe}');true;`);
    }
  };

  useEffect(() => {
    pushConfig({ nodes, playing, activeIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, playing, activeIds]);

  useEffect(() => {
    const unsub = AudioEngine.subscribeScope((frame) => { pushWave(frame); });
    return unsub;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>◈ NODE CONSTELLATION</Text>
        <Text style={styles.sub}>{nodes.length}× ORB · CHAKRA-KEYED LATTICE</Text>
      </View>
      <View style={styles.canvas}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: HTML,
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#03071A' },
            onLoad: () => pushConfig({ nodes, playing, activeIds }),
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html: HTML }}
            style={{ flex: 1, backgroundColor: '#03071A' }}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onLoadEnd={() => pushConfig({ nodes, playing, activeIds })}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  title: { color: '#dfe8ff', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  sub: { color: '#5a6a90', fontSize: 8, fontWeight: '700', letterSpacing: 1.5 },
  canvas: {
    height: 320,
    borderWidth: 1,
    borderColor: '#182040',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#03071A',
  },
});
