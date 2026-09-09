import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SK } from '../skins';
import { stopArchive, useArchiveSession } from './archiveSession';
import { s } from './archiveStyles';

export function ArchiveReadout({ prefix }: { prefix: string }) {
  const { active, preview, startedAt } = useArchiveSession();
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    setElapsed(0);
    if (!active) return;
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 500);
    return () => clearInterval(timer);
  }, [active, startedAt]);
  if (!active) return <View testID={`${prefix}-idle`} style={s.idleBar}><Ionicons name="headset-outline" size={15} color={SK('#a0a0b0')} /><Text style={s.idleText}>TAP TO PLAY + STAGE / HOLD TO PREVIEW</Text></View>;
  return <View testID={`${prefix}-now-playing`} style={s.readout}>
    <View style={s.readoutInfo}><Text testID={`${prefix}-playback-state`} style={s.readoutLabel}>{preview ? 'HOLD PREVIEW' : 'SIGNAL ACTIVE'}</Text><Text testID={`${prefix}-playing-name`} style={s.readoutName} numberOfLines={1}>{active.name}</Text><Text testID={`${prefix}-playing-time`} style={s.readoutMeta}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')} / {active.frequencies.length} {active.frequencies.length === 1 ? 'FREQUENCY' : 'FREQUENCIES'}</Text></View>
    <TouchableOpacity testID={`${prefix}-stop`} accessibilityRole="button" accessibilityLabel="Stop archive playback" onPress={stopArchive} style={s.stopButton}><Ionicons name="stop" size={15} color={SK('#000000')} /><Text style={s.stopText}>STOP</Text></TouchableOpacity>
  </View>;
}