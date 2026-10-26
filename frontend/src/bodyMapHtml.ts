import { BODY_POINTS } from './bodyMapData';
import { LIGHT_BODIES } from './biofield';

/**
 * Phosphor-CRT diagnostic body map canvas. Controlled from RN through
 * window.updateMap(json) + window.pushWave(json); reports taps back as
 * {__bodymap:true,type:'pt',id}.
 */
export const BODY_MAP_HTML = `<!DOCTYPE html>
<html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;}
html,body{background:#03140a;width:100%;height:100%;}
canvas{display:block;}</style>
</head><body>
<canvas id="c"></canvas>
<script>
var c=document.getElementById('c'),ctx=c.getContext('2d');
var __arc=CanvasRenderingContext2D.prototype.arc;
CanvasRenderingContext2D.prototype.arc=function(x,y,r,a0,a1,ccw){return __arc.call(this,x,y,(isFinite(r)&&r>0)?r:0,a0,a1,ccw);};
var W=0,H=0,DPR=Math.min(2,window.devicePixelRatio||1),scan=null;
function resize(){W=window.innerWidth;H=window.innerHeight;c.width=W*DPR;c.height=H*DPR;c.style.width=W+'px';c.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);scan=null;}
window.addEventListener('resize',resize);resize();

var PTS=${JSON.stringify(BODY_POINTS)};
var LB=${JSON.stringify(LIGHT_BODIES.map(b => ({ id: b.id, num: b.num, name: b.name, y: b.y })))};
var C={bg:'#03140a',dim:'#1f5a30',mid:'#4fa85c',hi:'#a9ff8a',glow:'#66ff66',gold:'#f3ffc4',goldGlow:'#ffe680',grid:'rgba(120,255,140,0.10)'};
var MAP={name:'STANDBY',code:'',freqs:[],points:[],playing:false,selected:0,setAt:0,hex:[],sig:[],bodies:[],mood:'RESTING STATE'};
var LIVE={wave:null,peak:0,rms:0,measuredHz:0,peaks:[],ts:0};
var env=0,envSlow=0,t=0,frame=0;

window.updateMap=function(m){try{if(typeof m==='string')m=JSON.parse(m);if(m.points!==undefined){MAP.points=m.points||[];}if(m.code!==undefined&&m.code!==MAP.code){MAP.setAt=performance.now();}for(var k in m){if(k!=='points')MAP[k]=m[k];}}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);if(w&&w.wave){LIVE.wave=w.wave;LIVE.peak=w.peak||0;LIVE.rms=typeof w.rms==='number'?w.rms:0;LIVE.measuredHz=w.measuredHz||0;LIVE.peaks=Array.isArray(w.peaks)?w.peaks:LIVE.peaks;LIVE.ts=performance.now();}}catch(e){}};
function onMsg(e){var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}window.updateMap(p);}catch(_){}}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
function send(o){o.__bodymap=true;var s=JSON.stringify(o);if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(s);else if(window.parent&&window.parent!==window)window.parent.postMessage(s,'*');}

// ─── geometry ───
function geo(){var u=Math.min(0.86*H,0.44*W/0.47);return {u:u,cx:W*0.5,top:H*0.045,lx:W*0.02,lw:W*0.245,rx:W*0.74,rw:W*0.245};}
var RS=[[0.025,0.115],[0.03,0.15],[0.11,0.17],[0.15,0.19],[0.18,0.30],[0.20,0.42],[0.215,0.50],[0.235,0.56],[0.225,0.585],[0.195,0.575],[0.185,0.52],[0.165,0.42],[0.145,0.32],[0.125,0.28],[0.12,0.36],[0.105,0.44],[0.115,0.50],[0.13,0.55],[0.125,0.62],[0.115,0.72],[0.10,0.82],[0.09,0.92],[0.11,0.965],[0.10,0.985],[0.04,0.98],[0.035,0.92],[0.03,0.80],[0.02,0.70],[0.0,0.62]];
function ptXY(p,g){return {x:g.cx+p.dx*g.u,y:g.top+p.y*g.u};}
function ptOf(id){for(var i=0;i<MAP.points.length;i++)if(MAP.points[i].id===id)return MAP.points[i];return null;}
function weightOf(id){var p=ptOf(id);return p?p.w:0;}
function bodyOf(id){for(var i=0;i<MAP.bodies.length;i++)if(MAP.bodies[i].id===id)return MAP.bodies[i];return null;}

function txt(s,x,y,fs,col,align,bold){ctx.font=(bold?'bold ':'')+fs+'px "Courier New",Menlo,monospace';ctx.fillStyle=col;ctx.textAlign=align||'left';ctx.textBaseline='top';ctx.fillText(s,x,y);}
function box(x,y,w,h,col){ctx.strokeStyle=col;ctx.lineWidth=1;ctx.strokeRect(Math.round(x)+0.5,Math.round(y)+0.5,Math.round(w),Math.round(h));}

function drawBody(g){
  var u=g.u,cx=g.cx,top=g.top;
  // field rings
  var bcx=cx,bcy=top+u*0.5;
  for(var i=0;i<9;i++){var k=i/8;var a=0.05+0.10*env*(1-k)+0.02*Math.sin(t*1.3-i*0.6);ctx.beginPath();ctx.ellipse(bcx,bcy,u*(0.27+i*0.034)+Math.sin(t*2+i)*env*2,u*(0.53+i*0.034),0,0,Math.PI*2);ctx.strokeStyle='rgba(150,255,150,'+a.toFixed(3)+')';ctx.lineWidth=0.8;ctx.stroke();}
  // outline
  ctx.save();ctx.shadowColor=C.glow;ctx.shadowBlur=8+10*env;ctx.strokeStyle=C.hi;ctx.lineWidth=1.3;
  ctx.beginPath();ctx.arc(cx,top+0.06*u,0.055*u,0,Math.PI*2);ctx.stroke();
  ctx.beginPath();
  for(var j=0;j<RS.length;j++){var p=RS[j];var x=cx+p[0]*u,y=top+p[1]*u;if(j===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
  for(var k2=RS.length-2;k2>=0;k2--){var q=RS[k2];ctx.lineTo(cx-q[0]*u,top+q[1]*u);}
  ctx.stroke();ctx.restore();
  // Djed column of light — meridian + 9 light-body stations
  ctx.setLineDash([2,4]);ctx.strokeStyle='rgba(170,255,170,0.35)';ctx.lineWidth=0.8;ctx.beginPath();ctx.moveTo(cx,top+0.12*u);ctx.lineTo(cx,top+0.60*u);ctx.stroke();ctx.setLineDash([]);
  var now=performance.now(),fs=Math.max(6,W*0.017),sx=g.lx+g.lw+6;
  ctx.strokeStyle='rgba(120,200,130,0.18)';ctx.lineWidth=0.6;ctx.beginPath();ctx.moveTo(sx,top);ctx.lineTo(sx,top+0.84*u);ctx.stroke();
  for(var b=0;b<LB.length;b++){var lb=LB[b],st=bodyOf(lb.id),sy=top+lb.y*u;
    var ach=st&&st.achieved,act=st&&st.active,prog=st?Math.min(1,st.exposure/12):0;
    if(act&&!ach){ctx.beginPath();ctx.moveTo(sx,sy+4);ctx.lineTo(sx,sy+4-8*prog);ctx.strokeStyle='rgba(255,230,128,0.85)';ctx.lineWidth=2;ctx.stroke();}
    if(ach){var age=st.achievedAt?(Date.now()-st.achievedAt)/1000:99;var nod=age<4?1-age/4:0;ctx.save();ctx.shadowColor=C.goldGlow;ctx.shadowBlur=6+10*nod;ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(sx,sy,1.7+1.5*nod,0,Math.PI*2);ctx.fill();ctx.restore();
      txt(nod>0?lb.num+' '+lb.name+' ✦':String(lb.num),sx+5,sy-fs*0.55,fs,nod>0?C.gold:'rgba(243,255,196,0.7)','left',nod>0);
    }else{ctx.fillStyle=act?'rgba(170,255,170,0.8)':'rgba(120,200,130,0.3)';ctx.beginPath();ctx.arc(sx,sy,act?1.6:1.1,0,Math.PI*2);ctx.fill();txt(String(lb.num),sx+5,sy-fs*0.55,fs*0.9,act?C.mid:'rgba(80,150,95,0.45)');}
  }
}

function drawWaves(g){
  var wave=LIVE.wave;if(!wave||!wave.length)return;
  var u=g.u;
  for(var i=0;i<PTS.length;i++){var p=PTS[i],w=weightOf(p.id);if(w<=0)continue;var xy=ptXY(p,g);
    var dirs=Math.abs(p.dx)<0.03?[-1,1]:[p.dx>0?1:-1];
    var amp=(2+7*w)*(0.25+0.75*env);var len=u*(0.16+0.06*w);var n=40;
    for(var d=0;d<dirs.length;d++){var dir=dirs[d];ctx.beginPath();
      for(var s=0;s<=n;s++){var f=s/n;var wi=Math.floor((f*wave.length*0.6+frame*3)%wave.length);var v=((wave[wi]||128)-128)/128;var fade=1-f*0.55;var x=xy.x+dir*(0.03*u+f*len);var y=xy.y+v*amp*fade*(0.6+0.4*Math.sin(f*9+t*6));if(s===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      ctx.strokeStyle='rgba(255,236,160,'+(0.25+0.55*w*env).toFixed(3)+')';ctx.lineWidth=1.1;ctx.stroke();}
  }
}

function drawPoints(g){
  for(var i=0;i<PTS.length;i++){var p=PTS[i],w=weightOf(p.id),xy=ptXY(p,g);var sel=MAP.selected===p.id;
    var coords=p.id===24?[{x:g.cx-0.07*g.u,y:xy.y},{x:g.cx+0.07*g.u,y:xy.y}]:[xy];
    for(var k=0;k<coords.length;k++){var q=coords[k];
      if(w>0){var pulse=0.5+0.5*Math.sin(t*(4+6*w)+p.id);var r=5+9*w*(0.35+0.65*env)+2*pulse;
        var grd=ctx.createRadialGradient(q.x,q.y,0,q.x,q.y,r*2.2);grd.addColorStop(0,'rgba(255,240,180,'+(0.55+0.4*env).toFixed(2)+')');grd.addColorStop(0.35,'rgba(255,225,120,'+(0.28*w).toFixed(2)+')');grd.addColorStop(1,'rgba(255,225,120,0)');
        ctx.fillStyle=grd;ctx.beginPath();ctx.arc(q.x,q.y,r*2.2,0,Math.PI*2);ctx.fill();
        ctx.save();ctx.shadowColor=C.goldGlow;ctx.shadowBlur=12;ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(q.x,q.y,2.6+1.2*w,0,Math.PI*2);ctx.fill();ctx.restore();
      }else{ctx.fillStyle='rgba(190,255,190,0.55)';ctx.beginPath();ctx.arc(q.x,q.y,1.8,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(190,255,190,0.25)';ctx.lineWidth=0.7;ctx.beginPath();ctx.arc(q.x,q.y,4.2,0,Math.PI*2);ctx.stroke();}
      if(sel){ctx.strokeStyle=C.hi;ctx.lineWidth=1;ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(q.x,q.y,11+Math.sin(t*5)*1.5,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.moveTo(q.x-16,q.y);ctx.lineTo(q.x-11,q.y);ctx.moveTo(q.x+11,q.y);ctx.lineTo(q.x+16,q.y);ctx.moveTo(q.x,q.y-16);ctx.lineTo(q.x,q.y-11);ctx.moveTo(q.x,q.y+11);ctx.lineTo(q.x,q.y+16);ctx.stroke();}
    }
    if(sel){txt('PT '+p.id+' '+p.name,g.cx,g.top+g.u+4,Math.max(7,W*0.02),C.hi,'center',true);}
  }
}

function drawLeft(g){
  var fs=Math.max(7,W*0.02),lh=fs*1.45,x=g.lx,w=g.lw,y=H*0.02;
  txt('CODE SAMPLE',x,y,fs,C.mid,'left',true);y+=lh;
  var bh=w*0.62;box(x,y,w,bh,C.dim);
  // sample chamber
  var mx=x+w*0.5,my=y+bh*0.5;ctx.strokeStyle=C.mid;ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+w*0.2,y+bh*0.14);ctx.lineTo(x+w*0.8,y+bh*0.14);ctx.lineTo(mx+w*0.06,my-bh*0.05);ctx.lineTo(mx+w*0.06,my+bh*0.05);ctx.lineTo(x+w*0.8,y+bh*0.86);ctx.lineTo(x+w*0.2,y+bh*0.86);ctx.lineTo(mx-w*0.06,my+bh*0.05);ctx.lineTo(mx-w*0.06,my-bh*0.05);ctx.closePath();ctx.stroke();
  var gl=0.35+0.65*env;ctx.save();ctx.shadowColor=C.goldGlow;ctx.shadowBlur=10*gl;ctx.fillStyle='rgba(255,240,190,'+gl.toFixed(2)+')';ctx.beginPath();ctx.ellipse(mx,y+bh*0.76,w*0.11,bh*0.07,0,0,Math.PI*2);ctx.fill();ctx.restore();
  for(var i=0;i<4;i++){var ly=my-bh*0.02+i*bh*0.03;ctx.strokeStyle='rgba(180,255,180,'+(0.2+0.5*env).toFixed(2)+')';ctx.beginPath();ctx.moveTo(mx-w*0.05,ly);ctx.lineTo(mx+w*0.05,ly);ctx.stroke();}
  y+=bh+lh*0.6;
  var acq=MAP.playing?((performance.now()-MAP.setAt)/1000):0;
  var rows=[['SAMPLE',MAP.code||'----'],['ACQ.',acq.toFixed(1)+' SEC'],['RES.',env>0.45?'HIGH':env>0.08?'MED':'LOW'],['MODE',MAP.freqs.length>1?'PULSE':'TONE'],['MOOD',MAP.mood||'RESTING STATE'],['SCAN',MAP.playing?'ACTIVE':'IDLE']];
  for(var r=0;r<rows.length;r++){txt(rows[r][0],x,y,fs,C.mid);var val=rows[r][1];if(r===4){ctx.font=fs*0.9+'px "Courier New",Menlo,monospace';while(val.length>3&&ctx.measureText(val).width>w-fs*3.2)val=val.slice(0,-1);}txt(val,x+w,y,r===4?fs*0.9:fs,(r===5&&MAP.playing)||(r===4&&val!=='RESTING STATE')?C.hi:C.gold,'right');y+=lh;}
  y+=lh*0.4;txt('NUM. SIGNATURE',x,y,fs,C.mid,'left',true);y+=lh;
  var wh=w*0.36;box(x,y,w,wh,C.dim);
  var wave=LIVE.wave;ctx.beginPath();
  for(var s=0;s<w;s++){var v=wave&&wave.length?((wave[Math.floor(s/w*wave.length)]||128)-128)/128:Math.sin(s*0.3+t*2)*0.05;var yy=y+wh*0.5+v*wh*0.42;if(s===0)ctx.moveTo(x+s,yy);else ctx.lineTo(x+s,yy);}
  ctx.strokeStyle=C.hi;ctx.lineWidth=1;ctx.save();ctx.shadowColor=C.glow;ctx.shadowBlur=4;ctx.stroke();ctx.restore();
  y+=wh+lh*0.4;
  var sig=MAP.sig||[];txt(sig.slice(0,6).join(' '),x,y,fs*0.95,C.mid);y+=lh*0.9;txt(sig.slice(6,12).join(' '),x,y,fs*0.95,C.mid);y+=lh*1.3;
  txt('STORED IN CPU',x,y,fs,C.mid,'left',true);y+=lh;
  var hh=lh*0.9*4+6;box(x,y,w,hh,C.dim);var hex=MAP.hex||[];
  for(var hr=0;hr<4;hr++){txt(hex.slice(hr*5,hr*5+5).join(' '),x+3,y+3+hr*lh*0.9,fs*0.95,C.mid);}
  y+=hh+lh*0.6;
  txt('INFO. FIELD',x,y,fs,C.mid,'left',true);y+=lh;
  var fh=w*0.42;if(y+fh<H-lh*1.4){box(x,y,w,fh,C.dim);var fx=x+w*0.5,fy=y+fh*0.5;
    for(var e=1;e<=6;e++){var ph=(t*0.6+e*0.17)%1;var rr=ph*w*0.46;ctx.beginPath();ctx.ellipse(fx,fy,rr,rr*0.32,0,0,Math.PI*2);ctx.strokeStyle='rgba(180,255,180,'+((1-ph)*(0.25+0.6*env)).toFixed(3)+')';ctx.lineWidth=0.8;ctx.stroke();}
    ctx.save();ctx.shadowColor=C.goldGlow;ctx.shadowBlur=8;ctx.fillStyle=C.gold;ctx.beginPath();ctx.arc(fx,fy,2,0,Math.PI*2);ctx.fill();ctx.restore();}
  txt('FIELD SURROUNDING HUMAN BODY ──▶',x,H-lh*1.1,fs,C.mid,'left',true);
}

function rowsGeo(g){var fs=Math.max(7,W*0.02);var y0=H*0.02+fs*1.45*3.2;var rh=(H-y0-fs*2.2)/PTS.length;return {fs:fs,y0:y0,rh:rh};}
function drawRight(g){
  var rg=rowsGeo(g),fs=rg.fs,x=g.rx,w=g.rw,y=H*0.02;
  txt('NODE POINTS',x,y,fs,C.mid,'left',true);y+=fs*1.45;txt('REST → LIVE Δ',x,y,fs*0.9,C.dim);y+=fs*1.45;
  txt('PT',x,y,fs,C.mid);txt('ACT',x+w*0.42,y,fs,C.mid,'center');txt('LVL',x+w-2,y,fs,C.mid,'right');
  for(var i=0;i<PTS.length;i++){var p=PTS[i],pt=ptOf(p.id),w2=pt?pt.w:0,ry=rg.y0+i*rg.rh,sel=MAP.selected===p.id;
    var rest=pt&&typeof pt.rest==='number'?pt.rest:0.10,lvl=pt&&typeof pt.level==='number'?pt.level:rest,dlt=(lvl-rest)*100;
    if(sel){ctx.fillStyle='rgba(120,255,140,0.12)';ctx.fillRect(x-3,ry-1,w+6,rg.rh);}
    txt(String(p.id),x,ry,fs,sel?C.hi:C.mid);
    var ax=x+w*0.42,ay=ry+fs*0.5;
    if(dlt>1){var blink=0.6+0.4*Math.sin(t*(5+5*w2)+i);ctx.save();ctx.shadowColor=C.goldGlow;ctx.shadowBlur=6;ctx.fillStyle='rgba(255,240,190,'+blink.toFixed(2)+')';ctx.beginPath();ctx.arc(ax,ay,1.6+1.2*w2,0,Math.PI*2);ctx.fill();ctx.restore();
      var live=lvl*100*(0.92+0.08*env)+Math.sin(t*3+p.id*1.7)*0.6*w2;txt((dlt>=0?'▲':'▼')+live.toFixed(1),x+w-2,ry,fs,w2>0?C.gold:'rgba(243,255,196,0.75)','right');}
    else{ctx.fillStyle='rgba(160,255,160,0.35)';ctx.beginPath();ctx.arc(ax,ay,1.2,0,Math.PI*2);ctx.fill();txt((rest*100).toFixed(1),x+w-2,ry,fs,C.dim,'right');}
  }
}

function overlay(){
  if(!scan){scan=document.createElement('canvas');scan.width=4;scan.height=3*DPR;var sc=scan.getContext('2d');sc.fillStyle='rgba(0,0,0,0.22)';sc.fillRect(0,0,4,DPR);}
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle=ctx.createPattern(scan,'repeat');ctx.fillRect(0,0,c.width,c.height);ctx.restore();
  var vg=ctx.createRadialGradient(W*0.5,H*0.5,H*0.25,W*0.5,H*0.5,H*0.75);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.55)');ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
}

function draw(){
  frame++;t+=0.016;
  var stale=performance.now()-LIVE.ts>400;var target=stale?0:Math.min(1,Math.max(LIVE.peak/55,(LIVE.rms||0)/28));
  env+=(target-env)*(target>env?0.35:0.12);envSlow+=(env-envSlow)*0.05;
  if(!MAP.playing&&env<0.02&&frame%2){requestAnimationFrame(draw);return;}
  var g=geo();
  ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
  var bg=ctx.createRadialGradient(g.cx,g.top+g.u*0.5,10,g.cx,g.top+g.u*0.5,g.u*0.7);bg.addColorStop(0,'rgba(40,120,60,'+(0.18+0.25*env).toFixed(2)+')');bg.addColorStop(1,'rgba(3,20,10,0)');ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.globalAlpha=0.94+0.06*Math.sin(t*23);
  drawBody(g);drawWaves(g);drawPoints(g);drawLeft(g);drawRight(g);
  ctx.globalAlpha=1;overlay();
  requestAnimationFrame(draw);
}
draw();

function hit(x,y){var g=geo();var best=-1,bd=16;
  for(var i=0;i<PTS.length;i++){var p=PTS[i],q=ptXY(p,g);var cands=p.id===24?[{x:g.cx-0.07*g.u,y:q.y},{x:g.cx+0.07*g.u,y:q.y}]:[q];
    for(var k=0;k<cands.length;k++){var d=Math.hypot(cands[k].x-x,cands[k].y-y);if(d<bd){bd=d;best=p.id;}}}
  if(best<0&&x>=g.rx-6){var rg=rowsGeo(g);var idx=Math.floor((y-rg.y0)/rg.rh);if(idx>=0&&idx<PTS.length)best=PTS[idx].id;}
  send({type:'pt',id:best>0?best:0});
}
var sx=0,sy=0;
c.addEventListener('pointerdown',function(e){sx=e.clientX;sy=e.clientY;});
c.addEventListener('pointerup',function(e){if(Math.hypot(e.clientX-sx,e.clientY-sy)<12)hit(e.clientX,e.clientY);});
</script></body></html>`;
