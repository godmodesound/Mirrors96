import React from 'react';
import { TouchableOpacity, Image, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function MirrorsIdBanner() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push('/chirpconnect')}
      activeOpacity={0.85}
      style={styles.bannerWrap}
    >
      <Image
        source={{ uri: 'https://customer-assets.emergentagent.com/job_e121e09e-99f3-472d-8697-f5a5be5cce59/artifacts/x7wgp9g9_MIRRORS%20ID.jpeg' }}
        style={styles.bannerImage}
        resizeMode="contain"
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  bannerImage: {
    width: '100%',
    height: 48,
    borderRadius: 4,
  },
});
