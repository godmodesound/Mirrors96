import { STRUCTURES } from './atlasData';

/** Humanome-style layered front-view atlas: skeleton · cardiovascular · nervous · organs. window.updateAtlas({selected, layers:{SKELETON:bool,...}, mode}) */
export const ATLAS_HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;}
html,body{background:#0d1117;width:100%;height:100%;}canvas{display:block;}</style>
</head><body><canvas id="c"></canvas>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d');
var __arc=CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc=function(x,y,r,a0,a1,ccw){return __arc.call(this,x,y,(isFinite(r)&&r>0)?r:0,a0,a1,ccw);};
var __el=CanvasRenderingContext2D.prototype.ellipse;
CanvasRenderingContext2D.prototype.ellipse=function(x,y,rx,ry,rot,a0,a1,ccw){return __el.call(this,x,y,Math.max(0,rx||0),Math.max(0,ry||0),rot,a0,a1,ccw);};
var W=0,H=0,DPR=Math.min(2,window.devicePixelRatio||1);
function resize(){W=window.innerWidth;H=window.innerHeight;c.width=W*DPR;c.height=H*DPR;c.style.width=W+'px';c.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
window.addEventListener('resize',resize);resize();
var ST=${JSON.stringify(STRUCTURES.map(s => ({ id: s.id, color: s.color, system: s.system, group: s.group || '' })))};
var S={selected:'',layers:{SKELETON:true,CARDIOVASCULAR:true,NERVOUS:true,ORGANS:true},mode:'ALL'};var t=0,env=0;var LIVE={peak:0,ts:0};
window.updateAtlas=function(m){try{if(typeof m==='string')m=JSON.parse(m);for(var k in m)S[k]=m[k];}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);LIVE.peak=w.peak||0;LIVE.ts=performance.now();}catch(e){}};
function onMsg(e){var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}window.updateAtlas(p);}catch(_){}}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
function send(o){o.__atlas=true;var s=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else if(window.parent&&window.parent!==window)window.parent.postMessage(s,'*');}
function geo(){var u=Math.min(H*0.94,W*2.1);return {u:u,cx:W*0.5,top:(H-u)/2};}
function P(dx,y,g){return {x:g.cx+dx*g.u,y:g.top+y*g.u};}
function st(id){for(var i=0;i<ST.length;i++)if(ST[i].id===id)return ST[i];return ST[0];}
function rgba(h,a){var r=parseInt(h.slice(1,3),16),gg=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+gg+','+b+','+a+')';}
// per-structure style: returns false if layer hidden
function use(id,baseCol){var s=st(id);if(!S.layers[s.system])return false;var sel=S.selected===id;
  var grpDim=S.mode!=='ALL'&&s.system==='SKELETON'&&s.group!==S.mode;
  var a=sel?1:S.selected?0.22:grpDim?0.15:0.9;var col=sel?s.color:(S.mode!=='ALL'&&s.system==='SKELETON'&&!grpDim&&!S.selected)?s.color:baseCol;
  ctx.strokeStyle=rgba(col,a);ctx.fillStyle=rgba(col,a*(s.system==='SKELETON'?0.42:0.9));ctx.lineWidth=sel?1.6:0.9;ctx.shadowBlur=sel?14+6*env:0;ctx.shadowColor=col;ctx.globalAlpha=1;return true;}
function bone(a,b,w,we){var ang=Math.atan2(b.y-a.y,b.x-a.x),nx=Math.cos(ang+Math.PI/2),ny=Math.sin(ang+Math.PI/2);we=we||w*1.7;
  ctx.beginPath();ctx.moveTo(a.x+nx*we,a.y+ny*we);ctx.lineTo(a.x+nx*w,a.y+ny*w+(b.y-a.y)*0.12);ctx.lineTo(b.x+nx*w,b.y+ny*w-(b.y-a.y)*0.12);ctx.lineTo(b.x+nx*we,b.y+ny*we);ctx.lineTo(b.x-nx*we,b.y-ny*we);ctx.lineTo(b.x-nx*w,b.y-ny*w-(b.y-a.y)*0.12);ctx.lineTo(a.x-nx*w,a.y-ny*w+(b.y-a.y)*0.12);ctx.lineTo(a.x-nx*we,a.y-ny*we);ctx.closePath();ctx.fill();ctx.stroke();}
