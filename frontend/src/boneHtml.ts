export type BoneRegion = { id: string; name: string; count: number; group: 'AXIAL' | 'APPENDICULAR'; color: string; breakdown: string[]; codes: string[] };

export const BONE_REGIONS: BoneRegion[] = [
  { id: 'skull', name: 'SKULL', count: 22, group: 'AXIAL', color: '#ffe680', breakdown: ['CRANIAL 8 — Frontal 1 · Parietal 2 · Temporal 2 · Occipital 1 · Sphenoid 1 · Ethmoid 1', 'FACIAL 14 — Maxilla 2 · Mandible 1 · Zygomatic 2 · Nasal 2 · Lacrimal 2 · Palatine 2 · Vomer 1 · Inferior nasal concha 2'], codes: ['Fractures', 'Bone Regeneration', 'Osteomyelitis'] },
  { id: 'ossicles', name: 'AUDITORY OSSICLES', count: 6, group: 'AXIAL', color: '#ffb0d0', breakdown: ['Malleus 2 · Incus 2 · Stapes 2 — the smallest bones in the body, inside the middle ear'], codes: ['Bone Growth', 'Bone Regeneration'] },
  { id: 'hyoid', name: 'HYOID', count: 1, group: 'AXIAL', color: '#c8ff9a', breakdown: ['1 — U-shaped bone in the neck; the only bone not articulating with another bone'], codes: ['Bone Growth'] },
  { id: 'vertebral', name: 'VERTEBRAL COLUMN', count: 26, group: 'AXIAL', color: '#b8a0ff', breakdown: ['Cervical 7 (C1–C7) · Thoracic 12 (T1–T12) · Lumbar 5 (L1–L5)', 'Sacrum 1 (S1–S5 fused) · Coccyx 1 (3–5 fused)'], codes: ['Disc Slipped', 'Scoliosis', 'Spondylitis', 'Ankylosing Spondylitis'] },
  { id: 'ribs', name: 'RIBS', count: 24, group: 'AXIAL', color: '#9ad8ff', breakdown: ['12 pairs — 7 true · 3 false · 2 floating'], codes: ['Fractures', 'Bone Regeneration'] },
  { id: 'sternum', name: 'STERNUM', count: 1, group: 'AXIAL', color: '#ffd0a0', breakdown: ['1 — Manubrium · Body · Xiphoid process (fused)'], codes: ['Fractures', 'Bone Regeneration'] },
  { id: 'pectoral', name: 'PECTORAL GIRDLE', count: 4, group: 'APPENDICULAR', color: '#a0ffd8', breakdown: ['Clavicle 2 · Scapula 2'], codes: ['Fractures', 'Arthritis General'] },
  { id: 'upper', name: 'UPPER LIMBS', count: 60, group: 'APPENDICULAR', color: '#ffc0c0', breakdown: ['Per side 30 — Humerus 1 · Radius 1 · Ulna 1', 'Hand 27 — Carpals 8 · Metacarpals 5 · Phalanges 14'], codes: ['Arthritis General', 'Rheumatoid Arthritis', 'Ganglion', 'Fractures'] },
  { id: 'pelvic', name: 'PELVIC GIRDLE', count: 2, group: 'APPENDICULAR', color: '#d0c0ff', breakdown: ['Hip bone 2 — Ilium · Ischium · Pubis (fused)'], codes: ['Osteoporosis', 'Bone Regeneration'] },
  { id: 'lower', name: 'LOWER LIMBS', count: 60, group: 'APPENDICULAR', color: '#c0e8ff', breakdown: ['Per side 30 — Femur 1 · Patella 1 · Tibia 1 · Fibula 1', 'Foot 26 — Tarsals 7 · Metatarsals 5 · Phalanges 14'], codes: ['Gout', 'Arthritis General', 'Bone Spurs', 'Fractures'] },
];

export const BONE_TOTAL = BONE_REGIONS.reduce((a, r) => a + r.count, 0); // 206
export const AXIAL_TOTAL = BONE_REGIONS.filter(r => r.group === 'AXIAL').reduce((a, r) => a + r.count, 0); // 80
export const APPENDICULAR_TOTAL = BONE_TOTAL - AXIAL_TOTAL; // 126

