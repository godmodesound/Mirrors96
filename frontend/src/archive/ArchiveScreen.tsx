import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, FlatList, KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AudioEngine } from '../AudioEngine';
import { FrequencyEntry } from '../FrequencyArchiveData';
import { SK } from '../skins';
import { ARCHIVE_CODES, ArchiveCode, ArchiveView, COLLECTIONS, SORTED_CODES, categoryName, codeSlug, letterFor, matchesCode } from './archiveData';
import { ArchiveHeader } from './ArchiveHeader';
import { ArchiveControls, ArchiveAlphabet } from './ArchiveControls';
import { ArchiveCollection } from './ArchiveCollections';
import { ArchiveEntry } from './ArchiveEntry';
import { ArchiveReadout } from './ArchiveReadout';
import { ArchiveLab } from './ArchiveLab';
import { archiveTick, stageArchiveCode, stopArchive, useArchiveSession } from './archiveSession';
import { s } from './archiveStyles';
import LandingScope from '../LandingScope';

type Props = {
  prefix?: string; onClose?: () => void; onLoadEntry?: (entry: FrequencyEntry) => void;
  onModeChange?: (enabled: boolean) => void; recent?: { name: string; frequency: number; category?: string }[];
};
type ArchiveRow = { id: string; entry?: ArchiveCode; collections?: typeof COLLECTIONS; lab?: boolean };

