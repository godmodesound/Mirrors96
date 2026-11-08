import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FREQUENCY_ARCHIVE } from './FrequencyArchiveData';

import { skinStyles, SK } from './skins';

const STREAK_KEY = '@mirrors_streak';
const LAST_LISTEN_KEY = '@mirrors_last_listen';
const EMAIL_KEY = '@mirrors_email_captured';

// Deterministic daily selection based on date hash
function getMirrorOfTheDay(): { name: string; frequency: number; category: string } {
  const now = new Date();
  const dayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  let hash = 0;
  for (let i = 0; i < dayStr.length; i++) {
    hash = ((hash << 5) - hash) + dayStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FREQUENCY_ARCHIVE.length;
  const entry = FREQUENCY_ARCHIVE[idx];
  return { name: entry.name, frequency: entry.frequencies[0], category: entry.category };
}

function getDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  onLoadFrequency: (freq: number) => void;
}

export default function MirrorOfTheDay({ onLoadFrequency }: Props) {
  const [mirror, setMirror] = useState(getMirrorOfTheDay());
  const [streak, setStreak] = useState(0);
  const [email, setEmail] = useState('');
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  useEffect(() => {
    loadStreak();
    checkEmailCaptured();
  }, []);

  const loadStreak = async () => {
    try {
      const raw = await AsyncStorage.getItem(STREAK_KEY);
      if (raw) setStreak(parseInt(raw, 10) || 0);
    } catch {}
  };

  const checkEmailCaptured = async () => {
    try {
      const v = await AsyncStorage.getItem(EMAIL_KEY);
      if (v === 'true') setEmailCaptured(true);
    } catch {}
  };

  const recordListen = useCallback(async () => {
    try {
      const today = getDateKey();
      const lastListen = await AsyncStorage.getItem(LAST_LISTEN_KEY);

      if (lastListen === today) return; // Already counted today

      // Check if yesterday was the last listen
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

      let newStreak = 1;
      if (lastListen === yesterdayKey) {
        const currentStreak = parseInt(await AsyncStorage.getItem(STREAK_KEY) || '0', 10);
        newStreak = currentStreak + 1;
      }

      await AsyncStorage.setItem(STREAK_KEY, String(newStreak));
      await AsyncStorage.setItem(LAST_LISTEN_KEY, today);
      setStreak(newStreak);
    } catch {}
  }, []);

  const handlePlay = () => {
    onLoadFrequency(mirror.frequency);
    recordListen();
  };

  const handleEmailSubmit = async () => {
    if (!email.trim() || !email.includes('@')) return;
    setEmailSubmitting(true);
    try {
      // Store locally — backend endpoint can be wired later
      await AsyncStorage.setItem(EMAIL_KEY, 'true');
      await AsyncStorage.setItem('@mirrors_email', email.trim());
      setEmailCaptured(true);
    } catch {} finally {
      setEmailSubmitting(false);
    }
  };

  return (
    <View style={st.card}>
      <View style={st.header}>
        <View style={st.dot} />
        <Text style={st.label}>TODAY'S MIRROR</Text>
        {streak > 1 && (
          <View style={st.streakBadge}>
            <Text style={st.streakText}>{streak} day streak</Text>
          </View>
        )}
      </View>

      <TouchableOpacity style={st.mirrorRow} onPress={handlePlay} activeOpacity={0.7}>
        <View style={st.freqCircle}>
          <Text style={st.freqNum}>{mirror.frequency}</Text>
          <Text style={st.freqUnit}>Hz</Text>
        </View>
        <View style={st.mirrorInfo}>
          <Text style={st.mirrorName}>{mirror.name}</Text>
          <Text style={st.mirrorCat}>{mirror.category}</Text>
        </View>
        <View style={st.playBtn}>
          <Text style={st.playIcon}>{'\u25B6'}</Text>
        </View>
      </TouchableOpacity>

      {!emailCaptured && (
        <View style={st.emailRow}>
          <TextInput
            style={st.emailInput}
            placeholder="Get tomorrow's mirror"
            placeholderTextColor={SK('#ffffff33')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[st.emailBtn, emailSubmitting && { opacity: 0.5 }]}
            onPress={handleEmailSubmit}
            disabled={emailSubmitting}
          >
            <Text style={st.emailBtnText}>{emailSubmitting ? '...' : '\u2192'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const st = skinStyles({
  card: {
    marginHorizontal: 8,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#ff0a0a22',
    borderRadius: 6,
    padding: 14,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ff0a0a',
  },
  label: {
    color: '#ff0a0a',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    fontFamily: 'TerminatorRealNFI',
    flex: 1,
  },
  streakBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#ff0a0a12',
    borderWidth: 1,
    borderColor: '#ff0a0a33',
  },
  streakText: {
    color: '#ff0a0a88',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  mirrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  freqCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#ff0a0a44',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ff0a0a08',
  },
  freqNum: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'TerminatorRealNFI',
  },
  freqUnit: {
    color: '#ff0a0a66',
    fontSize: 7,
    fontFamily: 'TerminatorRealNFI',
    marginTop: -2,
  },
  mirrorInfo: {
    flex: 1,
  },
  mirrorName: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
  },
  mirrorCat: {
    color: '#ffffff44',
    fontSize: 8,
    fontFamily: 'TerminatorRealNFI',
    letterSpacing: 1,
    marginTop: 2,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#ff0a0a44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    color: '#ff0a0a',
    fontSize: 12,
    marginLeft: 2,
  },
  emailRow: {
    flexDirection: 'row',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#ffffff0a',
    paddingTop: 10,
    gap: 8,
  },
  emailInput: {
    flex: 1,
    height: 32,
    borderWidth: 1,
    borderColor: '#ffffff15',
    borderRadius: 4,
    paddingHorizontal: 10,
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'TerminatorRealNFI',
    backgroundColor: '#ffffff06',
  },
  emailBtn: {
    width: 32,
    height: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ff0a0a44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emailBtnText: {
    color: '#ff0a0a',
    fontSize: 14,
    fontWeight: '700',
  },
});
