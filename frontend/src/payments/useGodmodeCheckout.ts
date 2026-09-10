import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as ExpoLinking from 'expo-linking';
import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API = (Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL || '').replace(/\/$/, '') + '/api';
const SESSION_KEY = 'godmode_checkout_session';
type PaymentState = 'ready' | 'checking' | 'unpaid' | 'paid' | 'expired' | 'cancelled' | 'error';

export function useGodmodeCheckout(sessionParam?: string, result?: string) {
  const [state, setState] = useState<PaymentState>(result === 'cancel' ? 'cancelled' : 'ready');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<string | null>(sessionParam || null);
  const requestId = useRef(Crypto.randomUUID());
  const checking = useRef(false);

  const check = useCallback(async () => {
    const id = session.current || await AsyncStorage.getItem(SESSION_KEY);
    if (!id || checking.current) return;
    session.current = id; checking.current = true; setState('checking'); setError(null);
    try {
      const response = await fetch(`${API}/sound/godmode/status/${encodeURIComponent(id)}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to verify payment. Please check again.');
      if (data.status === 'paid' && data.amount_total === 3396 && data.currency === 'usd') setState('paid');
      else if (data.status === 'expired') { requestId.current = Crypto.randomUUID(); setState('expired'); await AsyncStorage.removeItem(SESSION_KEY); }
      else setState(result === 'cancel' ? 'cancelled' : 'unpaid');
    } catch (e) { setState('error'); setError(e instanceof Error ? e.message : 'Unable to verify payment.'); }
    finally { checking.current = false; }
  }, [result]);

  useEffect(() => {
    if (sessionParam) session.current = sessionParam;
    void check();
    const listener = AppState.addEventListener('change', value => { if (value === 'active') void check(); });
    return () => listener.remove();
  }, [check, sessionParam]);

  const buy = async () => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`${API}/sound/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'godmode', request_id: requestId.current, ...(Platform.OS !== 'web' ? { return_uri: ExpoLinking.createURL('godmode') } : {}) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Checkout is unavailable. Please retry.');
      if (!data.url?.startsWith('https://checkout.stripe.com/') || data.amount_total !== 3396 || data.currency !== 'usd') throw new Error('Unexpected checkout details. Please retry.');
      session.current = data.session_id;
      await AsyncStorage.setItem(SESSION_KEY, data.session_id);
      if (Platform.OS === 'web') window.location.assign(data.url);
      else await Linking.openURL(data.url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to open checkout.'); }
    finally { setLoading(false); }
  };
  return { state, loading, error, buy, check };
}