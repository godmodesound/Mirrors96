import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, ImageBackground, TextInput, ActivityIndicator, Linking, Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import MirrorsIdBanner from '../src/MirrorsIdBanner';

import { skinStyles, SK } from '../src/skins';

const API_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL ||
  process.env.EXPO_PUBLIC_BACKEND_URL || '';
const SCREEN_WIDTH = Dimensions.get('window').width;

interface StoreAlbum {
  id: string;
  name: string;
  artist: string;
  description: string;
  price_cents: number;
  cover_url: string;
  tracklist: string[];
  preview_urls: string[];
}

interface Purchase {
  purchase_id: string;
  album_id: string;
  album_name: string;
  amount_cents: number;
  purchased_at: string;
  cover_url: string;
  tracklist: string[];
  download_urls: string[];
  preview_urls: string[];
}

type StoreView = 'shop' | 'album' | 'success' | 'library' | 'admin';

export default function StoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [view, setView] = useState<StoreView>('shop');
  const [albums, setAlbums] = useState<StoreAlbum[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<StoreAlbum | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [libraryEmail, setLibraryEmail] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [playingIdx, setPlayingIdx] = useState(-1);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  // Admin
  const [adminAuth, setAdminAuth] = useState(false);
  const [adminPass, setAdminPass] = useState('');
  const [adminAlbums, setAdminAlbums] = useState<any[]>([]);
  const [adminPurchases, setAdminPurchases] = useState<any[]>([]);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    fetchAlbums();
    // Check for success redirect
    const sessionId = params.session_id as string;
    if (sessionId) {
      verifySession(sessionId);
    }
  }, []);

  useEffect(() => {
    return () => { stopAudio(); };
  }, []);

  const fetchAlbums = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/store/albums`);
      const data = await res.json();
      setAlbums(data.albums || []);
    } catch (e) {}
    setLoading(false);
  };

  const verifySession = async (sessionId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/store/verify-session/${sessionId}`);
      const data = await res.json();
      if (data.status === 'paid') {
        setSuccessData(data);
        setView('success');
      }
    } catch (e) {}
  };

  const handleBuy = async (album: StoreAlbum) => {
    if (!email.trim()) {
      return;
    }
    setCheckoutLoading(true);
    try {
      const baseUrl = Platform.OS === 'web'
        ? window.location.origin
        : `${API_URL}`;
      const res = await fetch(`${API_URL}/api/store/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album_id: album.id,
          email: email.trim(),
          success_url: `${baseUrl}/store?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${baseUrl}/store`,
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
    } catch (e) {}
    setCheckoutLoading(false);
  };

  const fetchLibrary = async () => {
    if (!libraryEmail.trim()) return;
    setLibraryLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/store/library/${libraryEmail.trim().toLowerCase()}`);
      const data = await res.json();
      setPurchases(data.purchases || []);
    } catch (e) {}
    setLibraryLoading(false);
  };

  const playPreview = async (url: string, idx: number) => {
    await stopAudio();
    if (playingIdx === idx) { setPlayingIdx(-1); return; }
    try {
      const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
      soundRef.current = sound;
      setPlayingIdx(idx);
      sound.setOnPlaybackStatusUpdate((s: any) => {
        if (s.isLoaded && s.didJustFinish) { setPlayingIdx(-1); sound.unloadAsync(); }
      });
    } catch (e) { setPlayingIdx(-1); }
  };

  const stopAudio = async () => {
    if (soundRef.current) {
      try { await soundRef.current.stopAsync(); await soundRef.current.unloadAsync(); } catch (e) {}
      soundRef.current = null;
    }
    setPlayingIdx(-1);
  };

  // Admin
  const adminLogin = async () => {
    try {
      const res = await fetch(`${API_URL}/api/store/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPass }),
      });
      if (res.ok) {
        setAdminAuth(true);
        fetchAdminData();
      }
    } catch (e) {}
  };

  const fetchAdminData = async () => {
    try {
      const [aRes, pRes] = await Promise.all([
        fetch(`${API_URL}/api/store/admin/albums`),
        fetch(`${API_URL}/api/store/admin/purchases`),
      ]);
      const aData = await aRes.json();
      const pData = await pRes.json();
      setAdminAlbums(aData.albums || []);
      setAdminPurchases(pData.purchases || []);
    } catch (e) {}
  };

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // ═══════════════════════════════════
  // RENDER VIEWS
  // ═══════════════════════════════════

  const renderNav = () => (
    <View style={styles.nav}>
      <TouchableOpacity onPress={() => router.back()} style={styles.navBtn}>
        <Text style={styles.navBtnText}>◁</Text>
      </TouchableOpacity>
      <View style={styles.navCenter}>
        <Text style={styles.navTitle}>GODMODE STORE</Text>
      </View>
      <View style={styles.navLinks}>
        {(['shop', 'library', 'admin'] as StoreView[]).map(v => (
          <TouchableOpacity key={v} onPress={() => setView(v)}>
            <Text style={[styles.navLink, view === v && styles.navLinkActive]}>
              {v.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderShop = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
      <Text style={styles.heroTitle}>DIGITAL RELEASES</Text>
      <Text style={styles.heroSub}>432Hz tuned. Mastered for consciousness.</Text>
      <View style={styles.albumGrid}>
        {Array.from({ length: Math.ceil(albums.length / 2) }, (_, rowIdx) => (
          <View key={rowIdx} style={styles.albumRow}>
            {albums.slice(rowIdx * 2, rowIdx * 2 + 2).map(album => (
              <TouchableOpacity
                key={album.id}
                style={styles.albumCard}
                onPress={() => { setSelectedAlbum(album); setView('album'); }}
                activeOpacity={0.85}
              >
                <View style={styles.albumCoverWrap}>
                  {album.cover_url ? (
                    <Image source={{ uri: album.cover_url }} style={styles.albumCover} resizeMode="cover" />
                  ) : (
                    <View style={[styles.albumCover, { backgroundColor: SK('#1a0808'), justifyContent: 'center', alignItems: 'center' }]}>
                      <Text style={{ color: SK('#ff0a0a'), fontSize: 8 }}>{album.name}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.albumMeta}>
                  <Text style={styles.albumName}>{album.name}</Text>
                  <Text style={styles.albumArtist}>{album.artist}</Text>
                  <View style={styles.albumBottom}>
                    <Text style={styles.albumFreeTag}>FREE</Text>
                    <Text style={styles.albumTracks}>{album.tracklist.length} TRK</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderAlbum = () => {
    if (!selectedAlbum) return null;
    const a = selectedAlbum;
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <TouchableOpacity onPress={() => setView('shop')}>
          <Text style={styles.backLink}>◁ BACK TO SHOP</Text>
        </TouchableOpacity>
        <Image source={{ uri: a.cover_url }} style={styles.detailCover} resizeMode="cover" />
        <Text style={styles.detailTitle}>{a.name}</Text>
        <Text style={styles.detailArtist}>{a.artist}</Text>
        <Text style={styles.detailDesc}>{a.description}</Text>
        <View style={styles.freeAccessBanner}>
          <Text style={styles.freeAccessText}>FREE STREAMING ACCESS</Text>
        </View>

        {/* Tracklist */}
        <Text style={styles.sectionLabel}>TRACKLIST</Text>
        <View style={styles.tracklistSection}>
          {a.tracklist.map((track, i) => (
            <View key={i} style={styles.trackRow}>
              <Text style={styles.trackNum}>{String(i + 1).padStart(2, '0')}</Text>
              <Text style={styles.trackName}>{track}</Text>
              {a.preview_urls[i] && (
                <TouchableOpacity onPress={() => playPreview(a.preview_urls[i], i)}>
                  <Text style={[styles.trackPlay, playingIdx === i && styles.trackPlaying]}>
                    {playingIdx === i ? '◼' : '▶'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderSuccess = () => (
    <ScrollView style={styles.content} contentContainerStyle={styles.successContainer}>
      <Text style={styles.successIcon}>◈</Text>
      <Text style={styles.successTitle}>PURCHASE COMPLETE</Text>
      {successData && (
        <>
          <Text style={styles.successAlbum}>{successData.album_name}</Text>
          <Text style={styles.successEmail}>Access granted to: {successData.email}</Text>
        </>
      )}
      <Text style={styles.successNote}>
        Your album is now in your vault. Enter your email in the Library to access streaming and downloads.
      </Text>
      <TouchableOpacity style={styles.successBtn} onPress={() => { setLibraryEmail(successData?.email || ''); setView('library'); fetchLibrary(); }}>
        <Text style={styles.successBtnText}>GO TO YOUR VAULT</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.successBtnAlt} onPress={() => setView('shop')}>
        <Text style={styles.successBtnAltText}>CONTINUE SHOPPING</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderLibrary = () => (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
      <Text style={styles.vaultTitle}>YOUR VAULT</Text>
      <Text style={styles.vaultSub}>Enter your purchase email to access your library</Text>
      <View style={styles.vaultEmailRow}>
        <TextInput
          style={styles.emailInput}
          placeholder="EMAIL ADDRESS"
          placeholderTextColor={SK('#5a1a1a')}
          value={libraryEmail}
          onChangeText={setLibraryEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.vaultSearchBtn} onPress={fetchLibrary}>
          {libraryLoading ? (
            <ActivityIndicator color={SK('#ff0a0a')} size="small" />
          ) : (
            <Text style={styles.vaultSearchText}>ACCESS</Text>
          )}
        </TouchableOpacity>
      </View>
      {purchases.length > 0 ? (
        <View style={styles.purchasesList}>
          {purchases.map(p => (
            <View key={p.purchase_id} style={styles.purchaseCard}>
              <Image source={{ uri: p.cover_url }} style={styles.purchaseCover} resizeMode="cover" />
              <View style={styles.purchaseInfo}>
                <Text style={styles.purchaseName}>{p.album_name}</Text>
                <Text style={styles.purchaseDate}>
                  Purchased {new Date(p.purchased_at).toLocaleDateString()}
                </Text>
                <Text style={styles.purchaseAmount}>{formatPrice(p.amount_cents)}</Text>
              </View>
              <View style={styles.purchaseTracks}>
                <Text style={styles.purchaseTracksLabel}>YOUR TRACKS</Text>
                {p.tracklist.map((t, i) => (
                  <View key={i} style={styles.purchaseTrackRow}>
                    <Text style={styles.purchaseTrackName}>{t}</Text>
                    {p.preview_urls[i] && (
                      <TouchableOpacity onPress={() => playPreview(p.preview_urls[i], 1000 + i)}>
                        <Text style={[styles.trackPlay, playingIdx === 1000 + i && styles.trackPlaying]}>
                          {playingIdx === 1000 + i ? '◼' : '▶'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {p.download_urls[i] && (
                      <TouchableOpacity onPress={() => Linking.openURL(`${API_URL}/api/store/download/${p.purchase_id}/${i}`)}>
                        <Text style={styles.downloadBtn}>↓</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : libraryEmail && !libraryLoading ? (
        <View style={styles.emptyVault}>
          <Text style={styles.emptyVaultText}>No purchases found for this email.</Text>
          <TouchableOpacity onPress={() => setView('shop')}>
            <Text style={styles.emptyVaultLink}>BROWSE STORE</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );

  const renderAdmin = () => {
    if (!adminAuth) {
      return (
        <View style={[styles.content, styles.adminLogin]}>
          <Text style={styles.adminTitle}>ADMIN ACCESS</Text>
          <TextInput
            style={styles.emailInput}
            placeholder="ADMIN PASSWORD"
            placeholderTextColor={SK('#5a1a1a')}
            value={adminPass}
            onChangeText={setAdminPass}
            secureTextEntry
          />
          <TouchableOpacity style={styles.buyBtn} onPress={adminLogin}>
            <Text style={styles.buyBtnText}>ENTER</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        <Text style={styles.adminTitle}>ADMIN DASHBOARD</Text>
        <Text style={styles.sectionLabel}>ALBUMS ({adminAlbums.length})</Text>
        {adminAlbums.map(a => (
          <View key={a.id} style={styles.adminAlbumRow}>
            <Image source={{ uri: a.cover_url }} style={styles.adminThumb} resizeMode="cover" />
            <View style={styles.adminAlbumInfo}>
              <Text style={styles.adminAlbumName}>{a.name}</Text>
              <Text style={styles.adminAlbumMeta}>{formatPrice(a.price_cents)} • {a.tracklist.length} tracks • {a.is_published ? 'LIVE' : 'DRAFT'}</Text>
              <Text style={styles.adminAlbumMeta}>Downloads: {a.download_urls?.length || 0} files</Text>
            </View>
          </View>
        ))}
        <View style={styles.adminDivider} />
        <Text style={styles.sectionLabel}>RECENT PURCHASES ({adminPurchases.length})</Text>
        {adminPurchases.map(p => (
          <View key={p.id} style={styles.adminPurchaseRow}>
            <Text style={styles.adminPEmail}>{p.customer_email}</Text>
            <Text style={styles.adminPAlbum}>{p.album_name}</Text>
            <Text style={styles.adminPAmount}>{formatPrice(p.amount_cents)}</Text>
            <Text style={styles.adminPDate}>{new Date(p.created_at).toLocaleDateString()}</Text>
          </View>
        ))}
        {adminPurchases.length === 0 && (
          <Text style={styles.emptyVaultText}>No purchases yet.</Text>
        )}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={SK('#ff0a0a')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.safeArea, { paddingTop: insets.top }]}>
        <MirrorsIdBanner />
        {renderNav()}
        {view === 'shop' && renderShop()}
        {view === 'album' && renderAlbum()}
        {view === 'success' && renderSuccess()}
        {view === 'library' && renderLibrary()}
        {view === 'admin' && renderAdmin()}
      </View>
    </View>
  );
}

const styles = skinStyles({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },
  loadingContainer: { justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, paddingHorizontal: 16 },

  // Nav
  nav: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#1a0808',
  },
  navBtn: { padding: 8 },
  navBtnText: { color: '#ff0a0a', fontSize: 16, fontWeight: '700' },
  navCenter: { flex: 1, alignItems: 'center' },
  navTitle: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', letterSpacing: 3 },
  navLinks: { flexDirection: 'row', gap: 10 },
  navLink: { color: '#3a1010', fontSize: 8, fontWeight: '700', letterSpacing: 1 },
  navLinkActive: { color: '#ff0a0a' },

  // Hero
  heroTitle: { color: '#ff0a0a', fontSize: 22, fontWeight: '700', letterSpacing: 4, marginTop: 24, textAlign: 'center' },
  heroSub: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, marginTop: 4, textAlign: 'center', marginBottom: 20 },

  // Album Grid
  albumGrid: { gap: 10, marginTop: 4 },
  albumRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  albumCard: {
    width: 170, borderWidth: 1, borderColor: '#1a0808',
    backgroundColor: '#050303', overflow: 'hidden',
  },
  albumCoverWrap: { width: 170, height: 170, overflow: 'hidden' },
  albumCover: { width: 170, height: 170, backgroundColor: '#0a0505' },
  albumMeta: { padding: 8 },
  albumName: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  albumArtist: { color: '#5a1a1a', fontSize: 8, marginTop: 2 },
  albumBottom: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  albumPrice: { color: '#ff3040', fontSize: 12, fontWeight: '700' },
  albumFreeTag: { color: '#00ff00', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  albumTracks: { color: '#3a1010', fontSize: 8 },

  // Album Detail
  backLink: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', marginTop: 12, marginBottom: 16 },
  detailCover: { width: '100%', height: 300, backgroundColor: '#0a0505', borderWidth: 1, borderColor: '#1a0808' },
  detailTitle: { color: '#ff0a0a', fontSize: 24, fontWeight: '700', letterSpacing: 3, marginTop: 16 },
  detailArtist: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2, marginTop: 4 },
  detailDesc: { color: '#5a1a1a', fontSize: 11, lineHeight: 18, marginTop: 12 },
  detailPrice: { color: '#ff0a0a', fontSize: 28, fontWeight: '700', marginTop: 16 },
  freeAccessBanner: { 
    marginTop: 16, 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    backgroundColor: '#00aa0020', 
    borderWidth: 1, 
    borderColor: '#00aa00',
    alignItems: 'center',
  },
  freeAccessText: { 
    color: '#00ff00', 
    fontSize: 14, 
    fontWeight: '900', 
    letterSpacing: 3 
  },

  // Buy Section
  buySection: { marginTop: 16, gap: 10 },
  emailInput: {
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#0a0505',
    paddingHorizontal: 14, paddingVertical: 12, color: '#ff0a0a',
    fontSize: 12, letterSpacing: 1,
  },
  buyBtn: {
    backgroundColor: '#ff0a0a', paddingVertical: 16, alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: { color: '#000', fontSize: 13, fontWeight: '700', letterSpacing: 2 },

  // Tracklist
  sectionLabel: { color: '#5a1a1a', fontSize: 10, fontWeight: '700', letterSpacing: 2, marginTop: 24, marginBottom: 10 },
  tracklistSection: { gap: 1 },
  trackRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#0a0505',
  },
  trackNum: { color: '#3a1010', fontSize: 10, width: 22 },
  trackName: { color: '#ff3040', fontSize: 11, flex: 1 },
  trackPlay: { color: '#5a1a1a', fontSize: 14, width: 24, textAlign: 'center' },
  trackPlaying: { color: '#ff0a0a' },

  // Success
  successContainer: { alignItems: 'center', paddingTop: 60 },
  successIcon: { color: '#ff0a0a', fontSize: 60, marginBottom: 16 },
  successTitle: { color: '#ff0a0a', fontSize: 20, fontWeight: '700', letterSpacing: 3, marginBottom: 12 },
  successAlbum: { color: '#ff3040', fontSize: 16, fontWeight: '700', letterSpacing: 2 },
  successEmail: { color: '#5a1a1a', fontSize: 10, marginTop: 8 },
  successNote: { color: '#3a1010', fontSize: 10, textAlign: 'center', marginTop: 20, lineHeight: 16, paddingHorizontal: 20 },
  successBtn: { backgroundColor: '#ff0a0a', paddingHorizontal: 32, paddingVertical: 14, marginTop: 24 },
  successBtnText: { color: '#000', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  successBtnAlt: { borderWidth: 1, borderColor: '#2a0a0a', paddingHorizontal: 32, paddingVertical: 14, marginTop: 10 },
  successBtnAltText: { color: '#5a1a1a', fontSize: 10, letterSpacing: 2 },

  // Vault / Library
  vaultTitle: { color: '#ff0a0a', fontSize: 20, fontWeight: '700', letterSpacing: 3, marginTop: 24, textAlign: 'center' },
  vaultSub: { color: '#5a1a1a', fontSize: 10, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  vaultEmailRow: { gap: 8 },
  vaultSearchBtn: {
    borderWidth: 1, borderColor: '#ff0a0a', paddingVertical: 12, alignItems: 'center',
  },
  vaultSearchText: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  purchasesList: { marginTop: 20, gap: 16 },
  purchaseCard: { borderWidth: 1, borderColor: '#1a0808', overflow: 'hidden', backgroundColor: '#050303' },
  purchaseCover: { width: '100%', aspectRatio: 2.5, backgroundColor: '#0a0505' },
  purchaseInfo: { padding: 12 },
  purchaseName: { color: '#ff0a0a', fontSize: 14, fontWeight: '700', letterSpacing: 2 },
  purchaseDate: { color: '#3a1010', fontSize: 9, marginTop: 4 },
  purchaseAmount: { color: '#5a1a1a', fontSize: 10, marginTop: 2 },
  purchaseTracks: { padding: 12, borderTopWidth: 1, borderTopColor: '#1a0808' },
  purchaseTracksLabel: { color: '#5a1a1a', fontSize: 9, fontWeight: '700', letterSpacing: 1, marginBottom: 8 },
  purchaseTrackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, gap: 8 },
  purchaseTrackName: { color: '#ff3040', fontSize: 10, flex: 1 },
  downloadBtn: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', width: 24, textAlign: 'center' },

  // Empty vault
  emptyVault: { alignItems: 'center', paddingTop: 40 },
  emptyVaultText: { color: '#3a1010', fontSize: 11, marginBottom: 12 },
  emptyVaultLink: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2 },

  // Admin
  adminLogin: { justifyContent: 'center', alignItems: 'center', gap: 12, paddingTop: 100 },
  adminTitle: { color: '#ff0a0a', fontSize: 18, fontWeight: '700', letterSpacing: 3, marginTop: 20, marginBottom: 12, textAlign: 'center' },
  adminAlbumRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: '#0a0505',
  },
  adminThumb: { width: 48, height: 48, backgroundColor: '#0a0505' },
  adminAlbumInfo: { flex: 1 },
  adminAlbumName: { color: '#ff0a0a', fontSize: 11, fontWeight: '700' },
  adminAlbumMeta: { color: '#3a1010', fontSize: 8, marginTop: 2 },
  adminDivider: { height: 1, backgroundColor: '#1a0808', marginVertical: 16 },
  adminPurchaseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6,
    borderBottomWidth: 1, borderBottomColor: '#0a0505', flexWrap: 'wrap',
  },
  adminPEmail: { color: '#ff3040', fontSize: 9, flex: 1 },
  adminPAlbum: { color: '#5a1a1a', fontSize: 9 },
  adminPAmount: { color: '#ff0a0a', fontSize: 9, fontWeight: '700' },
  adminPDate: { color: '#3a1010', fontSize: 8 },
});
