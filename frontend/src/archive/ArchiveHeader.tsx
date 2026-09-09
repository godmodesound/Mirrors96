import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Line, Rect } from 'react-native-svg';
import { MirrorDefs } from '../MirrorFinish';
import { SK } from '../skins';
import { ARCHIVE_CODES, COLLECTIONS } from './archiveData';
import { s } from './archiveStyles';

export function ArchiveHeader({ prefix, onClose, compact = false }: { prefix: string; onClose?: () => void; compact?: boolean }) {
  const id = `archive-seal-${React.useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={compact ? s.compactHeader : s.header}>
      {compact ? <><Text style={s.eyebrow}>CODES ARCHIVE / SEARCH</Text><TouchableOpacity testID={`${prefix}-close`} accessibilityRole="button" accessibilityLabel="Close archive" onPress={onClose} style={s.close}><Ionicons name="close" size={23} color={SK('#f0f0f5')} /></TouchableOpacity></> : <>
      <View style={s.eyebrowRow}><View style={s.dot} /><Text testID={`${prefix}-eyebrow`} style={s.eyebrow}>GODMODE SOUND / INDEX 02</Text></View>
      <View style={s.headerRow}>
        <View><Text testID={`${prefix}-title`} accessibilityLabel="CODES ARCHIVE" style={s.title}>CODES</Text><Text style={s.subtitle}>ARCHIVE</Text></View>
        {onClose ? <TouchableOpacity testID={`${prefix}-close`} accessibilityRole="button" accessibilityLabel="Close archive" onPress={onClose} style={s.close}><Ionicons name="close" size={23} color={SK('#f0f0f5')} /></TouchableOpacity> : (
          <View style={s.seal} pointerEvents="none">
            <Svg width={68} height={72} viewBox="0 0 68 72">
              <MirrorDefs id={id} />
              {[0, 1, 2].map(i => <Path key={i} d={`M 6 ${17 + i * 15} L 34 ${5 + i * 15} L 62 ${17 + i * 15} L 34 ${30 + i * 15} Z`} fill="none" stroke={`url(#${id}-chrome)`} strokeWidth={2} />)}
              <Line x1={34} y1={30} x2={34} y2={62} stroke={SK('#ff0a0a')} strokeWidth={1} />
              <Rect x={31} y={62} width={6} height={6} fill={SK('#ff0a0a')} />
            </Svg>
          </View>
        )}
      </View>
      <Text testID={`${prefix}-totals`} style={s.headerMeta}>{ARCHIVE_CODES.length} codes / {COLLECTIONS.length} collections / one signal</Text>
      </>}
    </View>
  );
}