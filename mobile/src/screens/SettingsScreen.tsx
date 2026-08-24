import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import {
  REMINDER_FREQUENCY_OPTIONS,
  formatHourLabel,
  useSettings,
  type ReminderFrequency,
} from '../SettingsContext';
import {
  describeReminderSchedule,
  disableGentleReminders,
  enableGentleReminders,
  isExpoGo,
} from '../notifications';
import { BuddiBrand } from '../components/BuddiBrand';
import { SupportChip } from '../components/SupportChip';

type Props = {
  navigation: {
    goBack: () => void;
    navigate: (screen: string, params?: object) => void;
  };
};

const HOUR_CHOICES = [9, 12, 15, 18, 20];

export function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [note, setNote] = useState<string | null>(null);
  const [companionRequestNote, setCompanionRequestNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const applyReminderSchedule = async (patch: {
    enabled?: boolean;
    frequency?: ReminderFrequency;
    hour?: number;
  }) => {
    setBusy(true);
    setNote(null);
    try {
      const enabled = patch.enabled ?? settings.remindersEnabled;
      const frequency = patch.frequency ?? settings.reminderFrequency;
      const hour = patch.hour ?? settings.reminderHour;

      await updateSettings({
        remindersEnabled: enabled,
        reminderFrequency: frequency,
        reminderHour: hour,
      });

      if (enabled) {
        const result = await enableGentleReminders({ frequency, hour });
        if (result.scheduled === false) {
          setNote(
            isExpoGo()
              ? `Preference saved (${describeReminderSchedule({ frequency, hour })}). Expo Go on Android (SDK 53+) can’t schedule device notifications — the in-app care note still shows. Use an EAS build for real OS reminders.`
              : `Preference saved (${describeReminderSchedule({ frequency, hour })}), but the OS could not schedule a notification.`
          );
        } else {
          setNote(
            `Reminders on — ${describeReminderSchedule({ frequency, hour })}. Mute anytime.`
          );
        }
      } else {
        await disableGentleReminders();
        setNote('Reminders muted.');
      }
    } catch (e) {
      setNote(e instanceof Error ? e.message : 'Could not update reminders');
      await updateSettings({ remindersEnabled: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[...gradients.settings]} style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 8) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 72,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          style={{ minHeight: tapTarget.min, justifyContent: 'center' }}
        >
          <Text style={styles.back}>← Back</Text>
        </Pressable>

        <BuddiBrand size="compact" textStyle={styles.brand} />
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>{user?.email}</Text>

        {/* Account */}
        <Text style={styles.section}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Stay signed in</Text>
              <Text style={styles.rowBody}>
                Keep your secure session on this phone until you sign out.
              </Text>
            </View>
            <Switch
              value={settings.staySignedIn}
              onValueChange={(v) => updateSettings({ staySignedIn: v })}
              trackColor={{ true: colors.sage, false: '#D8D0C8' }}
            />
          </View>
        </View>

        {/* Companion */}
        <Text style={styles.section}>Companion</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Mute voice</Text>
              <Text style={styles.rowBody}>Talk plays only after a tap. Turn this on to keep it quiet.</Text>
            </View>
            <Switch
              value={settings.companionMuted}
              onValueChange={(v) => {
                updateSettings({ companionMuted: v, companionMuteIntentional: true });
              }}
              trackColor={{ true: colors.sage, false: '#D8D0C8' }}
              accessibilityLabel="Mute companion voice"
            />
          </View>
          <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, marginTop: 8, paddingTop: 12 }]}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Quiet-time music</Text>
              <Text style={styles.rowBody}>Soft sound while sitting together.</Text>
            </View>
            <Switch
              value={settings.togetherMusic}
              onValueChange={(v) => updateSettings({ togetherMusic: v })}
              trackColor={{ true: colors.sage, false: '#D8D0C8' }}
              accessibilityLabel="Quiet-time music"
            />
          </View>
          <Pressable
            onPress={() => navigation.navigate('Customize')}
            accessibilityRole="button"
            accessibilityLabel="Customize companion looks"
            style={styles.linkRow}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Style companion</Text>
              <Text style={styles.rowBody}>Looks and keepsakes.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setCompanionRequestNote(
                'Please ask your care team to help change your companion. Your progress and keepsakes will stay safe.'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Request companion change"
            style={styles.linkRow}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Request companion change</Text>
              <Text style={styles.rowBody}>Your care team can help with this.</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
          {companionRequestNote ? (
            <Text style={styles.companionRequestNote} accessibilityRole="alert">
              {companionRequestNote}
            </Text>
          ) : null}
        </View>

        {/* Reminders */}
        <Text style={styles.section}>Gentle reminders</Text>
        <View style={styles.card}>
          {isExpoGo() ? (
            <Text style={styles.expoGoNote}>
              Expo Go (Android): care notes still show in-app. OS notification pop-ups need an
              EAS build — they will not fire here.
            </Text>
          ) : null}
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Reminders</Text>
              <Text style={styles.rowBody}>Soft hellos only — never “you forgot.”</Text>
            </View>
            <Switch
              disabled={busy}
              value={settings.remindersEnabled}
              onValueChange={(v) => applyReminderSchedule({ enabled: v })}
              trackColor={{ true: colors.sage, false: '#D8D0C8' }}
            />
          </View>

          <Text style={styles.fieldLabel}>How often</Text>
          <View style={styles.chipWrap}>
            {REMINDER_FREQUENCY_OPTIONS.map((opt) => {
              const on = settings.reminderFrequency === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  disabled={busy}
                  onPress={() =>
                    applyReminderSchedule({
                      frequency: opt.id,
                      enabled: true,
                    })
                  }
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipTitle, on && styles.chipTitleOn]}>{opt.label}</Text>
                  <Text style={styles.chipBlurb}>{opt.blurb}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Preferred time</Text>
          <View style={styles.hourRow}>
            {HOUR_CHOICES.map((h) => {
              const on = settings.reminderHour === h;
              return (
                <Pressable
                  key={h}
                  disabled={busy}
                  onPress={() =>
                    applyReminderSchedule({
                      hour: h,
                      enabled: true,
                    })
                  }
                  style={[styles.hourChip, on && styles.hourChipOn]}
                >
                  <Text style={[styles.hourText, on && styles.hourTextOn]}>
                    {formatHourLabel(h)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {settings.remindersEnabled ? (
            <Text style={styles.scheduleHint}>
              Currently:{' '}
              {describeReminderSchedule({
                frequency: settings.reminderFrequency,
                hour: settings.reminderHour,
              })}
            </Text>
          ) : (
            <Text style={styles.scheduleHint}>Reminders are off — pick a time to turn them on.</Text>
          )}
        </View>

        {note ? <Text style={styles.feedback}>{note}</Text> : null}


        <Pressable style={styles.signOut} onPress={() => signOut()}>
          <Text style={styles.signOutText}>Sign out</Text>
        </Pressable>
      </ScrollView>
      <SupportChip />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  back: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.inkSoft,
    marginBottom: 8,
  },
  brand: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: colors.sageDeep,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 30,
    color: colors.ink,
    marginTop: 2,
  },
  sub: {
    fontFamily: 'Nunito_400Regular',
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  section: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowText: { flex: 1 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    minHeight: tapTarget.min,
  },
  chevron: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
    color: colors.inkSoft,
  },
  rowTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.ink,
  },
  rowBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    marginTop: 4,
    lineHeight: 18,
  },
  fieldLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
    marginTop: 16,
    marginBottom: 8,
  },
  chipWrap: { gap: 8 },
  chip: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.sageWash,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipOn: {
    borderColor: colors.sageDeep,
    backgroundColor: colors.mist,
  },
  chipTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
  },
  chipTitleOn: { color: colors.sageDeep },
  chipBlurb: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  hourRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  hourChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.sageWash,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  hourChipOn: {
    borderColor: colors.sageDeep,
    backgroundColor: colors.mint,
  },
  hourText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.inkSoft,
  },
  hourTextOn: { color: colors.sageDeep },
  scheduleHint: {
    marginTop: 12,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.sageDeep,
    lineHeight: 18,
  },
  expoGoNote: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
    lineHeight: 17,
    marginBottom: 12,
  },
  feedback: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.sageDeep,
    marginBottom: 10,
    fontSize: 13,
  },
  companionRequestNote: {
    marginTop: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: colors.sageDeep,
    fontSize: 13,
    lineHeight: 18,
  },
  aiLine: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
    lineHeight: 21,
    marginBottom: 8,
  },
  aiStrong: {
    fontFamily: 'Nunito_700Bold',
    color: colors.ink,
  },
  privacy: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 19,
    marginTop: 4,
  },
  signOut: {
    marginTop: spacing.xl,
    alignItems: 'center',
    paddingVertical: 14,
  },
  signOutText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.teal,
    fontSize: 16,
  },
});
