import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
  PanResponder,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { HelloCalendar } from '../components/HelloCalendar';
import { MilestoneCelebration } from '../components/MilestoneCelebration';
import { CheckupCelebration } from '../components/CheckupCelebration';
import { SupportChip } from '../components/SupportChip';
import { AnimalWebView, characterForLiveCompanion } from '../characters';
import { colors, gradients, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import {
  CompanionState,
  Unlock,
  acknowledgeCheckupCelebration,
  fetchCompanion,
  skipCarePlanToday,
  type CheckupCelebrationPending,
} from '../api';
import {
  disableClinicianScheduledReminder,
  enableClinicianScheduledReminder,
} from '../notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  expressionCaption,
  nextAmbientIdle,
  nextQuietIdle,
  type CompanionExpression,
  type CompanionPresence,
} from '../companionMood';
import { nextCompanionTalk } from '../companionTalk';
import type { AnimalWebHandle } from '../characters';
import { PET_TYPES } from '../pets';

/** Speak multi-sentence lines in sequence (Android TTS truncates long blobs). */
function speakCompanionLines(full: string, onEnd: () => void) {
  const parts = full
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const queue = parts.length ? parts : [full];
  let i = 0;
  const next = () => {
    if (i >= queue.length) {
      onEnd();
      return;
    }
    const chunk = queue[i++];
    Speech.speak(chunk, {
      rate: 0.88,
      pitch: 1.02,
      onDone: next,
      onStopped: onEnd,
      onError: onEnd,
    });
  };
  try {
    Speech.stop();
  } catch {
    /* ignore */
  }
  next();
}

const CLINICIAN_REMINDER_SYNC_KEY = 'kindplate.clinicianReminderSyncId';

async function syncClinicianReminder(reminder: CompanionState['clinicianReminder']) {
  if (!reminder?.note) {
    await disableClinicianScheduledReminder();
    await AsyncStorage.removeItem(CLINICIAN_REMINDER_SYNC_KEY);
    return;
  }
  const prev = await AsyncStorage.getItem(CLINICIAN_REMINDER_SYNC_KEY);
  const stamp = `${reminder.id}:${reminder.frequency}:${reminder.hour}:${reminder.note}`;
  if (prev === stamp) return;
  await enableClinicianScheduledReminder({
    note: reminder.note,
    frequency: reminder.frequency,
    hour: reminder.hour,
  });
  await AsyncStorage.setItem(CLINICIAN_REMINDER_SYNC_KEY, stamp);
}

type Props = {
  navigation: {
    navigate: (screen: string, params?: object) => void;
    setParams?: (params: object) => void;
  };
  celebrate?: boolean;
  newUnlocks?: Unlock[];
};

