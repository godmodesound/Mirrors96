import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SKINS, useSkin, skinStyles } from './index';

interface Props {
  visible?: boolean;
  onClose?: () => void;
}

/** Hidden skin selector — opened by long-pressing the hero logo. */
export default function SkinPicker({ visible, onClose }: Props) {
  const { skinId, setSkinId, pickerOpen, setPickerOpen } = useSkin();
  const insets = useSafeAreaInsets();
  const open = visible !== undefined ? visible : pickerOpen;
  const close = onClose || (() => setPickerOpen(false));

  return (
    <Modal visible={open} animationType="fade" transparent onRequestClose={close}>
      <View style={s.backdrop}>
        <View style={[s.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={s.head}>
            <View style={s.headText}>
              <Text style={s.title}>&gt; SKIN_SELECT</Text>
              <Text style={s.sub}>{SKINS.length} IDENTITIES · LOOK ONLY</Text>
            </View>
            <TouchableOpacity onPress={close} style={s.close} testID="skin-close">
              <Text style={s.closeTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
            {SKINS.map(sk => {
              const on = sk.id === skinId;
              return (
                <TouchableOpacity
                  key={sk.id}
                  testID={`skin-${sk.id}`}
                  activeOpacity={0.8}
                  onPress={() => setSkinId(sk.id)}
                  style={[s.row, on && s.rowOn]}
                >
                  <Text style={[s.idx, on && s.txtOn]}>{sk.index}</Text>
                  <View style={s.swatchWrap}>
                    <View style={[s.swatch, { backgroundColor: sk.accent }]} />
                    <View style={[s.swatch, { backgroundColor: sk.accent2 }]} />
                    <View style={[s.swatch, s.swatchBg, { backgroundColor: sk.light ? '#f4f4f4' : '#0a0a0a' }]} />
                  </View>
                  <View style={s.meta}>
                    <Text style={[s.name, on && s.txtOn]}>{sk.name}</Text>
                    <Text style={s.pantone}>{sk.pantone}</Text>
                  </View>
                  <Text style={[s.mark, on && s.txtOn]}>{on ? '●' : '○'}</Text>
                </TouchableOpacity>
              );
            })}
            <Text style={s.foot}>LONG-PRESS THE LOGO ANY TIME TO SWITCH SKIN</Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = skinStyles({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#050202',
    borderTopWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 14,
    paddingTop: 14,
    maxHeight: '88%',
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headText: { flex: 1, paddingRight: 8 },
  title: { color: '#ff0a0a', fontSize: 14, fontFamily: 'TerminatorRealNFI', letterSpacing: 1 },
  sub: { color: '#5a1a1a', fontSize: 8, fontFamily: 'TerminatorRealNFI', letterSpacing: 1, marginTop: 4 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2a0a0a' },
  closeTxt: { color: '#ff0a0a', fontSize: 16 },
  list: { flexGrow: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 10,
    minHeight: 56,
  },
  rowOn: { borderColor: '#ff0a0a', backgroundColor: '#180606' },
  idx: { color: '#5a1a1a', fontSize: 10, fontFamily: 'TerminatorRealNFI', width: 20 },
  swatchWrap: { flexDirection: 'row', gap: 3 },
  swatch: { width: 12, height: 26, borderWidth: 1, borderColor: '#000000' },
  swatchBg: { borderColor: '#333333' },
  meta: { flex: 1 },
  name: { color: '#ff3040', fontSize: 12, fontFamily: 'TerminatorRealNFI', letterSpacing: 1 },
  pantone: { color: '#5a1a1a', fontSize: 7, fontFamily: 'TerminatorRealNFI', marginTop: 3, letterSpacing: 0.5 },
  mark: { color: '#5a1a1a', fontSize: 12 },
  txtOn: { color: '#ff0a0a' },
  foot: { color: '#3a1010', fontSize: 7, fontFamily: 'TerminatorRealNFI', textAlign: 'center', marginTop: 4, marginBottom: 8, letterSpacing: 1 },
});
