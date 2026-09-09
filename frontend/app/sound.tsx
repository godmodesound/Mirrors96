import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SoundHeader } from '../src/sound/SoundHeader';
import { SoundLibrary } from '../src/sound/SoundLibrary';
import { SoundReadout } from '../src/sound/SoundReadout';
import { useSoundPlayback } from '../src/sound/useSoundPlayback';
import { ss } from '../src/sound/soundStyles';

export default function SoundScreen() {
  const insets = useSafeAreaInsets();
  const player = useSoundPlayback();
  return <View testID="sound-screen" style={[ss.screen, { paddingTop: insets.top }]}>
    <View style={ss.frame}>
      <ScrollView testID="sound-scroll" style={ss.scroll} contentContainerStyle={ss.content} showsVerticalScrollIndicator={false}>
        <SoundHeader prefix="sound" />
        {player.error && <Text testID="sound-playback-error" accessibilityRole="alert" style={ss.error}>{player.error}</Text>}
        <SoundLibrary prefix="sound" activeKey={player.activeKey} loading={player.loading} progress={player.progress} onPlay={player.play} onStop={player.stop} />
      </ScrollView>
      <SoundReadout prefix="sound" activeKey={player.activeKey} elapsed={player.elapsed} loading={player.loading} onStop={player.stop} />
    </View>
  </View>;
}