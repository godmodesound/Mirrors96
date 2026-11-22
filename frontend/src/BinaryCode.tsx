import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Platform, LayoutChangeEvent } from 'react-native';
import { AudioEngine, ActiveFreq } from './AudioEngine';

// The seven chakra colours stay fixed on every skin: root → crown.
const CHAKRA = ['#ff1a1a', '#ff7a00', '#ffd400', '#22c55e', '#1e90ff', '#5b4bff', '#b026ff'];
const ROW_H = 8;
const COL_LINE = 7;

/** Each frequency as whole Hz in binary, padded to full bytes; nothing sounding = one zero byte. */
export const toBits = (values: number[]): string => values.length
  ? values.map(v => { const b = Math.max(0, Math.round(v)).toString(2); return b.padStart(Math.ceil(b.length / 8) * 8, '0'); }).join('')
  : '00000000';

type Match = { ids?: number[]; sources?: ActiveFreq['source'][] };
export type BinarySource = Match & {
  /** Explicit feature values (Hz). When given, the engine is not consulted. */
  values?: number[];
  active?: boolean;
};

/** Frequencies the audio engine is sounding right now, optionally narrowed to tone ids / sources. */
function useEngineFreqs(enabled: boolean, ids?: number[], sources?: ActiveFreq['source'][]): number[] {
  const [key, setKey] = useState('');
  const idKey = ids ? ids.join(',') : '';
  const srcKey = sources ? sources.join(',') : '';
  useEffect(() => {
    if (!enabled) return;
    const idList = idKey ? idKey.split(',').map(Number) : null;
    const srcList = srcKey ? srcKey.split(',') : null;
    return AudioEngine.subscribeActiveFreqs(list => {
      const hz = list.filter(f => (!idList || (f.id !== undefined && idList.includes(f.id))) && (!srcList || srcList.includes(f.source))).map(f => f.hz);
      setKey(hz.join(','));
    });
  }, [enabled, idKey, srcKey]);
  return useMemo(() => (key ? key.split(',').map(Number) : []), [key]);
}

function useBits({ values, active, ids, sources }: BinarySource) {
  const explicit = values !== undefined;
  const engine = useEngineFreqs(!explicit, ids, sources);
  return { bits: toBits(explicit ? values : engine), live: explicit ? !!active : engine.length > 0 };
}

/** Clockwise step counter; only runs while the feature is live. */
function useFlow(live: boolean) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) { setTick(0); return; }
    const id = setInterval(() => setTick(t => t + 1), 160);
    return () => clearInterval(id);
  }, [live]);
  return tick;
}

type Cell = { ch: string; color: string };
const cells = (bits: string, start: number, count: number, total: number, tick: number): Cell[] =>
  Array.from({ length: Math.max(0, count) }, (_, i) => {
    const p = start + i;
    const n = bits.length;
    return { ch: bits[(((p - tick) % n) + n) % n], color: CHAKRA[Math.min(6, Math.floor((p / Math.max(1, total)) * 7))] };
  });
/** Merge same-colour neighbours into spans so a border costs a handful of Text nodes. */
const spans = (list: Cell[], sep: string) => {
  const out: { color: string; text: string }[] = [];
  list.forEach(c => {
    const last = out[out.length - 1];
    if (last && last.color === c.color) last.text += sep + c.ch; else out.push({ color: c.color, text: (out.length ? sep : '') + c.ch });
  });
  return out.map((s, i) => <Text key={i} style={{ color: s.color }}>{s.text}</Text>);
};

// Real digit advance differs per platform font, so it is measured once from a hidden probe and shared.
let charW = 0;
const charSubs = new Set<(w: number) => void>();
const PROBE = '0101010101010101010101010101010101010101';
function useCharW() {
  const [w, setW] = useState(charW);
  useEffect(() => { if (charW) { setW(charW); return; } charSubs.add(setW); return () => { charSubs.delete(setW); }; }, []);
  const probe = w ? null : <Text style={[s.row, s.probe]} onLayout={e => {
    const measured = e.nativeEvent.layout.width / PROBE.length;
    if (measured > 0 && !charW) { charW = measured; charSubs.forEach(cb => cb(measured)); }
  }}>{PROBE}</Text>;
  return { w, probe };
}

const useSize = () => {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize(prev => (Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height }));
  };
  return { size, onLayout };
};

/**
 * Rainbow binary border. Drop it in as a child of any bordered box (give that box a transparent
 * borderColor): the digits spell the feature's frequencies and travel clockwise while it is live.
 */
export function BinaryBorder(props: BinarySource & { testID?: string }) {
  const { bits, live } = useBits(props);
  const tick = useFlow(live);
  const { size, onLayout } = useSize();
  const { w: cw, probe } = useCharW();
  const nw = cw ? Math.floor(size.w / cw) : 0;
  const nh = Math.max(0, Math.floor((size.h - ROW_H * 2) / COL_LINE));
  const total = (nw + nh) * 2;
  return <View testID={props.testID} accessible={false} onLayout={onLayout} style={[s.fill, !live && s.idle]}>
    {probe}
    {nw > 0 && <>
      <Text numberOfLines={1} ellipsizeMode="clip" style={[s.row, s.top]}>{spans(cells(bits, 0, nw, total, tick), '')}</Text>
      <Text style={[s.col, s.right]}>{spans(cells(bits, nw, nh, total, tick), '\n')}</Text>
      <Text numberOfLines={1} ellipsizeMode="clip" style={[s.row, s.bottom]}>{spans(cells(bits, nw + nh, nw, total, tick).reverse(), '')}</Text>
      <Text style={[s.col, s.left]}>{spans(cells(bits, nw * 2 + nh, nh, total, tick).reverse(), '\n')}</Text>
    </>}
  </View>;
}

/** Rainbow binary rule for section titles — same code, laid out left to right. */
export function BinaryRule(props: BinarySource & { testID?: string }) {
  const { bits, live } = useBits(props);
  const tick = useFlow(live);
  const { size, onLayout } = useSize();
  const { w: cw, probe } = useCharW();
  const n = cw ? Math.floor(size.w / cw) : 0;
  return <View testID={props.testID} accessible={false} onLayout={onLayout} style={[s.rule, !live && s.idle]}>
    {probe}
    {n > 0 && <Text numberOfLines={1} ellipsizeMode="clip" style={s.row}>{spans(cells(bits, 0, n, n, tick), '')}</Text>}
  </View>;
}

const mono = Platform.select({ ios: 'Courier', default: 'monospace' });
const s = StyleSheet.create({
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, overflow: 'hidden', pointerEvents: 'none' },
  idle: { opacity: 0.38 },
  row: { fontFamily: mono, fontSize: 7, lineHeight: ROW_H, height: ROW_H, fontWeight: '700', includeFontPadding: false },
  probe: { position: 'absolute', opacity: 0, alignSelf: 'flex-start' },
  top: { position: 'absolute', left: 0, right: 0, top: 0 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  col: { position: 'absolute', top: ROW_H, bottom: ROW_H, width: 6, overflow: 'hidden', textAlign: 'center', fontFamily: mono, fontSize: 7, lineHeight: COL_LINE, fontWeight: '700', includeFontPadding: false },
  left: { left: 0 },
  right: { right: 0 },
  rule: { alignSelf: 'stretch', height: ROW_H, marginBottom: 10, overflow: 'hidden', pointerEvents: 'none' },
});