export function HomeScreen({ navigation, celebrate, newUnlocks = [] }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [pendingUnlocks, setPendingUnlocks] = useState<Unlock[]>([]);
  const [checkupMoment, setCheckupMoment] = useState<CheckupCelebrationPending | null>(null);
  const [showCheckup, setShowCheckup] = useState(false);
  const [helloBanner, setHelloBanner] = useState(false);
  const [napping, setNapping] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [talkLine, setTalkLine] = useState<string | null>(null);
  const [heartBurst, setHeartBurst] = useState(0);
  const petRef = useRef<AnimalWebHandle | null>(null);
  /** Server presence band — happy | resting only (quiet hours, not a miss penalty) */
  const [presence, setPresence] = useState<CompanionPresence>('happy');
  /** Client presentation — may include waving / excited / curious / sleepy */
  const [expression, setExpression] = useState<CompanionExpression>('happy');
  const expressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);
  const nappingRef = useRef(false);
  nappingRef.current = napping;

  const muted = settings.companionMuted;

  const happyPetFeedback = useCallback(() => {
    setNapping(false);
    clearExpressionTimer();
    setExpression('happy');
    setHeartBurst((value) => value + 1);
    petRef.current?.wake();
    petRef.current?.react();
    expressionTimer.current = setTimeout(() => setExpression('happy'), 2600);
  }, []);

  const rubResponder = useMemo(() => {
    let distance = 0;
    let previousX = 0;
    let previousY = 0;
    let fired = false;
    return PanResponder.create({
      onMoveShouldSetPanResponderCapture: (_event, gesture) =>
        Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
      onPanResponderGrant: () => {
        distance = 0;
        previousX = 0;
        previousY = 0;
        fired = false;
      },
      onPanResponderMove: (_event, gesture) => {
        distance += Math.abs(gesture.dx - previousX) + Math.abs(gesture.dy - previousY);
        previousX = gesture.dx;
        previousY = gesture.dy;
        if (!fired && distance >= 48) {
          fired = true;
          happyPetFeedback();
        }
      },
    });
  }, [happyPetFeedback]);

  const clearExpressionTimer = () => {
    if (expressionTimer.current) {
      clearTimeout(expressionTimer.current);
      expressionTimer.current = null;
    }
  };

  /** After a short gesture, return to a calm expression. */
  const settleAfterGesture = useCallback((nap: boolean) => {
    setExpression(nap ? 'sleepy' : 'happy');
  }, []);

  /** Greeting wave — App open / foreground only (not check-in logic) */
  const playGreetingWave = useCallback(
    (nap: boolean) => {
      clearExpressionTimer();
      setExpression('waving');
      expressionTimer.current = setTimeout(() => {
        settleAfterGesture(nap);
      }, 2600);
    },
    [settleAfterGesture]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const data = await fetchCompanion(user.id);
      setCompanion(data);
      void syncClinicianReminder(data.clinicianReminder).catch(() => {
        /* Expo Go / permission — in-app card still shows */
      });
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[Home] companion appearance', {
          petType: data.petType,
          hat: data.hat,
          neck: data.neck,
          scene: data.scene,
          petName: data.petName,
        });
      }
      if (data.newlyUnlocked?.length && !newUnlocks.length) {
        setPendingUnlocks(data.newlyUnlocked);
        setShowMilestone(true);
      } else if (data.checkupCelebration?.id) {
        setCheckupMoment(data.checkupCelebration);
        setShowCheckup(true);
        setNapping(false);
        clearExpressionTimer();
        setExpression('excited');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load companion');
    } finally {
      setLoading(false);
    }
  }, [user, newUnlocks.length]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  useEffect(() => {
    if (newUnlocks.length) {
      setPendingUnlocks(newUnlocks);
      setShowMilestone(true);
    }
  }, [newUnlocks]);

  // Soft hello after a meal check-in (even when no keepsake unlocked)
  useEffect(() => {
    if (!celebrate) return;
    setHelloBanner(true);
    setNapping(false);
    clearExpressionTimer();
    setExpression('excited');
    expressionTimer.current = setTimeout(() => {
      settleAfterGesture(nappingRef.current);
      setHelloBanner(false);
      navigation.setParams?.({ celebrate: undefined });
    }, 4200);
    return () => clearExpressionTimer();
  }, [celebrate, navigation, settleAfterGesture]);

  useEffect(() => {
    if (!companion) return;
    const band = companion.mood === 'resting' ? 'resting' : 'happy';
    setPresence(band);
    // Quiet hours start cozy-looking; user can still Talk / Wave / Play anytime
    if (band === 'happy') {
      setNapping(false);
    }
    setExpression((prev) => {
      if (prev === 'waving' || prev === 'excited') return prev;
      if (nappingRef.current) return 'sleepy';
      return band === 'resting' ? 'sleepy' : 'happy';
    });
  }, [companion?.petType, companion?.mood, companion?.hat, companion?.neck, companion?.scene, companion?.petName]);

  // Milestone → excited (visual only; no numeric streak callout)
  useEffect(() => {
    if (!showMilestone) return;
    clearExpressionTimer();
    setExpression('excited');
  }, [showMilestone]);

  // Checkup celebration → excited companion (attendance acknowledgment only)
  useEffect(() => {
    if (!showCheckup) return;
    clearExpressionTimer();
    setExpression('excited');
  }, [showCheckup]);

  // App foreground → waving greeting (not tied to check-ins)
  useEffect(() => {
    playGreetingWave(nappingRef.current);
    const onChange = (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        playGreetingWave(nappingRef.current);
      }
      appState.current = next;
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
      clearExpressionTimer();
    };
  }, [playGreetingWave]);

  // While napping: soft quiet idle rotation
  useEffect(() => {
    if (!napping) return;
    if (expression === 'waving' || expression === 'excited') return;
    const id = setInterval(() => {
      setExpression((prev) => nextQuietIdle(prev));
    }, 14000);
    return () => clearInterval(id);
  }, [napping, expression]);

  // Ambient naps during awake idle — clock-based only (not check-in / miss gated)
  useEffect(() => {
    if (napping) return;
    if (expression === 'waving' || expression === 'excited') return;
    const id = setInterval(() => {
      setExpression((prev) => {
        const next = nextAmbientIdle(prev, new Date());
        return next ?? prev;
      });
    }, 20000);
    return () => clearInterval(id);
  }, [napping, expression]);

  if (loading && !companion) {
    return (
      <LinearGradient colors={[...gradients.loading]} style={styles.centered}>
        <ActivityIndicator color={colors.sageDeep} size="large" />
        <SupportChip />
      </LinearGradient>
    );
  }

  const quietHours = presence === 'resting';
  const cozyLook = quietHours || napping;
  const gradient = cozyLook ? gradients.homeResting : gradients.home;

  return (
    <LinearGradient colors={[...gradient]} style={styles.root}>
      <MilestoneCelebration
        visible={showMilestone}
        unlocks={pendingUnlocks}
        petName={companion?.petName}
        onClose={() => {
          setShowMilestone(false);
          setPendingUnlocks([]);
          navigation.setParams?.({ newUnlocks: undefined });
          settleAfterGesture(napping);
          if (companion?.checkupCelebration?.id && !checkupMoment) {
            setCheckupMoment(companion.checkupCelebration);
            setShowCheckup(true);
            setNapping(false);
            clearExpressionTimer();
            setExpression('excited');
          }
        }}
      />

      <CheckupCelebration
        visible={showCheckup && Boolean(checkupMoment)}
        petName={companion?.petName}
        message={
          checkupMoment?.message ||
          'Your clinician wanted you to know they are proud of you for being here today.'
        }
        onClose={() => {
          const id = checkupMoment?.id;
          setShowCheckup(false);
          setCheckupMoment(null);
          settleAfterGesture(false);
          if (user && id) {
            void acknowledgeCheckupCelebration(user.id, id)
              .then((next) => {
                setCompanion(next);
              })
              .catch(() => {
                /* still dismiss locally so it does not loop in-session */
              });
          }
        }}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 8) + 4,
            paddingBottom: Math.max(insets.bottom, 16) + 28,
          },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <View style={styles.topRow}>
          <Text style={[styles.brand, cozyLook && styles.brandResting]} accessibilityRole="header">
            Buddi
          </Text>
          <View style={styles.topActions}>
            <SupportChip placement="inline" />
            <Pressable
              onPress={() => navigation.navigate('Settings')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              style={styles.topBtn}
            >
              <Text style={styles.settingsGear}>⚙</Text>
            </Pressable>
          </View>
        </View>

        <Text style={styles.hello}>Hi {user?.name}</Text>
        <Text style={styles.sub}>
          {quietHours ? 'Quiet evening — hang out anytime.' : 'Glad you’re here.'}
        </Text>

        {helloBanner ? (
          <View style={styles.helloBanner} accessibilityRole="summary">
            <Text style={styles.helloBannerText}>
              Saved — {companion?.petName || 'your companion'} says hi.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {companion && (
          <View style={styles.hero}>
            <View
              {...rubResponder.panHandlers}
              accessibilityLabel={`Rub ${companion.petName} to make them happy`}
              style={[styles.hero3d, { opacity: ({ bright: 1, fatigued: 0.82, dim: 0.58, dormant: 0.35 } as const)[companion.vitality || 'bright'] }]}
            >
              <AnimalWebView
                ref={petRef}
                key={`home-${companion.petType}-${companion.hat}-${companion.neck}`}
                character={characterForLiveCompanion(companion.petType)}
                expression={expression}
                muted={muted}
                style={styles.hero3d}
                accessibilityLabel={`${companion.petName} companion, vitality ${companion.vitality || 'bright'}`}
                outfit={{
                  hat: companion.hat,
                  face: companion.face,
                  neck: companion.neck,
                  held: companion.held,
                  scene: companion.scene,
                }}
              />
              {heartBurst > 0 ? (
                <View key={heartBurst} pointerEvents="none" style={styles.hearts}>
                  <Text style={[styles.heart, styles.heartLeft]}>♥</Text>
                  <Text style={[styles.heart, styles.heartCenter]}>♥</Text>
                  <Text style={[styles.heart, styles.heartRight]}>♥</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.petName}>{companion.petName}</Text>
            <Text style={styles.petSpecies}>
              {PET_TYPES.find((pet) => pet.id === companion.petType)?.label || companion.petType}
              {' · '}{({ baby: 'Baby', little: 'Little', growing: 'Growing', playful: 'Playful', adventurer: 'Adventurer', grown: 'Grown' } as const)[companion.growthStage || 'baby']}
            </Text>
            <Text style={styles.petCaption}>
              {expressionCaption(companion.petName, expression)}
            </Text>
            <Pressable
              onPress={() => navigation.navigate('Customize', companion)}
              accessibilityRole="link"
              style={styles.styleLinkHit}
            >
              <Text style={styles.styleLink}>Style look</Text>
            </Pressable>

            {talkLine ? (
              <View style={styles.speechBubble} accessibilityRole="summary">
                <Text style={styles.speechBubbleText}>{talkLine}</Text>
              </View>
            ) : null}

            {companion.clinicianReminder?.note ? (
              <View style={styles.careNote} accessibilityRole="summary">
                <Text style={styles.careNoteEyebrow}>Care note</Text>
                <Text style={styles.careNoteBody}>
                  {companion.clinicianReminder.todayMoment?.prompt ||
                    companion.clinicianReminder.note}
                </Text>
                {companion.clinicianReminder.todayMoment ? (
                  <Text style={styles.careNoteSoft}>
                    {companion.clinicianReminder.todayMoment.isToday
                      ? `Today · ${companion.clinicianReminder.todayMoment.mealLabel}`
                      : `Next · ${companion.clinicianReminder.todayMoment.date}`}
                  </Text>
                ) : null}
                {companion.clinicianReminder.carePlan?.slots?.length ? (
                  <Pressable
                    style={styles.careNoteBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Move today's care moment to another day"
                    onPress={() => {
                      if (!user) return;
                      void skipCarePlanToday(user.id)
                        .then((next) => setCompanion(next))
                        .catch(() => {});
                    }}
                  >
                    <Text style={styles.careNoteBtnText}>Not today</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {companion.careGoals?.messages?.length ? (
              <View style={styles.careNote} accessibilityRole="summary">
                <Text style={styles.careNoteEyebrow}>{companion.careGoals.title}</Text>
                {companion.careGoals.messages.map((message) => (
                  <Text key={message} style={styles.careNoteBody}>{message}</Text>
                ))}
              </View>
            ) : null}

            <View style={styles.petActions}>
              <Pressable
                style={styles.petBtn}
                accessibilityRole="button"
                accessibilityLabel={`Talk with ${companion.petName}`}
                onPress={() => {
                  setNapping(false);
                  clearExpressionTimer();
                  setExpression('happy');
                  const line = nextCompanionTalk(companion.petName);
                  setTalkLine(line);
                  petRef.current?.wake();
                  petRef.current?.speak('');
                  // User tapped Talk — always speak (never auto-plays on its own).
                  if (muted) {
                    void updateSettings({ companionMuted: false });
                  }
                  setSpeaking(true);
                  speakCompanionLines(line, () => setSpeaking(false));
                  expressionTimer.current = setTimeout(() => {
                    settleAfterGesture(false);
                  }, 7800);
                }}
              >
                <Text style={styles.petBtnText}>{speaking ? 'Talking…' : 'Talk'}</Text>
              </Pressable>
              <Pressable
                style={styles.petBtn}
                accessibilityRole="button"
                accessibilityLabel="Wave hello"
                onPress={() => {
                  setNapping(false);
                  clearExpressionTimer();
                  setExpression('waving');
                  expressionTimer.current = setTimeout(() => {
                    settleAfterGesture(false);
                  }, 2600);
                }}
              >
                <Text style={styles.petBtnText}>Wave</Text>
              </Pressable>
              <Pressable
                style={styles.petBtn}
                accessibilityRole="button"
                accessibilityLabel="Gentle curious play"
                onPress={() => {
                  setNapping(false);
                  clearExpressionTimer();
                  setExpression('curious');
                  setTalkLine('Let’s play!');
                  setHeartBurst((value) => value + 1);
                  petRef.current?.wake();
                  petRef.current?.react();
                  expressionTimer.current = setTimeout(() => {
                    settleAfterGesture(false);
                  }, 3200);
                }}
              >
                <Text style={styles.petBtnText}>Play</Text>
              </Pressable>
            </View>
          </View>
        )}

        {companion ? <HelloCalendar helloDays={companion.helloDays || []} /> : null}

        {napping && companion ? (
          <View style={styles.restCard} accessibilityRole="summary">
            <Text style={styles.restTitle}>Resting</Text>
            <Text style={styles.restBody}>
              {companion.petName} is cozy — not upset. Talk whenever you like.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primary, cozyLook && styles.primaryResting]}
          onPress={() => navigation.navigate('CheckIn')}
          accessibilityRole="button"
          accessibilityLabel="Take a meal photo check-in"
        >
          <Text style={styles.primaryText}>Meal photo</Text>
        </Pressable>
        <Text style={styles.skipHint}>Optional · skip anytime</Text>

        <View style={styles.linkRow}>
          {companion?.walksAvailable ? (
            <Pressable
              onPress={() => navigation.navigate('Together')}
              accessibilityRole="link"
              style={styles.linkHit}
            >
              <Text style={styles.link}>Quiet time</Text>
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            accessibilityRole="link"
            style={styles.linkHit}
          >
            <Text style={styles.linkMuted}>Settings</Text>
          </Pressable>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  topBtn: {
    minHeight: tapTarget.min,
    minWidth: tapTarget.min,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  helloBanner: {
    marginTop: spacing.sm,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  helloBannerText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.sageDeep,
    lineHeight: 22,
  },
  brand: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: colors.sageDeep,
  },
  brandResting: { color: colors.teal },
  settingsGear: {
    fontSize: 22,
    color: colors.inkSoft,
    lineHeight: 28,
  },
  signOut: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.inkSoft,
    fontSize: 14,
  },
  switchAccount: {
    alignSelf: 'flex-start',
    marginTop: 8,
    marginBottom: 4,
    minHeight: tapTarget.min,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.card,
    justifyContent: 'center',
  },
  switchAccountText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.teal,
  },
  hello: {
    marginTop: spacing.md,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 32,
    color: colors.ink,
    letterSpacing: -0.5,
  },
  sub: {
    marginTop: 6,
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    color: colors.inkSoft,
    lineHeight: 23,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    width: '100%',
  },
  hero3d: {
    width: '100%',
    height: 320,
    borderRadius: 28,
  },
  vitality_bright: { opacity: 1 },
  vitality_fatigued: { opacity: 0.82 },
  vitality_dim: { opacity: 0.58 },
  vitality_dormant: { opacity: 0.35 },
  petName: {
    marginTop: 10,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.ink,
  },
  hearts: { ...StyleSheet.absoluteFillObject },
  heart: { position: 'absolute', color: colors.coral, fontSize: 30, textShadowColor: colors.white, textShadowRadius: 5 },
  heartLeft: { left: '22%', top: '30%', transform: [{ rotate: '-12deg' }] },
  heartCenter: { left: '47%', top: '15%' },
  heartRight: { right: '20%', top: '34%', transform: [{ rotate: '12deg' }] },
  petSpecies: {
    marginTop: 2,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.sageDeep,
  },
  styleLinkHit: {
    marginTop: 4,
    minHeight: 36,
    justifyContent: 'center',
  },
  styleLink: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.sageDeep,
    textDecorationLine: 'underline',
  },
  petCaption: {
    marginTop: 4,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  careNote: {
    marginTop: 14,
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  careNoteEyebrow: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 11,
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  careNoteBody: {
    marginTop: 6,
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    lineHeight: 22,
    color: colors.ink,
  },
  careNoteSoft: {
    marginTop: 6,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
  },
  careNoteBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.sageDeep,
  },
  careNoteBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.white,
  },
  speechBubble: {
    marginTop: 12,
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  speechBubbleText: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.ink,
  },
  petActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  petBtn: {
    backgroundColor: colors.sageDeep,
    borderRadius: 14,
    minHeight: tapTarget.min,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petBtnText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 14,
  },
  restCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 14,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.teal,
  },
  restBody: {
    marginTop: 6,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: colors.inkSoft,
  },
  restMeta: {
    marginTop: 8,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.sageDeep,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.teal,
    marginBottom: spacing.md,
  },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.sageDeep,
    borderRadius: 18,
    minHeight: tapTarget.min,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryResting: {
    backgroundColor: colors.teal,
  },
  primaryText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 17,
  },
  skipHint: {
    marginTop: 8,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  linkRow: {
    marginTop: spacing.lg,
    gap: 10,
    alignItems: 'center',
  },
  linkHit: {
    minHeight: tapTarget.min,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  link: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.sageDeep,
    textDecorationLine: 'underline',
  },
  linkMuted: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
  },
});
