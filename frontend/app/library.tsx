import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Dimensions, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AudioEngine } from '../src/AudioEngine';
import { FREQUENCY_ARCHIVE, FrequencyEntry } from '../src/FrequencyArchiveData';
import MirrorsIdBanner from '../src/MirrorsIdBanner';
import DisclaimerFooter from '../src/DisclaimerFooter';
import CodesLabShared, { loadFrequencyToLab } from '../src/CodesLabShared';

// ═══ EVIDENCE-BASED UX PRIMITIVES ═══
// Doherty <400ms: fire haptic + visual pulse on any user tap.
// Fitts's Law: primary tap target ≥ 48pt height.
// Hick's Law: single primary action per entry (tap = play+load; long-press = preview).
const tick = () => { if (Platform.OS !== 'web') { try { Haptics.selectionAsync(); } catch {} } };
const pulse = () => { if (Platform.OS !== 'web') { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {} } };

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
  body:         { latin: 'CORPUS GENERALIS',  glyph: '✦', order: 13 },
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
  // $-Codes tier — scalar-augmented GodMode generator (engine-wide flag)
  const [godTier, setGodTier] = useState(AudioEngine.getGodMode());
  const setTier = (on: boolean) => {
    setGodTier(on);
    AudioEngine.setGodMode(on);
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('alpha');
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());
  const [activeAlpha, setActiveAlpha] = useState<string | null>(null);
  const [showCodesLab, setShowCodesLab] = useState(true);
  const [codesLabKey, setCodesLabKey] = useState(0); // Force refresh
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Audio persists across pages for universal sync (harmonic layering).
  // Users stop audio via explicit STOP controls, not by navigation.

  // ═══ DATA PROCESSING ═══
  const totalFreqs = FREQUENCY_ARCHIVE.length;

  const categorized = useMemo(() => {
    const map = new Map<string, FrequencyEntry[]>();
    FREQUENCY_ARCHIVE.forEach(entry => {
      const cat = entry.category || 'body';
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
  // Unified action: TAP = play + load-to-Lab (single primary intent).
  // LONG-PRESS = preview only (plays without loading — for auditioning).
  // Doherty <400ms: haptic + visual pulse fire immediately on down-event.
  const previewIdRef = useRef<string | null>(null);
  const [playStartTs, setPlayStartTs] = useState<number>(0);
  const [elapsedS, setElapsedS] = useState<number>(0);

  useEffect(() => {
    if (!playingItem) return;
    const t = setInterval(() => setElapsedS(Math.max(0, Math.floor((Date.now() - playStartTs) / 1000))), 250);
    return () => clearInterval(t);
  }, [playingItem, playStartTs]);

  const handlePlayStack = (name: string, frequencies: number[]) => {
    if (frequencies.length === 0) return;
    if (playingItem === name) {
      pulse();
      AudioEngine.stopMulti();
      setPlayingItem(null);
    } else {
      pulse();
      AudioEngine.playMulti(frequencies, 0.3);
      setPlayingItem(name);
      setPlayStartTs(Date.now());
      setElapsedS(0);
    }
  };

  const handlePreviewStart = (name: string, frequencies: number[]) => {
    if (frequencies.length === 0) return;
    tick();
    AudioEngine.playMulti(frequencies, 0.3);
    setPlayingItem(name);
    setPlayStartTs(Date.now());
    setElapsedS(0);
    previewIdRef.current = name;
  };
  const handlePreviewEnd = () => {
    if (!previewIdRef.current) return;
    AudioEngine.stopMulti();
    setPlayingItem(null);
    previewIdRef.current = null;
  };

  const handleStop = () => {
    pulse();
    AudioEngine.stopMulti();
    AudioEngine.stopAll();
    setPlayingItem(null);
  };

  const toggleCategory = (cat: string) => {
    tick();
    setExpandedCats(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const handleLoadToTerminal = async (entry: FrequencyEntry) => {
    pulse();
    AudioEngine.stopMulti();
    AudioEngine.stopAll();
    setPlayingItem(null);
    // Load to shared storage and refresh the lab
    await loadFrequencyToLab(entry.frequencies, entry.name);
    setCodesLabKey(prev => prev + 1); // Force refresh
    setShowCodesLab(true);
  };

  // ═══ Unified primary action — TAP = play + auto-load to Lab.
  //     One tap, one intent. Removes the previous double-button friction.
  const handleTapEntry = async (key: string, entry: FrequencyEntry) => {
    pulse();
    if (playingItem === key) {
      // Second tap on active row toggles off (cognitive parity with a switch).
      AudioEngine.stopMulti();
      setPlayingItem(null);
      return;
    }
    AudioEngine.stopMulti();
    AudioEngine.playMulti(entry.frequencies, 0.3);
    setPlayingItem(key);
    setPlayStartTs(Date.now());
    setElapsedS(0);
    // Silent load to Lab so the user can dive deeper without a second tap
    try { await loadFrequencyToLab(entry.frequencies, entry.name); setCodesLabKey(p => p + 1); } catch {}
  };

  // ═══ RENDER HELPERS ═══
  // Entry card: ONE primary action (tap = play + load). Long-press = preview-only.
  // Meets: Doherty (haptic <400ms), Fitts's Law (48pt target), Hick's Law (single choice).
  const renderEntry = (entry: FrequencyEntry, idx: number) => {
    const key = `${entry.category}-${entry.name}-${idx}`;
    const isActive = playingItem === key;
    return (
      <TouchableOpacity
        key={key}
        style={[s.entryCard, isActive && s.entryCardActive]}
        onPress={() => handleTapEntry(key, entry)}
        onPressIn={tick}
        onLongPress={() => handlePreviewStart(key, entry.frequencies)}
        onPressOut={() => { if (previewIdRef.current === key) handlePreviewEnd(); }}
        delayLongPress={300}
        activeOpacity={0.85}
      >
        <View style={s.entryRow}>
          <View style={s.entryNumCol}>
            <Text style={[s.entryNum, isActive && s.entryNumActive]}>{String(idx + 1).padStart(3, '0')}</Text>
          </View>
          <View style={s.entryInfoCol}>
            <Text style={[s.entryName, isActive && s.entryNameActive]} numberOfLines={1}>
              {godTier ? '$ ' : ''}{entry.name}
            </Text>
            <View style={s.entryFreqRow}>
              {entry.frequencies.slice(0, 6).map((f, i) => (
                <Text key={i} style={[s.entryFreq, isActive && s.entryFreqActive]}>
                  {f}
                </Text>
              ))}
              {entry.frequencies.length > 6 && (
                <Text style={s.entryFreq}>+{entry.frequencies.length - 6}</Text>
              )}
            </View>
          </View>
          <View style={s.entryPlayCol}>
            {isActive ? (
              <>
                <View style={s.entryLiveDot} />
                <Text style={s.entryElapsed}>{Math.floor(elapsedS / 60)}:{String(elapsedS % 60).padStart(2, '0')}</Text>
                <Text style={s.entryStopGlyph}>◼</Text>
              </>
            ) : (
              <Text style={s.entryPlay}>▶</Text>
            )}
          </View>
        </View>
        {/* Live full-width playback bar — animated by CSS pulse for immediate visual affordance */}
        {isActive && <View style={s.livebar} />}
        {/* Micro hint: single line below active row for gesture education (non-modal) */}
        {isActive && (
          <Text style={s.entryHint}>◈ TAP AGAIN TO STOP · HOLD ANY ENTRY FOR PREVIEW</Text>
        )}
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
      <ScrollView
        style={s.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ═══ VATICAN HEADER ═══ */}
        <View style={s.header}>
          <View style={s.headerOrnament}>
            <View style={s.headerDash} />
            <Text style={s.headerDot}>◆</Text>
            <View style={s.headerDash} />
          </View>
          <Text style={s.headerTitle}>CODES ARCHIVE</Text>
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

        {/* ═══ CODES LAB TOGGLE ═══ */}
        <TouchableOpacity 
          style={s.labToggle}
          onPress={() => setShowCodesLab(!showCodesLab)}
        >
          <Text style={s.labToggleText}>
            {showCodesLab ? '▾ HIDE CODES LAB' : '▸ SHOW CODES LAB'}
          </Text>
        </TouchableOpacity>

        {/* ═══ CODES LAB (Synced — matches home version) ═══ */}
        {showCodesLab && (
          <CodesLabShared key={codesLabKey} />
        )}

        {/* ═══ SEARCH — live result counter, evidence-based feedback ═══ */}
        <View style={s.searchBar}>
          <Text style={s.searchGlyph}>⊕</Text>
          <TextInput
            style={s.searchInput}
            placeholder="Search conditions, frequencies..."
            placeholderTextColor="#3a1010"
            value={searchQuery}
            onChangeText={(t) => { setSearchQuery(t); tick(); }}
            returnKeyType="search"
          />
          {(() => {
            const q = searchQuery.trim().toLowerCase();
            const count = q
              ? FREQUENCY_ARCHIVE.filter(e =>
                  e.name.toLowerCase().includes(q) ||
                  (e.category || '').toLowerCase().includes(q) ||
                  e.frequencies.some(f => String(f).includes(q))
                ).length
              : FREQUENCY_ARCHIVE.length;
            return (
              <View style={s.searchCountPill}>
                <Text style={s.searchCountTxt}>{count}/{FREQUENCY_ARCHIVE.length}</Text>
              </View>
            );
          })()}
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); tick(); }} style={s.searchClearBtn}>
              <Text style={s.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ═══ VIEW TABS — A-Z first row, CODEX second, LAB third ═══ */}
        <View style={s.viewTabs}>
          {([
            { id: 'alpha' as ViewMode, label: 'A-Z' },
            { id: 'archive' as ViewMode, label: 'CODEX' },
            { id: 'lab' as ViewMode, label: 'LAB' },
          ]).map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[s.viewTab, viewMode === tab.id && s.viewTabActive]}
              onPress={() => { tick(); setViewMode(tab.id); }}
            >
              <Text style={[s.viewTabText, viewMode === tab.id && s.viewTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ═══ $-CODES TIER ═══ */}
        <View style={s.tierRow}>
          <TouchableOpacity
            style={[s.tierBtn, !godTier && s.tierBtnStd]}
            onPress={() => setTier(false)}
            activeOpacity={0.7}
          >
            <Text style={[s.tierTxt, !godTier && s.tierTxtStd]}>STANDARD</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.tierBtn, godTier && s.tierBtnGold]}
            onPress={() => setTier(true)}
            activeOpacity={0.7}
          >
            <Text style={[s.tierTxt, godTier && s.tierTxtGold]}>$-CODES</Text>
          </TouchableOpacity>
          <Text style={s.tierHint}>{godTier ? 'GODMODE · SCALAR-AUGMENTED' : 'SINGLE-DDS REFERENCE'}</Text>
        </View>

        {/* ═══ NOW PLAYING — sticky, high-contrast, Fitts-sized STOP ═══ */}
        {playingItem && (
          <View style={s.nowPlaying}>
            <View style={s.npDot} />
            <View style={{ flex: 1 }}>
              <Text style={s.npText} numberOfLines={1}>
                TRANSMITTING · {playingItem.split('-').slice(1, -1).join('-')}
              </Text>
              <Text style={s.npElapsed}>
                {Math.floor(elapsedS / 60)}:{String(elapsedS % 60).padStart(2, '0')} ELAPSED · LOADED TO LAB
              </Text>
            </View>
            <TouchableOpacity onPress={handleStop} style={s.npStopBtn} activeOpacity={0.75}>
              <Text style={s.npStopGlyph}>◼</Text>
              <Text style={s.npStopTxt}>STOP</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══ CONTENT ═══ */}
        <View style={s.contentWrap}>
          {/* Alpha sidebar for A-Z view */}
          {viewMode === 'alpha' && (
            <View style={s.alphaSidebar}>
              <View>
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
              </View>
            </View>
          )}

          <View style={s.contentCol}>
            {/* Search Results */}
            {filteredArchive ? (
              <View>
                <Text style={s.resultLabel}>
                  {filteredArchive.length} RESULTS FOR {'"'}{searchQuery.toUpperCase()}{'"'}
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
            <DisclaimerFooter />
          </View>
        </View>
      </ScrollView>
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
  headerTitle: { color: '#ff0a0a', fontSize: 18, fontWeight: '700', letterSpacing: 4, marginTop: 4, fontFamily: 'TerminatorRealNFI' },
  headerSub: { color: '#5a1a1a', fontSize: 8, letterSpacing: 2, marginTop: 2, fontFamily: 'TerminatorRealNFI' },
  headerStats: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  headerStat: { color: '#3a1010', fontSize: 8, letterSpacing: 1, fontFamily: 'TerminatorRealNFI' },
  headerStatDiv: { color: '#2a0a0a', fontSize: 8 },

  // Lab Toggle
  labToggle: {
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#050303',
    borderWidth: 1,
    borderColor: '#ff0a0a40',
    alignItems: 'center',
  },
  labToggleText: {
    color: '#ff0a0a',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
  },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginVertical: 6, paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: '#2a0a0a', backgroundColor: '#050303', gap: 6,
  },
  searchGlyph: { color: '#ff0a0a', fontSize: 12, marginRight: 4 },
  searchInput: { flex: 1, color: '#ff0a0a', fontSize: 12, paddingVertical: 2 },
  // Live-count pill sits INSIDE the search bar and updates on every keystroke
  // so the user sees immediate evidence of filter progress (Doherty threshold).
  searchCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#ff0a0a55',
    borderRadius: 3,
    backgroundColor: '#0a0505',
  },
  searchCountTxt: {
    color: '#ff0a0a',
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1,
  },
  searchClearBtn: {
    width: 32, height: 32, alignItems: 'center', justifyContent: 'center',
  },
  searchClear: { color: '#ff5a5a', fontSize: 14, fontWeight: '900' },

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
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  tierBtn: {
    borderWidth: 1,
    borderColor: '#2a1010',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#0b0505',
  },
  tierBtnStd: { borderColor: '#c9d2dd', backgroundColor: '#c9d2dd' },
  tierBtnGold: { borderColor: '#ffd75e', backgroundColor: '#ffd75e' },
  tierTxt: {
    color: '#5a4a30',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  tierTxtStd: { color: '#000' },
  tierTxtGold: { color: '#000' },
  tierHint: {
    flex: 1,
    color: '#c9a227',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'right',
  },

  // Now Playing — Fitts-Law sized STOP + elapsed timer
  nowPlaying: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16,
    marginBottom: 6, paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: '#1a0505', borderWidth: 1, borderColor: '#ff0a0a', borderRadius: 4, gap: 10,
  },
  npDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ff0a0a' },
  npText: { color: '#ff0a0a', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  npElapsed: { color: '#ff6a6a', fontSize: 7, fontWeight: '800', letterSpacing: 1.4, marginTop: 2 },
  // Larger tap target (>=48pt) per Fitts's Law — critical action, hard to miss
  npStopBtn: {
    minWidth: 72,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#ff0a0a',
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  npStopGlyph: { color: '#000', fontSize: 12, fontWeight: '900' },
  npStopTxt: { color: '#000', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  npStop: { color: '#ff3040', fontSize: 9, fontWeight: '700' }, // legacy — kept to avoid orphan refs

  // Content
  contentWrap: { flexDirection: 'row' },
  scroll: { flex: 1 },
  contentCol: { flex: 1, paddingHorizontal: 16 },

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

  // Entry Card — single primary action (tap = play+load), long-press = preview
  // Fitts's Law: 56pt row height, generous padding, big invisible tap zone.
  entryCard: {
    minHeight: 56,
    paddingVertical: 8, paddingHorizontal: 8,
    borderBottomWidth: 1, borderBottomColor: '#0a0505',
  },
  entryCardActive: {
    backgroundColor: '#1a0808',
    borderBottomColor: '#ff0a0a80',
    borderLeftWidth: 3,
    borderLeftColor: '#ff0a0a',
    paddingLeft: 5,
  },
  entryRow: { flexDirection: 'row', alignItems: 'center' },
  entryTop: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  entryNumCol: { width: 34 },
  entryNum: { color: '#3a1010', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
  entryNumActive: { color: '#ff0a0a' },
  entryInfoCol: { flex: 1, paddingRight: 6 },
  entryName: { color: '#ff5050', fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  entryNameActive: { color: '#ff0a0a', fontWeight: '900' },
  entryFreqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  entryFreq: {
    color: '#5a1a1a', fontSize: 8, fontWeight: '700', backgroundColor: '#050303',
    paddingHorizontal: 5, paddingVertical: 2, borderWidth: 1, borderColor: '#1a0808', borderRadius: 2,
  },
  entryFreqActive: { color: '#ff0a0a', borderColor: '#ff0a0a60', backgroundColor: '#0a0505' },
  // Right cluster: play glyph → live dot + elapsed + stop glyph on active
  entryPlayCol: {
    minWidth: 56,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
  },
  entryLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ff0a0a' },
  entryElapsed: { color: '#ff0a0a', fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  entryStopGlyph: { color: '#ff0a0a', fontSize: 12, fontWeight: '900' },
  entryPlay: { color: '#ff5050', fontSize: 15, fontWeight: '900' },
  entryPlayActive: { color: '#ff0a0a' },
  // Full-width live-bar under active entry — unambiguous visual "on" state
  livebar: {
    height: 2,
    marginTop: 6,
    marginBottom: 2,
    backgroundColor: '#ff0a0a',
    opacity: 0.9,
    borderRadius: 1,
  },
  entryHint: {
    color: '#ff0a0a70',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginTop: 3,
  },
  // Legacy load button style retained so orphan refs (if any) compile
  loadBtn: {
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#ffffff0a',
    alignItems: 'center',
  },
  loadBtnText: {
    color: '#ff0a0a88',
    fontSize: 8,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 2,
  },

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
