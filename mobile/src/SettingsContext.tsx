import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReminderFrequency = 'daily' | 'every_2_days' | 'every_3_days' | 'weekly';

export const REMINDER_FREQUENCY_OPTIONS: {
  id: ReminderFrequency;
  label: string;
  blurb: string;
}[] = [
  { id: 'daily', label: 'Every day', blurb: 'A soft hello once a day' },
  { id: 'every_2_days', label: 'Every 2 days', blurb: 'A lighter touch' },
  { id: 'every_3_days', label: 'Every 3 days', blurb: 'Occasional check-in' },
  { id: 'weekly', label: 'Once a week', blurb: 'Sunday soft note' },
];

export type AppSettings = {
  togetherMusic: boolean;
  /** Companion voice / speech — off by default; never auto-play on load */
  companionMuted: boolean;
  staySignedIn: boolean;
  remindersEnabled: boolean;
  reminderFrequency: ReminderFrequency;
  /** Local hour 0–23 */
  reminderHour: number;
};

const DEFAULTS: AppSettings = {
  togetherMusic: false,
  companionMuted: true,
  staySignedIn: true,
  remindersEnabled: false,
  reminderFrequency: 'daily',
  reminderHour: 18,
};

const KEY = 'kindplate.settings';

type SettingsContextValue = {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const updateSettings = async (patch: Partial<AppSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings requires SettingsProvider');
  return ctx;
}

export function formatHourLabel(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}
