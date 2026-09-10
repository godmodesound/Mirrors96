import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SK, skinStyles } from './skins';

export type LabMenu = 'signals' | 'modes' | null;
export default function LabMenuBar({ prefix, selected, onSelect, modesLabel = 'MODES & PRESETS' }: { prefix: string; selected: LabMenu; onSelect: (menu: LabMenu) => void; modesLabel?: string }) {
  return <View testID={`${prefix}-menus`} style={styles.row}>{(['signals', 'modes'] as const).map(menu => <TouchableOpacity key={menu} testID={`${prefix}-menu-${menu}`} accessibilityRole="button" accessibilityState={{ expanded: selected === menu }} onPress={() => onSelect(selected === menu ? null : menu)} style={[styles.menu, selected === menu && styles.active]} activeOpacity={0.7}>
    <Ionicons name={menu === 'signals' ? 'pulse-outline' : 'options-outline'} color={SK('#b8cad7')} size={17} /><Text style={styles.label}>{menu === 'signals' ? 'SIGNALS' : modesLabel}</Text><Ionicons name={selected === menu ? 'chevron-up' : 'chevron-down'} color={SK('#b8cad7')} size={14} />
  </TouchableOpacity>)}</View>;
}
const styles = skinStyles({
  row: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  menu: { flex: 1, minHeight: 50, flexDirection: 'row', gap: 7, alignItems: 'center', paddingHorizontal: 10, borderWidth: 1, borderColor: '#39404a', backgroundColor: '#0c0c0e' },
  active: { borderColor: '#ff0a0a', backgroundColor: '#180808' },
  label: { flex: 1, color: '#e1e8ed', fontSize: 10, fontWeight: '700', lineHeight: 15 },
});