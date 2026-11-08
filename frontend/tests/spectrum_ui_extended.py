"""Additional THz regression: actual per-node gains, shared linking, editor reflow, tuning."""
import asyncio,json,traceback
from spectrum_ui import URL, ROOT, INSTRUMENT, AUDIO
from playwright.async_api import async_playwright

async def main():
 async with async_playwright() as pw:
  browser=await pw.chromium.launch(headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
  page=await browser.new_page(viewport={'width':390,'height':844});errors=[];results=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  instrument=INSTRUMENT.replace('window.__qa.oscs.push(o);return o','const conn=o.connect.bind(o);o.connect=(dest,...args)=>{o.__dest=dest;return conn(dest,...args)};window.__qa.oscs.push(o);return o')
  await page.add_init_script(instrument)
  async def tap(id):
   el=page.get_by_test_id(id);await el.scroll_into_view_if_needed();await page.wait_for_timeout(100);await el.click();await page.wait_for_timeout(200)
  async def text(id):return await page.get_by_test_id(id).inner_text()
  async def edit(value,unit='thz',index=1,prefix='archive-codes-lab'):
   await tap(f'{prefix}-frequency-{index}');await tap(f'{prefix}-unit-{unit}-{index}')
   await page.get_by_test_id(f'{prefix}-frequency-input-{index}').fill(value);await tap(f'{prefix}-frequency-apply-{index}')
  async def run(name,fn):
   try:await fn();results.append({'name':name,'pass':True});print('PASS',name,flush=True)
   except Exception as e:
    results.append({'name':name,'pass':False,'error':str(e),'trace':traceback.format_exc()});print('FAIL',name,str(e),flush=True)
    await page.screenshot(path=str(ROOT/(name.replace(' ','_')+'_failure.jpg')),quality=40,full_page=False)
  async def open_shared():
   await page.goto(URL+'/library');await page.wait_for_timeout(3000)
   await tap('archive-tab-lab');await tap('archive-lab-toggle');await tap('archive-codes-lab-menu-signals')
  await open_shared()
  async def shared_links():
   await edit('1');await tap('archive-codes-lab-add-layer');await edit('2',index=2)
   await tap('archive-codes-lab-menu-modes');await tap('archive-codes-lab-link-layers');await tap('archive-codes-lab-menu-signals')
   await tap('archive-codes-lab-execute')
   slider=page.get_by_test_id('archive-codes-lab-spectrum-slider-1');await slider.scroll_into_view_if_needed();b=await slider.bounding_box()
   await page.mouse.move(b['x']+b['width']*.55,b['y']+22);await page.mouse.down();await page.mouse.move(b['x']+b['width']*.65,b['y']+22,steps=6);await page.mouse.up();await page.wait_for_timeout(200)
   for value,unit in [('1e24','hz'),('0.01','hz'),('1','thz')]:
    await edit(value,unit)
    fs=[float((await text(f'archive-codes-lab-stored-hz-{i}')).split()[0]) for i in [1,2]]
    assert abs(fs[1]/fs[0]-2)<1e-8 and all(.01<=f<=1e24 for f in fs)
   assert all(o['hz']<20000 for o in (await page.evaluate(AUDIO))['oscs'])
   await page.reload();await page.wait_for_timeout(2500);await tap('archive-tab-lab');await tap('archive-lab-toggle');await tap('archive-codes-lab-menu-signals')
   assert 'LINKED' in await text('archive-codes-lab-node-title-1')
   assert await text('archive-codes-lab-frequency-value-1')=='1 THz'
   assert await text('archive-codes-lab-frequency-value-2')=='2 THz'
   assert 'EXECUTE' in await text('archive-codes-lab-execute')
   assert not (await page.evaluate(AUDIO)).get('oscs',[])
   await tap('archive-codes-lab-menu-modes');await tap('archive-codes-lab-link-layers');await tap('archive-codes-lab-menu-signals')
  await run('shared link limits live and stopped hydration',shared_links)
  async def gain():
   await edit('1');await edit('600','hz',2);await tap('archive-codes-lab-execute')
   slider=page.get_by_test_id('archive-codes-lab-gain-slider-1');await slider.scroll_into_view_if_needed();b=await slider.bounding_box()
   await page.mouse.click(b['x']+.1,b['y']+22);await page.wait_for_timeout(400)
   assert 'GAIN 0%' in await text('archive-codes-lab-gain-value-1')
   gains=await page.evaluate("()=>window.__qa.oscs.filter(o=>!o.__stopped).map(o=>({hz:o.frequency.value,gain:o.__dest?.gain?.value}))")
   print('SHARED_GAIN',gains,flush=True);results.append({'shared_gain_evidence':gains})
   await tap('archive-codes-lab-execute')
   assert abs(gains[0]['gain'])<.001, f'Node1 UI gain0% still sounds at gain {gains[0]["gain"]}; Node2 gain {gains[1]["gain"]}'
  await run('shared individual node gain0 mutes only node1',gain)
  async def editor_layout():
   for width,height in [(320,844),(390,844),(820,1024),(844,390)]:
    await page.set_viewport_size({'width':width,'height':height});await page.wait_for_timeout(200)
    await tap('archive-codes-lab-frequency-1');await page.get_by_test_id('archive-codes-lab-frequency-input-1').fill('1e12')
    box=await page.get_by_test_id('archive-codes-lab-frequency-input-1').bounding_box();assert box['x']>=0 and box['x']+box['width']<=width,box
    assert await page.evaluate('()=>document.documentElement.scrollWidth===innerWidth')
    await page.screenshot(path=str(ROOT/f'shared_editor_{width}.jpg'),quality=40,full_page=False)
    await tap('archive-codes-lab-frequency-cancel-1')
   await page.set_viewport_size({'width':390,'height':844})
   await tap('archive-codes-lab-menu-modes');await tap('archive-codes-lab-reset')
  await run('shared editor responsive and reset',editor_layout)
  async def tune():
   await page.goto(URL);await page.wait_for_timeout(2500);await tap('home-lab-menu-signals');await edit('1',prefix='home-lab')
   await tap('home-lab-execute');await tap('home-scope-tuning')
   readout=await text('home-lab-output-hz-1');assert '474.28' in readout
   a=await page.evaluate(AUDIO);assert abs(a['oscs'][0]['hz']-465.66128730773926*440/432)<.01
   await tap('home-lab-menu-modes');await tap('home-lab-godmode');await page.wait_for_timeout(300)
   a=await page.evaluate(AUDIO);print('GOD440',a,flush=True);assert all(0<o['hz']<20000 for o in a['oscs'])
   expected=465.66128730773926*440/432
   god_mid=(a['oscs'][0]['hz']+a['oscs'][1]['hz'])/2
   await tap('home-lab-godmode')
   after=await page.evaluate(AUDIO);print('AFTER_GOD440',after,flush=True)
   results.append({'godmode_tuning_evidence':{'expected':expected,'god_carrier':god_mid,'after_off':after['oscs'][0]['hz'],'readout':readout}})
   await tap('home-scope-tuning');await tap('home-lab-execute')
   await page.wait_for_timeout(300);assert not (await page.evaluate(AUDIO))['oscs']
   assert abs(god_mid-expected)<.01 and abs(after['oscs'][0]['hz']-expected)<.01, f'A440 applied twice: expected {expected}, GodMode centre {god_mid}, after off {after["oscs"][0]["hz"]}'
  await run('A440 translated readout and live GodMode',tune)
  results.append({'page_errors':errors});(ROOT/'extended_results.json').write_text(json.dumps(results,indent=2));await browser.close()

asyncio.run(main())