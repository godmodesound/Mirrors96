import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { skinStyles } from '../src/skins';

const F = 'TerminatorRealNFI';

export default function TermsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={st.container}>
      <View style={{ paddingTop: insets.top }} />
      <ScrollView style={st.scroll} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => router.back()} style={st.backBtn}>
          <Text style={st.backText}>{'\u25C1'} BACK</Text>
        </TouchableOpacity>

        <Text style={st.h1}>TERMS OF SERVICE</Text>
        <Text style={st.updated}>Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text>
        <View style={st.divider} />

        <Text style={st.body}>These Terms of Service govern your use of the MIRRORS application by GODMODE SOUND. By using the app, you agree to these terms.</Text>

        <Text style={st.heading}>USE OF SERVICE</Text>
        <Text style={st.body}>MIRRORS provides a sound experience for focus, calm, and presence. The app generates audio frequencies for personal listening. It is not a medical device. No content in this app constitutes medical advice, diagnosis, or treatment.</Text>

        <Text style={st.heading}>PURCHASES</Text>
        <Text style={st.body}>Digital music purchases are processed through Stripe. Prices are listed in USD. Upon successful payment, you receive immediate access to download digital content. Due to the digital nature of these products, all sales are generally final. See our refund policy on the About page for exceptions.</Text>

        <Text style={st.heading}>INTELLECTUAL PROPERTY</Text>
        <Text style={st.body}>All audio content, visual design, frequency compositions, and software are the intellectual property of Vince Sinnott / GODMODE SOUND. Personal use only. Redistribution, resale, or commercial use of any content is prohibited.</Text>

        <Text style={st.heading}>USER ACCOUNTS</Text>
        <Text style={st.body}>You are responsible for maintaining the security of your account credentials. You may not share account access or create multiple accounts for the purpose of circumventing purchase requirements.</Text>

        <Text style={st.heading}>DISCLAIMERS</Text>
        <Text style={st.body}>MIRRORS is provided "as is" without warranties of any kind. We do not guarantee specific outcomes from using the app. The frequency sessions are an artistic and experiential product, not a medical intervention.</Text>

        <Text style={st.heading}>LIMITATION OF LIABILITY</Text>
        <Text style={st.body}>GODMODE SOUND shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the app.</Text>

        <Text style={st.heading}>MODIFICATIONS</Text>
        <Text style={st.body}>We reserve the right to update these terms. Continued use of the app after changes constitutes acceptance of the updated terms.</Text>

        <Text style={st.heading}>CONTACT</Text>
        <Text style={st.body}>Questions about these terms: contact@godmodesound.com</Text>

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
