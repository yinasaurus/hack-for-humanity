import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login as apiLogin,
  signup as apiSignup,
  saveToken,
  getToken,
  User,
} from './api';
import { useSettings } from './SettingsContext';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, name: string) => Promise<User>;
  signOut: () => Promise<void>;
  setUser: (u: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'companion.user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [raw, token] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          getToken(),
        ]);
        // Need both saved profile and JWT — otherwise show sign-in
        if (raw && token && settings.staySignedIn) {
          setUserState(JSON.parse(raw));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
          if (!token) await saveToken(null);
        }
      } finally {
        setLoading(false);
      }
    })();
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!settings.staySignedIn) {
      AsyncStorage.removeItem(STORAGE_KEY);
    } else if (user) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    }
  }, [settings.staySignedIn, user]);

  const setUser = async (u: User | null) => {
    setUserState(u);
    if (u && settings.staySignedIn) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { user: u } = await apiLogin(email.trim().toLowerCase(), password, 'patient');
    await setUser(u);
    return u;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { user: u } = await apiSignup(email.trim().toLowerCase(), password, name.trim());
    await setUser(u);
    return u;
  };

  const signOut = async () => {
    await saveToken(null);
    await setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}
