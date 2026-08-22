import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ReminderFrequency } from './SettingsContext';

/**
 * Local reminders only. Expo Go on Android (SDK 53+) removed push and may
 * throw when the notifications module loads — we never crash the app for that.
 */
export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

/** False on Expo Go Android where scheduling APIs are unreliable / throw. */
export function areLocalRemindersAvailable() {
  if (isExpoGo() && Platform.OS === 'android') return false;
  return true;
}

export type ReminderSchedule = {
  frequency: ReminderFrequency;
  hour: number;
};

const REMINDER_ID = 'kindplate-gentle-reminder';
const CLINICIAN_REMINDER_ID = 'kindplate-clinician-reminder';

type NotificationsModule = typeof import('expo-notifications');

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!areLocalRemindersAvailable()) return null;
  try {
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

function ensureHandler(Notifications: NotificationsModule) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  } catch {
    // Expo Go may throw when configuring handlers — ignore
  }
}

function buildTrigger(
  Notifications: NotificationsModule,
  frequency: ReminderFrequency,
  hour: number,
  channelId?: string
) {
  const types = Notifications.SchedulableTriggerInputTypes;
  // Prefer enum when present (dev builds); fall back to legacy calendar/interval shapes.
  if (types?.DAILY && frequency === 'daily') {
    return { type: types.DAILY, hour, minute: 0, channelId };
  }
  if (types?.WEEKLY && frequency === 'weekly') {
    return { type: types.WEEKLY, weekday: 1, hour, minute: 0, channelId };
  }
  if (types?.TIME_INTERVAL && (frequency === 'every_2_days' || frequency === 'every_3_days')) {
    const days = frequency === 'every_2_days' ? 2 : 3;
    return {
      type: types.TIME_INTERVAL,
      seconds: days * 24 * 60 * 60,
      repeats: true,
      channelId,
    };
  }

  if (frequency === 'daily') {
    return { hour, minute: 0, repeats: true, channelId };
  }
  if (frequency === 'weekly') {
    return { weekday: 1, hour, minute: 0, repeats: true, channelId };
  }
  const days = frequency === 'every_2_days' ? 2 : 3;
  return { seconds: days * 24 * 60 * 60, repeats: true, channelId };
}

async function scheduleLocal(
  identifier: string,
  content: { title: string; body: string },
  frequency: ReminderFrequency,
  hour: number
): Promise<{ scheduled: true } | { scheduled: false; reason: 'expo-go-android' | 'unavailable' | 'permission' }> {
  if (!areLocalRemindersAvailable()) {
    return { scheduled: false, reason: 'expo-go-android' };
  }

  try {
    const Notifications = await loadNotifications();
    if (!Notifications?.scheduleNotificationAsync) {
      return { scheduled: false, reason: 'unavailable' };
    }
    ensureHandler(Notifications);

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return { scheduled: false, reason: 'permission' };
    }

    if (Platform.OS === 'android' && Notifications.setNotificationChannelAsync) {
      await Notifications.setNotificationChannelAsync('gentle', {
        name: 'Gentle companion notes',
        importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
      });
    }

    try {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    } catch {
      /* ignore */
    }

    const channelId = Platform.OS === 'android' ? 'gentle' : undefined;
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: { ...content, sound: false },
      trigger: buildTrigger(Notifications, frequency, hour, channelId) as never,
    });

    return { scheduled: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (isExpoGo() || /Expo Go|development build|Push notifications/i.test(msg)) {
      return { scheduled: false, reason: 'expo-go-android' };
    }
    return { scheduled: false, reason: 'unavailable' };
  }
}

/** Gentle copy only — never “you forgot to log.” */
export async function enableGentleReminders(schedule: ReminderSchedule) {
  const hour = Math.min(23, Math.max(0, Math.round(schedule.hour)));
  return scheduleLocal(
    REMINDER_ID,
    {
      title: 'Buddi',
      body: 'Your companion would love a quiet hello when you have a moment.',
    },
    schedule.frequency,
    hour
  );
}

/**
 * Clinician-scheduled reminder — note + frequency + rough time-of-day hour.
 * Never throws (Home sync must stay calm in Expo Go).
 */
export async function enableClinicianScheduledReminder(opts: {
  note: string;
  frequency: ReminderFrequency;
  /** Clock hour 0–23 — prefer Morning(8) / Midday(12) / Evening(18) slots from clinic */
  hour?: number;
}) {
  const note = String(opts.note || '').trim();
  if (!note) {
    await disableClinicianScheduledReminder();
    return { scheduled: false as const, reason: 'empty' as const };
  }

  const hour = Math.min(23, Math.max(0, Math.round(opts.hour ?? 12)));
  const result = await scheduleLocal(
    CLINICIAN_REMINDER_ID,
    {
      title: 'A gentle note from your care team',
      body: note,
    },
    opts.frequency,
    hour
  );
  return result;
}

export async function disableGentleReminders() {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications?.cancelScheduledNotificationAsync) return;
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  } catch {
    // ignore — Expo Go / missing module
  }
}

export async function disableClinicianScheduledReminder() {
  try {
    const Notifications = await loadNotifications();
    if (!Notifications?.cancelScheduledNotificationAsync) return;
    await Notifications.cancelScheduledNotificationAsync(CLINICIAN_REMINDER_ID);
  } catch {
    // ignore — Expo Go / missing module
  }
}

export function describeReminderSchedule(schedule: ReminderSchedule) {
  const hourLabel = formatSimpleHour(schedule.hour);
  switch (schedule.frequency) {
    case 'daily':
      return `Every day around ${hourLabel}`;
    case 'every_2_days':
      return `About every 2 days (first note ~${hourLabel} window)`;
    case 'every_3_days':
      return `About every 3 days (first note ~${hourLabel} window)`;
    case 'weekly':
      return `Sundays around ${hourLabel}`;
    default:
      return hourLabel;
  }
}

function formatSimpleHour(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}:00 ${suffix}`;
}
