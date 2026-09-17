import React, { useEffect, useState } from 'react';
import { Platform, View, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useGoogleAuth } from './GoogleAuthContext';
import { skinStyles } from './skins';

/**
 * Native "Sign in with Apple" button — iOS only (App Store requires the native control).
 * Renders nothing on web/Android or when the user is already signed in.
 */
export default function AppleSignInButton({ mirrorsId }: { mirrorsId?: string }) {
  const { googleUser, googleLoading, signInWithApple } = useGoogleAuth();
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    AppleAuthentication.isAvailableAsync().then(setAvailable).catch(() => setAvailable(false));
  }, []);

  if (Platform.OS !== 'ios' || !available || googleLoading || googleUser) return null;

  const onPress = async () => {
    if (busy) return;
    setBusy(true);
    const result = await signInWithApple(mirrorsId);
    setBusy(false);
    if (result === 'error') {
      Alert.alert('SIGN IN FAILED', 'Apple sign-in could not be completed. Please try again.');
    }
  };

  return (
    <View style={st.wrap} testID="apple-sign-in">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={10}
        style={st.btn}
        onPress={onPress}
      />
    </View>
  );
}

const st = skinStyles({
  wrap: { marginTop: 10 },
  btn: { width: '100%', height: 48 },
});
