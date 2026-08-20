import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { ReminderFrequency } from './SettingsContext';

/**
 * Prefer scheduling local notifications whenever possible.
 * Expo Go on Android (SDK 53+) may still refuse — we catch and surface that.
 */
export function areLocalRemindersAvailable() {
  // Always attempt; enableGentleReminders reports scheduled:false if Expo Go blocks it.
  return true;
}

export function isExpoGo() {
  return Constants.appOwnership === 'expo';
}

export type ReminderSchedule = {
  frequency: ReminderFrequency;
  hour: number;
};

const REMINDER_ID = 'kindplate-gentle-reminder';

type NotificationsModule = typeof import('expo-notifications');

async function loadNotifications(): Promise<NotificationsModule> {
  return import('expo-notifications');
}

async function ensureHandler(Notifications: NotificationsModule) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Gentle copy only — never “you forgot to log.” */
export async function enableGentleReminders(schedule: ReminderSchedule) {
  try {
    const Notifications = await loadNotifications();
    ensureHandler(Notifications);

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      throw new Error('Notifications permission is needed for gentle reminders');
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('gentle', {
        name: 'Gentle companion notes',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    await disableGentleReminders();

    const hour = Math.min(23, Math.max(0, Math.round(schedule.hour)));
    const channelId = Platform.OS === 'android' ? 'gentle' : undefined;

    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'KindPlate',
        body: 'Your companion would love a quiet hello when you have a moment.',
        sound: false,
      },
      trigger: buildTrigger(Notifications, schedule.frequency, hour, channelId),
    });

    return { scheduled: true as const };
  } catch (e) {
    if (isExpoGo() && Platform.OS === 'android') {
      return { scheduled: false as const, reason: 'expo-go-android' as const };
    }
    throw e instanceof Error ? e : new Error('Could not schedule reminders');
  }
}

function buildTrigger(
  Notifications: NotificationsModule,
  frequency: ReminderFrequency,
  hour: number,
  channelId?: string
) {
  if (frequency === 'daily') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute: 0,
      channelId,
    };
  }

  if (frequency === 'weekly') {
    return {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: 1,
      hour,
      minute: 0,
      channelId,
    };
  }

  const days = frequency === 'every_2_days' ? 2 : 3;
  return {
    type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
    seconds: days * 24 * 60 * 60,
    repeats: true,
    channelId,
  };
}

export async function disableGentleReminders() {
  try {
    const Notifications = await loadNotifications();
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
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
