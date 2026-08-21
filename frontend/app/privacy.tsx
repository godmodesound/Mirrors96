import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DisclaimerFooter from '../src/DisclaimerFooter';

import { skinStyles } from '../src/skins';

const F = 'TerminatorRealNFI';

export default function PrivacyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={st.container}>
      <View style={{ paddingTop: insets.top }} />
      <ScrollView style={st.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Text style={st.backText}>{'\u25C1'} BACK</Text>
        </TouchableOpacity>

        <Text style={st.h1}>PRIVACY POLICY</Text>
        <Text style={st.updated}>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <View style={st.divider} />

        <Text style={st.body}>GODMODE SOUND ("we", "us", "our") operates the MIRRORS application. This Privacy Policy describes how we collect, use, and share information when you use our app.</Text>

        <Text style={st.heading}>INFORMATION WE COLLECT</Text>
        <Text style={st.body}>{'\u2022'} Account information: email address and username if you create an account.{"\n"}{'\u2022'} Usage data: session frequency selections and listening history (stored locally on your device by default).{"\n"}{'\u2022'} Payment information: processed securely through Stripe. We do not store credit card details.{"\n"}{'\u2022'} Email address: if you voluntarily subscribe to the daily mirror newsletter.</Text>

        <Text style={st.heading}>HOW WE USE INFORMATION</Text>
        <Text style={st.body}>We use the information to provide the MIRRORS experience, process purchases, and send requested communications. We do not sell personal data to third parties.</Text>

        <Text style={st.heading}>LOCAL STORAGE</Text>
        <Text style={st.body}>Frequency presets, session history, streak counters, and app settings are stored locally on your device using AsyncStorage. This data remains on your device unless you clear app data.</Text>

        <Text style={st.heading}>THIRD-PARTY SERVICES</Text>
        <Text style={st.body}>{'\u2022'} Stripe (payment processing){"\n"}{'\u2022'} Apple Music (external links){"\n"}{'\u2022'} SoundCloud (external links)</Text>

        <Text style={st.heading}>YOUR RIGHTS</Text>
        <Text style={st.body}>You may request deletion of your account and associated data by contacting contact@godmodesound.com. Local data can be cleared by uninstalling the app.</Text>

        <Text style={st.heading}>CONTACT</Text>
        <Text style={st.body}>For privacy inquiries: contact@godmodesound.com</Text>

        <DisclaimerFooter />
      </ScrollView>
    </View>
  );
}

const st = skinStyles({
  container: { flex: 1, backgroundColor: '#000' },
  scroll: { flex: 1, paddingHorizontal: 20 },
  backBtn: { paddingVertical: 12 },
  backText: { color: '#ff0a0a', fontSize: 10, fontFamily: F, letterSpacing: 2 },
  h1: { color: '#ff0a0a', fontSize: 20, fontWeight: '900', fontFamily: F, letterSpacing: 4, marginTop: 8 },
  updated: { color: '#ffffff44', fontSize: 8, fontFamily: F, letterSpacing: 1, marginTop: 4 },
  divider: { width: 40, height: 1, backgroundColor: '#ff0a0a44', marginVertical: 20 },
  heading: { color: '#ff0a0a', fontSize: 10, fontWeight: '700', fontFamily: F, letterSpacing: 2, marginTop: 20, marginBottom: 8 },
  body: { color: '#ffffff88', fontSize: 10, lineHeight: 16, fontFamily: F, marginBottom: 8 },
});
