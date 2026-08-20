import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  Pressable,
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
  type CheckupCelebrationPending,
} from '../api';
import {
  expressionCaption,
  nextAmbientIdle,
  nextQuietIdle,
  type CompanionExpression,
  type CompanionPresence,
} from '../companionMood';

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
  const { user, signOut } = useAuth();
  const { settings } = useSettings();
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [pendingUnlocks, setPendingUnlocks] = useState<Unlock[]>([]);
  const [checkupMoment, setCheckupMoment] = useState<CheckupCelebrationPending | null>(null);
  const [showCheckup, setShowCheckup] = useState(false);
  const [napping, setNapping] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  /** Server presence band — happy | resting only (quiet hours, not a miss penalty) */
  const [presence, setPresence] = useState<CompanionPresence>('happy');
  /** Client presentation — may include waving / excited / curious / sleepy */
  const [expression, setExpression] = useState<CompanionExpression>('happy');
  const expressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appState = useRef(AppState.currentState);
  const nappingRef = useRef(false);
  nappingRef.current = napping;

  const muted = settings.companionMuted;

  const clearExpressionTimer = () => {
    if (expressionTimer.current) {
      clearTimeout(expressionTimer.current);
      expressionTimer.current = null;
    }
  };

  /** After a short gesture — stay with the user unless they chose Sleep */
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

  const stopVoice = () => {
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
    setSpeaking(false);
  };

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
            paddingBottom: Math.max(insets.bottom, 16) + 72,
          },
        ]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      >
        <View style={styles.topRow}>
          <Text style={[styles.brand, cozyLook && styles.brandResting]} accessibilityRole="header">
            KindPlate
          </Text>
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

        <Text style={styles.hello}>Hi {user?.name}</Text>
        <Text style={styles.sub}>
          {quietHours
            ? 'Evening hush — your companion is cozy. Talk, wave, or play anytime; a meal photo is never required.'
            : 'Thanks for spending a moment here today.'}
        </Text>

        <Pressable
          style={styles.switchAccount}
          onPress={signOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out or switch account"
        >
          <Text style={styles.switchAccountText}>Sign out / switch account</Text>
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {companion && (
          <View style={styles.hero}>
            <AnimalWebView
              key={`home-${companion.petType}-${companion.hat}-${companion.neck}`}
              character={characterForLiveCompanion(companion.petType)}
              expression={expression}
              muted={muted}
              style={styles.hero3d}
              accessibilityLabel={`${companion.petName} companion`}
              outfit={{
                hat: companion.hat,
                face: companion.face,
                neck: companion.neck,
                held: companion.held,
                scene: companion.scene,
              }}
            />
            <Text style={styles.petName}>{companion.petName}</Text>
            <Text style={styles.petCaption}>
              {expressionCaption(companion.petName, expression)}
              {' · Drag gently to look around · Customize in Settings'}
            </Text>

            <View style={styles.petActions}>
              <Pressable
                style={styles.petBtn}
                accessibilityRole="button"
                accessibilityLabel={`Talk with ${companion.petName}`}
                onPress={() => {
                  setNapping(false);
                  if (!muted) {
                    setSpeaking(true);
                    Speech.speak(`Hi. I'm ${companion.petName}. I'm glad you're here.`, {
                      rate: 0.82,
                      pitch: 1.0,
                      onDone: () => setSpeaking(false),
                      onStopped: () => setSpeaking(false),
                    });
                  }
                  clearExpressionTimer();
                  setExpression('happy');
                }}
              >
                <Text style={styles.petBtnText}>Talk</Text>
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
                  expressionTimer.current = setTimeout(() => {
                    settleAfterGesture(false);
                  }, 3200);
                }}
              >
                <Text style={styles.petBtnText}>Play</Text>
              </Pressable>
              <Pressable
                style={[styles.petBtn, styles.petBtnSleep]}
                accessibilityRole="button"
                accessibilityLabel="Let companion rest cozily"
                onPress={() => {
                  stopVoice();
                  setNapping(true);
                  clearExpressionTimer();
                  setExpression('sleepy');
                }}
              >
                <Text style={styles.petBtnText}>Sleep</Text>
              </Pressable>
            </View>
          </View>
        )}

        {companion ? <HelloCalendar helloDays={companion.helloDays || []} /> : null}

        {napping && companion ? (
          <View style={styles.restCard} accessibilityRole="summary">
            <Text style={styles.restTitle}>Resting together</Text>
            <Text style={styles.restBody}>
              {companion.petName} is not sad or fading — just resting quietly. Talk, wave, or
              play whenever you like. Missed days never change how welcome you are. A meal
              photo is optional whenever you want one.
            </Text>
          </View>
        ) : null}

        <Pressable
          style={[styles.primary, cozyLook && styles.primaryResting]}
          onPress={() => navigation.navigate('CheckIn')}
          accessibilityRole="button"
          accessibilityLabel="Take a meal photo check-in"
        >
          <Text style={styles.primaryText}>Take a photo of your meal</Text>
        </Pressable>
        <Pressable
          onPress={() => {}}
          accessibilityRole="text"
          style={styles.skipHintWrap}
        >
          <Text style={styles.skipHint}>
            No pressure — you can skip a photo any day. Your companion simply rests.
          </Text>
        </Pressable>
        <Text style={styles.clinicNote}>
          Your clinic can see meal photos and a plain-language pattern summary — not a score,
          and not a diagnosis. AI observes; clinicians decide.
        </Text>

        <View style={styles.linkRow}>
          {companion?.walksAvailable ? (
            <Pressable
              onPress={() => navigation.navigate('Together')}
              accessibilityRole="link"
              style={styles.linkHit}
            >
              <Text style={styles.link}>Sit quietly together</Text>
            </Pressable>
          ) : (
            <Text style={styles.linkMuted}>Quiet time unlocks after a few check-ins</Text>
          )}
        </View>

        {companion && companion.unlocks.length > 0 && (
          <View style={styles.unlocks}>
            <Text style={styles.unlocksTitle}>Keepsakes</Text>
            <Text style={styles.keepsakeLine}>
              {companion.unlocks.map((u) => u.label).join(' · ')}
            </Text>
          </View>
        )}
      </ScrollView>
      <SupportChip />
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
  topBtn: {
    minHeight: tapTarget.min,
    minWidth: tapTarget.min,
    justifyContent: 'center',
    alignItems: 'flex-end',
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
  petName: {
    marginTop: 10,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.ink,
  },
  petCaption: {
    marginTop: 4,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: 12,
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
  petBtnSleep: { backgroundColor: colors.teal },
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
  skipHintWrap: { marginTop: 8 },
  skipHint: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
    textAlign: 'center',
  },
  clinicNote: {
    marginTop: 10,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    lineHeight: 19,
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
  unlocks: { marginTop: spacing.xl },
  unlocksTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
    marginBottom: 6,
  },
  keepsakeLine: {
    fontFamily: 'Nunito_400Regular',
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21,
  },
});