function el(x,y,rx,ry,rot){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot||0,0,Math.PI*2);ctx.fill();ctx.stroke();}
function path(pts,close){ctx.beginPath();for(var i=0;i<pts.length;i++){if(i===0)ctx.moveTo(pts[i].x,pts[i].y);else ctx.lineTo(pts[i].x,pts[i].y);}if(close)ctx.closePath();}
function curve(pts){ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);for(var i=1;i<pts.length-1;i++){var xc=(pts[i].x+pts[i+1].x)/2,yc=(pts[i].y+pts[i+1].y)/2;ctx.quadraticCurveTo(pts[i].x,pts[i].y,xc,yc);}var L=pts[pts.length-1];ctx.lineTo(L.x,L.y);ctx.stroke();}

// ═══ ORGANS (drawn first, sit inside the cage) ═══
function drawOrgans(g){var u=g.u;
  if(use('trachea','#d8d0e8')){var a=P(0,0.135,g),b=P(0,0.215,g);ctx.lineWidth=3.5;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.lineWidth=1.2;for(var r=0;r<7;r++){var y=a.y+(b.y-a.y)*r/7;ctx.beginPath();ctx.moveTo(a.x-0.008*u,y);ctx.lineTo(a.x+0.008*u,y);ctx.stroke();}
    ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(b.x,b.y);ctx.lineTo(b.x-0.035*u,b.y+0.035*u);ctx.moveTo(b.x,b.y);ctx.lineTo(b.x+0.035*u,b.y+0.035*u);ctx.stroke();}
  if(use('thyroid','#e08a9a')){var th=P(0,0.165,g);el(th.x-0.014*u,th.y,0.011*u,0.018*u,0.2);el(th.x+0.014*u,th.y,0.011*u,0.018*u,-0.2);}
  if(use('lungs','#f4a3b0')){[-1,1].forEach(function(s){var L=P(s*0.055,0.29,g);ctx.beginPath();ctx.moveTo(L.x-s*0.02*u,L.y-0.085*u);ctx.quadraticCurveTo(L.x+s*0.075*u,L.y-0.09*u,L.x+s*0.07*u,L.y+0.02*u);ctx.quadraticCurveTo(L.x+s*0.06*u,L.y+0.075*u,L.x+s*0.005*u,L.y+0.075*u);ctx.quadraticCurveTo(L.x-s*0.03*u,L.y+0.03*u,L.x-s*0.02*u,L.y-0.085*u);ctx.fill();ctx.stroke();});}
  if(use('diaphragm','#d88a6a')){var d=P(0,0.36,g);ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(d.x-0.105*u,d.y);ctx.quadraticCurveTo(d.x-0.05*u,d.y-0.045*u,d.x,d.y-0.02*u);ctx.quadraticCurveTo(d.x+0.05*u,d.y-0.045*u,d.x+0.105*u,d.y);ctx.stroke();}
  if(use('heart','#ff3b3b')){var h=P(-0.012,0.295,g);ctx.beginPath();ctx.moveTo(h.x,h.y-0.03*u);ctx.bezierCurveTo(h.x-0.05*u,h.y-0.06*u,h.x-0.055*u,h.y+0.01*u,h.x-0.005*u,h.y+0.05*u);ctx.bezierCurveTo(h.x+0.04*u,h.y+0.01*u,h.x+0.035*u,h.y-0.05*u,h.x,h.y-0.03*u);ctx.fill();ctx.stroke();}
  if(use('liver','#a5442f')){var lv=P(-0.045,0.385,g);ctx.beginPath();ctx.moveTo(lv.x-0.065*u,lv.y-0.03*u);ctx.quadraticCurveTo(lv.x-0.005*u,lv.y-0.055*u,lv.x+0.07*u,lv.y-0.02*u);ctx.quadraticCurveTo(lv.x+0.03*u,lv.y+0.015*u,lv.x-0.02*u,lv.y+0.035*u);ctx.quadraticCurveTo(lv.x-0.07*u,lv.y+0.03*u,lv.x-0.065*u,lv.y-0.03*u);ctx.fill();ctx.stroke();}
  if(use('stomach','#f0906a')){var sto=P(0.04,0.385,g);ctx.beginPath();ctx.moveTo(sto.x-0.01*u,sto.y-0.04*u);ctx.bezierCurveTo(sto.x+0.05*u,sto.y-0.05*u,sto.x+0.06*u,sto.y+0.03*u,sto.x+0.01*u,sto.y+0.045*u);ctx.bezierCurveTo(sto.x-0.02*u,sto.y+0.05*u,sto.x-0.03*u,sto.y+0.01*u,sto.x-0.01*u,sto.y-0.04*u);ctx.fill();ctx.stroke();}
  if(use('spleen','#8a3050')){var sp=P(0.085,0.375,g);el(sp.x,sp.y,0.014*u,0.028*u,0.4);}
  if(use('pancreas','#e8c08a')){var pa=P(0.0,0.42,g);ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(pa.x-0.045*u,pa.y);ctx.quadraticCurveTo(pa.x,pa.y-0.012*u,pa.x+0.06*u,pa.y-0.005*u);ctx.stroke();}
  if(use('kidneys','#8a2a2a')){[-1,1].forEach(function(s){var k=P(s*0.05,0.445,g);el(k.x,k.y,0.014*u,0.03*u,s*0.25);});}
  if(use('adrenals','#f0c040')){[-1,1].forEach(function(s){var k=P(s*0.05,0.41,g);ctx.beginPath();ctx.moveTo(k.x-0.012*u,k.y+0.005*u);ctx.lineTo(k.x,k.y-0.01*u);ctx.lineTo(k.x+0.012*u,k.y+0.005*u);ctx.closePath();ctx.fill();ctx.stroke();});}
  if(use('intestines','#f0a070')){var ic=P(0,0.475,g);ctx.lineWidth=6;ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(ic.x-0.075*u,ic.y-0.06*u);ctx.lineTo(ic.x-0.075*u,ic.y+0.02*u);ctx.quadraticCurveTo(ic.x-0.075*u,ic.y+0.05*u,ic.x-0.03*u,ic.y+0.05*u);ctx.lineTo(ic.x+0.045*u,ic.y+0.05*u);ctx.quadraticCurveTo(ic.x+0.08*u,ic.y+0.05*u,ic.x+0.08*u,ic.y+0.02*u);ctx.lineTo(ic.x+0.08*u,ic.y-0.04*u);ctx.lineTo(ic.x-0.06*u,ic.y-0.06*u);ctx.stroke();
    ctx.lineWidth=4.5;ctx.beginPath();for(var i=0;i<=40;i++){var f=i/40;var x=ic.x-0.05*u+Math.sin(f*Math.PI*7)*0.045*u;var y=ic.y-0.04*u+f*0.07*u;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.lineCap='butt';}
  if(use('bladder','#e8d8a0')){var bl=P(0,0.535,g);el(bl.x,bl.y,0.022*u,0.016*u);}
}
// ═══ SKELETON ═══
function drawSkeleton(g){var u=g.u;var B='#e9dcc0';
  if(use('spine',B)){for(var v=0;v<24;v++){var yn=0.135+v*0.0158;var p=P(0,yn,g);var w=(v<7?0.017:v<19?0.022:0.03)*u;ctx.fillRect(p.x-w/2,p.y-0.0055*u,w,0.011*u);ctx.strokeRect(p.x-w/2,p.y-0.0055*u,w,0.011*u);}
    var sc=P(0,0.515,g);ctx.beginPath();ctx.moveTo(sc.x-0.035*u,sc.y);ctx.lineTo(sc.x+0.035*u,sc.y);ctx.lineTo(sc.x+0.006*u,sc.y+0.065*u);ctx.lineTo(sc.x-0.006*u,sc.y+0.065*u);ctx.closePath();ctx.fill();ctx.stroke();}
  if(use('skull',B)){var h=P(0,0.06,g);el(h.x,h.y,0.046*u,0.055*u);
    ctx.beginPath();ctx.moveTo(h.x-0.04*u,h.y+0.03*u);ctx.quadraticCurveTo(h.x-0.035*u,h.y+0.075*u,h.x,h.y+0.078*u);ctx.quadraticCurveTo(h.x+0.035*u,h.y+0.075*u,h.x+0.04*u,h.y+0.03*u);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(13,17,23,0.6)';el(h.x-0.019*u,h.y+0.005*u,0.013*u,0.011*u);el(h.x+0.019*u,h.y+0.005*u,0.013*u,0.011*u);
    ctx.beginPath();ctx.moveTo(h.x,h.y+0.02*u);ctx.lineTo(h.x-0.008*u,h.y+0.04*u);ctx.lineTo(h.x+0.008*u,h.y+0.04*u);ctx.closePath();ctx.fill();
    ctx.lineWidth=0.6;for(var tt=-4;tt<=4;tt++){ctx.beginPath();ctx.moveTo(h.x+tt*0.0055*u,h.y+0.052*u);ctx.lineTo(h.x+tt*0.0055*u,h.y+0.066*u);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(h.x-0.03*u,h.y+0.059*u);ctx.lineTo(h.x+0.03*u,h.y+0.059*u);ctx.stroke();}
  if(use('ossicles','#ffb0d0')){[-1,1].forEach(function(s){var e=P(s*0.047,0.068,g);el(e.x,e.y,0.005*u,0.005*u);});}
  if(use('hyoid','#c8ff9a')){var hy=P(0,0.15,g);ctx.beginPath();ctx.arc(hy.x,hy.y-0.006*u,0.014*u,Math.PI*0.2,Math.PI*0.8);ctx.stroke();}
  if(use('sternum',B)){var s0=P(0,0.205,g);ctx.beginPath();ctx.moveTo(s0.x-0.018*u,s0.y);ctx.lineTo(s0.x+0.018*u,s0.y);ctx.lineTo(s0.x+0.011*u,s0.y+0.11*u);ctx.lineTo(s0.x,s0.y+0.135*u);ctx.lineTo(s0.x-0.011*u,s0.y+0.11*u);ctx.closePath();ctx.fill();ctx.stroke();}
  if(use('ribs',B)){for(var r=0;r<12;r++){var y=0.20+r*0.0158;var spread=(0.075+Math.sin((r+1)/13*Math.PI)*0.04)*u;var drop=(0.045+r*0.004)*u;
    [-1,1].forEach(function(s){var a=P(s*0.012,y,g);ctx.lineWidth=2.2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.bezierCurveTo(a.x+s*spread*1.15,a.y-0.005*u,a.x+s*spread*1.05,a.y+drop*0.8,g.cx+s*(r<7?0.014:r<10?0.03:0.06)*u,a.y+(r<10?drop:drop*0.7));ctx.stroke();});}}
  if(use('pectoral',B)){[-1,1].forEach(function(s){bone(P(s*0.02,0.185,g),P(s*0.125,0.178,g),1.4,2.2);var sp=P(s*0.1,0.225,g);ctx.beginPath();ctx.moveTo(sp.x-s*0.02*u,sp.y-0.03*u);ctx.lineTo(sp.x+s*0.03*u,sp.y-0.035*u);ctx.lineTo(sp.x+s*0.02*u,sp.y+0.05*u);ctx.lineTo(sp.x-s*0.005*u,sp.y+0.04*u);ctx.closePath();ctx.fill();ctx.stroke();});}
  if(use('upper',B)){[-1,1].forEach(function(s){bone(P(s*0.14,0.195,g),P(s*0.16,0.395,g),2.6,4.2);bone(P(s*0.158,0.40,g),P(s*0.18,0.555,g),1.8,2.8);bone(P(s*0.168,0.405,g),P(s*0.196,0.555,g),1.6,2.4);
    var hnd=P(s*0.188,0.568,g);for(var cI=0;cI<8;cI++){var cx2=hnd.x+s*((cI%4)-1.5)*0.007*u,cy2=hnd.y+Math.floor(cI/4)*0.009*u;el(cx2,cy2,0.0035*u,0.0035*u);}
    for(var f=0;f<5;f++){var bx=hnd.x+s*(f-2)*0.0085*u+s*0.003*u,by=hnd.y+0.016*u;var len=(0.03-Math.abs(f-2)*0.004)*u;var ex=bx+s*(f-2)*0.0035*u;bone({x:bx,y:by},{x:ex,y:by+len},0.9,1.4);var sg=(len*0.7)/3;for(var ph=0;ph<3;ph++){bone({x:ex+s*(f-2)*0.001*u,y:by+len+ph*sg},{x:ex+s*(f-2)*0.0015*u,y:by+len+(ph+1)*sg-1},0.7,1.0);}}});}
  if(use('pelvis',B)){[-1,1].forEach(function(s){var pv=P(s*0.055,0.50,g);ctx.beginPath();ctx.moveTo(pv.x-s*0.02*u,pv.y-0.04*u);ctx.quadraticCurveTo(pv.x+s*0.075*u,pv.y-0.055*u,pv.x+s*0.065*u,pv.y+0.01*u);ctx.quadraticCurveTo(pv.x+s*0.04*u,pv.y+0.045*u,pv.x+s*0.01*u,pv.y+0.06*u);ctx.quadraticCurveTo(pv.x-s*0.02*u,pv.y+0.065*u,pv.x-s*0.025*u,pv.y+0.045*u);ctx.quadraticCurveTo(pv.x-s*0.035*u,pv.y+0.0*u,pv.x-s*0.02*u,pv.y-0.04*u);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(13,17,23,0.5)';el(pv.x+s*0.022*u,pv.y+0.025*u,0.009*u,0.008*u);});}
  if(use('lower',B)){[-1,1].forEach(function(s){bone(P(s*0.07,0.545,g),P(s*0.058,0.735,g),3,4.8);var kn=P(s*0.058,0.742,g);el(kn.x,kn.y,0.011*u,0.011*u);
    bone(P(s*0.055,0.758,g),P(s*0.05,0.945,g),2.4,3.6);bone(P(s*0.072,0.762,g),P(s*0.068,0.94,g),1.2,1.8);
    var ft=P(s*0.055,0.958,g);for(var tI=0;tI<7;tI++){el(ft.x+s*((tI%4)-1.5)*0.007*u,ft.y+Math.floor(tI/4)*0.008*u,0.0035*u,0.0035*u);}
    for(var f2=0;f2<5;f2++){var bx2=ft.x+s*(f2-1.2)*0.008*u,by2=ft.y+0.015*u;bone({x:bx2,y:by2},{x:bx2+s*0.005*u,y:by2+0.022*u},0.9,1.3);bone({x:bx2+s*0.005*u,y:by2+0.023*u},{x:bx2+s*0.008*u,y:by2+0.034*u},0.7,1.0);}});}
}
// ═══ CARDIOVASCULAR ═══
function vesselTree(g,off,col,id){var u=g.u;if(!use(id,col))return;ctx.lineWidth=1.3;ctx.lineCap='round';
  // neck/carotid
  curve([P(off*0.5-0.01,0.29,g),P(off*0.6-0.012,0.18,g),P(off-0.02,0.10,g),P(off-0.03,0.055,g)]);
  curve([P(off*0.5+0.012,0.29,g),P(off*0.6+0.014,0.18,g),P(off+0.02,0.10,g),P(off+0.03,0.055,g)]);
  // arms
  [-1,1].forEach(function(s){curve([P(off+s*0.0,0.22,g),P(off+s*0.09,0.20,g),P(off+s*0.145,0.24,g),P(off+s*0.158,0.40,g),P(off+s*0.185,0.55,g),P(off+s*0.19,0.60,g)]);
    curve([P(off+s*0.158,0.40,g),P(off+s*0.17,0.48,g),P(off+s*0.196,0.555,g)]);
    // legs
    curve([P(off*0.5+s*0.0,0.47,g),P(off*0.5+s*0.04,0.50,g),P(off*0.5+s*0.06,0.58,g),P(off*0.5+s*0.058,0.74,g),P(off*0.5+s*0.052,0.95,g),P(off*0.5+s*0.06,0.99,g)]);
    curve([P(off*0.5+s*0.06,0.58,g),P(off*0.5+s*0.075,0.70,g),P(off*0.5+s*0.07,0.94,g)]);});
  ctx.lineCap='butt';}
function drawCardio(g){var u=g.u;
  vesselTree(g,0.006,'#4a6bff','veins');vesselTree(g,-0.006,'#ff2a2a','arteries');
  if(use('aorta','#ff5a3b')){ctx.lineWidth=3.2;ctx.lineCap='round';curve([P(-0.012,0.275,g),P(-0.005,0.245,g),P(0.012,0.235,g),P(0.006,0.27,g),P(-0.004,0.35,g),P(-0.002,0.46,g)]);ctx.lineCap='butt';}
  if(use('heart','#ff3b3b')&&!S.layers.ORGANS){var h=P(-0.012,0.295,g);el(h.x,h.y,0.028*u,0.03*u);}
}
// ═══ NERVOUS ═══
function drawNervous(g,part){var u=g.u;
  if(part==='brain'){if(use('brain','#f7b8c8')){var h=P(0,0.05,g);el(h.x,h.y,0.04*u,0.036*u);ctx.lineWidth=0.7;for(var i=0;i<6;i++){ctx.beginPath();ctx.arc(h.x+(-0.025+i*0.01)*u,h.y+(i%2?0.008:-0.008)*u,0.012*u,0,Math.PI*1.6);ctx.stroke();}
    ctx.beginPath();ctx.moveTo(h.x,h.y-0.035*u);ctx.lineTo(h.x,h.y+0.03*u);ctx.stroke();}return;}
  if(use('cord','#ffe066')){ctx.lineWidth=2.2;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(g.cx,g.top+0.09*u);ctx.lineTo(g.cx,g.top+0.50*u);ctx.stroke();ctx.lineCap='butt';}
  if(use('nerves','#ffd23b')){ctx.lineWidth=0.9;ctx.lineCap='round';
    [-1,1].forEach(function(s){for(var k=0;k<3;k++){curve([P(0,0.17+k*0.02,g),P(s*(0.08+k*0.02),0.20+k*0.01,g),P(s*0.15,0.27+k*0.03,g),P(s*(0.165+k*0.01),0.42+k*0.02,g),P(s*(0.185+k*0.005),0.6,g)]);}
      curve([P(0,0.49,g),P(s*0.045,0.54,g),P(s*0.06,0.62,g),P(s*0.055,0.76,g),P(s*0.05,0.98,g)]);
      curve([P(s*0.06,0.62,g),P(s*0.08,0.72,g),P(s*0.072,0.95,g)]);
      for(var r=0;r<8;r++){var y=0.21+r*0.03;curve([P(0,y,g),P(s*0.06,y+0.02,g),P(s*0.1,y+0.05,g)]);}});ctx.lineCap='butt';}
}
function draw(){t+=0.016;var stale=performance.now()-LIVE.ts>400;var tgt=stale?0:Math.min(1,LIVE.peak/55);env+=(tgt-env)*0.2;
  ctx.fillStyle='#0d1117';ctx.fillRect(0,0,W,H);var g=geo();
  var rg=ctx.createRadialGradient(g.cx,g.top+0.5*g.u,10,g.cx,g.top+0.5*g.u,g.u*0.6);rg.addColorStop(0,'rgba(40,52,70,0.55)');rg.addColorStop(1,'rgba(13,17,23,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
  drawOrgans(g);drawNervous(g,'brain');drawSkeleton(g);drawNervous(g,'rest');drawCardio(g);ctx.shadowBlur=0;
  requestAnimationFrame(draw);}
draw();
// hit anchors: [id, dx, y, r(u)]
var HIT=[['brain',0,0.05,0.04],['skull',0,0.075,0.05],['ossicles',-0.047,0.068,0.012],['ossicles',0.047,0.068,0.012],['thyroid',0,0.165,0.018],['hyoid',0,0.148,0.012],['trachea',0,0.195,0.014],
['pectoral',-0.09,0.18,0.03],['pectoral',0.09,0.18,0.03],['pectoral',-0.1,0.23,0.025],['pectoral',0.1,0.23,0.025],['sternum',0,0.24,0.016],['heart',-0.012,0.30,0.035],['aorta',0.005,0.245,0.012],
['lungs',-0.075,0.27,0.04],['lungs',0.075,0.27,0.04],['ribs',-0.1,0.31,0.03],['ribs',0.1,0.31,0.03],['ribs',-0.05,0.35,0.02],['ribs',0.05,0.35,0.02],['diaphragm',0,0.345,0.018],
['liver',-0.05,0.385,0.04],['stomach',0.045,0.385,0.035],['spleen',0.088,0.375,0.02],['pancreas',0.02,0.42,0.02],['adrenals',-0.05,0.41,0.014],['adrenals',0.05,0.41,0.014],['kidneys',-0.05,0.445,0.025],['kidneys',0.05,0.445,0.025],
['intestines',0,0.48,0.045],['bladder',0,0.535,0.02],['spine',0,0.15,0.014],['spine',0,0.55,0.03],['pelvis',-0.07,0.50,0.04],['pelvis',0.07,0.50,0.04],
['upper',-0.15,0.30,0.03],['upper',0.15,0.30,0.03],['upper',-0.175,0.48,0.03],['upper',0.175,0.48,0.03],['upper',-0.19,0.59,0.035],['upper',0.19,0.59,0.035],
['lower',-0.064,0.64,0.035],['lower',0.064,0.64,0.035],['lower',-0.058,0.85,0.03],['lower',0.058,0.85,0.03],['lower',-0.058,0.975,0.03],['lower',0.058,0.975,0.03],
['arteries',-0.11,0.22,0.012],['veins',0.11,0.22,0.012],['nerves',-0.1,0.25,0.012],['nerves',0.1,0.25,0.012],['cord',0,0.11,0.012]];
var sx=0,sy=0;
c.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;});
c.addEventListener('pointerup',function(e){if(Math.hypot(e.clientX-sx,e.clientY-sy)>12)return;var g=geo();var best='',bd=1e9;
  for(var i=0;i<HIT.length;i++){var h=HIT[i];if(!S.layers[st(h[0]).system])continue;var p=P(h[1],h[2],g);var d=Math.hypot(p.x-e.clientX,p.y-e.clientY)/(h[3]*g.u);if(d<1&&d<bd){bd=d;best=h[0];}}
  send({type:'structure',id:best});});
</script></body></html>`;
