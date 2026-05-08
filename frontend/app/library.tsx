import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioEngine } from '../src/AudioEngine';
import { FREQUENCY_ARCHIVE, FrequencyEntry } from '../src/FrequencyArchiveData';
import MirrorsIdBanner from '../src/MirrorsIdBanner';

// ═══════════════════════════════════════════════
// VATICAN ARCHIVE — CATEGORY CODEX
// Latin nomenclature for each body system
// ═══════════════════════════════════════════════

const CATEGORY_CODEX: Record<string, { latin: string; glyph: string; order: number }> = {
  schumann:       { latin: 'RESONANTIA TERRAE', glyph: '⊕', order: 0 },
  brainwave:      { latin: 'FLUCTUS MENTIS',   glyph: '◎', order: 1 },
  solfeggio:      { latin: 'SOLFEGGIO SACRUM', glyph: '♱', order: 2 },
  blood:          { latin: 'SANGUIS',          glyph: '◉', order: 3 },
  bone:           { latin: 'CORPUS OSSEUM',    glyph: '⬡', order: 4 },
  cancer:         { latin: 'TUMOREM',          glyph: '⊗', order: 5 },
  cardiovascular: { latin: 'CARDIOVASCULUM',   glyph: '♡', order: 6 },
  dental:         { latin: 'DENTALIS',         glyph: '◇', order: 7 },
  detox:          { latin: 'PURIFICATIO',      glyph: '⟐', order: 8 },
  digestive:      { latin: 'DIGESTORIUM',      glyph: '◐', order: 9 },
  ear:            { latin: 'AUDITUS',          glyph: '◑', order: 10 },
  eye:            { latin: 'VISIO',            glyph: '◔', order: 11 },
  glands:         { latin: 'GLANDULAE',        glyph: '◍', order: 12 },
  health:         { latin: 'SALUS GENERALIS',  glyph: '✦', order: 13 },
  immune:         { latin: 'IMMUNITAS',        glyph: '⊛', order: 14 },
  kidney:         { latin: 'RENES',            glyph: '◈', order: 15 },
  mental:         { latin: 'ANIMUS',           glyph: '◬', order: 16 },
  nervous:        { latin: 'NERVORUM',         glyph: '⚡', order: 17 },
  pain:           { latin: 'DOLOR',            glyph: '✧', order: 18 },
  reproductive:   { latin: 'GENERATIO',        glyph: '⊙', order: 19 },
  respiratory:    { latin: 'SPIRITUS',         glyph: '◌', order: 20 },
  skin:           { latin: 'CUTIS',            glyph: '◻', order: 21 },
};

type ViewMode = 'archive' | 'alpha' | 'lab';

