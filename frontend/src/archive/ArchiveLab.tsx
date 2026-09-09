import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SK } from '../skins';
import CodesLabShared from '../CodesLabShared';
import { ArchiveCode, QUICK_STACKS } from './archiveData';
import { playArchiveCode, stopArchive, useArchiveSession } from './archiveSession';
import { s } from './archiveStyles';

export function ArchiveLab({ prefix, expanded, recent, onLoad }: { prefix: string; expanded: boolean; recent: ArchiveCode[]; onLoad: (entry: ArchiveCode) => void }) {
  const { active, loaded, revision } = useArchiveSession();
  const [showEngine, setShowEngine] = useState(expanded);
  return <View testID={`${prefix}-lab`}>
    <View style={s.labCard}>
      <TouchableOpacity testID={`${prefix}-lab-toggle`} accessibilityRole="button" accessibilityState={{ expanded: showEngine }} onPress={() => { stopArchive(); setShowEngine(value => !value); }} style={s.labButton}>
        <Ionicons name="options-outline" size={24} color={SK('#ff5d5d')} /><View style={s.labButtonInfo}><Text style={s.labTitle}>CODES LAB</Text><Text testID={`${prefix}-lab-loaded-name`} style={s.labHint}>{loaded ? `Staged: ${loaded.name}` : 'Open the five-layer frequency generator'}</Text></View><Ionicons name={showEngine ? 'chevron-up' : 'chevron-down'} size={18} color={SK('#a0a0b0')} />
      </TouchableOpacity>
      {showEngine && <View testID={`${prefix}-shared-lab`}><CodesLabShared key={revision} /></View>}
    </View>
    {recent.length > 0 && <View style={s.labSection}><View style={s.labSectionHeader}><Text style={s.sectionTitle}>RECENTLY LOADED</Text></View><View style={s.quickGrid}>{recent.map(entry => <TouchableOpacity key={entry.id} testID={`${prefix}-recent-${entry.id}`} onPress={() => onLoad(entry)} style={s.quick} accessibilityLabel={`Load ${entry.name} to Lab`}><Text style={s.quickText}>{entry.frequencies[0]} Hz</Text><Text style={s.quickMeta}>{entry.name}</Text></TouchableOpacity>)}</View></View>}
    {QUICK_STACKS.map(group => <View key={group.title} style={s.labSection}>
      <View style={s.labSectionHeader}><Text testID={`${prefix}-presets-${group.title.toLowerCase().replace(/ /g, '-')}`} style={s.sectionTitle}>{group.title}</Text><Text style={s.sectionSubtitle}>{group.subtitle}</Text></View>
      <View style={s.quickGrid}>{group.codes.map(entry => <TouchableOpacity key={entry.id} testID={`${prefix}-preset-${entry.id}`} accessibilityRole="button" accessibilityState={{ selected: active?.id === entry.id }} accessibilityLabel={`${active?.id === entry.id ? 'Stop' : 'Play'} ${entry.name}`} onPress={() => playArchiveCode(entry)} style={[s.quick, active?.id === entry.id && s.quickActive]}>
        <Text style={s.quickText}>{entry.name.replace(' · Schumann', '')}</Text><Text style={s.quickMeta}>{active?.id === entry.id ? 'STOP' : entry.frequencies.length === 1 ? 'PLAY' : `${entry.frequencies.length} LAYERS`}</Text>
      </TouchableOpacity>)}</View>
    </View>)}
  </View>;
}