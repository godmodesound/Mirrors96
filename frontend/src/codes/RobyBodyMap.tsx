import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { skinStyles } from '../skins';
import { CHAKRAS, BODY_PARTS, BodyPart, SIDE_LABEL, TONE_SETS, ToneSetId, chakraTone, chakraToneLabel, resonantChakra, libraryCodes } from './atlasData';

export default function RobyBodyMap({ frequency, onTune, prefix }: { frequency: number; onTune: (hz: number) => void; prefix: string }) {
  const [toneSet, setToneSet] = useState<ToneSetId>('notes432');
  const [selected, setSelected] = useState<BodyPart | null>(null);
  const resonance = resonantChakra(frequency, toneSet);
  const pick = (part: BodyPart) => {
    setSelected(part);
    onTune(chakraTone(CHAKRAS[part.chakra - 1], toneSet));
  };
  const codes = libraryCodes(selected?.library);
  return <View testID={`${prefix}-roby`}>
    <Text style={s.kicker}>ROBY CHART · WHERE BELIEFS AFFECT YOUR ANATOMY</Text>
    <View testID={`${prefix}-roby-tonesets`} style={s.chips}>
      {TONE_SETS.map(t => <TouchableOpacity key={t.id} testID={`${prefix}-roby-toneset-${t.id}`} onPress={() => setToneSet(t.id)}
        accessibilityState={{ selected: toneSet === t.id }} style={[s.chip, toneSet === t.id && s.chipOn]}>
        <Text style={[s.chipText, toneSet === t.id && s.chipTextOn]}>{t.label}</Text>
      </TouchableOpacity>)}
    </View>
    <Text testID={`${prefix}-roby-resonance`} style={s.resonance}>
      {resonance ? `RESONATING · ${resonance.chakra.name} CHAKRA (${resonance.cents >= 0 ? '+' : ''}${resonance.cents}¢)` : 'NO CHAKRA RESONANCE · tap a body part to tune'}
    </Text>
    {selected && <View testID={`${prefix}-roby-detail`} style={[s.detail, { borderColor: CHAKRAS[selected.chakra - 1].color }]}>
      <Text testID={`${prefix}-roby-detail-part`} style={s.part}>{selected.part.toUpperCase()}</Text>
      <Text style={s.side}>{SIDE_LABEL[selected.side]}</Text>
      <Text testID={`${prefix}-roby-detail-belief`} style={s.belief}>{selected.belief}</Text>
      {selected.also && <Text style={s.caption}>({selected.also})</Text>}
      <Text style={s.caption}>{CHAKRAS[selected.chakra - 1].name} CHAKRA · {chakraToneLabel(CHAKRAS[selected.chakra - 1], toneSet)}</Text>
      {codes.length > 0 && <>
        <Text style={s.libLabel}>LIBRARY CODES · {selected.library?.toUpperCase()}</Text>
        <View style={s.chips}>{codes.map((c, i) => <TouchableOpacity key={c.name} testID={`${prefix}-roby-lib-${i}`}
          onPress={() => onTune(c.frequencies[0])} style={s.chip}>
          <Text style={s.chipText} numberOfLines={1}>{c.name} · {c.frequencies[0]} Hz</Text>
        </TouchableOpacity>)}</View>
      </>}
    </View>}
    {[...CHAKRAS].reverse().map(chakra => {
      const on = resonance?.chakra.n === chakra.n;
      return <View key={chakra.n} testID={`${prefix}-roby-chakra-${chakra.n}`} style={[s.group, { borderLeftColor: chakra.color }, on && s.groupOn]}>
        <View style={s.groupHead}>
          <View style={[s.dot, { backgroundColor: chakra.color }]} />
          <Text style={s.groupTitle}>{chakra.name} CHAKRA</Text>
          <TouchableOpacity testID={`${prefix}-roby-chakra-tune-${chakra.n}`} onPress={() => onTune(chakraTone(chakra, toneSet))} style={s.tune}>
            <Text style={s.tuneText}>{chakraTone(chakra, toneSet)} Hz ▶</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.caption}>{chakra.power}</Text>
        <View style={s.chips}>{BODY_PARTS.filter(p => p.chakra === chakra.n).map(p => {
          const isSel = selected?.part === p.part;
          return <TouchableOpacity key={p.part} testID={`${prefix}-roby-part-${p.part.toLowerCase().replace(/\s+/g, '-')}`}
            onPress={() => pick(p)} accessibilityLabel={`${p.part}: ${p.belief}`} accessibilityState={{ selected: isSel }}
            style={[s.chip, isSel && { borderColor: chakra.color, backgroundColor: '#1a0a0a' }]}>
            <Text style={s.chipText}>{p.side === 'W' ? '◎' : p.side} · {p.part}</Text>
          </TouchableOpacity>;
        })}</View>
      </View>;
    })}
    <Text style={s.caption}>R = right/masculine (doing, belief) · L = left/feminine (receiving, trust) · ◎ = whole body. Reflective reference, not medical advice.</Text>
  </View>;
}

const s = skinStyles({
  kicker: { color: '#ff6060', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: { minHeight: 44, maxWidth: '100%', paddingHorizontal: 10, borderWidth: 1, borderColor: '#593030', justifyContent: 'center', backgroundColor: '#0a0505' },
  chipOn: { borderColor: '#ff0a0a', backgroundColor: '#ff0a0a' },
  chipText: { color: '#ffffff', fontSize: 11, fontWeight: '700' }, chipTextOn: { color: '#000000' },
  resonance: { color: '#ff8080', fontSize: 11, fontWeight: '800', marginVertical: 10, letterSpacing: 0.5 },
  detail: { borderWidth: 2, padding: 12, gap: 4, marginBottom: 12, backgroundColor: '#0d0303' },
  part: { color: '#ffffff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
  side: { color: '#ff6060', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  belief: { color: '#ffffff', fontSize: 14, lineHeight: 20 },
  libLabel: { color: '#ff6060', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginTop: 6 },
  caption: { color: '#bdaaaa', fontSize: 11, lineHeight: 17 },
  group: { borderLeftWidth: 4, borderWidth: 1, borderColor: '#2a1515', padding: 10, marginBottom: 8, backgroundColor: '#070303' },
  groupOn: { borderColor: '#ff0a0a', backgroundColor: '#140505' },
  groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  groupTitle: { flex: 1, color: '#ffffff', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  tune: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center', borderWidth: 1, borderColor: '#ff0a0a' },
  tuneText: { color: '#ff8080', fontSize: 10, fontWeight: '800' },
});
