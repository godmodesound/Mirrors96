import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { ALBUMS, Album, Track } from '../AlbumData';
import { SoundArtwork } from './SoundArtwork';
import { SoundTrack, trackKey } from './SoundTrack';
import { ss } from './soundStyles';

type Props = { prefix: 'home' | 'sound'; activeKey: string | null; loading?: boolean; progress?: number; onPlay: (track: Track, album: Album) => void; onStop: () => void };
export function SoundLibrary({ prefix, activeKey, loading = false, progress, onPlay, onStop }: Props) {
  const [selected, setSelected] = useState(ALBUMS[0]);
  return <View testID={`${prefix}-sound-library`}>
    <View style={ss.sectionHeading}><Text style={ss.sectionTitle}>The collection</Text><Text style={ss.count}>{ALBUMS.length} / ALBUMS</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.albumRail} testID={`${prefix}-album-selector`}>
      {ALBUMS.map(album => <TouchableOpacity key={album.id} testID={prefix === 'home' ? `home-album-${album.id}` : `sound-select-${album.id}`} accessibilityRole="button" accessibilityLabel={`Select ${album.name}`} accessibilityState={{ selected: selected.id === album.id }} onPress={() => { if (selected.id !== album.id) onStop(); setSelected(album); }} style={[ss.album, selected.id === album.id && ss.albumActive]} activeOpacity={0.7}>
        <SoundArtwork album={album} testID={prefix === 'home' ? `home-album-cover-${album.id}` : `sound-cover-${album.id}`} style={ss.cover} />
        <Text testID={`${prefix}-album-name-${album.id}`} style={ss.albumName}>{album.name.toUpperCase()}</Text><Text testID={prefix === 'home' ? `home-album-count-${album.id}` : `sound-count-${album.id}`} style={ss.albumCount}>{album.tracks.length} TRACKS</Text>
      </TouchableOpacity>)}
    </ScrollView>
    <View style={ss.selected}><SoundArtwork testID={`${prefix}-selected-cover`} album={selected} style={ss.selectedCover} /><View style={ss.selectedInfo}><Text style={ss.selectedLabel}>SELECTED RECORD</Text><Text testID={`${prefix}-selected-album`} style={ss.selectedName}>{selected.name.toUpperCase()}</Text><Text testID={`${prefix}-selected-artist`} style={ss.selectedArtist}>{selected.artist}</Text></View></View>
    <View style={ss.trackHeading}><Text testID={`${prefix}-tracklist-title`} style={ss.sectionTitle}>Tracklist</Text><Text testID={`${prefix}-tracklist-count`} style={ss.count}>{selected.tracks.length} RECORDINGS</Text></View>
    <ScrollView key={selected.id} testID={`${prefix}-compact-tracklist`} accessibilityLabel={`${selected.name} tracklist, scroll for all ${selected.tracks.length} tracks`} style={ss.tracks} nestedScrollEnabled showsVerticalScrollIndicator>{selected.tracks.map(track => <SoundTrack key={track.number} prefix={prefix} album={selected} track={track} active={activeKey === trackKey(selected, track)} loading={loading} progress={progress} onPlay={onPlay} />)}</ScrollView>
    {selected.tracks.length > 5 && <Text testID={`${prefix}-tracklist-scroll-hint`} style={ss.scrollHint}>SCROLL TRACKLIST TO EXPLORE ALL {selected.tracks.length} TRACKS</Text>}
    <Text testID={`${prefix}-tracklist-source`} style={ss.source}>{['codes', 'in-memory-of'].includes(selected.id) ? 'PUBLIC PREVIEWS / ITUNES' : 'FULL-LENGTH RECORDINGS / ARTIST ARCHIVE'}</Text>
  </View>;
}