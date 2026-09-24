export type Dimension = { d: number; mind: string; color: string; hz: number; du: number; field: string; beings: string };

const DU = [
  { n: 1, name: 'EARTH', matter: 'Carbon Matter · metabolic body', beings: 'INCARNATES' },
  { n: 2, name: 'TARA', matter: 'Carbon-Etheric Matter · carbon-crystal body', beings: 'SOULS' },
  { n: 3, name: 'GAIA', matter: 'Etheric Matter · crystal body', beings: 'OVER SOULS' },
  { n: 4, name: 'ARAMATENA', matter: 'Hydroplasmic Pre-Matter · crystal liquid body', beings: 'AVATARS' },
  { n: 5, name: 'ECKASHA', matter: 'Suprasplasmic Matter · gas body', beings: 'RISHI' },
];
export const DENSITY_UNIVERSES = DU;
const MINDS = ['SUBCONSCIOUS', 'INSTINCTUAL', 'REASONING', 'ASTRAL', 'ARCHETYPE', 'CELESTIAL', 'KETHERIC', 'MONADIC', 'KERIATIC', 'CHRISTIC', 'BUDDHIC', 'NIRVANIC', 'PARTICUM', 'PARTICIA', 'RISHIC'];
const COLORS = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#283593', '#d81b60', '#ffd54f', '#bdbdbd', '#0d1b6e', '#616161', '#ffffff', '#80deea', '#fff59d', '#f8bbd0'];
const fieldFor = (d: number) => (d <= 9 ? 'KUNDALINI LIFE FORCE (D1–9)' : d <= 11 ? 'MAHARATA LIFE FORCE (D10–11)' : 'RA-RE-RA-SHA LIFE FORCE (D12–15)');

export const DIMENSIONS: Dimension[] = MINDS.map((mind, i) => {
  const d = i + 1;
  const du = Math.ceil(d / 3);
  return { d, mind: `${mind} MIND`, color: COLORS[i], hz: 174 + i * 111, du, field: fieldFor(d), beings: DU[du - 1].beings };
});

export const PRIMAL_FIELDS = [
  { level: 'ECKATIC LEVEL-1', name: 'ECKAH', kind: 'PRIMAL SOUND FIELD' },
  { level: 'POLARIC LEVEL-2', name: 'POLAH', kind: 'PRIMAL SOUND FIELD' },
  { level: 'TRIADIC LEVEL-3', name: 'GEOMATIC', kind: 'PRIMAL LIGHT FIELD' },
];

