import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';
const AUTH_URL = 'https://auth.emergentagent.com/';
const TOKEN_KEY = 'google_session_token';
const PENDING_LINK_KEY = '@pending_mirrors_link';

export interface GoogleUser {
  user_id: string;
  email: string;
  name: string;
  picture: string;
  mirrors_id?: string | null;
}

const saveToken = async (t: string) => {
  if (Platform.OS === 'web') localStorage.setItem(TOKEN_KEY, t);
  else await SecureStore.setItemAsync(TOKEN_KEY, t);
};
const getToken = async (): Promise<string | null> => {
  if (Platform.OS === 'web') return localStorage.getItem(TOKEN_KEY);
  return SecureStore.getItemAsync(TOKEN_KEY);
};
const clearToken = async () => {
  if (Platform.OS === 'web') localStorage.removeItem(TOKEN_KEY);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
};

const parseSessionId = (url: string): string | null => {
  const m = url.match(/[#&?]session_id=([^&#]+)/);
  return m ? decodeURIComponent(m[1]) : null;
};

interface GoogleAuthState {
  googleUser: GoogleUser | null;
  googleLoading: boolean;
  signInWithGoogle: (mirrorsId?: string) => Promise<void>;
  signOutGoogle: () => Promise<void>;
}

const Ctx = createContext<GoogleAuthState>({
  googleUser: null,
  googleLoading: true,
  signInWithGoogle: async () => {},
  signOutGoogle: async () => {},
});

export const useGoogleAuth = () => useContext(Ctx);

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleUser, setGoogleUser] = useState<GoogleUser | null>(null);
  const [googleLoading, setGoogleLoading] = useState(true);
  const processedRef = useRef(false);

  const processSessionId = useCallback(async (sessionId: string, mirrorsId?: string | null) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/google/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, mirrors_id: mirrorsId || null }),
      });
      if (!res.ok) return;
      const data = await res.json();
      await saveToken(data.session_token);
      setGoogleUser(data.user);
    } catch (e) {
      console.log('Google session error:', e);
    }
  }, []);

  const checkStoredSession = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGoogleUser(data.user);
      } else if (res.status === 401) {
        await clearToken();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const init = async () => {
      if (Platform.OS === 'web') {
        // Process session_id FIRST (hash or query), then fall back to stored token
        const sid = parseSessionId(window.location.hash || window.location.search || '');
        if (sid) {
          const pending = localStorage.getItem(PENDING_LINK_KEY);
          localStorage.removeItem(PENDING_LINK_KEY);
          await processSessionId(sid, pending);
          window.history.replaceState(null, '', window.location.pathname);
        } else {
          await checkStoredSession();
        }
      } else {
        // Cold-start deep link fallback
        const initialUrl = await Linking.getInitialURL();
        const sid = initialUrl ? parseSessionId(initialUrl) : null;
        if (sid && !processedRef.current) {
          processedRef.current = true;
          await processSessionId(sid);
        } else {
          await checkStoredSession();
        }
      }
      setGoogleLoading(false);
    };
    init();

    if (Platform.OS !== 'web') {
      const sub = Linking.addEventListener('url', ({ url }) => {
        const sid = parseSessionId(url);
        if (sid && !processedRef.current) {
          processedRef.current = true;
          processSessionId(sid);
        }
      });
      return () => sub.remove();
    }
  }, [processSessionId, checkStoredSession]);

  const signInWithGoogle = useCallback(async (mirrorsId?: string) => {
    const redirectUrl = Platform.OS === 'web' ? window.location.origin + '/' : Linking.createURL('');
    const authUrl = `${AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
    if (Platform.OS === 'web') {
      if (mirrorsId) localStorage.setItem(PENDING_LINK_KEY, mirrorsId);
      window.location.href = authUrl;
      return;
    }
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    if (result.type === 'success' && result.url) {
      const sid = parseSessionId(result.url);
      if (sid) {
        processedRef.current = true;
        await processSessionId(sid, mirrorsId);
      }
    }
  }, [processSessionId]);

  const signOutGoogle = useCallback(async () => {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${API_BASE}/api/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch {}
    await clearToken();
    setGoogleUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ googleUser, googleLoading, signInWithGoogle, signOutGoogle }}>
      {children}
    </Ctx.Provider>
  );
};
