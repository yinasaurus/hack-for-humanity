import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login as apiLogin,
  signup as apiSignup,
  saveToken,
  getToken,
  getDeviceTimezone,
  syncTimezone,
  CompanionState,
  User,
} from './api';
import { useSettings } from './SettingsContext';
import {
  DEMO_PASSWORD,
  findDemoPatientAccount,
  isDemoToolsEnabled,
} from './demoMode';

type AuthContextValue = {
  user: User | null;
  companion: CompanionState | null;
  loading: boolean;
  /** True while presenter is jumping between seeded demo accounts. */
  demoSwitching: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string, name: string) => Promise<User>;
  signOut: () => Promise<void>;
  /** Dev/demo only — instant jump between seeded @demo.local patients. */
  switchDemoAccount: (email: string) => Promise<User>;
  setUser: (u: User | null) => void;
  setCompanion: React.Dispatch<React.SetStateAction<CompanionState | null>>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const STORAGE_KEY = 'companion.user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [user, setUserState] = useState<User | null>(null);
  // Kept in memory only: it is an onboarding handoff, not a second source of
  // truth. Home refreshes from the API on focus after a cold start.
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoSwitching, setDemoSwitching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [raw, token] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY),
          getToken(),
        ]);
        // Need both saved profile and JWT — otherwise show sign-in
        if (raw && token && settings.staySignedIn) {
          const restoredUser = JSON.parse(raw) as User;
          setUserState(restoredUser);
          if (restoredUser.role === 'patient') {
            // Timezone changes must not prevent a patient from entering the
            // app; the server can reject this route on older prototypes.
            void syncTimezone(restoredUser.id, getDeviceTimezone()).catch(() => undefined);
          }
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
    if (!u) setCompanion(null);
    if (u && settings.staySignedIn) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY);
    }
  };

  const signIn = async (email: string, password: string) => {
    setCompanion(null);
    const { user: u } = await apiLogin(email.trim().toLowerCase(), password, 'patient');
    await setUser(u);
    void syncTimezone(u.id, getDeviceTimezone()).catch(() => undefined);
    return u;
  };

  const signUp = async (email: string, password: string, name: string) => {
    setCompanion(null);
    const { user: u } = await apiSignup(email.trim().toLowerCase(), password, name.trim());
    await setUser(u);
    void syncTimezone(u.id, getDeviceTimezone()).catch(() => undefined);
    return u;
  };

  const signOut = async () => {
    setCompanion(null);
    await saveToken(null);
    await setUser(null);
  };

  const switchDemoAccount = async (email: string) => {
    if (!isDemoToolsEnabled()) {
      throw new Error('Demo account switcher is disabled in this build');
    }
    const target = findDemoPatientAccount(email);
    if (!target) {
      throw new Error('Unknown demo account');
    }
    setDemoSwitching(true);
    // Drop companion immediately so Home cannot paint the previous pet.
    setCompanion(null);
    try {
      await saveToken(null);
      const { user: u } = await apiLogin(target.email, DEMO_PASSWORD, 'patient');
      await setUser(u);
      void syncTimezone(u.id, getDeviceTimezone()).catch(() => undefined);
      return u;
    } finally {
      setDemoSwitching(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        companion,
        loading,
        demoSwitching,
        signIn,
        signUp,
        signOut,
        switchDemoAccount,
        setUser,
        setCompanion,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth requires AuthProvider');
  return ctx;
}
