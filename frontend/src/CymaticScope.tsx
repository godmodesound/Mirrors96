import React, { useRef, useEffect, useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, ScrollView } from 'react-native';
import { WebView } from 'react-native-webview';

// ═══════════════════════════════════════════════════════════
// CYMATIC OSCILLOSCOPE — real-time frequency feedback scope
// 7 mediums: CHLADNI · WATER · SAND · CYMATICS · MERCURY · GOLD · FIRE
// Canvas renderer runs in a WebView (native) / iframe (web).
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
var cfg={freqs:[432],playing:false,medium:'CYMATICS'};
var PAL={
  CHLADNI:{main:'#9be89b',glow:'#3aff6e',dim:'rgba(125,232,125,0.10)'},
  WATER:{main:'#8fd8ff',glow:'#19b6ff',dim:'rgba(95,201,255,0.10)'},
  SAND:{main:'#eed9a6',glow:'#d9a441',dim:'rgba(232,200,125,0.10)'},
  CYMATICS:{main:'#a8f0a0',glow:'#4dff77',dim:'rgba(141,255,157,0.10)'},
  MERCURY:{main:'#eceef5',glow:'#aab4c8',dim:'rgba(216,220,232,0.10)'},
  GOLD:{main:'#ffe08a',glow:'#ffaa00',dim:'rgba(255,215,94,0.10)'},
  FIRE:{main:'#ff9a5a',glow:'#ff2a0a',dim:'rgba(255,90,42,0.10)'}
};
window.updateScope=function(c){try{if(typeof c==='string')c=JSON.parse(c);if(c.freqs)cfg.freqs=c.freqs;if(typeof c.playing==='boolean')cfg.playing=c.playing;if(c.medium)cfg.medium=c.medium;}catch(e){}};
window.addEventListener('message',function(e){window.updateScope(e.data);});
document.addEventListener('message',function(e){window.updateScope(e.data);});
function grid(p){
  ctx.strokeStyle=p.dim;ctx.lineWidth=0.5;
  for(var i=0;i<24;i++){var a=i*Math.PI/12;ctx.beginPath();ctx.moveTo(CX,CY);ctx.lineTo(CX+Math.cos(a)*R0*1.22,CY+Math.sin(a)*R0*1.22);ctx.stroke();}
  for(var k=1;k<=4;k++){ctx.beginPath();ctx.arc(CX,CY,R0*1.15*k/4,0,6.2832);ctx.stroke();}
}
function draw(t){
  ctx.fillStyle='rgba(0,0,0,0.22)';ctx.fillRect(0,0,W,H);
  var p=PAL[cfg.medium]||PAL.CYMATICS;
  grid(p);
  var f=(cfg.freqs&&cfg.freqs[0])||432;
  var n=2+Math.round(f%12);          // angular modes
  var m=3+Math.round((f/100)%9);     // radial modes
  var spin=cfg.playing?t*0.00045*(1+(f%7)*0.25):0;
  var breathe=cfg.playing?1+0.025*Math.sin(t*0.003*(1+(f%5))):1;
  var R=R0*breathe;
  var med=cfg.medium;
  var pts=cfg.playing?(med==='SAND'?1400:900):320;
  for(var i=0;i<pts;i++){
    var th=Math.random()*6.2832,r=Math.sqrt(Math.random());
    var I=Math.abs(Math.sin(n*th+spin)*Math.sin(m*Math.PI*r));
    var hit=false,size=1.4,alpha=0;
    if(med==='CHLADNI'){hit=I<0.14;alpha=0.5+Math.random()*0.4;size=1.2;}
    else if(med==='SAND'){hit=I<0.20;alpha=0.35+Math.random()*0.35;size=1.0;}
    else if(med==='WATER'){var w=Math.abs(Math.sin(m*Math.PI*r-(cfg.playing?t*0.004:0)));hit=w>0.9;alpha=0.30+0.4*w;size=1.6;}
    else if(med==='FIRE'){hit=I>0.55;alpha=0.35+0.5*I;size=1.5+I;}
    else if(med==='MERCURY'||med==='GOLD'){hit=I>0.62;alpha=0.35+0.55*I;size=1.8+I*1.2;}
    else {hit=I>0.58;alpha=0.30+0.55*I;size=1.3+I;}
    if(!hit)continue;
    var x=CX+Math.cos(th)*r*R,y=CY+Math.sin(th)*r*R;
    if(med==='FIRE'){y-=I*10*Math.random();}
    ctx.globalAlpha=alpha;ctx.fillStyle=p.main;
    ctx.fillRect(x,y,size,size);
    if((med==='MERCURY'||med==='GOLD')&&I>0.85){ctx.globalAlpha=0.9;ctx.fillStyle='#ffffff';ctx.fillRect(x,y,1,1);}
  }
  ctx.globalAlpha=1;
  // rim
  ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=cfg.playing?18:8;
  ctx.strokeStyle=p.glow;ctx.lineWidth=cfg.playing?2:1;ctx.globalAlpha=cfg.playing?0.85:0.4;
  ctx.beginPath();
  for(var a2=0;a2<=6.2832;a2+=0.05){
    var wob=1+(cfg.playing?0.02*Math.sin(n*a2+spin*3):0.006*Math.sin(n*a2));
    var rx=CX+Math.cos(a2)*R*wob,ry=CY+Math.sin(a2)*R*wob;
    a2===0?ctx.moveTo(rx,ry):ctx.lineTo(rx,ry);
  }
  ctx.closePath();ctx.stroke();ctx.restore();
  // core
  ctx.globalAlpha=cfg.playing?0.95:0.5;ctx.save();ctx.shadowColor=p.glow;ctx.shadowBlur=14;
  ctx.fillStyle='#ffffff';ctx.beginPath();ctx.arc(CX,CY,cfg.playing?2.6:1.8,0,6.2832);ctx.fill();ctx.restore();
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

  useEffect(() => {
    pushConfig({ freqs: frequencies, playing, medium });
  }, [frequencies, playing, medium, pushConfig]);

  const color = MEDIUM_COLORS[medium];
  const mainFreq = frequencies[0] || 432;

  return (
    <View style={st.wrap}>
      {/* Readout */}
      <View style={[st.readout, { borderColor: color }]}>
        <Text style={[st.readoutText, { color }]}>
          {mainFreq.toFixed(2)} Hz · {medium} PROTOCOL {playing ? 'ACTIVE' : 'STANDBY'}
        </Text>
      </View>

      {/* Scope canvas */}
      <View style={[st.scope, { borderColor: `${color}40` }]}>
        {Platform.OS === 'web' ? (
          React.createElement('iframe', {
            ref: iframeRef,
            srcDoc: SCOPE_HTML,
            style: { width: '100%', height: '100%', border: 'none', backgroundColor: '#000' },
            onLoad: () => pushConfig({ freqs: frequencies, playing, medium }),
          })
        ) : (
          <WebView
            ref={webRef}
            source={{ html: SCOPE_HTML }}
            style={st.webview}
            javaScriptEnabled
            scrollEnabled={false}
            androidLayerType="hardware"
            onLoadEnd={() => pushConfig({ freqs: frequencies, playing, medium })}
          />
        )}
      </View>

      {/* Medium selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.mediumRow}>
        {MEDIUMS.map(m => (
          <TouchableOpacity
            key={m}
            style={[
              st.mediumPill,
              { borderColor: MEDIUM_COLORS[m] },
              medium === m && { backgroundColor: MEDIUM_COLORS[m] },
            ]}
            onPress={() => setMedium(m)}
          >
            <Text style={[st.mediumText, { color: medium === m ? '#000' : MEDIUM_COLORS[m] }]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
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
  mediumRow: { gap: 6, paddingVertical: 8 },
  mediumPill: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  mediumText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
});
