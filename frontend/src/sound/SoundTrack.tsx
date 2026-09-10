import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Album, Track } from '../AlbumData';
import { SK } from '../skins';
import { ss } from './soundStyles';

export const trackKey = (album: Album, track: Track) => `${album.name}-${track.number}`;
export const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
type Props = { prefix: string; album: Album; track: Track; active: boolean; loading: boolean; progress?: number; onPlay: (track: Track, album: Album) => void };
export function SoundTrack({ prefix, album, track, active, loading, progress, onPlay }: Props) {
  return <View testID={`${prefix}-track-row-${album.id}-${track.number}`} style={[ss.track, active && ss.trackActive]}>
    <TouchableOpacity testID={`${prefix}-play-${album.id}-${track.number}`} accessibilityRole="button" accessibilityState={{ selected: active }} accessibilityLabel={`${active ? 'Stop' : 'Play'} ${track.name}`} onPress={() => onPlay(track, album)} activeOpacity={0.65} style={ss.trackButton}>
      <Text style={ss.trackNumber}>{String(track.number).padStart(2, '0')}</Text><View style={ss.trackInfo}><Text testID={`${prefix}-track-${album.id}-${track.number}`} style={[ss.trackName, active && ss.trackNameActive]}>{track.name}</Text></View>
      <Text testID={`${prefix}-duration-${album.id}-${track.number}`} style={ss.duration}>{track.duration > 0 ? formatTime(track.duration) : '—'}</Text>
      <View style={ss.trackIcon}>{loading && active ? <ActivityIndicator testID={`${prefix}-track-loading`} size="small" color={SK('#ff0a0a')} /> : <Ionicons name={active ? 'stop' : 'play'} color={SK(active ? '#ff0a0a' : '#bdc3ce')} size={16} />}</View>
    </TouchableOpacity>
    {active && typeof progress === 'number' && <View testID={`${prefix}-playback-progress`} style={ss.progress}><View style={[ss.progressFill, { width: `${Math.max(0, Math.min(100, progress * 100))}%` }]} /></View>}
  </View>;
}