import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { useGoogleAuth } from './GoogleAuthContext';

import { skinStyles, SK } from './skins';

export default function GoogleSignInButton({ mirrorsId }: { mirrorsId?: string }) {
  const { googleUser, googleLoading, signInWithGoogle, signOutGoogle } = useGoogleAuth();

  if (googleLoading) {
    return <ActivityIndicator color={SK('#ff0a0a')} size="small" style={{ marginVertical: 12 }} />;
  }

  if (googleUser) {
    return (
      <View style={st.card}>
        {googleUser.picture ? (
          <Image source={{ uri: googleUser.picture }} style={st.avatar} />
        ) : (
          <View style={[st.avatar, st.avatarFallback]}>
            <Text style={st.avatarLetter}>{googleUser.name?.[0]?.toUpperCase() || 'G'}</Text>
          </View>
        )}
        <View style={st.info}>
          <Text style={st.name} numberOfLines={1}>{googleUser.name}</Text>
          <Text style={st.email} numberOfLines={1}>{googleUser.email}</Text>
          {googleUser.mirrors_id ? <Text style={st.linked}>LINKED · {googleUser.mirrors_id}</Text> : null}
        </View>
        <TouchableOpacity style={st.signOutBtn} onPress={signOutGoogle}>
          <Text style={st.signOutText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={st.btn} onPress={() => signInWithGoogle(mirrorsId)} activeOpacity={0.85}>
      <View style={st.gBadge}>
        <Text style={st.g}>G</Text>
      </View>
      <Text style={st.btnText}>SIGN IN WITH GOOGLE</Text>
    </TouchableOpacity>
  );
}

const st = skinStyles({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#0a0505',
    borderWidth: 1.5,
    borderColor: '#ff0a0a',
    borderRadius: 10,
    paddingVertical: 14,
  },
  gBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ff0a0a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  g: { color: '#000', fontSize: 14, fontWeight: '900' },
  btnText: { color: '#ff0a0a', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0a0505',
    borderWidth: 1,
    borderColor: '#ff0a0a55',
    borderRadius: 10,
    padding: 12,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: '#ff0a0a' },
  avatarFallback: { backgroundColor: '#1a0808', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { color: '#ff0a0a', fontSize: 18, fontWeight: '900' },
  info: { flex: 1 },
  name: { color: '#fff', fontSize: 13, fontWeight: '800', letterSpacing: 1 },
  email: { color: '#888', fontSize: 11, marginTop: 2 },
  linked: { color: '#ff0a0a', fontSize: 9, letterSpacing: 1.5, marginTop: 4, fontWeight: '700' },
  signOutBtn: { borderWidth: 1, borderColor: '#5a1a1a', borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  signOutText: { color: '#ff6b6b', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
});
