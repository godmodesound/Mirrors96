import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
  Linking,
  Dimensions,
  ActivityIndicator,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MirrorsIdBanner from '../src/MirrorsIdBanner';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import { ALBUMS, Album, Track } from '../src/AlbumData';

import { skinStyles, SK } from '../src/skins';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL || '';

// Album cover component with loading state
const AlbumCover = ({ uri, style }: { uri: string; style: any }) => {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <View style={[style, { backgroundColor: SK('#1a0808'), justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: SK('#ff0a0a'), fontSize: 20 }}>◈</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri, cache: 'force-cache' }}
      style={style}
      resizeMode="cover"
      onError={() => setError(true)}
    />
  );
};

const formatDuration = (seconds: number) => {
  if (!seconds || seconds === 0) return 'FULL';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function SoundScreen() {
  const [selectedAlbum, setSelectedAlbum] = useState<Album>(ALBUMS[0]);
  const [playingTrack, setPlayingTrack] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const insets = useSafeAreaInsets();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const stopPlayback = async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (e) {}
      soundRef.current = null;
    }
    setPlayingTrack(null);
    setPlaybackProgress(0);
    setIsLoading(false);
  };

  const playPreview = async (track: Track) => {
    if (playingTrack === track.number) {
      await stopPlayback();
      return;
    }

    await stopPlayback();
    setIsLoading(true);
    setPlayingTrack(track.number);

    try {
      if (Platform.OS !== 'web') {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: track.previewUrl },
        { shouldPlay: true, volume: 1.0 }
      );
      soundRef.current = sound;
      setIsLoading(false);

      // Track progress
      intervalRef.current = setInterval(async () => {
        if (soundRef.current) {
          try {
            const status = await soundRef.current.getStatusAsync();
            if (status.isLoaded) {
              if (status.didJustFinish) {
                await stopPlayback();
              } else {
                const progress = status.positionMillis / (status.durationMillis || 30000);
                setPlaybackProgress(progress);
              }
            }
          } catch (e) {}
        }
      }, 200);
    } catch (e) {
      console.log('Playback error:', e);
      setIsLoading(false);
      setPlayingTrack(null);
    }
  };

  const cardWidth = (SCREEN_WIDTH - 52) / 2;

  const handleCheckout = async (type: 'album' | 'single', name: string, coverUrl: string) => {
    if (checkoutLoading) return;
    setCheckoutLoading(true);
    try {
      const baseUrl = Platform.OS === 'web' ? window.location.origin : API_URL;
      const res = await fetch(`${API_URL}/api/sound/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          artist: selectedAlbum?.artist || 'VINCE SINNOTT',
          cover_url: coverUrl,
          success_url: `${baseUrl}/sound`,
          cancel_url: `${baseUrl}/sound`,
        }),
      });
      const data = await res.json();
      if (data.checkout_url) {
        if (Platform.OS === 'web') {
          window.location.href = data.checkout_url;
        } else {
          Linking.openURL(data.checkout_url);
        }
      }
    } catch (e) {
      console.log('Checkout error:', e);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <MirrorsIdBanner />
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.terminalHeader}>
              <Text style={styles.terminalTitle}>SOUND</Text>
            </View>
            <Text style={styles.subtitle}>
              GODMODE SOUND DISCOGRAPHY — ALL MUSIC FREE. STREAMING ENABLED.
            </Text>
            <TouchableOpacity style={styles.discographyBtn} onPress={() => handleCheckout('album', 'GODMODE DISCOGRAPHY', '')}>
              <Text style={styles.discographyBtnText}>DISCOGRAPHY</Text>
            </TouchableOpacity>
            <Text style={styles.freeAccessLabel}>ALL TRACKS FREE · FULL STREAMING ACCESS</Text>
          </View>

          {/* Full Access Badge */}
          <View style={styles.previewBadge}>
            <View style={[styles.previewDot, { backgroundColor: SK('#00ff00') }]} />
            <Text style={[styles.previewBadgeText, { color: SK('#00ff00') }]}>FULL ACCESS · FREE STREAMING</Text>
          </View>

          {/* Quick Select */}
          <View style={styles.quickSelectSection}>
            <Text style={styles.quickSelectLabel}>QUICK SELECT:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickSelectRow}>
              {ALBUMS.map(album => (
                <TouchableOpacity
                  key={album.id}
                  style={[styles.quickChip, selectedAlbum.id === album.id && styles.quickChipActive]}
                  onPress={() => { stopPlayback(); setSelectedAlbum(album); }}
                >
                  <Text style={[styles.quickChipText, selectedAlbum.id === album.id && styles.quickChipTextActive]}>
                    {album.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* ═══ BLOCKBUSTER SHELF ═══ */}
          <View style={styles.shelfSection}>
            <Text style={styles.shelfTitle}>◈ DISCOGRAPHY SHELF</Text>

            {/* Shelf Row 1: Top 3 */}
            <View style={styles.shelfContainer}>
              <View style={styles.shelfBackWall} />
              <View style={styles.shelfRow}>
                {ALBUMS.slice(0, 3).map(album => {
                  const isSelected = selectedAlbum.id === album.id;
                  return (
                    <TouchableOpacity
                      key={album.id}
                      style={[styles.caseWrap, isSelected && styles.caseWrapSelected]}
                      onPress={() => { stopPlayback(); setSelectedAlbum(album); }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.caseBody, isSelected && styles.caseBodySelected]}>
                        <AlbumCover uri={album.coverUrl} style={styles.caseCover} />
                        {isSelected && <View style={styles.caseGlow} />}
                      </View>
                      <Text style={[styles.caseLabel, isSelected && styles.caseLabelSelected]} numberOfLines={1}>
                        {album.name}
                      </Text>
                      {album.tracks.length > 0 && (
                        <Text style={styles.caseTrackCount}>{album.tracks.length} TRK</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Physical shelf edge */}
              <View style={styles.shelfEdge}>
                <View style={styles.shelfEdgeLine} />
                <View style={styles.shelfEdgeBody} />
              </View>
            </View>

            {/* Shelf Row 2: Bottom 3 */}
            <View style={styles.shelfContainer}>
              <View style={styles.shelfBackWall} />
              <View style={styles.shelfRow}>
                {ALBUMS.slice(3).map(album => {
                  const isSelected = selectedAlbum.id === album.id;
                  return (
                    <TouchableOpacity
                      key={album.id}
                      style={[styles.caseWrap, isSelected && styles.caseWrapSelected]}
                      onPress={() => { stopPlayback(); setSelectedAlbum(album); }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.caseBody, isSelected && styles.caseBodySelected]}>
                        <AlbumCover uri={album.coverUrl} style={styles.caseCover} />
                        {isSelected && <View style={styles.caseGlow} />}
                      </View>
                      <Text style={[styles.caseLabel, isSelected && styles.caseLabelSelected]} numberOfLines={1}>
                        {album.name}
                      </Text>
                      {album.tracks.length > 0 && (
                        <Text style={styles.caseTrackCount}>{album.tracks.length} TRK</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.shelfEdge}>
                <View style={styles.shelfEdgeLine} />
                <View style={styles.shelfEdgeBody} />
              </View>
            </View>
          </View>

          {/* Selected Album Detail */}
          <View style={styles.selectedSection}>
            <View style={styles.selectedHeader}>
              <AlbumCover uri={selectedAlbum.coverUrl} style={styles.selectedCover} />
              <View style={styles.selectedInfo}>
                <Text style={styles.selectedBadge}>SELECTED</Text>
                <Text style={styles.selectedName}>{selectedAlbum.name}</Text>
                <Text style={styles.selectedArtist}>{selectedAlbum.artist} • GODMODE SOUND</Text>
                <View style={styles.freeAccessBadge}>
                  <Text style={styles.freeAccessBadgeText}>FREE STREAMING</Text>
                </View>
              </View>
            </View>

            {/* Track List */}
            {selectedAlbum.tracks.length > 0 ? (
              <View style={styles.trackList}>
                <Text style={styles.trackListTitle}>
                  {selectedAlbum.name} — Track Previews (30s)
                </Text>
                <Text style={styles.trackListSub}>Source: iTunes public lookup</Text>

                {selectedAlbum.tracks.map(track => {
                  const isActive = playingTrack === track.number;
                  return (
                    <TouchableOpacity
                      key={track.number}
                      style={[styles.trackRow, isActive && styles.trackRowActive]}
                      onPress={() => playPreview(track)}
                    >
                      <Text style={styles.trackNumber}>{track.number}</Text>
                      <View style={styles.trackInfo}>
                        <Text style={[styles.trackName, isActive && styles.trackNameActive]}>{track.name}</Text>
                        {isActive && (
                          <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${playbackProgress * 100}%` }]} />
                          </View>
                        )}
                      </View>
                      <Text style={styles.trackDuration}>{formatDuration(track.duration)}</Text>
                      <View style={styles.trackPlayBtn}>
                        {isLoading && isActive ? (
                          <ActivityIndicator size="small" color={SK('#ff0a0a')} />
                        ) : (
                          <Text style={[styles.trackPlayIcon, isActive && styles.trackPlayIconActive]}>
                            {isActive ? '\u25a0' : '\u25b6'}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <View style={styles.tipBox}>
                  <Text style={styles.tipText}>
                    {selectedAlbum.id === 'codes'
                      ? 'Previews are public 30s samples. Full album available on Apple Music.'
                      : selectedAlbum.id === 'mirrors'
                      ? 'Full tracks from the Mirrors album. Includes Here 2day Gone 2morrow.'
                      : selectedAlbum.id === '13'
                      ? 'Full tracks from the 13 album.'
                      : selectedAlbum.id === 'presence'
                      ? 'Full tracks from the Presence album.'
                      : 'Previews sourced from iTunes public lookup.'}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noTracksBox}>
                <Text style={styles.noTracksText}>Full album available for streaming.</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>SOUND • GODMODE SOUND • VINCE SINNOTT</Text>
          </View>

        </ScrollView>
      </View>
    </View>
  );
}

