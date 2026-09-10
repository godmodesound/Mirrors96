import React from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { skinStyles, SK } from '../src/skins';
import { MirrorSurface } from '../src/MirrorFinish';
import { useGodmodeCheckout } from '../src/payments/useGodmodeCheckout';

export default function GodmodePurchaseScreen() {
  const { session_id, checkout } = useLocalSearchParams<{ session_id?: string; checkout?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const payment = useGodmodeCheckout(session_id, checkout);
  const paid = payment.state === 'paid';
  return <View testID="godmode-purchase-screen" style={[styles.screen, { paddingTop: insets.top }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <TouchableOpacity testID="godmode-back" accessibilityRole="button" onPress={() => router.replace('/')} style={styles.back}><Ionicons name="arrow-back" size={19} color={SK('#dce8f1')} /><Text style={styles.backText}>BACK TO APP</Text></TouchableOpacity>
      <Text style={styles.eyebrow}>GODMODE SOUND / ONE-TIME PURCHASE</Text>
      <Text testID="godmode-purchase-title" style={styles.title}>GODMODE</Text>
      <View style={styles.pricePanel}><MirrorSurface radius={0} /><Text style={styles.priceLabel}>ONE PAYMENT / USD</Text><Text testID="godmode-price" style={styles.price}>$33.96</Text><Text style={styles.priceMeta}>NO SUBSCRIPTION</Text></View>
      <Text style={styles.description}>Complete your GODMODE purchase securely with Stripe. Your existing music and frequency tools remain accessible.</Text>
      <View testID="godmode-payment-status" accessibilityLiveRegion="polite" style={styles.status}>
        {payment.state === 'checking' && <ActivityIndicator color={SK('#ff0a0a')} />}
        <Text style={styles.statusText}>{paid ? 'PAYMENT VERIFIED · Thank you.' : payment.state === 'checking' ? 'Checking payment directly with Stripe…' : payment.state === 'cancelled' ? 'CHECKOUT CANCELLED · Payment not confirmed.' : payment.state === 'unpaid' ? 'Payment has not been confirmed yet.' : payment.state === 'expired' ? 'This checkout expired. You can start again.' : 'Card details are entered only on Stripe.'}</Text>
      </View>
      {payment.error && <Text testID="godmode-checkout-error" accessibilityRole="alert" style={styles.error}>{payment.error}</Text>}
      {!paid && <TouchableOpacity testID="godmode-buy-button" accessibilityRole="button" accessibilityLabel="Buy GODMODE for 33 dollars and 96 cents" disabled={payment.loading || payment.state === 'checking'} onPress={payment.buy} activeOpacity={0.7} style={[styles.buy, (payment.loading || payment.state === 'checking') && styles.disabled]}>{payment.loading ? <ActivityIndicator color={SK('#000000')} /> : <><Text style={styles.buyText}>BUY GODMODE · $33.96</Text><Ionicons name="arrow-forward" color={SK('#000000')} size={19} /></>}</TouchableOpacity>}
      {['unpaid', 'cancelled', 'error'].includes(payment.state) && <TouchableOpacity testID="godmode-check-payment" accessibilityRole="button" onPress={payment.check} style={styles.check}><Text style={styles.checkText}>CHECK PAYMENT STATUS</Text></TouchableOpacity>}
      {paid && <TouchableOpacity testID="godmode-payment-done" onPress={() => router.replace('/')} style={styles.buy}><Text style={styles.buyText}>RETURN TO GODMODE SOUND</Text></TouchableOpacity>}
      <Text style={styles.footer}>SECURE CHECKOUT / STRIPE</Text>
    </ScrollView>
  </View>;
}

const styles = skinStyles({
  screen: { flex: 1, backgroundColor: '#000000' },
  content: { padding: 22, paddingBottom: 50, maxWidth: 620, width: '100%', alignSelf: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44, marginBottom: 28 },
  backText: { color: '#b7c8d4', fontSize: 11, letterSpacing: 1 },
  eyebrow: { color: '#a0a0b0', fontSize: 10, letterSpacing: 1.3, marginBottom: 16 },
  title: { color: '#eef3f7', fontSize: 27, fontFamily: 'TerminatorRealNFI', marginBottom: 27 },
  pricePanel: { padding: 28, marginBottom: 22, borderWidth: 1, borderColor: '#697f90' },
  priceLabel: { color: '#b7c8d4', fontSize: 10, letterSpacing: 1.5 },
  price: { color: '#eef3f7', fontSize: 56, fontWeight: '700', marginVertical: 12 },
  priceMeta: { color: '#b7c8d4', fontSize: 10, letterSpacing: 2 },
  description: { color: '#c0c6cd', fontSize: 15, lineHeight: 24 },
  status: { minHeight: 65, paddingVertical: 16, flexDirection: 'row', gap: 10, alignItems: 'center' },
  statusText: { flex: 1, color: '#a0a0b0', fontSize: 12, lineHeight: 19 },
  error: { color: '#ff9a9a', fontSize: 13, lineHeight: 21, marginBottom: 16 },
  buy: { minHeight: 54, backgroundColor: '#ff0a0a', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 14 },
  buyText: { color: '#000000', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  disabled: { opacity: 0.5 },
  check: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 12, borderWidth: 1, borderColor: '#39414a' },
  checkText: { color: '#c0cbd4', fontSize: 11, letterSpacing: 1 },
  footer: { color: '#8c9daa', textAlign: 'center', fontSize: 10, letterSpacing: 1.5, marginTop: 24 },
});