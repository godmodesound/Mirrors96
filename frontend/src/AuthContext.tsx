import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
  || process.env.EXPO_PUBLIC_BACKEND_URL
  || '';

interface User {
  id: string;
  email: string;
  username: string;
  display_name: string;
  mirrors_id: string;
  phone: string;
  sms_opt_in: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, username: string, displayName: string, phone: string, smsOptIn: boolean) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: { display_name?: string; phone?: string; sms_opt_in?: boolean }) => Promise<{ success: boolean; error?: string }>;
  saveConfig: (name: string, configType: string, data: object) => Promise<boolean>;
  getConfigs: () => Promise<any[]>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  logout: async () => {},
  updateProfile: async () => ({ success: false }),
  saveConfig: async () => false,
  getConfigs: async () => [],
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved token on startup
  useEffect(() => {
    loadSavedAuth();
  }, []);

  const loadSavedAuth = async () => {
    try {
      const savedToken = await AsyncStorage.getItem('mirrors_token');
      const savedUser = await AsyncStorage.getItem('mirrors_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify token is still valid
        try {
          const res = await fetch(`${API_URL}/api/auth/profile`, {
            headers: { Authorization: `Bearer ${savedToken}` },
          });
          if (res.ok) {
            const profile = await res.json();
            setUser({
              id: profile.id,
              email: profile.email,
              username: profile.username || '',
              display_name: profile.display_name,
              mirrors_id: profile.mirrors_id,
              phone: profile.phone || '',
              sms_opt_in: profile.sms_opt_in || false,
            });
          } else {
            // Token expired
            await AsyncStorage.removeItem('mirrors_token');
            await AsyncStorage.removeItem('mirrors_user');
            setToken(null);
            setUser(null);
          }
        } catch (e) {
          // Network error, keep cached user
        }
      }
    } catch (e) {
      console.log('Error loading auth:', e);
    }
    setIsLoading(false);
  };

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('mirrors_token', data.token);
        await AsyncStorage.setItem('mirrors_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, error: data.detail || 'Login failed' };
    } catch (e: any) {
      return { success: false, error: 'Network error' };
    }
  };

  const register = async (email: string, password: string, username: string, displayName: string, phone: string, smsOptIn: boolean) => {
    try {
      const res = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username, display_name: displayName, phone, sms_opt_in: smsOptIn }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        setUser(data.user);
        await AsyncStorage.setItem('mirrors_token', data.token);
        await AsyncStorage.setItem('mirrors_user', JSON.stringify(data.user));
        return { success: true };
      }
      return { success: false, error: data.detail || 'Registration failed' };
    } catch (e: any) {
      return { success: false, error: 'Network error' };
    }
  };

  const updateProfile = async (updates: { display_name?: string; phone?: string; sms_opt_in?: boolean }) => {
    if (!token) return { success: false, error: 'Not authenticated' };
    try {
      const res = await fetch(`${API_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(prev => prev ? { ...prev, ...data } : null);
        if (user) {
          await AsyncStorage.setItem('mirrors_user', JSON.stringify({ ...user, ...data }));
        }
        return { success: true };
      }
      return { success: false, error: data.detail || 'Update failed' };
    } catch (e: any) {
      return { success: false, error: 'Network error' };
    }
  };

  const logout = async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.removeItem('mirrors_token');
    await AsyncStorage.removeItem('mirrors_user');
  };

  const saveConfig = async (name: string, configType: string, data: object) => {
    if (!token) return false;
    try {
      const res = await fetch(`${API_URL}/api/configs/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, config_type: configType, data }),
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  };

  const getConfigs = async () => {
    if (!token) return [];
    try {
      const res = await fetch(`${API_URL}/api/configs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        return data.configs || [];
      }
    } catch (e) {}
    return [];
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateProfile, saveConfig, getConfigs }}>
      {children}
    </AuthContext.Provider>
  );
}
