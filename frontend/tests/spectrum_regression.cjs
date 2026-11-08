// Full-spectrum math and native bridge contract; native API is STUBBED, not device verification.
const fs = require('fs'), vm = require('vm'), ts = require('typescript'), assert = require('node:assert/strict');
const results = [];
function test(name, fn) { try { fn(); results.push({name,pass:true}); console.log('PASS',name); } catch(e) { results.push({name,pass:false,error:e.message}); console.error('FAIL',name,e.message); } }
function load(file, requireFn, extra='') {
 const out = ts.transpileModule(fs.readFileSync(file,'utf8')+extra,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React}}).outputText;
 const context = {exports:{},require:requireFn,console,Uint8Array,Float32Array,Map,Set};
 vm.runInNewContext(out,context); return context.exports;
}
const s=load('src/codes/spectrum.ts',require);
test('bounds and finite clamp',()=>{ assert.equal(s.clampFrequency(-1),.01);assert.equal(s.clampFrequency(1e25),1e24);for(const v of [NaN,Infinity,-Infinity])assert.equal(s.clampFrequency(v),432); });
test('strict invalid parsing',()=>{for(const v of ['', ' ', '-1','0','NaN','Infinity','12abc','1e','1.2.3','1,2,3','1e25','0.001'])assert.equal(s.parseFrequency(v,1),null,v);});
test('decimal comma and scientific parsing',()=>{for(const [text,factor,want] of [['0.01',1,.01],['1e24',1,1e24],['1,5',1e12,1.5e12],['1E+12',1,1e12],['.5',1,0.5]])assert.equal(s.parseFrequency(text,factor),want);});
test('nine SI formats',()=>{assert.equal(s.FREQUENCY_UNITS.length,9);for(const u of s.FREQUENCY_UNITS)assert.equal(s.formatFrequency(u.factor),`1 ${u.label}`);});
test('log sweep endpoints and round trips',()=>{assert.equal(s.frequencyAtPosition(0),.01);assert.equal(s.frequencyAtPosition(1),1e24);for(let p=0;p<=1;p+=.01)assert.ok(Math.abs(s.spectrumPosition(s.frequencyAtPosition(p))-p)<1e-10);});
test('octave translation and wavelength',()=>{assert.equal(s.audioFrequency(432),432);assert.equal(s.audioFrequency(26000),406.25);assert.equal(s.translatedTone(1e12).octaves,31);assert.equal(s.audioFrequency(1e12),465.66128730773926);assert.equal(s.emWavelength(1e12),'299.79 µm');for(const f of [20001,1e12,1e24])assert.ok(s.audioFrequency(f)>256&&s.audioFrequency(f)<=512);});
test('linked ratios both boundaries finite',()=>{for(const target of [.01,1e24]){const a=s.linkedFrequencies([1e12,2e12],0,target);assert.ok(a.every(Number.isFinite));assert.ok(a.every(x=>x>=.01&&x<=1e24));assert.ok(Math.abs(a[1]/a[0]-2)<1e-10);}});
const a=load('src/AudioEngine.tsx',(name)=>{
 if(name==='./codes/spectrum')return s;
 if(name==='react')return {default:{},useRef(){},useCallback(){},useEffect(){},useState(){}};
 if(name==='react-native')return {Platform:{OS:'ios'}};
 if(name==='react-native-webview')return {WebView:{}};
 if(name==='./skins')return {skinStyles:x=>x,SK:x=>x};
 throw Error(name);
},'\nexport const __testPending = () => pendingMessages;');
test('native start/update/multi translated before bridge and registry',()=>{
 a.AudioEngine.startTone(1,1e12,.5,'sine');a.AudioEngine.updateFreq(1,2e12);a.AudioEngine.playMulti([432,1e12,26000]);
 const msgs=a.__testPending().map(JSON.parse);assert.equal(msgs[0].freq,s.audioFrequency(1e12));assert.equal(msgs[1].freq,s.audioFrequency(2e12));assert.deepEqual(Array.from(msgs[2].freqs),[432,s.audioFrequency(1e12),406.25]);
 assert.ok(a.AudioEngine.getActiveFreqs().every(f=>f.hz<=20000));
 a.AudioEngine.stopTone(1);a.AudioEngine.stopMulti();assert.equal(a.AudioEngine.getActiveFreqs().length,0);
});
const storage=new Map();
const shared=load('src/CodesLabShared.tsx',name=>{
 if(name==='./codes/spectrum')return s;
 if(name==='@react-native-async-storage/async-storage')return {setItem:async(k,v)=>storage.set(k,v)};
 return name==='./skins'?{skinStyles:x=>x}:{};
});
(async()=>{try {await shared.loadFrequencyToLab([1e12,1e24],'TEST_THz');const saved=JSON.parse(storage.get('codes_lab_state'));assert.equal(saved.layers[0].frequency,1e12);assert.equal(saved.layers[1].frequency,1e24);assert.equal(saved.layers[0].isPlaying,false);results.push({name:'loadFrequencyToLab stores source beyond26k',pass:true});console.log('PASS loadFrequencyToLab');}catch(e){results.push({name:'loadFrequencyToLab',pass:false,error:e.message});}
 fs.writeFileSync('/app/test_reports/spectrum_unit_results.json',JSON.stringify(results,null,2));process.exitCode=results.some(x=>!x.pass)?1:0;})();