import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PORTAL_ART } from '../brandArt';
import { SK } from '../skins';
import { ARCHIVE_CODES, COLLECTIONS } from './archiveData';
import { s } from './archiveStyles';

export function ArchiveHeader({ prefix, onClose, compact = false }: { prefix: string; onClose?: () => void; compact?: boolean }) {
  return (
    <View style={compact ? s.compactHeader : s.header}>
      {compact ? <><Text style={s.eyebrow}>CODES ARCHIVE / SEARCH</Text><TouchableOpacity testID={`${prefix}-close`} accessibilityRole="button" accessibilityLabel="Close archive" onPress={onClose} style={s.close}><Ionicons name="close" size={23} color={SK('#f0f0f5')} /></TouchableOpacity></> : <>
      <View style={s.eyebrowRow}><View style={s.dot} /><Text testID={`${prefix}-eyebrow`} style={s.eyebrow}>GODMODE SOUND / INDEX 02</Text></View>
      <View style={s.headerRow}>
        <View><Text testID={`${prefix}-title`} accessibilityLabel="CODES ARCHIVE" style={s.title}>CODES</Text><Text style={s.subtitle}>ARCHIVE</Text></View>
        {onClose ? <TouchableOpacity testID={`${prefix}-close`} accessibilityRole="button" accessibilityLabel="Close archive" onPress={onClose} style={s.close}><Ionicons name="close" size={23} color={SK('#f0f0f5')} /></TouchableOpacity> : (
          <Image testID={`${prefix}-logo`} source={{ uri: PORTAL_ART }} style={logoStyle} resizeMode="cover" accessibilityLabel="Mirrors Codes Archive logo" />
        )}
      </View>
      <Text testID={`${prefix}-totals`} style={s.headerMeta}>{ARCHIVE_CODES.length} codes / {COLLECTIONS.length} collections / one signal</Text>
      </>}
    </View>
  );
}

const logoStyle = { width: 64, height: 96, borderWidth: 1, borderColor: SK('#c8922e') };