export default function ArchiveScreen({ prefix = 'archive', onClose, onLoadEntry, onModeChange, recent = [] }: Props) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<ArchiveView>('codex');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [letter, setLetter] = useState<string | null>(null);
  const [godMode, setGodMode] = useState(AudioEngine.getGodMode());
  const [labExpanded, setLabExpanded] = useState(false);
  const { active, preview } = useArchiveSession();
  const entriesRef = useRef<FlatList<ArchiveRow>>(null);
  const entrance = useRef(new Animated.Value(0)).current;

  useFocusEffect(useCallback(() => { setGodMode(AudioEngine.getGodMode()); }, []));
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(reduced => {
      if (!mounted) return;
      Animated.timing(entrance, { toValue: 1, duration: reduced ? 0 : 240, useNativeDriver: true }).start();
    }).catch(() => entrance.setValue(1));
    return () => { mounted = false; entrance.stopAnimation(); };
  }, [entrance]);
  useEffect(() => { entriesRef.current?.scrollToOffset({ offset: 0, animated: false }); }, [category, letter]);

  const matches = useMemo(() => SORTED_CODES.filter(entry => matchesCode(entry, query) && (!category || entry.category === category) && (!letter || letterFor(entry.name) === letter)), [query, category, letter]);
  const history = useMemo(() => recent.slice(0, 8).map((item, index) => ARCHIVE_CODES.find(code => code.name === item.name) || { name: item.name, frequencies: [item.frequency], category: item.category || 'body', id: `recent-${codeSlug(item.name)}`, index }), [recent]);
  const showCollections = view === 'codex' && !category && !query.trim();
  const rows: ArchiveRow[] = showCollections
    ? COLLECTIONS.filter((_, index) => index % 2 === 0).map((collection, index) => ({ id: `collections-${collection.id}`, collections: COLLECTIONS.slice(index * 2, index * 2 + 2) }))
    : view === 'lab' ? [{ id: 'lab', lab: true }] : matches.map(entry => ({ id: entry.id, entry }));

  const changeView = (next: ArchiveView) => { archiveTick(); setView(next); setCategory(null); setLetter(null); };
  const changeQuery = (text: string) => { setQuery(text); setCategory(null); setLetter(null); if (text.trim()) setView('alpha'); };
  const changeMode = (enabled: boolean) => { archiveTick(); if (onModeChange) onModeChange(enabled); else AudioEngine.setGodMode(enabled); setGodMode(enabled); };
  const loadCode = useCallback(async (entry: ArchiveCode) => {
    archiveTick(); stopArchive(); await stageArchiveCode(entry);
    if (onLoadEntry) { onLoadEntry(entry); return; }
    setLabExpanded(true); setView('lab'); setQuery(''); setCategory(null); setLetter(null);
  }, [onLoadEntry]);
  const reset = () => { setQuery(''); setLetter(null); setCategory(null); setView('codex'); };

  const entriesHeading = <View>
    {category && <TouchableOpacity testID={`${prefix}-back-collections`} accessibilityRole="button" onPress={() => setCategory(null)} style={s.breadcrumb}><Ionicons name="chevron-back" color={SK('#ff5d5d')} size={16} /><Text style={s.breadcrumbText}>ALL COLLECTIONS</Text></TouchableOpacity>}
    {view === 'alpha' && <ArchiveAlphabet prefix={prefix} selected={letter} onSelect={setLetter} />}
    <View style={s.listHeading}><View style={s.readoutInfo}><Text testID={`${prefix}-results-title`} style={s.sectionTitle}>{query.trim() ? 'Search results' : category ? categoryName(category) : letter ? `Index / ${letter}` : 'All codes'}</Text>{query.trim() ? <Text style={s.sectionSubtitle} numberOfLines={2}>Matching “{query.trim()}”</Text> : null}</View><Text testID={`${prefix}-results-count`} style={s.count}>{matches.length} CODES</Text></View>
  </View>;

  return <KeyboardAvoidingView testID={`${prefix}-screen`} style={[s.screen, { paddingTop: insets.top, paddingBottom: onClose ? insets.bottom : 0 }]} behavior={Platform.OS === 'ios' ? 'padding' : Platform.OS === 'android' ? 'height' : undefined}>
    <Animated.View style={[s.frame, { opacity: entrance }]}>
      <FlatList ref={entriesRef} testID={`${prefix}-browse-list`} style={s.list} data={rows} extraData={`${active?.id}-${preview}-${godMode}-${labExpanded}`} keyExtractor={item => item.id} initialNumToRender={8} maxToRenderPerBatch={10} windowSize={7} contentContainerStyle={s.listContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
        ListHeaderComponent={<View style={s.listHeader}>
          <LandingScope testID={`${prefix}-scope`} />
          <ArchiveHeader prefix={prefix} onClose={onClose} />
          <ArchiveControls prefix={prefix} query={query} setQuery={changeQuery} view={view} setView={changeView} godMode={godMode} setGodMode={changeMode} />
          <View style={s.headerSummary}>{showCollections ? <View style={s.listHeading}><View><Text style={s.sectionTitle}>Choose a collection</Text><Text style={s.sectionSubtitle}>Explore the archive by system.</Text></View><Text testID={`${prefix}-results-count`} style={s.count}>{COLLECTIONS.length} / INDEX</Text></View> : view !== 'lab' ? entriesHeading : null}</View>
        </View>}
        renderItem={({ item, index }) => item.collections ? <View testID={`${prefix}-collection-row-${index}`} style={s.gridRow}>{item.collections.map((collection, offset) => <ArchiveCollection key={collection.id} prefix={prefix} collection={collection} index={index * 2 + offset} onSelect={setCategory} />)}</View> : item.lab ? <View testID={`${prefix}-lab-scroll`}><ArchiveLab key={String(labExpanded)} prefix={prefix} expanded={labExpanded} recent={history} onLoad={loadCode} /></View> : item.entry ? <ArchiveEntry prefix={prefix} entry={item.entry} active={active?.id === item.entry.id} preview={preview} godMode={godMode} onLoad={loadCode} /> : null}
        ListEmptyComponent={<View testID={`${prefix}-empty`} style={s.empty}><Ionicons name="search-outline" color={SK('#a0a0b0')} size={30} /><Text style={s.emptyTitle}>No matching codes</Text><Text style={s.emptyText}>Try a different name, collection or Hz value.</Text><TouchableOpacity testID={`${prefix}-reset-filters`} accessibilityRole="button" onPress={reset} style={s.resetButton}><Text style={s.resetText}>RESET FILTERS</Text></TouchableOpacity></View>} />
      <ArchiveReadout prefix={prefix} />
    </Animated.View>
  </KeyboardAvoidingView>;
}