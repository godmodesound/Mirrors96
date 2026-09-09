import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ALBUMS } from '../AlbumData';
import { SK } from '../skins';
import { formatTime, trackKey } from './SoundTrack';
import { ss } from './soundStyles';

export function SoundReadout({ prefix, activeKey, elapsed, loading, onStop }: { prefix: string; activeKey: string | null; elapsed?: number; loading?: boolean; onStop: () => void }) {
  if (!activeKey) return null;
  const item = ALBUMS.flatMap(album => album.tracks.map(track => ({ album, track }))).find(({ album, track }) => trackKey(album, track) === activeKey);
  return <View testID={`${prefix}-music-readout`} style={ss.readout}>
    <View style={ss.readoutInfo}><Text style={ss.readoutLabel}>{loading ? 'LOADING RECORDING' : 'NOW PLAYING'}</Text><Text testID={`${prefix}-now-playing`} style={ss.readoutName} numberOfLines={2}>{item?.track.name || activeKey}</Text><Text testID={`${prefix}-music-elapsed`} style={ss.readoutMeta}>{typeof elapsed === 'number' ? `${formatTime(elapsed)} / ` : ''}{item?.album.name.toUpperCase()}</Text></View>
    <TouchableOpacity testID={`${prefix}-stop-music`} accessibilityRole="button" accessibilityLabel="Stop music" style={ss.stopButton} onPress={onStop}><Ionicons name="stop" size={15} color={SK('#000000')} /><Text style={ss.stopText}>STOP</Text></TouchableOpacity>
  </View>;
}