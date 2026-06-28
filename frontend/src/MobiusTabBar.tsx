import React from 'react';
import { View, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 7 chakras mapped to tabs — cymatic sacred geometry icons + traditional colors
const TABS = [
  { icon: '◆', label: 'HOME', color: '#E0301E' },
  { icon: '⬡', label: 'CODES ARCHIVE', color: '#FF8C00' },
  { icon: '✹', label: 'SOUND', color: '#FFD700' },
  { icon: '✿', label: 'BI-NAURAL', color: '#2ECC40' },
  { icon: '◈', label: 'BRAIN', color: '#0074D9' },
  { icon: '◉', label: 'ID', color: '#4B0082' },
  { icon: '✦', label: 'HOW', color: '#9B30FF' },
];

interface Props {
  state: any;
  descriptors: any;
  navigation: any;
}

export default function MobiusTabBar({ state, descriptors, navigation }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
      <View style={styles.edgeLine} />
      <View style={styles.row}>
        {state.routes.map((route: any, i: number) => {
          if (i >= TABS.length) return null;
          const active = state.index === i;
          const tab = TABS[i];

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.tab}
              onPress={() => {
                if (!active) navigation.navigate(route.name);
              }}
              activeOpacity={0.7}
            >
              {active && <View style={styles.glowDot} />}
              <Text
                style={[
                  styles.icon,
                  { color: active ? '#ff0a0a' : tab.color },
                ]}
              >
                {tab.icon}
              </Text>
              <Text
                style={[
                  styles.label,
                  { color: active ? '#ff0a0a' : tab.color, opacity: active ? 1 : 0.6 },
                ]}
              >
                {tab.label}
              </Text>
              {active && <View style={styles.activeLine} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: '#000000',
  },
  edgeLine: {
    height: 1,
    backgroundColor: '#ff0a0a',
    opacity: 0.12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 6,
    paddingBottom: 2,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    position: 'relative',
  },
  glowDot: {
    position: 'absolute',
    top: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ff0a0a',
    opacity: 0.08,
  },
  icon: {
    fontSize: 18,
    marginBottom: 2,
  },
  label: {
    fontSize: 7,
    fontWeight: '700',
    letterSpacing: 1,
    fontFamily: 'TerminatorRealNFI',
  },
  activeLine: {
    position: 'absolute',
    bottom: 0,
    width: 16,
    height: 2,
    backgroundColor: '#ff0a0a',
    borderRadius: 1,
  },
});