const styles = skinStyles({
  container: { flex: 1, backgroundColor: '#000000' },
  safeArea: { flex: 1 },
  scrollView: { flex: 1, paddingHorizontal: 16 },
  header: { paddingTop: 16, paddingBottom: 8 },
  terminalHeader: {
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0a0505',
  },
  terminalTitle: {
    color: '#ff0a0a',
    fontSize: 18,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 4,
  },
  subtitle: {
    color: '#5a1a1a',
    fontSize: 9,
    marginTop: 8,
    fontFamily: 'TerminatorRealNFI',
    textAlign: 'center',
    lineHeight: 14,
  },
  discographyBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ff0a0a',
    backgroundColor: '#150505',
    alignSelf: 'center',
    borderRadius: 4,
  },
  discographyBtnText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
    letterSpacing: 1,
  },
  freeAccessLabel: {
    color: '#00ff00',
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
  },
  externalNote: {
    color: '#3a1010',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 13,
    paddingHorizontal: 10,
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#ff0a0a40',
    backgroundColor: '#0a0505',
  },
  previewDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  previewBadgeText: {
    color: '#ff0a0a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  quickSelectSection: { marginTop: 14 },
  quickSelectLabel: {
    color: '#5a1a1a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    marginBottom: 6,
  },
  quickSelectRow: { gap: 6 },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
    borderRadius: 4,
  },
  quickChipActive: { borderColor: '#ff0a0a', backgroundColor: '#150505' },
  quickChipText: {
    color: '#5a1a1a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  quickChipTextActive: { color: '#ff0a0a' },
  /* ═══ BLOCKBUSTER SHELF STYLES ═══ */
  shelfSection: {
    marginTop: 18,
  },
  shelfTitle: {
    color: '#ff0a0a',
    fontSize: 11,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 14,
  },
  shelfContainer: {
    marginBottom: 16,
    position: 'relative' as const,
  },
  shelfBackWall: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 16,
    backgroundColor: '#060202',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderWidth: 1,
    borderColor: '#1a0808',
    borderBottomWidth: 0,
  },
  shelfRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-evenly' as const,
    alignItems: 'flex-end' as const,
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 8,
  },
  shelfEdge: {
    marginHorizontal: 0,
  },
  shelfEdgeLine: {
    height: 4,
    backgroundColor: '#ff0a0a',
    borderRadius: 1,
    shadowColor: '#ff0a0a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 8,
  },
  shelfEdgeBody: {
    height: 10,
    backgroundColor: '#120404',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#2a0a0a',
  },
  caseWrap: {
    alignItems: 'center' as const,
    width: '30%' as any,
    maxWidth: 110,
  },
  caseWrapSelected: {},
  caseBody: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: 3,
    overflow: 'hidden' as const,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
  },
  caseBodySelected: {
    borderColor: '#ff0a0a',
    borderWidth: 2,
  },
  caseCover: {
    width: '100%',
    height: '100%',
  },
  caseGlow: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: '#ff0a0a80',
    borderRadius: 2,
    backgroundColor: '#ff0a0a10',
  },
  caseLabel: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
    marginTop: 5,
    textAlign: 'center' as const,
    letterSpacing: 1,
  },
  caseLabelSelected: {
    color: '#ff0a0a',
  },
  caseTrackCount: {
    color: '#3a1010',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    textAlign: 'center' as const,
    marginTop: 1,
    letterSpacing: 1,
  },
  selectedSection: { marginTop: 20 },
  selectedHeader: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ff0a0a',
    backgroundColor: '#0a0505',
  },
  selectedCover: {
    width: 80,
    height: 80,
    borderWidth: 1,
    borderColor: '#ff0a0a40',
  },
  selectedInfo: { flex: 1, justifyContent: 'center' },
  selectedBadge: {
    color: '#ff0a0a',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
    marginBottom: 2,
  },
  selectedName: {
    color: '#ff0a0a',
    fontSize: 16,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  selectedArtist: {
    color: '#5a1a1a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    marginTop: 4,
  },
  freeAccessBadge: {
    marginTop: 8,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: '#00aa0020',
    borderWidth: 1,
    borderColor: '#00aa00',
    borderRadius: 3,
    alignSelf: 'flex-start',
  },
  freeAccessBadgeText: {
    color: '#00ff00',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  selectedBtnRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  buyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#ff0a0a',
    borderRadius: 3,
  },
  buyBtnText: {
    color: '#ff0a0a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  lockBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    borderRadius: 3,
  },
  lockBtnText: {
    color: '#5a1a1a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
  },
  trackList: { marginTop: 12 },
  trackListTitle: {
    color: '#ff0a0a',
    fontSize: 11,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
    marginBottom: 2,
  },
  trackListSub: {
    color: '#3a1010',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    marginBottom: 10,
  },
  trackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a0808',
    gap: 8,
  },
  trackRowActive: {
    backgroundColor: '#150505',
    borderBottomColor: '#ff0a0a40',
  },
  trackNumber: {
    color: '#5a1a1a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
    width: 20,
    textAlign: 'center',
  },
  trackInfo: { flex: 1 },
  trackName: {
    color: '#ff3040',
    fontSize: 11,
    fontFamily: 'TerminatorRealNFI',
  },
  trackNameActive: { color: '#ff0a0a', fontWeight: '700' },
  progressBar: {
    height: 2,
    backgroundColor: '#1a0808',
    marginTop: 4,
    borderRadius: 1,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#ff0a0a',
    borderRadius: 1,
  },
  trackDuration: {
    color: '#5a1a1a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    width: 35,
    textAlign: 'right',
  },
  trackPlayBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackPlayIcon: {
    color: '#ff0a0a',
    fontSize: 12,
  },
  trackPlayIconActive: {
    color: '#ff3040',
  },
  fullBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    borderRadius: 2,
  },
  fullBtnText: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
  },
  tipBox: {
    marginTop: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
  },
  tipText: {
    color: '#5a1a1a',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    textAlign: 'center',
    lineHeight: 14,
  },
  noTracksBox: {
    marginTop: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#2a0a0a',
    backgroundColor: '#0a0505',
    alignItems: 'center',
  },
  noTracksText: {
    color: '#5a1a1a',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
  },
  buyFullBtn: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ff0a0a',
  },
  buyFullBtnText: {
    color: '#ff0a0a',
    fontSize: 9,
    fontFamily: 'TerminatorRealNFI',
    fontWeight: '700',
  },
  footer: {
    marginTop: 24,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1a0808',
    alignItems: 'center',
  },
  footerText: {
    color: '#3a1010',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 2,
  },
});
