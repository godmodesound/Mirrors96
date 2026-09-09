import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SK } from '../skins';
import { COLLECTIONS } from './archiveData';
import { s } from './archiveStyles';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  schumann: 'planet-outline', brainwave: 'pulse-outline', solfeggio: 'musical-notes-outline',
  blood: 'water-outline', bone: 'git-branch-outline', cardiovascular: 'heart-outline',
  eye: 'eye-outline', ear: 'ear-outline', mental: 'sparkles-outline', nervous: 'flash-outline',
  skin: 'layers-outline', body: 'body-outline', respiratory: 'cloud-outline',
};
export function ArchiveCollection({ prefix, collection, index, onSelect }: { prefix: string; collection: typeof COLLECTIONS[number]; index: number; onSelect: (id: string) => void }) {
  return <TouchableOpacity testID={`${prefix}-collection-${collection.id}`} accessibilityRole="button" accessibilityLabel={`${collection.name}, ${collection.codes.length} codes`} onPress={() => onSelect(collection.id)} activeOpacity={0.65} style={s.collection}>
    <View style={s.collectionAccent} />
    <View style={s.collectionTop}><Ionicons name={ICONS[collection.id] || 'scan-outline'} size={23} color={SK('#ff5d5d')} /><Text style={s.collectionNumber}>/{String(index + 1).padStart(2, '0')}</Text></View>
    <Text testID={`${prefix}-collection-name-${collection.id}`} style={s.collectionName}>{collection.name}</Text>
    <Text style={s.collectionLatin}>{collection.latinName}</Text>
    <View style={s.collectionBottom}><Text testID={`${prefix}-collection-count-${collection.id}`} style={s.count}>{collection.codes.length} CODES</Text><Ionicons name="arrow-forward" size={16} color={SK('#bdc3ce')} /></View>
  </TouchableOpacity>;
}