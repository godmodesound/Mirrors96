import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SK } from '../skins';
import { ArchiveView, LETTERS } from './archiveData';
import { s } from './archiveStyles';

type Props = { prefix: string; query: string; setQuery: (q: string) => void; view: ArchiveView; setView: (v: ArchiveView) => void; godMode: boolean; setGodMode: (on: boolean) => void };
const TABS: { view: ArchiveView; title: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { view: 'codex', title: 'CODEX', icon: 'grid-outline' }, { view: 'alpha', title: 'A–Z INDEX', icon: 'list-outline' }, { view: 'lab', title: 'LAB', icon: 'options-outline' },
];

export function ArchiveControls({ prefix, query, setQuery, view, setView, godMode, setGodMode }: Props) {
  return <>
    <View style={s.search}>
      <Ionicons name="search-outline" size={19} color={SK('#a0a0b0')} />
      <TextInput testID={`${prefix}-search-input`} accessibilityLabel="Search archive by name, category or frequency" style={s.searchInput} placeholder="Search a name or frequency" placeholderTextColor={SK('#a0a0b0')} value={query} onChangeText={setQuery} autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
      {query ? <TouchableOpacity testID={`${prefix}-search-clear`} accessibilityLabel="Clear search" accessibilityRole="button" onPress={() => setQuery('')} style={s.iconButton}><Ionicons name="close-circle" color={SK('#a0a0b0')} size={20} /></TouchableOpacity> : <View style={s.searchEnd}><Text style={s.micro}>Hz</Text></View>}
    </View>
    <View style={s.tabs}>
      {TABS.map(tab => <TouchableOpacity key={tab.view} testID={`${prefix}-tab-${tab.view}`} accessibilityRole="tab" accessibilityState={{ selected: view === tab.view }} onPress={() => setView(tab.view)} activeOpacity={0.65} style={[s.tab, view === tab.view && s.tabActive]}>
        <Ionicons name={tab.icon} size={16} color={SK(view === tab.view ? '#ff0a0a' : '#a0a0b0')} /><Text style={[s.tabText, view === tab.view && s.tabTextActive]}>{tab.title}</Text>
      </TouchableOpacity>)}
    </View>
    <View style={s.engineRow}>
      <Text testID={`${prefix}-engine-label`} style={s.engineLabel}>SIGNAL MODE</Text>
      <View style={s.engineOptions}>{[false, true].map(on => <TouchableOpacity key={String(on)} testID={`${prefix}-mode-${on ? 'dollar' : 'standard'}`} accessibilityRole="button" accessibilityState={{ selected: godMode === on }} onPress={() => setGodMode(on)} style={[s.engineButton, godMode === on && (on ? s.engineGold : s.engineActive)]} activeOpacity={0.7}><Text style={[s.engineText, godMode === on && s.engineSelected]}>{on ? '$-CODES' : 'STANDARD'}</Text></TouchableOpacity>)}</View>
    </View>
  </>;
}

export function ArchiveAlphabet({ prefix, selected, onSelect }: { prefix: string; selected: string | null; onSelect: (letter: string | null) => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.alphabet} keyboardShouldPersistTaps="handled" testID={`${prefix}-alphabet`}>
    {[null, ...LETTERS].map(letter => <TouchableOpacity key={letter || 'all'} testID={`${prefix}-letter-${letter === '#' ? 'numbers' : letter?.toLowerCase() || 'all'}`} accessibilityRole="button" accessibilityState={{ selected: selected === letter }} onPress={() => onSelect(selected === letter ? null : letter)} style={[s.letterButton, selected === letter && s.letterActive]}><Text style={[s.letterText, selected === letter && s.letterTextActive]}>{letter || 'ALL'}</Text></TouchableOpacity>)}
  </ScrollView>;
}