import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';

/** Auto-playing video with native controls (expo-video). */
export default function ChirpVideo({ uri, style }: { uri: string; style?: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri, p => { p.play(); });
  return <VideoView player={player} style={style} nativeControls contentFit="contain" />;
}
