import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

export const SOUND_LAB_ICON_URL = 'https://customer-assets-rejwkqb3.emergentagent.net/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/e9aay0bv_15F45109-779B-48D9-92AD-08039D96CC26.webp';

export function SoundLabIcon({ size = 70, testID }: { size?: number; testID: string }) {
  return <View style={[styles.frame, { width: size, height: size }]}>
    <Image testID={testID} accessibilityLabel="Sound Lab chrome symbol" source={{ uri: SOUND_LAB_ICON_URL }} style={styles.symbol} resizeMode="cover" />
  </View>;
}

// Center-crop the blank margins of the supplied portrait, not the symbol itself.
const styles = StyleSheet.create({
  frame: { overflow: 'hidden', borderRadius: 6, backgroundColor: '#151515' },
  symbol: { width: '100%', height: '100%', transform: [{ scale: 1.4 }] },
});