import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { skinStyles } from '../src/skins';

const F = 'TerminatorRealNFI';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={st.container}>
      <View style={{ paddingTop: insets.top }} />
      <ScrollView style={st.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Text style={st.backText}>{'\u25C1'} BACK</Text>
        </TouchableOpacity>

        <Text style={st.h1}>MIRRORS</Text>
        <Text style={st.h2}>By Vince Sinnott</Text>
        <View style={st.divider} />

        {/* BIO */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>ABOUT THE ARTIST</Text>
          <Text style={st.body}>
            Vince Sinnott is an electronic music composer releasing on GODMODE SOUND. MIRRORS is his applied-listening project — 96 calibrated sessions for focus, calm, and deep presence, built on a 432Hz foundation.
          </Text>
          <Text style={st.body}>
            With releases including Codes (2025) and In Memory Of (2018), Vince's work spans generative ambient, frequency design, and electronic composition. MIRRORS represents the intersection of artistic practice and functional audio.
          </Text>
        </View>

        {/* DISCOGRAPHY */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>DISCOGRAPHY</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://music.apple.com/us/artist/codes/1491858588')} style={st.link}>
            <Text style={st.linkText}>{'\u25B6'} Apple Music — Codes, In Memory Of, and more</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://soundcloud.com/codes-godmode')} style={st.link}>
            <Text style={st.linkText}>{'\u25B6'} SoundCloud — DJ Sets & Mixes</Text>
          </TouchableOpacity>
        </View>

        {/* CONTACT */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>CONTACT</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:contact@godmodesound.com')} style={st.link}>
            <Text style={st.linkText}>contact@godmodesound.com</Text>
          </TouchableOpacity>
        </View>

        {/* REFUND POLICY */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>REFUND POLICY</Text>
          <Text style={st.body}>
            All digital purchases (albums, singles) are delivered instantly upon payment. Due to the nature of digital goods, refunds are generally not available after delivery. If you experience a technical issue preventing access to your purchase, contact us within 14 days at contact@godmodesound.com and we will resolve the issue or issue a full refund.
          </Text>
        </View>

        {/* LEGAL */}
        <View style={st.section}>
          <View style={st.legalRow}>
            <TouchableOpacity onPress={() => router.push('/privacy')}>
              <Text style={st.legalLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <Text style={st.legalSep}>{'\u00B7'}</Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={st.legalLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>


        <Text style={st.copyright}>{'\u00A9'} {new Date().getFullYear()} GODMODE SOUND. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const st = skinStyles({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  backBtn: { paddingVertical: 12 },
  backText: { color: '#ff0a0a', fontSize: 10, fontFamily: F, letterSpacing: 2 },
  h1: { color: '#ff0a0a', fontSize: 36, fontWeight: '900', fontFamily: F, letterSpacing: 6, marginTop: 8 },
  h2: { color: '#ffffff88', fontSize: 12, fontFamily: F, letterSpacing: 2, marginTop: 4 },
  divider: { width: 40, height: 1, backgroundColor: '#ff0a0a44', marginVertical: 20 },
  section: { marginBottom: 28 },
  sectionTitle: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', fontFamily: F, letterSpacing: 2, marginBottom: 10 },
  body: { color: '#ffffff99', fontSize: 11, lineHeight: 18, fontFamily: F, marginBottom: 10 },
  link: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#ffffff0a' },
  linkText: { color: '#ff0a0a99', fontSize: 10, fontFamily: F, letterSpacing: 1 },
  legalRow: { flexDirection: 'row', alignItems: 'center', gap: 10, justifyContent: 'center' },
  legalLink: { color: '#ff0a0a66', fontSize: 9, fontFamily: F, letterSpacing: 1 },
  legalSep: { color: '#ffffff22', fontSize: 10 },
  copyright: { color: '#ffffff22', fontSize: 7, fontFamily: F, textAlign: 'center', marginTop: 16, letterSpacing: 1 },
});
