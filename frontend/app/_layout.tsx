import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View, StyleSheet, StatusBar, ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { useFonts } from 'expo-font';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AudioBridgeProvider } from '../src/AudioEngine';
import { AuthProvider } from '../src/AuthContext';
import { GoogleAuthProvider } from '../src/GoogleAuthContext';
import MobiusTabBar from '../src/MobiusTabBar';

// No floating button — PTT is seamlessly integrated in Mirrors ID section

export default function Layout() {
  const [fontsLoaded] = useFonts({
    'TerminatorRealNFI': require('../assets/fonts/TerminatorRealNFI.ttf'),
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <ActivityIndicator size="large" color="#ff0a0a" />
      </View>
    );
  }

  return (
    <GoogleAuthProvider>
    <AuthProvider>
    <AudioBridgeProvider>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <Tabs
          tabBar={(props) => <MobiusTabBar {...props} />}
          screenOptions={{
            headerShown: false,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Terminal',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="terminal" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="library"
            options={{
              title: 'Archive',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="library" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="sound"
            options={{
              title: 'Sound',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="musical-notes" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="binaural"
            options={{
              title: 'Neural',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="pulse" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="moods"
            options={{
              title: 'States',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="infinite" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="mirrors-id"
            options={{
              title: 'Mirrors ID',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="finger-print" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="how"
            options={{
              title: 'How',
              tabBarIcon: ({ color, size }) => (
                <Ionicons name="help-circle" size={size - 2} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="ptt"
            options={{
              href: null,
              title: 'PTT',
            }}
          />
          <Tabs.Screen
            name="codes"
            options={{
              href: null,
              title: 'CODES',
            }}
          />
          <Tabs.Screen
            name="chirpconnect"
            options={{
              href: null,
              title: 'MirrorConnect',
            }}
          />
          <Tabs.Screen
            name="store"
            options={{
              href: null,
              title: 'Store',
            }}
          />
        </Tabs>
      </View>
    </AudioBridgeProvider>
    </AuthProvider>
    </GoogleAuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});