/** Front-view skeleton canvas. window.updateBones({selected, mode}) */
export const BONE_HTML = `<!DOCTYPE html>
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
var REG=${JSON.stringify(BONE_REGIONS.map(r => ({ id: r.id, color: r.color, group: r.group })))};
var S={selected:'',mode:'ALL'};var t=0;
window.updateBones=function(m){try{if(typeof m==='string')m=JSON.parse(m);for(var k in m)S[k]=m[k];}catch(e){}};
function onMsg(e){var d=e.data;try{window.updateBones(typeof d==='string'?JSON.parse(d):d);}catch(_){}}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
function send(o){o.__bones=true;var s=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else if(window.parent&&window.parent!==window)window.parent.postMessage(s,'*');}
function geo(){var u=Math.min(H*0.92,W*1.9);return {u:u,cx:W*0.5,top:(H-u)/2};}
function P(dx,y,g){return {x:g.cx+dx*g.u,y:g.top+y*g.u};}
function reg(id){for(var i=0;i<REG.length;i++)if(REG[i].id===id)return REG[i];return REG[0];}
function hexa(h,a){var r=parseInt(h.slice(1,3),16),gg=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+gg+','+b+','+a+')';}
function styleFor(id){var r=reg(id);var sel=S.selected===id;var grp=S.mode==='ALL'||S.mode===r.group;var lit=sel||(S.mode!=='ALL'&&grp&&!S.selected);
  var col=lit?r.color:'#e9dcc0';var a=sel?1:(!grp&&S.mode!=='ALL')?0.18:(S.selected?0.35:0.85);
  ctx.strokeStyle=hexa(col,a);ctx.fillStyle=hexa(col,a*(lit?0.55:0.28));ctx.lineWidth=sel?1.8:1.1;ctx.shadowBlur=lit?10:0;ctx.shadowColor=col;}
function line(a,b){ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
function bone(a,b,w){var ang=Math.atan2(b.y-a.y,b.x-a.x),nx=Math.cos(ang+Math.PI/2)*w,ny=Math.sin(ang+Math.PI/2)*w;ctx.beginPath();ctx.moveTo(a.x+nx,a.y+ny);ctx.lineTo(b.x+nx,b.y+ny);ctx.lineTo(b.x-nx,b.y-ny);ctx.lineTo(a.x-nx,a.y-ny);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(a.x,a.y,w*1.6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(b.x,b.y,w*1.6,0,Math.PI*2);ctx.fill();ctx.stroke();}

function drawSkeleton(g){var u=g.u;
  // skull
  ctx.save();styleFor('skull');var h=P(0,0.062,g);ctx.beginPath();ctx.arc(h.x,h.y,0.052*u,0,Math.PI*2);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(h.x-0.032*u,h.y+0.03*u);ctx.lineTo(h.x-0.024*u,h.y+0.07*u);ctx.lineTo(h.x+0.024*u,h.y+0.07*u);ctx.lineTo(h.x+0.032*u,h.y+0.03*u);ctx.stroke();
  ctx.fillStyle='rgba(0,0,0,0.7)';ctx.beginPath();ctx.ellipse(h.x-0.018*u,h.y-0.005*u,0.011*u,0.009*u,0,0,Math.PI*2);ctx.ellipse(h.x+0.018*u,h.y-0.005*u,0.011*u,0.009*u,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.moveTo(h.x,h.y+0.01*u);ctx.lineTo(h.x-0.006*u,h.y+0.028*u);ctx.lineTo(h.x+0.006*u,h.y+0.028*u);ctx.closePath();ctx.fill();
  for(var tt=-3;tt<=3;tt++){ctx.beginPath();ctx.moveTo(h.x+tt*0.006*u,h.y+0.048*u);ctx.lineTo(h.x+tt*0.006*u,h.y+0.06*u);ctx.stroke();}
  ctx.restore();
  // ossicles (tiny marks by ears)
  ctx.save();styleFor('ossicles');[-1,1].forEach(function(s){var e=P(s*0.05,0.066,g);ctx.beginPath();ctx.arc(e.x,e.y,0.006*u,0,Math.PI*2);ctx.fill();ctx.stroke();});ctx.restore();
  // hyoid
  ctx.save();styleFor('hyoid');var hy=P(0,0.145,g);ctx.beginPath();ctx.arc(hy.x,hy.y,0.014*u,Math.PI*0.15,Math.PI*0.85,true);ctx.stroke();ctx.restore();
  // vertebral column
  ctx.save();styleFor('vertebral');for(var v=0;v<24;v++){var yn=0.135+v*0.0165;var p=P(0,yn,g);var w=(v<7?0.016:v<19?0.02:0.026)*u;ctx.fillRect(p.x-w/2,p.y-0.006*u,w,0.012*u);ctx.strokeRect(p.x-w/2,p.y-0.006*u,w,0.012*u);}
  var sc=P(0,0.535,g);ctx.beginPath();ctx.moveTo(sc.x-0.03*u,sc.y);ctx.lineTo(sc.x+0.03*u,sc.y);ctx.lineTo(sc.x,sc.y+0.07*u);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  // sternum
  ctx.save();styleFor('sternum');var s0=P(0,0.20,g);ctx.beginPath();ctx.moveTo(s0.x-0.016*u,s0.y);ctx.lineTo(s0.x+0.016*u,s0.y);ctx.lineTo(s0.x+0.01*u,s0.y+0.13*u);ctx.lineTo(s0.x,s0.y+0.15*u);ctx.lineTo(s0.x-0.01*u,s0.y+0.13*u);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  // ribs
  ctx.save();styleFor('ribs');ctx.fillStyle='transparent';for(var r=0;r<10;r++){var y=0.205+r*0.021;var spread=(0.08+Math.sin(r/9*Math.PI)*0.05)*u;[-1,1].forEach(function(s){var a=P(s*0.012,y,g);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+s*spread*1.1,a.y+0.01*u,a.x+s*spread,a.y+0.06*u,g.cx+s*(r<8?0.012:0.05)*u,a.y+(r<8?0.045:0.06)*u);ctx.stroke();});}
  ctx.restore();
  // pectoral girdle
  ctx.save();styleFor('pectoral');[-1,1].forEach(function(s){bone(P(s*0.02,0.185,g),P(s*0.125,0.175,g),1.6);var sp=P(s*0.105,0.215,g);ctx.beginPath();ctx.moveTo(sp.x-s*0.02*u,sp.y-0.02*u);ctx.lineTo(sp.x+s*0.025*u,sp.y-0.015*u);ctx.lineTo(sp.x,sp.y+0.05*u);ctx.closePath();ctx.fill();ctx.stroke();});ctx.restore();
  // upper limbs
  ctx.save();styleFor('upper');[-1,1].forEach(function(s){bone(P(s*0.14,0.19,g),P(s*0.165,0.36,g),3);bone(P(s*0.165,0.36,g),P(s*0.19,0.53,g),2);bone(P(s*0.175,0.365,g),P(s*0.205,0.53,g),2);
    var hnd=P(s*0.2,0.545,g);ctx.beginPath();ctx.ellipse(hnd.x,hnd.y,0.018*u,0.012*u,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(var f=0;f<5;f++){var fx=hnd.x+s*(f-2)*0.009*u+s*0.004*u;line({x:fx,y:hnd.y+0.008*u},{x:fx+s*(f-2)*0.003*u,y:hnd.y+0.055*u-Math.abs(f-2)*0.006*u});}});ctx.restore();
  // pelvic girdle
  ctx.save();styleFor('pelvic');[-1,1].forEach(function(s){var pv=P(s*0.06,0.50,g);ctx.beginPath();ctx.moveTo(pv.x-s*0.02*u,pv.y-0.03*u);ctx.quadraticCurveTo(pv.x+s*0.07*u,pv.y-0.04*u,pv.x+s*0.06*u,pv.y+0.02*u);ctx.quadraticCurveTo(pv.x+s*0.03*u,pv.y+0.07*u,pv.x-s*0.02*u,pv.y+0.06*u);ctx.quadraticCurveTo(pv.x-s*0.03*u,pv.y+0.02*u,pv.x-s*0.02*u,pv.y-0.03*u);ctx.fill();ctx.stroke();});ctx.restore();
  // lower limbs
  ctx.save();styleFor('lower');[-1,1].forEach(function(s){bone(P(s*0.075,0.565,g),P(s*0.065,0.76,g),3.2);var kn=P(s*0.065,0.765,g);ctx.beginPath();ctx.arc(kn.x,kn.y,0.012*u,0,Math.PI*2);ctx.fill();ctx.stroke();
    bone(P(s*0.06,0.78,g),P(s*0.055,0.955,g),2.4);bone(P(s*0.078,0.78,g),P(s*0.072,0.95,g),1.4);
    var ft=P(s*0.06,0.965,g);ctx.beginPath();ctx.ellipse(ft.x,ft.y,0.02*u,0.01*u,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    for(var f=0;f<5;f++){var fx=ft.x+s*(f-1)*0.009*u;line({x:fx,y:ft.y+0.008*u},{x:fx+s*0.006*u,y:ft.y+0.03*u});}});ctx.restore();
}
var LABELS=[['Frontal / Parietal',-1,0.05,0,0.04],['Mandible',1,0.11,0.02,0.11],['Clavicle',-1,0.17,-0.1,0.176],['Scapula',1,0.23,0.11,0.22],['Sternum',1,0.29,0.005,0.27],['Ribs',-1,0.27,-0.09,0.26],['Humerus',1,0.34,0.155,0.30],['Vertebral column',-1,0.40,-0.01,0.40],['Radius / Ulna',1,0.46,0.19,0.46],['Pelvic bone',-1,0.51,-0.1,0.50],['Carpals · Metacarpals · Phalanges',1,0.58,0.2,0.57],['Femur',-1,0.68,-0.07,0.67],['Tibia / Fibula',1,0.86,0.07,0.86],['Tarsals · Metatarsals · Phalanges',-1,0.97,-0.06,0.97]];
function drawLabels(g){var fs=Math.max(7,W*0.022);ctx.font=fs+'px "Courier New",monospace';ctx.textBaseline='middle';ctx.lineWidth=0.7;
  for(var i=0;i<LABELS.length;i++){var L=LABELS[i];var side=L[1];var ly=g.top+L[2]*g.u;var lx=side<0?6:W-6;var a=P(L[3],L[4],g);
    ctx.strokeStyle='rgba(200,190,160,0.35)';ctx.beginPath();ctx.moveTo(side<0?lx+ctx.measureText(L[0]).width+4:lx-ctx.measureText(L[0]).width-4,ly);ctx.lineTo(a.x,a.y);ctx.stroke();
    ctx.fillStyle='rgba(200,190,160,0.4)';ctx.beginPath();ctx.arc(a.x,a.y,1.5,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(233,220,192,0.75)';ctx.textAlign=side<0?'left':'right';ctx.fillText(L[0],lx,ly);}}
function draw(){t+=0.016;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);var g=geo();
  ctx.strokeStyle='rgba(255,255,255,0.04)';ctx.lineWidth=0.5;for(var gy=0;gy<H;gy+=24){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
  drawLabels(g);drawSkeleton(g);requestAnimationFrame(draw);}
draw();
var HIT=[['skull',0,0.062],['ossicles',-0.05,0.066],['ossicles',0.05,0.066],['hyoid',0,0.145],['vertebral',0,0.25],['vertebral',0,0.40],['vertebral',0,0.50],['vertebral',0,0.56],['ribs',-0.08,0.26],['ribs',0.08,0.26],['ribs',-0.06,0.33],['ribs',0.06,0.33],['sternum',0,0.27],['pectoral',-0.09,0.178],['pectoral',0.09,0.178],['pectoral',-0.105,0.22],['pectoral',0.105,0.22],['upper',-0.15,0.28],['upper',0.15,0.28],['upper',-0.18,0.45],['upper',0.18,0.45],['upper',-0.2,0.56],['upper',0.2,0.56],['pelvic',-0.07,0.50],['pelvic',0.07,0.50],['lower',-0.07,0.66],['lower',0.07,0.66],['lower',-0.06,0.86],['lower',0.06,0.86],['lower',-0.06,0.97],['lower',0.06,0.97]];
var sx=0,sy=0;
c.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;});
c.addEventListener('pointerup',function(e){if(Math.hypot(e.clientX-sx,e.clientY-sy)>12)return;var g=geo();var best='',bd=0.05*g.u;for(var i=0;i<HIT.length;i++){var p=P(HIT[i][1],HIT[i][2],g);var d=Math.hypot(p.x-e.clientX,p.y-e.clientY);if(d<bd){bd=d;best=HIT[i][0];}}send({type:'region',id:best});});
</script></body></html>`;
