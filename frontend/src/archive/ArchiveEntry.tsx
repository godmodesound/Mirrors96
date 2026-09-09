import React, { useRef } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SK } from '../skins';
import { ArchiveCode, categoryName } from './archiveData';
import { archiveTick, playArchiveCode, endArchivePreview } from './archiveSession';
import { s } from './archiveStyles';

type Props = { prefix: string; entry: ArchiveCode; active: boolean; preview: boolean; godMode: boolean; onLoad: (entry: ArchiveCode) => void };
export const ArchiveEntry = React.memo(function ArchiveEntry({ prefix, entry, active, preview, godMode, onLoad }: Props) {
  const held = useRef(false);
  return <View testID={`${prefix}-entry-${entry.id}`} style={[s.entry, active && s.entryActive]}>
    <View style={s.entryRow}>
      <TouchableOpacity testID={`${prefix}-play-${entry.id}`} accessibilityRole="button" accessibilityLabel={`${active ? 'Stop' : 'Play'} ${entry.name}`} accessibilityHint="Hold to preview; release to stop" accessibilityState={{ selected: active }} style={s.entryMain} activeOpacity={0.7}
        onPressIn={() => { held.current = false; archiveTick(); }}
        onPress={() => { if (!held.current) playArchiveCode(entry); }}
        delayLongPress={350} onLongPress={() => { held.current = true; playArchiveCode(entry, true); }} onPressOut={() => { if (held.current) endArchivePreview(entry.id); }}>
        <View style={s.entryTop}><Text style={s.entryNumber}>{String(entry.index).padStart(3, '0')}</Text><Text style={s.entryCategory}>{categoryName(entry.category)} / {entry.frequencies.length} FREQ</Text><Ionicons name={active ? 'stop' : 'play'} size={14} color={SK(active ? '#ff0a0a' : '#bdc3ce')} /></View>
        <Text testID={`${prefix}-name-${entry.id}`} style={s.entryTitle}>{godMode ? '$ ' : ''}{entry.name}</Text>
        <View testID={`${prefix}-frequencies-${entry.id}`} style={s.frequencyRow}>{entry.frequencies.slice(0, 5).map((frequency, i) => <Text key={i} style={[s.frequency, active && s.frequencyActive]}>{frequency} Hz</Text>)}{entry.frequencies.length > 5 && <Text style={s.frequency}>+{entry.frequencies.length - 5}</Text>}</View>
      </TouchableOpacity>
      <TouchableOpacity testID={`${prefix}-load-${entry.id}`} accessibilityRole="button" accessibilityLabel={`Load ${entry.name} to Codes Lab`} style={s.entryLoad} activeOpacity={0.6} onPress={() => onLoad(entry)}><Ionicons name="arrow-forward" color={SK('#bdc3ce')} size={18} /><Text style={s.loadText}>LAB</Text></TouchableOpacity>
    </View>
    {active && <Text testID={`${prefix}-entry-status-${entry.id}`} style={s.entryHint}>{preview ? 'PREVIEW · Release to stop' : 'PLAYING · Staged in Lab · Tap again to stop'}</Text>}
  </View>;
});