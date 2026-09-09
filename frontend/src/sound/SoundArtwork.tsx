import React, { useEffect, useState } from 'react';
import { Image, View, StyleProp, ImageStyle, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Album } from '../AlbumData';
import { SK } from '../skins';
import { ss } from './soundStyles';

export function SoundArtwork({ album, testID, style }: { album: Album; testID: string; style: StyleProp<ImageStyle> }) {
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [album.coverUrl]);
  if (error) return <View testID={`${testID}-unavailable`} accessibilityLabel={`${album.name} artwork unavailable`} style={[style, ss.artworkError]}><Ionicons name="disc-outline" size={28} color={SK('#a0a0b0')} /></View>;
  return <Image testID={testID} accessibilityLabel={`${album.name} album cover`} source={{ uri: album.coverUrl }} style={[style, album.id === 'mirrors' && artwork.white]} resizeMode={album.id === 'mirrors' ? 'contain' : 'cover'} onError={() => setError(true)} />;
}

// The supplied album artwork has a white backdrop, identical in every skin.
const artwork = StyleSheet.create({ white: { backgroundColor: '#ffffff' } });