export default function LibraryScreen() {
  const [playingItem, setPlayingItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('archive');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [activeAlpha, setActiveAlpha] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    return () => { AudioEngine.stopMulti(); AudioEngine.stopAll(); };
  }, []);

  // ═══ DATA PROCESSING ═══
  const totalFreqs = FREQUENCY_ARCHIVE.length;

  const categorized = useMemo(() => {
    const map = new Map<string, FrequencyEntry[]>();
    FREQUENCY_ARCHIVE.forEach(entry => {
      const cat = entry.category || 'health';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(entry);
    });
    // Sort categories by codex order
    const sorted = [...map.entries()].sort((a, b) => {
      const oa = CATEGORY_CODEX[a[0]]?.order ?? 99;
      const ob = CATEGORY_CODEX[b[0]]?.order ?? 99;
      return oa - ob;
    });
    return sorted;
  }, []);

  const alphabetized = useMemo(() => {
    const map = new Map<string, FrequencyEntry[]>();
    FREQUENCY_ARCHIVE.forEach(entry => {
      const letter = entry.name.charAt(0).toUpperCase();
      if (!map.has(letter)) map.set(letter, []);
      map.get(letter)!.push(entry);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, []);

  const alphaLetters = useMemo(() => alphabetized.map(([l]) => l), [alphabetized]);

  const filteredArchive = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const q = searchQuery.toLowerCase();
    return FREQUENCY_ARCHIVE.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      e.frequencies.some(f => f.toString().includes(q))
    );
  }, [searchQuery]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    FREQUENCY_ARCHIVE.forEach(e => cats.add(e.category));
    return cats.size;
  }, []);

  // ═══ PLAYBACK ═══
  const handlePlayStack = (name: string, frequencies: number[]) => {
    if (frequencies.length === 0) return;
    if (playingItem === name) {
      AudioEngine.stopMulti();
      setPlayingItem(null);
    } else {
      AudioEngine.playMulti(frequencies, 0.3);
      setPlayingItem(name);
    }
  };

  const handleStop = () => {
    AudioEngine.stopMulti();
    AudioEngine.stopAll();
    setPlayingItem(null);
  };

  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  // ═══ RENDER HELPERS ═══
  const renderEntry = (entry: FrequencyEntry, idx: number) => {
    const key = `${entry.category}-${entry.name}-${idx}`;
    const isActive = playingItem === key;
    const codex = CATEGORY_CODEX[entry.category];
    return (
      <TouchableOpacity
        key={key}
        style={[s.entryCard, isActive && s.entryCardActive]}
        onPress={() => handlePlayStack(key, entry.frequencies)}
        activeOpacity={0.8}
      >
        <View style={s.entryTop}>
          <View style={s.entryNumCol}>
            <Text style={s.entryNum}>{String(idx + 1).padStart(3, '0')}</Text>
          </View>
          <View style={s.entryInfoCol}>
            <Text style={[s.entryName, isActive && s.entryNameActive]}>
              {entry.name}
            </Text>
            <View style={s.entryFreqRow}>
              {entry.frequencies.map((f, i) => (
                <Text key={i} style={[s.entryFreq, isActive && s.entryFreqActive]}>
                  {f}
                </Text>
              ))}
            </View>
          </View>
          <View style={s.entryPlayCol}>
            {isActive && <View style={s.entryLiveDot} />}
            <Text style={[s.entryPlay, isActive && s.entryPlayActive]}>
              {isActive ? '◼' : '▶'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderCategorySection = (cat: string, entries: FrequencyEntry[]) => {
    const codex = CATEGORY_CODEX[cat] || { latin: cat.toUpperCase(), glyph: '◈', order: 99 };
    const isExpanded = expandedCats.has(cat);
    const filtered = searchQuery.trim()
      ? entries.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
      : entries;
    if (searchQuery.trim() && filtered.length === 0) return null;

    return (
      <View key={cat} style={s.catSection}>
        <TouchableOpacity
          style={s.catHeader}
          onPress={() => toggleCategory(cat)}
          activeOpacity={0.8}
        >
          <View style={s.catHeaderLeft}>
            <Text style={s.catGlyph}>{codex.glyph}</Text>
            <View>
              <Text style={s.catLatin}>{codex.latin}</Text>
              <Text style={s.catCount}>{filtered.length} ENTRIES</Text>
            </View>
          </View>
          <Text style={s.catToggle}>{isExpanded ? '▾' : '▸'}</Text>
        </TouchableOpacity>
        {isExpanded && (
          <View style={s.catBody}>
            {/* Ornamental top border */}
            <View style={s.ornamentLine}>
              <View style={s.ornamentDash} />
              <Text style={s.ornamentDot}>◆</Text>
              <View style={s.ornamentDash} />
            </View>
            {filtered.map((entry, idx) => renderEntry(entry, idx))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      <View style={[s.safeArea, { paddingTop: insets.top }]}>
        <MirrorsIdBanner />
        {/* ═══ VATICAN HEADER ═══ */}
        <View style={s.header}>
          <View style={s.headerOrnament}>
            <View style={s.headerDash} />
            <Text style={s.headerDot}>◆</Text>
            <View style={s.headerDash} />
          </View>
          <Text style={s.headerTitle}>FREQUENCY ARCHIVE</Text>
          <Text style={s.headerSub}>CONSOLIDATED ANNOTATED FREQUENCY LIST</Text>
          <View style={s.headerStats}>
            <Text style={s.headerStat}>{totalFreqs} FREQUENCIES</Text>
            <Text style={s.headerStatDiv}>•</Text>
            <Text style={s.headerStat}>{uniqueCategories} CODICES</Text>
            <Text style={s.headerStatDiv}>•</Text>
            <Text style={s.headerStat}>432Hz CALIBRATED</Text>
          </View>
          <View style={s.headerOrnament}>
            <View style={s.headerDash} />
            <Text style={s.headerDot}>◆</Text>
            <View style={s.headerDash} />
          </View>
        </View>

        {/* ═══ SEARCH ═══ */}
        <View style={s.searchBar}>
          <Text style={s.searchGlyph}>⊕</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search conditions, frequencies..."
            placeholderTextColor="#3a1010"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={s.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ VIEW TABS ═══ */}
        <View style={s.viewTabs}>
          {([
            { id: 'archive' as ViewMode, label: 'CODEX' },
            { id: 'alpha' as ViewMode, label: 'A-Z' },
            { id: 'lab' as ViewMode, label: 'LAB' },
          ]).map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[s.viewTab, viewMode === tab.id && s.viewTabActive]}
              onPress={() => setViewMode(tab.id)}
            >
              <Text style={[s.viewTabText, viewMode === tab.id && s.viewTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ NOW PLAYING ═══ */}
        {playingItem && (
          <View style={s.nowPlaying}>
            <View style={s.npDot} />
            <Text style={s.npText} numberOfLines={1}>
              TRANSMITTING: {playingItem.split('-').slice(1).join('-')}
            </Text>
            <TouchableOpacity onPress={handleStop}>
              <Text style={s.npStop}>◼ STOP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ CONTENT ═══ */}
        <View style={s.contentWrap}>
          {/* Alpha sidebar for A-Z view */}
          {viewMode === 'alpha' && (
            <View style={s.alphaSidebar}>
              <ScrollView showsVerticalScrollIndicator={false}>
                {alphaLetters.map(letter => (
                  <TouchableOpacity
                    key={letter}
                    style={[s.alphaBtn, activeAlpha === letter && s.alphaBtnActive]}
                    onPress={() => setActiveAlpha(activeAlpha === letter ? null : letter)}
                  >
                    <Text style={[s.alphaLetter, activeAlpha === letter && s.alphaLetterActive]}>
                      {letter}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <ScrollView
            style={s.scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          >
            {/* Search Results */}
            {filteredArchive ? (
              <View>
                <Text style={s.resultLabel}>
                  {filteredArchive.length} RESULTS FOR "{searchQuery.toUpperCase()}"
                </Text>
                {filteredArchive.map((entry, idx) => renderEntry(entry, idx))}
                {filteredArchive.length === 0 && (
                  <Text style={s.emptyText}>No conditions found in the archive.</Text>
                )}
              </View>
            ) : viewMode === 'archive' ? (
              /* ═══ CODEX VIEW — By Category ═══ */
              <View>
                {categorized.map(([cat, entries]) => renderCategorySection(cat, entries))}
              </View>
            ) : viewMode === 'alpha' ? (
              /* ═══ A-Z VIEW ═══ */
              <View>
                {alphabetized
                  .filter(([letter]) => !activeAlpha || letter === activeAlpha)
                  .map(([letter, entries]) => (
                    <View key={letter} style={s.alphaSection}>
                      <View style={s.alphaSectionHeader}>
                        <Text style={s.alphaSectionLetter}>{letter}</Text>
                        <View style={s.alphaSectionLine} />
                        <Text style={s.alphaSectionCount}>{entries.length}</Text>
                      </View>
                      {entries.map((entry, idx) => renderEntry(entry, idx))}
                    </View>
                  ))}
              </View>
            ) : (
              /* ═══ LAB VIEW ═══ */
              <View>
                <Text style={s.labTitle}>FREQUENCY LAB</Text>
                <Text style={s.labSub}>Quick access stacks & presets</Text>

                {/* Solfeggio */}
                <View style={s.labSection}>
                  <Text style={s.labSectionTitle}>♱ SOLFEGGIO SACRUM</Text>
                  {[174, 285, 396, 417, 432, 528, 639, 741, 852, 963].map(f => {
                    const key = `sol-${f}`;
                    const isActive = playingItem === key;
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[s.labRow, isActive && s.labRowActive]}
                        onPress={() => handlePlayStack(key, [f])}
                      >
                        <Text style={[s.labRowPlay, isActive && s.labRowPlayActive]}>
                          {isActive ? '◼' : '▶'}
                        </Text>
                        <Text style={s.labRowFreq}>{f} Hz</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Schumann */}
                <View style={s.labSection}>
                  <Text style={s.labSectionTitle}>⊕ RESONANTIA TERRAE</Text>
                  {[7.83, 14.3, 20.8, 27.3, 33.8].map(f => {
                    const key = `sch-${f}`;
                    const isActive = playingItem === key;
                    return (
                      <TouchableOpacity
                        key={f}
                        style={[s.labRow, isActive && s.labRowActive]}
                        onPress={() => handlePlayStack(key, [f])}
                      >
                        <Text style={[s.labRowPlay, isActive && s.labRowPlayActive]}>
                          {isActive ? '◼' : '▶'}
                        </Text>
                        <Text style={s.labRowFreq}>{f} Hz — Schumann</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Mood Stacks */}
                <View style={s.labSection}>
                  <Text style={s.labSectionTitle}>✦ MOOD STACKS</Text>
                  {[
                    { name: 'CALM', freqs: [432, 528, 7.83] },
                    { name: 'SAVAGE', freqs: [396, 417, 741, 40, 20] },
                    { name: 'RAMPED UP', freqs: [417, 639, 963, 40] },
                    { name: 'BLISS', freqs: [528, 639, 963, 432, 285] },
                    { name: 'EUPHORIA', freqs: [528, 639, 963, 432, 285, 174] },
                    { name: 'HAPPY', freqs: [528, 639, 963, 432] },
                  ].map(mood => {
                    const key = `mood-${mood.name}`;
                    const isActive = playingItem === key;
                    return (
                      <TouchableOpacity
                        key={mood.name}
                        style={[s.labRow, isActive && s.labRowActive]}
                        onPress={() => handlePlayStack(key, mood.freqs)}
                      >
                        <Text style={[s.labRowPlay, isActive && s.labRowPlayActive]}>
                          {isActive ? '◼' : '▶'}
                        </Text>
                        <Text style={s.labRowFreq}>{mood.name}</Text>
                        <Text style={s.labRowMeta}>{mood.freqs.length} layers</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════
// STYLES — VATICAN ARCHIVE AESTHETIC
// ═══════════════════════════════════════════════

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  safeArea: { flex: 1 },

  // Header
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, alignItems: 'center' },
  headerOrnament: { flexDirection: 'row', alignItems: 'center', gap: 8, width: '100%', marginVertical: 4 },
  headerDash: { flex: 1, height: 1, backgroundColor: '#2a0a0a' },
  headerDot: { color: '#ff0a0a', fontSize: 6 },
  headerTitle: { color: '#ff0a0a', fontSize: 18, fontWeight: '700', letterSpacing: 4, marginTop: 4 },
  headerSub: { color: '#5a1a1a', fontSize: 8, letterSpacing: 2, marginTop: 2 },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  headerStat: { color: '#3a1010', fontSize: 8, letterSpacing: 1 },
  headerStatDiv: { color: '#2a0a0a', fontSize: 8 },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginVertical: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#050303',
  },
  searchGlyph: { color: '#ff0a0a', fontSize: 12, marginRight: 8 },
  searchInput: { flex: 1, color: '#ff0a0a', fontSize: 11 },
  searchClear: { color: '#5a1a1a', fontSize: 14, paddingLeft: 8 },

  // View Tabs
  viewTabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 6, gap: 4,
  },
  viewTab: {
    flex: 1, paddingVertical: 7, alignItems: 'center',
    borderWidth: 1, borderColor: '#1a0808', backgroundColor: '#050303',
  },
  viewTabActive: { borderColor: '#ff0a0a', backgroundColor: '#0a0505' },
  viewTabText: { color: '#3a1010', fontSize: 9, fontWeight: '700', letterSpacing: 2 },
  viewTabTextActive: { color: '#ff0a0a' },

  // Now Playing
  nowPlaying: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginBottom: 4, paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#100505', borderWidth: 1, borderColor: '#ff0a0a40', gap: 6,
  },
  npDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff0a0a' },
  npText: { flex: 1, color: '#ff0a0a', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  npStop: { color: '#ff3040', fontSize: 9, fontWeight: '700' },

  // Content
  contentWrap: { flex: 1, flexDirection: 'row' },
  scroll: { flex: 1, paddingHorizontal: 16 },

  // Search results
  resultLabel: { color: '#5a1a1a', fontSize: 9, marginVertical: 8, letterSpacing: 1 },
  emptyText: { color: '#3a1010', fontSize: 10, textAlign: 'center', marginTop: 40 },

  // ═══ CODEX VIEW ═══
  catSection: { marginBottom: 4 },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, paddingHorizontal: 10,
    borderWidth: 1, borderColor: '#1a0808', backgroundColor: '#050303',
  },
  catHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catGlyph: { color: '#ff0a0a', fontSize: 16, width: 22, textAlign: 'center' },
  catLatin: { color: '#ff0a0a', fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  catCount: { color: '#3a1010', fontSize: 8, marginTop: 1, letterSpacing: 1 },
  catToggle: { color: '#5a1a1a', fontSize: 14, width: 20, textAlign: 'center' },
  catBody: { paddingLeft: 2, borderLeftWidth: 1, borderLeftColor: '#1a0808' },

  // Ornament
  ornamentLine: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8 },
  ornamentDash: { flex: 1, height: 1, backgroundColor: '#1a0808' },
  ornamentDot: { color: '#2a0a0a', fontSize: 5 },

  // Entry Card
  entryCard: {
    flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#0a0505',
  },
  entryCardActive: { backgroundColor: '#100505', borderBottomColor: '#ff0a0a30' },
  entryTop: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  entryNumCol: { width: 32 },
  entryNum: { color: '#2a0a0a', fontSize: 8, letterSpacing: 1 },
  entryInfoCol: { flex: 1 },
  entryName: { color: '#ff3040', fontSize: 11, fontWeight: '600' },
  entryNameActive: { color: '#ff0a0a' },
  entryFreqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 3 },
  entryFreq: {
    color: '#3a1010', fontSize: 8, backgroundColor: '#050303',
    paddingHorizontal: 4, paddingVertical: 1, borderWidth: 1, borderColor: '#1a0808',
  },
  entryFreqActive: { color: '#ff0a0a', borderColor: '#ff0a0a40' },
  entryPlayCol: { width: 30, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  entryLiveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ff0a0a' },
  entryPlay: { color: '#5a1a1a', fontSize: 12 },
  entryPlayActive: { color: '#ff0a0a' },

  // ═══ ALPHA VIEW ═══
  alphaSidebar: {
    width: 24, borderRightWidth: 1, borderRightColor: '#1a0808', paddingTop: 4,
  },
  alphaBtn: { paddingVertical: 3, alignItems: 'center' },
  alphaBtnActive: { backgroundColor: '#150505' },
  alphaLetter: { color: '#3a1010', fontSize: 9, fontWeight: '700' },
  alphaLetterActive: { color: '#ff0a0a' },
  alphaSection: { marginBottom: 12 },
  alphaSectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 6, marginBottom: 4,
  },
  alphaSectionLetter: { color: '#ff0a0a', fontSize: 22, fontWeight: '700', width: 28 },
  alphaSectionLine: { flex: 1, height: 1, backgroundColor: '#2a0a0a' },
  alphaSectionCount: { color: '#3a1010', fontSize: 8 },

  // ═══ LAB VIEW ═══
  labTitle: { color: '#ff0a0a', fontSize: 16, fontWeight: '700', letterSpacing: 3, marginTop: 8 },
  labSub: { color: '#5a1a1a', fontSize: 9, marginTop: 2, marginBottom: 14 },
  labSection: { marginBottom: 20 },
  labSectionTitle: {
    color: '#ff0a0a', fontSize: 10, fontWeight: '700', letterSpacing: 2,
    paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#1a0808', marginBottom: 6,
  },
  labRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 8, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#0a0505',
  },
  labRowActive: { backgroundColor: '#100505', borderBottomColor: '#ff0a0a30' },
  labRowPlay: { color: '#5a1a1a', fontSize: 11, width: 16 },
  labRowPlayActive: { color: '#ff0a0a' },
  labRowFreq: { color: '#ff3040', fontSize: 11, flex: 1 },
  labRowMeta: { color: '#3a1010', fontSize: 8 },
});
