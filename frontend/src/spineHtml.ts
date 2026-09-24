export const CHAKRA_7 = [
  { name: 'ROOT', sanskrit: 'MULADHARA', hz: 456, note: 'Bb', color: '#ff1a1a' },
  { name: 'SACRAL', sanskrit: 'SVADHISTHANA', hz: 606, note: 'Eb', color: '#ff8a00' },
  { name: 'SOLAR PLEXUS', sanskrit: 'MANIPURA', hz: 728, note: 'F#', color: '#ffee00' },
  { name: 'HEART', sanskrit: 'ANAHATA', hz: 512, note: 'C', color: '#22e044' },
  { name: 'THROAT', sanskrit: 'VISHUDDHA', hz: 768, note: 'G', color: '#1e90ff' },
  { name: '3RD EYE', sanskrit: 'AJNA', hz: 576, note: 'D', color: '#7b3fe4' },
  { name: 'CROWN', sanskrit: 'SAHASRARA', hz: 864, note: 'A', color: '#c97bff' },
];

/** Side-profile CSF flow + Kundalini spine canvas. window.updateSpine(json) / window.pushWave(json). */
export const SPINE_HTML = `<!DOCTYPE html>
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
var CH=${JSON.stringify(CHAKRA_7)};
var S={flow:true,cpm:8,active:-1,rise:0,seq:false};
var LIVE={peak:0,ts:0};var env=0,t=0,flowPhase=0,riseAnim=0;
window.updateSpine=function(m){try{if(typeof m==='string')m=JSON.parse(m);for(var k in m)S[k]=m[k];}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);LIVE.peak=w.peak||0;LIVE.ts=performance.now();}catch(e){}};
function onMsg(e){var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}window.updateSpine(p);}catch(_){}}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
function send(o){o.__spine=true;var s=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else if(window.parent&&window.parent!==window)window.parent.postMessage(s,'*');}

function geo(){var u=H*0.9;return {u:u,top:H*0.05,cx:W*0.52};}
// spine centre-line: yn 0.17 (skull base) → 0.95 (coccyx); gentle S (facing right)
function spineX(yn,g){var k=(yn-0.17)/0.78;return g.cx+g.u*(0.035*Math.sin(k*Math.PI*1.9+0.4)-0.01);}
function chakraPos(i,g){var yn=[0.93,0.82,0.68,0.54,0.36][i];
  if(i<=4)return {x:spineX(yn,g),y:g.top+yn*g.u};
  if(i===5)return {x:g.cx+g.u*0.085,y:g.top+g.u*0.085};
  return {x:g.cx+g.u*0.02,y:g.top-g.u*0.005};}
function hex(h,a){var r=parseInt(h.slice(1,3),16),gg=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+gg+','+b+','+a+')';}

function drawBody(g){var u=g.u,cx=g.cx,top=g.top;
  ctx.save();ctx.strokeStyle='rgba(255,255,255,0.28)';ctx.lineWidth=1;
  // head (side profile facing right)
  ctx.beginPath();ctx.arc(cx+0.02*u,top+0.085*u,0.085*u,Math.PI*0.55,Math.PI*2.35);ctx.stroke();
  ctx.beginPath();ctx.moveTo(cx+0.10*u,top+0.10*u);ctx.quadraticCurveTo(cx+0.13*u,top+0.13*u,cx+0.09*u,top+0.16*u);ctx.lineTo(cx+0.06*u,top+0.175*u);ctx.stroke();
  // torso silhouette
  ctx.beginPath();ctx.moveTo(cx-0.045*u,top+0.16*u);ctx.quadraticCurveTo(cx-0.12*u,top+0.30*u,cx-0.09*u,top+0.55*u);ctx.quadraticCurveTo(cx-0.07*u,top+0.80*u,cx-0.10*u,top+0.98*u);
  ctx.moveTo(cx+0.05*u,top+0.18*u);ctx.quadraticCurveTo(cx+0.14*u,top+0.30*u,cx+0.09*u,top+0.50*u);ctx.quadraticCurveTo(cx+0.06*u,top+0.75*u,cx+0.12*u,top+0.98*u);ctx.stroke();
  // brain
  ctx.strokeStyle='rgba(255,180,160,0.45)';ctx.beginPath();ctx.ellipse(cx+0.015*u,top+0.075*u,0.065*u,0.052*u,-0.2,0,Math.PI*2);ctx.stroke();
  for(var i=0;i<5;i++){ctx.beginPath();ctx.arc(cx+(-0.03+i*0.015)*u,top+(0.05+(i%2)*0.02)*u,0.014*u,0,Math.PI*1.4);ctx.stroke();}
  ctx.restore();
  // vertebrae
  for(var v=0;v<24;v++){var yn=0.18+v*0.0315;var x=spineX(yn,g),y=top+yn*u;var w=(v<7?0.022:v<19?0.03:0.036)*u;ctx.fillStyle=v<7?'rgba(255,214,120,0.55)':v<19?'rgba(160,220,255,0.5)':'rgba(180,255,180,0.5)';ctx.fillRect(x-w/2,y-0.011*u,w,0.022*u);}
  // sacrum + coccyx
  var sx=spineX(0.94,g);ctx.fillStyle='rgba(255,150,200,0.5)';ctx.beginPath();ctx.moveTo(sx-0.03*u,top+0.935*u);ctx.lineTo(sx+0.03*u,top+0.935*u);ctx.lineTo(sx+0.005*u,top+0.99*u);ctx.closePath();ctx.fill();
}

function csfPath(s,g){ // 0..1 loop: up spinal canal → around brain → wide loop back down
  var u=g.u,top=g.top,cx=g.cx;
  if(s<0.5){var yn=0.95-(s/0.5)*0.78;return {x:spineX(yn,g)-0.012*u,y:top+yn*u};}
  if(s<0.66){var a=(s-0.5)/0.16;var ang=Math.PI*0.5-a*Math.PI*1.35;return {x:cx+0.015*u+Math.cos(ang)*0.075*u*(1-a*0.1),y:top+0.075*u-Math.sin(ang)*0.062*u};}
  var b=(s-0.66)/0.34;var yy=top+0.10*u+b*0.85*u;var xx=cx-0.09*u-Math.sin(b*Math.PI)*0.16*u;return {x:xx,y:yy};
}
function drawCSF(g){var u=g.u;
  ctx.save();ctx.strokeStyle='rgba(90,170,255,0.35)';ctx.lineWidth=1.2;ctx.setLineDash([3,4]);ctx.beginPath();
  for(var i=0;i<=120;i++){var p=csfPath(i/120,g);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.stroke();ctx.setLineDash([]);
  // arrow head on ascending limb
  var a1=csfPath(0.30,g),a0=csfPath(0.28,g);var ang=Math.atan2(a1.y-a0.y,a1.x-a0.x);ctx.fillStyle='rgba(120,190,255,0.7)';ctx.beginPath();ctx.moveTo(a1.x+Math.cos(ang)*8,a1.y+Math.sin(ang)*8);ctx.lineTo(a1.x+Math.cos(ang+2.5)*7,a1.y+Math.sin(ang+2.5)*7);ctx.lineTo(a1.x+Math.cos(ang-2.5)*7,a1.y+Math.sin(ang-2.5)*7);ctx.closePath();ctx.fill();
  // spinal canal glow
  ctx.strokeStyle='rgba(120,200,255,'+(0.25+0.5*env).toFixed(2)+')';ctx.lineWidth=3;ctx.shadowColor='#5ac8ff';ctx.shadowBlur=8+12*env;ctx.beginPath();
  for(var j=0;j<=40;j++){var yn=0.17+j/40*0.78;var x=spineX(yn,g)-0.012*u,y=g.top+yn*u;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();
  // particles
  if(S.flow){var N=26;for(var k=0;k<N;k++){var s=(k/N+flowPhase)%1;var p=csfPath(s,g);var pulse=0.5+0.5*Math.sin(flowPhase*Math.PI*2*3+k);ctx.fillStyle='rgba(170,225,255,'+(0.35+0.55*pulse).toFixed(2)+')';ctx.beginPath();ctx.arc(p.x,p.y,1.6+1.8*pulse+2*env,0,Math.PI*2);ctx.fill();}}
  ctx.restore();
}
function drawSerpents(g){var u=g.u;var rise=riseAnim;if(rise<=0.001)return;
  var y0=g.top+0.93*u,y1=g.top+0.085*u;var L=y0-y1;
  var cols=['#ff2a2a','#ffd24a'];
  for(var sIdx=0;sIdx<2;sIdx++){ctx.save();ctx.strokeStyle=cols[sIdx];ctx.lineWidth=2.2;ctx.shadowColor=cols[sIdx];ctx.shadowBlur=8;ctx.globalAlpha=0.85;ctx.beginPath();
    var n=Math.floor(160*rise);for(var i=0;i<=n;i++){var f=i/160;var y=y0-f*L;var yn=(y-g.top)/u;var base=yn>0.17?spineX(yn,g):g.cx+0.02*u;var wob=Math.sin(f*Math.PI*7+t*1.2)*0.048*u*(sIdx?1:-1);var x=base+wob;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
    ctx.stroke();
    if(rise<1){var f2=rise;var yh=y0-f2*L,ynh=(yh-g.top)/u;var bx=(ynh>0.17?spineX(ynh,g):g.cx+0.02*u)+Math.sin(f2*Math.PI*7+t*1.2)*0.048*u*(sIdx?1:-1);ctx.fillStyle=cols[sIdx];ctx.beginPath();ctx.arc(bx,yh,3.5,0,Math.PI*2);ctx.fill();}
    ctx.restore();}
  if(rise>=0.999){ // crown lotus / wings
    var cp=chakraPos(6,g);ctx.save();ctx.strokeStyle='rgba(230,190,255,0.8)';ctx.lineWidth=1;ctx.shadowColor='#c97bff';ctx.shadowBlur=10;
    for(var p=0;p<12;p++){var a=p/12*Math.PI*2+t*0.3;ctx.beginPath();ctx.ellipse(cp.x+Math.cos(a)*0.03*u,cp.y+Math.sin(a)*0.03*u,0.022*u,0.009*u,a,0,Math.PI*2);ctx.stroke();}
    ctx.restore();}
}
function drawChakras(g){var u=g.u;
  for(var i=0;i<7;i++){var p=chakraPos(i,g);var on=S.active===i;var lit=on||(riseAnim*7>=i+0.9);var col=CH[i].color;
    var r=(0.018+(on?0.008:0))*u+(on?3*env+Math.sin(t*6)*1.5:0);
    var grd=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2.6);grd.addColorStop(0,hex(col,lit?0.55:0.18));grd.addColorStop(1,hex(col,0));ctx.fillStyle=grd;ctx.beginPath();ctx.arc(p.x,p.y,r*2.6,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.shadowColor=col;ctx.shadowBlur=lit?14:4;ctx.fillStyle=hex(col,lit?0.95:0.45);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.restore();
    // petals
    ctx.strokeStyle=hex(col,lit?0.9:0.35);ctx.lineWidth=1;var petals=[4,6,10,12,16,2,12][i];for(var k=0;k<petals;k++){var a=k/petals*Math.PI*2+t*(on?0.8:0.15);ctx.beginPath();ctx.moveTo(p.x+Math.cos(a)*r,p.y+Math.sin(a)*r);ctx.lineTo(p.x+Math.cos(a)*r*1.55,p.y+Math.sin(a)*r*1.55);ctx.stroke();}
    if(on){ctx.font='bold '+Math.max(8,W*0.024)+'px "Courier New",monospace';ctx.fillStyle='#fff';ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(CH[i].name+' · '+CH[i].hz+' Hz',p.x+r*2.2+4,p.y);}
  }
}
function drawLabels(g){var fs=Math.max(8,W*0.024);ctx.font=fs+'px "Courier New",monospace';ctx.textBaseline='top';
  ctx.fillStyle='rgba(120,190,255,0.85)';ctx.textAlign='left';ctx.fillText('CSF FLOW · '+(S.flow?S.cpm+' CPM':'PAUSED'),6,6);
  ctx.fillStyle='rgba(255,255,255,0.45)';ctx.fillText('CNS · CENTRAL NERVOUS SYSTEM',6,6+fs*1.5);
  ctx.textAlign='right';ctx.fillStyle='rgba(255,210,74,0.85)';ctx.fillText('KUNDALINI '+Math.round(riseAnim*100)+'%',W-6,6);
  ctx.fillStyle='rgba(255,255,255,0.35)';ctx.fillText('C7 · T12 · L5 · S1 · CO',W-6,6+fs*1.5);
}
function draw(){t+=0.016;
  var stale=performance.now()-LIVE.ts>400;var tgt=stale?0:Math.min(1,LIVE.peak/55);env+=(tgt-env)*(tgt>env?0.3:0.1);
  if(S.flow)flowPhase=(flowPhase+(S.cpm/60)*0.016*0.45*(1+env*1.5))%1;
  riseAnim+=(S.rise-riseAnim)*0.04;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  var g=geo();
  var rg=ctx.createRadialGradient(g.cx,g.top+0.5*g.u,10,g.cx,g.top+0.5*g.u,g.u*0.7);rg.addColorStop(0,'rgba(60,40,120,'+(0.16+0.2*env).toFixed(2)+')');rg.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H);
  if(riseAnim>0.05){ctx.save();ctx.globalAlpha=0.12*riseAnim;ctx.strokeStyle='#ffd24a';for(var r=0;r<36;r++){var a=r/36*Math.PI*2;ctx.beginPath();ctx.moveTo(g.cx,g.top+0.5*g.u);ctx.lineTo(g.cx+Math.cos(a)*W,g.top+0.5*g.u+Math.sin(a)*W);ctx.stroke();}ctx.restore();}
  drawBody(g);drawCSF(g);drawSerpents(g);drawChakras(g);drawLabels(g);
  requestAnimationFrame(draw);}
draw();
var sx=0,sy=0;
c.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;});
c.addEventListener('pointerup',function(e){if(Math.hypot(e.clientX-sx,e.clientY-sy)>12)return;var g=geo();var best=-1,bd=22;for(var i=0;i<7;i++){var p=chakraPos(i,g);var d=Math.hypot(p.x-e.clientX,p.y-e.clientY);if(d<bd){bd=d;best=i;}}if(best>=0)send({type:'chakra',idx:best});});
</script></body></html>`;
