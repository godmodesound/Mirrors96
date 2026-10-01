/** Harmony / dissonance math — just-intonation ratios, Tenney height, Lissajous canvas. */
export const JI_NOTES = [
  { note: 'C', n: 1, d: 1, color: '#f4a3a3' }, { note: 'Db', n: 16, d: 15, color: '#6ab8ff' }, { note: 'D', n: 9, d: 8, color: '#f2c14e' },
  { note: 'Eb', n: 6, d: 5, color: '#b39ddb' }, { note: 'E', n: 5, d: 4, color: '#8bd18b' }, { note: 'F', n: 4, d: 3, color: '#ff8fb1' },
  { note: 'F#', n: 45, d: 32, color: '#5ad7e6' }, { note: 'G', n: 3, d: 2, color: '#ffb377' }, { note: 'Ab', n: 8, d: 5, color: '#8ea0ff' },
  { note: 'A', n: 5, d: 3, color: '#d4e157' }, { note: 'Bb', n: 9, d: 5, color: '#e6a3f0' }, { note: 'B', n: 15, d: 8, color: '#7fe0c8' }, { note: "C'", n: 2, d: 1, color: '#f4a3a3' },
];

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

/** Best small-integer ratio for f2/f1 (continued fractions, denominators ≤ 64). */
export function approxRatio(f1: number, f2: number, maxD = 64) {
  const x = f2 / f1;
  let h1 = 1, h0 = 0, k1 = 0, k0 = 1, b = x;
  for (let i = 0; i < 20; i++) {
    const a = Math.floor(b);
    const h2 = a * h1 + h0, k2 = a * k1 + k0;
    if (k2 > maxD) break;
    h0 = h1; h1 = h2; k0 = k1; k1 = k2;
    if (Math.abs(x - h1 / k1) < 1e-6) break;
    b = 1 / (b - a);
    if (!isFinite(b)) break;
  }
  const g = gcd(h1, k1) || 1;
  const n = h1 / g, d = k1 / g;
  const cents = 1200 * Math.log2(x / (n / d));
  return { n, d, cents };
}

/** Tenney height log2(n·d) — lower = simpler = more consonant. */
export const tenney = (n: number, d: number) => Math.log2(n * d);

export type Verdict = { label: 'UNISON' | 'HARMONY' | 'CONSONANT' | 'TENSION' | 'DISSONANCE'; score: number; color: string };

export function verdictFor(freqs: number[]): Verdict & { pairs: { a: number; b: number; n: number; d: number; beat: number; height: number }[] } {
  const sorted = [...freqs].filter(f => f > 0).sort((a, b) => a - b);
  const pairs: { a: number; b: number; n: number; d: number; beat: number; height: number }[] = [];
  for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
    const { n, d, cents } = approxRatio(sorted[i], sorted[j]);
    const beat = Math.abs(sorted[j] - sorted[i]);
    // off-lattice tuning (|cents| > 8) and slow beating (< 25 Hz) add roughness
    const height = tenney(n, d) + Math.min(3, Math.abs(cents) / 8) + (beat >= 5 && beat < 25 ? 4 : beat > 0.5 && beat < 5 ? 1.5 : 0);
    pairs.push({ a: sorted[i], b: sorted[j], n, d, beat, height });
  }
  if (!pairs.length) return { label: 'UNISON', score: 100, color: '#ffffff', pairs };
  const avg = pairs.reduce((s, p) => s + p.height, 0) / pairs.length;
  const score = Math.max(0, Math.min(100, Math.round(100 - (avg / 10) * 100)));
  const label = avg < 0.5 ? 'UNISON' : avg < 4.2 ? 'HARMONY' : avg < 5.4 ? 'CONSONANT' : avg < 7.2 ? 'TENSION' : 'DISSONANCE';
  const color = label === 'UNISON' ? '#ffffff' : label === 'HARMONY' ? '#f2d27a' : label === 'CONSONANT' ? '#8bd18b' : label === 'TENSION' ? '#ffb377' : '#ff5a6a';
  return { label, score, color, pairs };
}

