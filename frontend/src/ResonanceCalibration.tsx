import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AudioEngine } from './AudioEngine';
import { skinStyles } from './skins';
import { CAL_ZONES, CalZone, Calibration, sweepRange, saveCalibration, useCalibration } from './calibration';

const SWEEP_MS = 10000;
const TICK = 100;

/**
 * RESONANCE CALIBRATION — guided binaural sweep per body zone.
 * Each zone sweeps its carrier ±1 semitone around its 432-lattice note; the user taps
 * I FEEL IT where it lands. Results persist, show on the BIOMAP and drive the Bi-Naural carrier.
 */
export default function ResonanceCalibration({ testID = 'calibration', onStart, onApply }: {
  testID?: string; onStart: () => void; onApply: (carrier: number, beat: number, zone: CalZone) => void;
}) {
  const cal = useCalibration();
  const [step, setStep] = useState<number | null>(null); // zone index while running
  const [progress, setProgress] = useState(0);
  const [hz, setHz] = useState(0);
  const draft = useRef<Calibration>({});
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const live = useRef({ hz: 0, step: null as number | null });

  const clear = () => { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
  useEffect(() => () => { if (live.current.step !== null) { clear(); AudioEngine.stopBinaural(); } }, []);

  const runZone = (index: number) => {
    clear();
    if (index >= CAL_ZONES.length) return finish();
    const zone = CAL_ZONES[index];
    const { lo, hi } = sweepRange(zone);
    live.current = { hz: lo, step: index };
    setStep(index); setProgress(0); setHz(lo);
    if (index === 0) AudioEngine.startBinaural(lo, zone.beat); else AudioEngine.updateBinaural(lo, zone.beat);
    const started = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - started) / SWEEP_MS);
      const f = Math.round(lo * (hi / lo) ** p * 100) / 100;
      live.current.hz = f; setHz(f); setProgress(p);
      AudioEngine.updateBinaural(f, zone.beat);
      if (p >= 1) runZone(index + 1); // no tap → zone keeps its previous result
    }, TICK);
  };
  const start = () => { onStart(); draft.current = { ...cal }; runZone(0); };
  const capture = () => {
    const i = live.current.step; if (i === null) return;
    const zone = CAL_ZONES[i];
    draft.current[zone.id] = { hz: live.current.hz, beat: zone.beat, at: Date.now() };
    runZone(i + 1);
  };
  const finish = () => {
    clear(); AudioEngine.stopBinaural();
    live.current = { hz: 0, step: null };
    setStep(null);
    saveCalibration(draft.current);
    // Bi-Naural adopts the calibration: heart first, else the first calibrated zone.
    const first = CAL_ZONES.find(z => z.id === 'heart' && draft.current[z.id]) || CAL_ZONES.find(z => draft.current[z.id]);
    if (first) onApply(draft.current[first.id].hz, first.beat, first);
  };
  const cancel = () => { clear(); AudioEngine.stopBinaural(); live.current = { hz: 0, step: null }; setStep(null); };

  const running = step !== null;
  const zone = running ? CAL_ZONES[step!] : null;
  const count = Object.keys(cal).length;
  return <View testID={testID} style={s.wrap}>
    <View style={s.head}>
      <Text style={s.title}>◎ RESONANCE CALIBRATION</Text>
      <Text style={s.meta}>{count}/{CAL_ZONES.length} ZONES</Text>
    </View>
    {running && zone ? <View testID={`${testID}-running`} style={s.run}>
      <Text style={s.step}>ZONE {step! + 1}/{CAL_ZONES.length} · {zone.name}</Text>
      <Text testID={`${testID}-hz`} style={s.hz}>{hz.toFixed(2)} Hz</Text>
      <Text style={s.meta}>NOTE {zone.note} ±1 SEMITONE · BEAT {zone.beat} Hz · HEADPHONES ON</Text>
      <View style={s.track}><View style={[s.fill, { width: `${progress * 100}%` }]} /></View>
      <TouchableOpacity testID={`${testID}-feel`} style={s.feel} onPress={capture} activeOpacity={0.8}>
        <Text style={s.feelText}>✦ I FEEL IT</Text>
      </TouchableOpacity>
      <View style={s.row}>
        <TouchableOpacity testID={`${testID}-skip`} style={s.btn} onPress={() => runZone(step! + 1)}><Text style={s.btnText}>SKIP ZONE</Text></TouchableOpacity>
        <TouchableOpacity testID={`${testID}-cancel`} style={s.btn} onPress={cancel}><Text style={s.btnText}>CANCEL</Text></TouchableOpacity>
      </View>
    </View> : <>
      <Text style={s.hint}>A slow binaural sweep moves through 7 body zones. Tap I FEEL IT the moment a tone lands in that area — your tones are saved, mapped on the BIOMAP and used by the Bi-Naural carrier.</Text>
      <TouchableOpacity testID={`${testID}-start`} style={s.feel} onPress={start} activeOpacity={0.8}>
        <Text style={s.feelText}>{count ? '↻ RECALIBRATE' : '▶ START CALIBRATION'}</Text>
      </TouchableOpacity>
    </>}
    {count > 0 && <View testID={`${testID}-results`} style={s.results}>
      <Text style={s.meta}>MY TONES · TAP TO TUNE BI-NAURAL</Text>
      <View style={s.chips}>{CAL_ZONES.filter(z => cal[z.id]).map(z => <TouchableOpacity key={z.id} testID={`${testID}-apply-${z.id}`}
        disabled={running} style={s.chip} onPress={() => onApply(cal[z.id].hz, z.beat, z)}>
        <Text style={s.chipName}>{z.name.split(' · ')[0]}</Text>
        <Text style={s.chipHz}>{cal[z.id].hz.toFixed(2)} Hz</Text>
      </TouchableOpacity>)}</View>
      {!running && <TouchableOpacity testID={`${testID}-reset`} style={s.reset} onPress={() => saveCalibration({})}><Text style={s.btnText}>CLEAR CALIBRATION</Text></TouchableOpacity>}
    </View>}
  </View>;
}

const s = skinStyles({
  wrap: { marginBottom: 12, borderWidth: 1, borderColor: '#1f5a30', backgroundColor: '#020d07', borderRadius: 6, padding: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#a9ff8a', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  meta: { color: '#4fa85c', fontSize: 9, letterSpacing: 1, fontWeight: '800' },
  hint: { color: '#4fa85c', fontSize: 10, lineHeight: 15, marginTop: 8 },
  run: { marginTop: 8, gap: 6 },
  step: { color: '#c8ffb8', fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  hz: { color: '#f3ffc4', fontSize: 30, fontWeight: '300' },
  track: { height: 4, backgroundColor: '#0a2a14' }, fill: { height: 4, backgroundColor: '#a9ff8a' },
  feel: { minHeight: 52, marginTop: 10, borderWidth: 2, borderColor: '#a9ff8a', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a2a14' },
  feelText: { color: '#f3ffc4', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  row: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: '#1f5a30', alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#a9ff8a', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  results: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#0f2e18' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { minHeight: 44, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#4fa85c', justifyContent: 'center', backgroundColor: '#03140a' },
  chipName: { color: '#c8ffb8', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  chipHz: { color: '#f3ffc4', fontSize: 11 },
  reset: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
});
