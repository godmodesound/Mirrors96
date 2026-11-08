"""Public-preview Codes Lab regression; instruments REAL browser audio, never emits/sends messages."""
import asyncio, json, os, traceback
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path('/app/test_reports/artifacts_iter21'); ROOT.mkdir(exist_ok=True)
env=dict(line.strip().split('=',1) for line in Path('/app/frontend/.env').read_text().splitlines() if '=' in line)
URL=env['EXPO_PUBLIC_BACKEND_URL']
results=[]
INSTRUMENT="""(() => {const AC=window.AudioContext||window.webkitAudioContext;window.__qa={contexts:[],oscs:[],analysers:[],gains:[]};window.AudioContext=class extends AC {constructor(...a){super(...a);window.__qa.contexts.push(this)}createOscillator(){const o=super.createOscillator();o.__stopped=false;const stop=o.stop.bind(o);o.stop=(...a)=>{o.__stopped=true;return stop(...a)};window.__qa.oscs.push(o);return o}createGain(){const g=super.createGain();window.__qa.gains.push(g);return g}createAnalyser(){const a=super.createAnalyser();window.__qa.analysers.push(a);return a}}})();"""
AUDIO="""()=>{const q=window.__qa;const a=q.analysers[0],c=q.contexts[0];if(!a)return {};const b=new Float32Array(a.frequencyBinCount);a.getFloatFrequencyData(b);let i=1;for(let j=2;j<b.length;j++)if(b[j]>b[i])i=j;const t=new Float32Array(a.fftSize);a.getFloatTimeDomainData(t);return {peakHz:i*c.sampleRate/a.fftSize,rms:Math.sqrt(t.reduce((s,v)=>s+v*v,0)/t.length),oscs:q.oscs.filter(o=>!o.__stopped).map(o=>({hz:o.frequency.value,type:o.type})),gains:q.gains.map(g=>g.gain.value)}}"""

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  page=await browser.new_page(viewport={'width':390,'height':844})
  errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
  await page.add_init_script(INSTRUMENT)
  await page.goto(URL,wait_until='domcontentloaded');await page.wait_for_timeout(5000)
  async def tap(id):
   l=page.get_by_test_id(id);await l.scroll_into_view_if_needed();await page.wait_for_timeout(100);await l.click();await page.wait_for_timeout(200)
  async def edit(value,unit=None,index=1,prefix='home-lab'):
   await tap(f'{prefix}-frequency-{index}')
   if unit:await tap(f'{prefix}-unit-{unit}-{index}')
   await page.get_by_test_id(f'{prefix}-frequency-input-{index}').fill(value)
   await tap(f'{prefix}-frequency-apply-{index}')
  async def text(id): return await page.get_by_test_id(id).inner_text()
  async def audio():return await page.evaluate(AUDIO)
  async def run(name,fn):
   try:await fn();results.append({'name':name,'pass':True});print('PASS',name,flush=True)
   except Exception as e:
    results.append({'name':name,'pass':False,'error':str(e),'trace':traceback.format_exc()});print('FAIL',name,str(e),flush=True)
    await page.screenshot(path=str(ROOT/(name.replace(' ','_')+'_failure.jpg')),quality=40,full_page=False)
  async def selection():
   await tap('home-lab-menu-signals');await page.get_by_test_id('home-lab-units-1').wait_for()
   assert await page.get_by_test_id('home-lab-units-1').locator('[data-testid]').count()==9
   await edit('1','thz')
   assert await text('home-lab-stored-hz-1')=='1000000000000 Hz selected'
   assert '465.66' in await text('home-lab-output-hz-1')
   assert '31 octaves' in await text('home-lab-translation-1')
   assert '299.79 µm' in await text('home-lab-wavelength-1')
   await edit('12abc');assert await page.get_by_test_id('home-lab-frequency-error-1').is_visible()
   assert await text('home-lab-stored-hz-1')=='1000000000000 Hz selected'
   await tap('home-lab-frequency-cancel-1')
   for unit in ['phz','ehz','zhz','yhz']:
    await edit('1',unit);assert (await text('home-lab-frequency-value-1')).lower()==f'1 {unit}'
   await edit('26000','hz');assert '406.25' in await text('home-lab-output-hz-1')
   await edit('432','hz');assert '432.00' in await text('home-lab-output-hz-1')
   assert 'PLUG-INS SOON' not in await text('home-lab-signals-panel')
  await run('selection validation units',selection)
  async def playback():
   await edit('432','hz');await tap('home-lab-execute');await page.wait_for_timeout(600)
   a=await audio();print('432 FFT',a,flush=True);assert abs(a['peakHz']-432)<6 and a['rms']>.01
   await edit('1','thz');await page.wait_for_timeout(500)
   a=await audio();print('THz FFT',a,flush=True);assert abs(a['peakHz']-465.66)<6 and abs(a['oscs'][0]['hz']-465.66)<.01
   await edit('2','thz');assert abs((await audio())['oscs'][0]['hz']-465.66)<.01
   await tap('home-lab-wave-1-tri');assert (await audio())['oscs'][0]['type']=='triangle'
   gain=page.get_by_test_id('home-lab-gain-slider-1');await gain.scroll_into_view_if_needed();box=await gain.bounding_box()
   await page.mouse.click(box['x']+box['width']*.25,box['y']+22);await page.wait_for_timeout(200)
   assert '25%' in await text('home-lab-gain-value-1')
   assert any(abs(g-.25)<.03 for g in (await audio())['gains'])
   await tap('home-lab-add-layer');assert len((await audio())['oscs'])==2
   await tap('home-lab-remove-layer-2');assert len((await audio())['oscs'])==1
   await tap('home-lab-execute');await page.wait_for_timeout(500)
   a=await audio();assert not a['oscs'] and a['rms']<.001
  await run('real audio live layers gain waves stop',playback)
  async def links_presets():
   await edit('1','thz');await tap('home-lab-add-layer');await edit('2','thz',2)
   await tap('home-lab-menu-modes');await tap('home-lab-link-layers');await tap('home-lab-menu-signals')
   slider=page.get_by_test_id('home-lab-spectrum-slider-1');await slider.scroll_into_view_if_needed();b=await slider.bounding_box()
   await page.mouse.move(b['x']+b['width']*.55,b['y']+22);await page.mouse.down();await page.mouse.move(b['x']+b['width']*.65,b['y']+22,steps=8);await page.mouse.up();await page.wait_for_timeout(200)
   f=[float((await text(f'home-lab-stored-hz-{i}')).split()[0]) for i in [1,2]];assert abs(f[1]/f[0]-2)<1e-8
   dial=page.get_by_test_id('home-lab-dial-1');await dial.scroll_into_view_if_needed();b=await dial.bounding_box()
   await page.mouse.move(b['x']+38,b['y']+38);await page.mouse.down();await page.mouse.move(b['x']+65,b['y']+20,steps=8);await page.mouse.up();await page.wait_for_timeout(200)
   f=[float((await text(f'home-lab-stored-hz-{i}')).split()[0]) for i in [1,2]];assert abs(f[1]/f[0]-2)<1e-8
   for value in ['1e24','0.01']:
    await edit(value,'hz');f=[float((await text(f'home-lab-stored-hz-{i}')).split()[0]) for i in [1,2]]
    assert abs(f[1]/f[0]-2)<1e-8 and all(.01<=v<=1e24 for v in f)
   await edit('1','thz');await tap('home-lab-wave-1-saw')
   await tap('home-lab-menu-modes')
   before=await page.evaluate("()=>localStorage.getItem('@codes_lab_presets_v1')")
   await tap('home-lab-save-preset')
   saved=await page.evaluate("()=>JSON.parse(localStorage.getItem('@codes_lab_presets_v1'))")
   assert saved[0]['layers'][0]['frequency']==1e12 and saved[0]['layers'][0]['wave']=='SAW' and saved[0]['linked']
   ts=saved[0]['ts'];results.append({'test_preset_id':ts})
   await page.reload();await page.wait_for_timeout(3000)
   await tap('home-lab-menu-modes');await tap('home-lab-load-presets');await tap(f'home-lab-preset-load-{ts}');await tap('home-lab-menu-signals')
   assert await text('home-lab-frequency-value-1')=='1 THz'
   assert 'LINKED' in await text('home-lab-node-title-1')
   assert '25%' in await text('home-lab-gain-value-1')
   assert 'SAW' in await text('home-lab-wave-1-saw')
   await tap('home-lab-menu-modes');await tap('home-lab-load-presets');await tap(f'home-lab-preset-delete-{ts}')
   remaining=await page.evaluate("()=>JSON.parse(localStorage.getItem('@codes_lab_presets_v1'))")
   assert all(p['ts']!=ts for p in remaining)
   await tap('home-lab-menu-signals')
  await run('linked gestures boundaries preset reload cleanup',links_presets)
  async def scalar_send_layout():
   await tap('home-lab-menu-modes');await tap('home-lab-scalar');await tap('home-lab-godmode');await tap('home-lab-godmode');await tap('home-lab-scalar')
   assert not (await audio()).get('oscs',[])
   await tap('home-send-codes');assert 'THz' in await text('send-codes-frequencies');assert await page.get_by_test_id('send-codes-translation-note').is_visible()
   await page.get_by_text('CANCEL',exact=True).click();await tap('home-lab-menu-signals')
   for width,height in [(390,844),(320,844),(820,1024),(844,390)]:
    await page.set_viewport_size({'width':width,'height':height});await page.wait_for_timeout(300)
    await page.get_by_test_id('home-lab-frequency-control-1').scroll_into_view_if_needed()
    await edit('1','thz');await page.get_by_test_id('home-lab-frequency-input-1').count()
    dims=await page.evaluate('()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,bad:Array.from(document.querySelectorAll("svg circle,svg rect")).filter(e=>["r","width","height"].some(k=>e.hasAttribute(k)&&Number(e.getAttribute(k))<0)).length})')
    assert dims['width']==dims['scroll'] and dims['bad']==0,dims
    b=await page.get_by_test_id('home-lab-frequency-control-1').bounding_box();assert b['x']>=0 and b['x']+b['width']<=width
    await page.screenshot(path=str(ROOT/f'home_{width}.jpg'),quality=40,full_page=False)
  await run('scalar godmode send responsive',scalar_send_layout)
  async def shared():
   await page.set_viewport_size({'width':390,'height':844});await page.goto(URL+'/library');await page.wait_for_timeout(3000)
   ids=await page.evaluate("()=>Array.from(document.querySelectorAll('[data-testid]')).map(e=>e.dataset.testid)");print('ARCHIVE IDS',ids,flush=True)
   await tap('archive-tab-lab');await tap('archive-lab-toggle');await tap('archive-codes-lab-menu-signals')
   await edit('1','thz',prefix='archive-codes-lab')
   assert '465.66' in await text('archive-codes-lab-output-hz-1')
   await tap('archive-codes-lab-execute');await page.wait_for_timeout(500)
   a=await audio();assert abs(a['peakHz']-465.66)<6 and a['rms']>.01
   await tap('archive-codes-lab-add-layer');assert len((await audio())['oscs'])==2
   await tap('archive-codes-lab-remove-layer-2');assert len((await audio())['oscs'])==1
   await tap('archive-codes-lab-execute');await page.wait_for_timeout(300);assert not (await audio())['oscs']
   raw=await page.evaluate("()=>JSON.parse(localStorage.getItem('codes_lab_state'))");assert raw['layers'][0]['frequency']==1e12 and not raw['layers'][0]['isPlaying']
   await page.reload();await page.wait_for_timeout(3000);await tap('archive-tab-lab');await tap('archive-lab-toggle');await tap('archive-codes-lab-menu-signals')
   assert await text('archive-codes-lab-frequency-value-1')=='1 THz';assert 'EXECUTE' in await text('archive-codes-lab-execute')
   raw=await page.evaluate("()=>JSON.parse(localStorage.getItem('codes_lab_state'))");assert raw['layers'][0]['frequency']==1e12
   await tap('archive-codes-lab-menu-modes');await tap('archive-codes-lab-link-layers');await tap('archive-codes-lab-reset');await tap('archive-codes-lab-menu-signals')
   assert await text('archive-codes-lab-frequency-value-1')=='432 Hz'
   await page.get_by_test_id('archive-codes-lab-frequency-control-1').scroll_into_view_if_needed();await page.screenshot(path=str(ROOT/'shared390.jpg'),quality=40,full_page=False)
  await run('shared audio hydration reset',shared)
  async def routes_archive():
   for route in ['/sound','/binaural','/moods','/mirrors-id','/how']:
    await page.goto(URL+route);await page.wait_for_timeout(1800);assert await page.locator('body').inner_text();print('PASS route',route,flush=True)
   await page.goto(URL);await page.wait_for_timeout(2000);await tap('home-open-codes-archive')
   ids=await page.evaluate("()=>Array.from(document.querySelectorAll('[data-testid]')).map(e=>e.dataset.testid).filter(x=>x.startsWith('home-archive'))");print('HOME ARCHIVE IDS',ids,flush=True)
   await page.get_by_test_id('home-archive-search-input').fill('432');await page.wait_for_timeout(400)
   ids=await page.evaluate("()=>Array.from(document.querySelectorAll('[data-testid]')).map(e=>e.dataset.testid).filter(x=>x.includes('home-archive-load'))");print('LOAD IDS',ids,flush=True)
   await tap(ids[0]);await tap('home-lab-menu-signals');assert '432' in await text('home-lab-frequency-value-1')
  await run('other routes and home archive432',routes_archive)
  error_text=await page.evaluate("""() => {const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));return errorElements.map(el => el.textContent).join(', ');} """)
  print(f'Found error message: {error_text}' if error_text else 'No error messages found on the page')
  results.append({'page_errors':errors});(ROOT/'ui_results.json').write_text(json.dumps(results,indent=2));await browser.close()

if __name__=='__main__': asyncio.run(main())