/** Lissajous canvas — 2 tones → 2D figure, 3+ tones → rotating 3D figure. window.updateLiss({freqs,color,label,dense}) */
export const LISS_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>*{margin:0;padding:0;overflow:hidden;touch-action:none;}html,body{background:#000;width:100%;height:100%;}canvas{display:block;}</style></head>
<body><canvas id="c"></canvas><script>
var c=document.getElementById('c'),ctx=c.getContext('2d');var W=0,H=0,DPR=Math.min(2,window.devicePixelRatio||1);
function resize(){W=window.innerWidth;H=window.innerHeight;c.width=W*DPR;c.height=H*DPR;c.style.width=W+'px';c.style.height=H+'px';ctx.setTransform(DPR,0,0,DPR,0,0);}
window.addEventListener('resize',resize);resize();
var S={freqs:[432,648],color:'#f2d27a',label:'HARMONY',playing:false};var LIVE={peak:0,ts:0};var env=0,t=0,rot=0;
window.updateLiss=function(m){try{if(typeof m==='string')m=JSON.parse(m);for(var k in m)S[k]=m[k];}catch(e){}};
window.pushWave=function(w){try{if(typeof w==='string')w=JSON.parse(w);LIVE.peak=w.peak||0;LIVE.ts=performance.now();}catch(e){}};
function onMsg(e){var d=e.data;try{var p=typeof d==='string'?JSON.parse(d):d;if(p&&p.__wave){window.pushWave(p);return;}window.updateLiss(p);}catch(_){}}
window.addEventListener('message',onMsg);document.addEventListener('message',onMsg);
function rgba(h,a){var r=parseInt(h.slice(1,3),16),g=parseInt(h.slice(3,5),16),b=parseInt(h.slice(5,7),16);return 'rgba('+r+','+g+','+b+','+a+')';}
function draw(){t+=0.016;rot+=0.004+0.01*env;var stale=performance.now()-LIVE.ts>400;var tgt=stale?0:Math.min(1,LIVE.peak/55);env+=(tgt-env)*0.2;
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);var f=S.freqs.filter(function(v){return v>0;});if(f.length<1){requestAnimationFrame(draw);return;}
  var base=f[0];var r=f.map(function(v){return v/base;});var cx=W/2,cy=H/2,A=Math.min(W,H)*0.40;
  // how many base cycles to trace: simple ratios close quickly, complex ones need many
  var cycles=Math.min(64,Math.max(4,Math.round(S.dense||8)));var N=Math.min(6000,cycles*160);var ph=t*0.35;
  ctx.lineWidth=1.4;ctx.lineCap='round';ctx.shadowColor=S.color;ctx.shadowBlur=10+8*env;
  var col=S.color;
  if(f.length===1){ctx.strokeStyle=rgba(col,0.9);ctx.beginPath();for(var i=0;i<=400;i++){var x=cx+(i/400-0.5)*2*A,y=cy+Math.sin(i/400*Math.PI*8+ph*6)*A*0.5*(0.4+0.6*env+0.2);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
  else if(f.length===2){ctx.beginPath();for(var j=0;j<=N;j++){var u=j/N*Math.PI*2*cycles;var x2=cx+Math.sin(u*r[0]+ph)*A,y2=cy+Math.sin(u*r[1])*A;if(j===0)ctx.moveTo(x2,y2);else ctx.lineTo(x2,y2);}
    ctx.strokeStyle=rgba(col,Math.max(0.18,0.95-cycles*0.012));ctx.stroke();}
  else{var cr=Math.cos(rot),sr=Math.sin(rot),ct=Math.cos(rot*0.6),stt=Math.sin(rot*0.6);ctx.beginPath();
    for(var k=0;k<=N;k++){var v=k/N*Math.PI*2*cycles;var X=Math.sin(v*r[0]+ph),Y=Math.sin(v*r[1]),Z=Math.sin(v*r[2]+ph*0.5);
      var x1=X*cr-Z*sr,z1=X*sr+Z*cr;var y1=Y*ct-z1*stt,z2=Y*stt+z1*ct;var persp=1/(1.9-z2*0.5);var px=cx+x1*A*persp,py=cy+y1*A*persp;if(k===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
    ctx.strokeStyle=rgba(col,Math.max(0.16,0.9-cycles*0.012));ctx.stroke();}
  ctx.shadowBlur=0;
  requestAnimationFrame(draw);}
draw();
</script></body></html>`;
