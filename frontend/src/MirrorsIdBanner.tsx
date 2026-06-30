import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Linking } from 'react-native';

const GOOGLE_EARTH_URL = 'https://earth.google.com/web/';

export default function MirrorsIdBanner() {
  const handlePress = () => {
    Linking.openURL(GOOGLE_EARTH_URL);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={styles.bannerWrap}
    >
      <View style={styles.bannerBox}>
        <View style={styles.borderDecor}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />
        </View>
        <Text style={styles.bannerText}>GODMODE</Text>
        <Text style={styles.bannerSub}>EARTH LINK</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  bannerBox: {
    width: '100%',
    backgroundColor: '#0a0303',
    borderWidth: 1,
    borderColor: '#ff0a0a',
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  borderDecor: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  cornerTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#ff0a0a',
  },
  cornerTR: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: '#ff0a0a',
  },
  cornerBL: {
    position: 'absolute',
    bottom: -1,
    left: -1,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: '#ff0a0a',
  },
  cornerBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 8,
    height: 8,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: '#ff0a0a',
  },
  bannerText: {
    color: '#ff0a0a',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 8,
    fontFamily: 'TerminatorRealNFI',
  },
  bannerSub: {
    color: '#5a1a1a',
    fontSize: 8,
    letterSpacing: 4,
    marginTop: 2,
    fontFamily: 'TerminatorRealNFI',
  },
});
