import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DisclaimerFooter() {
  return (
    <View style={st.wrap}>
      <View style={st.divider} />
      <Text style={st.text}>
        MIRRORS is a sound experience for focus, calm, and presence. It is not a medical device and makes no therapeutic claims. Not intended to diagnose, treat, cure, or prevent any condition.
      </Text>
    </View>
  );
}

const st = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: 'center',
  },
  divider: {
    width: 40,
    height: 1,
    backgroundColor: '#ff0a0a22',
    marginBottom: 14,
  },
  text: {
    color: '#ffffff44',
    fontSize: 8,
    lineHeight: 12,
    textAlign: 'center',
    letterSpacing: 0.4,
    fontFamily: 'TerminatorRealNFI',
  },
});