/** Concentric 15-D time-matrix canvas. window.updateMatrix({active, lit:number}) */
export const MATRIX_HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;}
html,body{background:#000;width:100%;height:100%;}canvas{display:block;}</style>
</head><body><canvas id="c"></canvas>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d');
var __arc=CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc=function(x,y,r,a0,a1,ccw){return __arc.call(this,x,y,(isFinite(r)&&r>0)?r:0,a0,a1,ccw);};
var W=0,H=0,DPR=Math.min(2,window.devicePixelRatio||1);
function resize(){W=window.innerWidth;H=window.innerHeight;c.width=W*DPR;c.height=H*DPR;c.style.width=W+'px';c.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
window.addEventListener('resize',resize);resize();
var DIM=${JSON.stringify(DIMENSIONS.map(d => ({ d: d.d, color: d.color, mind: d.mind, du: d.du })))};
var PF=['ECKATIC L-1','POLARIC L-2','TRIADIC L-3'];
var S={active:0,lit:0};var LIVE={peak:0,ts:0};var env=0,t=0;
window.updateMatrix=function(m){try{if(typeof m==='string')m=JSON.parse(m);for(var k in m)S[k]=m[k];}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);LIVE.peak=w.peak||0;LIVE.ts=performance.now();}catch(e){}};
function onMsg(e){var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}window.updateMatrix(p);}catch(_){}}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
function send(o){o.__matrix=true;var s=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else if(window.parent&&window.parent!==window)window.parent.postMessage(s,'*');}
function rgba(h,a){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+g+','+b+','+a+')';}
function geo(){var R=Math.min(W,H)*0.47;return {cx:W*0.5,cy:H*0.5,R:R,r0:R*0.10,step:(R*0.78)/15};}
function ringR(i,g){return g.r0+(i+1)*g.step;}
var DUCOL=['rgba(255,240,200,0.10)','rgba(200,235,200,0.10)','rgba(200,215,245,0.10)','rgba(225,205,245,0.10)','rgba(245,215,235,0.10)'];
function draw(){t+=0.016;var stale=performance.now()-LIVE.ts>400;var tgt=stale?0:Math.min(1,LIVE.peak/55);env+=(tgt-env)*0.2;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);var g=geo();var fs=Math.max(7,W*0.022);
  // density universe bands
  for(var du=4;du>=0;du--){ctx.fillStyle=DUCOL[du];ctx.beginPath();ctx.arc(g.cx,g.cy,ringR(du*3+2,g),0,Math.PI*2);ctx.fill();}
  // primal fields (outer 3)
  for(var p=0;p<3;p++){var rr=ringR(14,g)+(p+1)*g.step*0.9;ctx.strokeStyle='rgba(255,255,255,'+(0.18-p*0.04)+')';ctx.lineWidth=0.8;ctx.setLineDash([2,5]);ctx.beginPath();ctx.arc(g.cx,g.cy,rr,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.font=fs*0.85+'px "Courier New",monospace';ctx.fillStyle='rgba(255,255,255,0.45)';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(PF[p],g.cx,g.cy-rr);}
  // dimension rings
  for(var i=14;i>=0;i--){var d=DIM[i];var r=ringR(i,g);var on=S.active===d.d;var lit=S.lit>=d.d;var a=on?0.95:lit?0.6:0.28;
    ctx.strokeStyle=rgba(d.color==='#ffffff'?'#e0e0e0':d.color,a);ctx.lineWidth=on?2.4+2*env:lit?1.4:0.9;
    if(on){ctx.shadowColor=d.color;ctx.shadowBlur=16+10*env;}else ctx.shadowBlur=0;
    ctx.beginPath();ctx.arc(g.cx,g.cy,r,0,Math.PI*2);ctx.stroke();ctx.shadowBlur=0;
    if(on){ctx.fillStyle=rgba(d.color,0.10+0.1*env);ctx.beginPath();ctx.arc(g.cx,g.cy,r,0,Math.PI*2);ctx.arc(g.cx,g.cy,i>0?ringR(i-1,g):g.r0,0,Math.PI*2,true);ctx.fill();}
    // label + colour dot on the vertical axis
    var ly=g.cy-r+g.step*0.5;ctx.font=(on?'bold ':'')+fs+'px "Courier New",monospace';ctx.textAlign='right';ctx.textBaseline='middle';ctx.fillStyle=on?'#fff':'rgba(255,255,255,'+(lit?0.85:0.55)+')';ctx.fillText('D'+d.d,g.cx-6,ly);
    ctx.fillStyle=rgba(d.color,on||lit?1:0.7);ctx.beginPath();ctx.arc(g.cx+4,ly,fs*0.38+(on?1.5*Math.sin(t*5)+1.5:0),0,Math.PI*2);ctx.fill();if(d.color==='#ffffff'||d.color==='#0d1b6e'){ctx.strokeStyle='rgba(255,255,255,0.6)';ctx.lineWidth=0.6;ctx.stroke();}
    ctx.textAlign='left';ctx.fillStyle=on?'#fff':'rgba(255,255,255,'+(lit?0.7:0.4)+')';ctx.font=fs*0.8+'px "Courier New",monospace';ctx.fillText(d.mind,g.cx+4+fs*0.9,ly);
    // orbiting spark for lit rings
    if(lit||on){var ang=t*(0.25+i*0.03)+i;ctx.fillStyle=rgba(d.color,0.9);ctx.beginPath();ctx.arc(g.cx+Math.cos(ang)*r,g.cy+Math.sin(ang)*r,on?2.6:1.5,0,Math.PI*2);ctx.fill();}
  }
  // DU labels along the lower-left
  ctx.font='bold '+fs*0.85+'px "Courier New",monospace';ctx.textAlign='center';
  var names=['DU-1 EARTH','DU-2 TARA','DU-3 GAIA','DU-4 ARAMATENA','DU-5'];
  for(var k=0;k<5;k++){var rr2=ringR(k*3+1,g);var ang2=Math.PI*0.78;ctx.fillStyle='rgba(120,100,200,0.85)';ctx.fillText(names[k],g.cx+Math.cos(ang2)*rr2,g.cy+Math.sin(ang2)*rr2);}
  // core
  var core=ctx.createRadialGradient(g.cx,g.cy,0,g.cx,g.cy,g.r0);core.addColorStop(0,'rgba(255,255,255,'+(0.9)+')');core.addColorStop(0.4,'rgba(255,230,180,0.6)');core.addColorStop(1,'rgba(255,200,120,0)');ctx.fillStyle=core;ctx.beginPath();ctx.arc(g.cx,g.cy,g.r0,0,Math.PI*2);ctx.fill();
  ctx.font=fs*0.8+'px "Courier New",monospace';ctx.fillStyle='rgba(0,0,0,0.85)';ctx.textAlign='center';ctx.fillText('EARTH',g.cx,g.cy);
  requestAnimationFrame(draw);}
draw();
var sx=0,sy=0;
c.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;});
c.addEventListener('pointerup',function(e){if(Math.hypot(e.clientX-sx,e.clientY-sy)>12)return;var g=geo();var dist=Math.hypot(e.clientX-g.cx,e.clientY-g.cy);if(dist<g.r0){send({type:'dim',d:0});return;}
  var idx=Math.floor((dist-g.r0)/g.step);if(idx>=0&&idx<15)send({type:'dim',d:idx+1});});
</script></body></html>`;
