import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { HelloCalendar } from '../components/HelloCalendar';
import { MilestoneCelebration } from '../components/MilestoneCelebration';
import { CheckupCelebration } from '../components/CheckupCelebration';
import { SupportChip } from '../components/SupportChip';
import { BuddiBrand } from '../components/BuddiBrand';
import {
  AnimalWebView,
  animalPresentationFor,
  characterForLiveCompanion,
  createAnimalIntent,
  isGrowthMilestoneDay,
} from '../characters';
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
  calmExpressionForVitality,
  expressionCaption,
  isEngagementResting,
  nextAmbientIdle,
  nextQuietIdle,
  type CompanionExpression,
  type CompanionPresence,
} from '../companionMood';
import { companionTalkFrame, selectCompanionTalk } from '../companionTalk';
import { startCompanionTalkReveal } from '../companionTalkTimeline';
import {
  PLAY_TARGETS,
  advancePlayStep,
  animalTalkBubble,
} from '../companionInteraction';
import {
  REACTION_MS,
  talkVisualDurationMs,
} from '../companionReactions';
import type { AnimalWebHandle } from '../characters';
import { petTypeLabel } from '../pets';
import { BondingHeartBurst } from '../components/BondingHeartBurst';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useAnimalAudio } from '../audio/useAnimalAudio';
import type { BondingHeartIntensity } from '../companionBonding';

const CLINICIAN_REMINDER_SYNC_KEY = 'kindplate.clinicianReminderSyncId';
const GROWTH_CHAPTERS = ['baby', 'little', 'growing', 'playful', 'adventurer', 'grown'] as const;

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
  const reducedMotion = useReducedMotion();
  const {
    user,
    companion: handoffCompanion,
    setCompanion: setContextCompanion,
  } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [companion, setLocalCompanion] = useState<CompanionState | null>(handoffCompanion);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [pendingUnlocks, setPendingUnlocks] = useState<Unlock[]>([]);
  const [showGrowthCelebration, setShowGrowthCelebration] = useState(false);
  const growthCelebrationPending = useRef(false);
  const growthCelebrationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [checkupMoment, setCheckupMoment] = useState<CheckupCelebrationPending | null>(null);
  const [showCheckup, setShowCheckup] = useState(false);
  const [helloBanner, setHelloBanner] = useState(false);
  const [napping, setNapping] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [talkLine, setTalkLine] = useState<string | null>(null);
  const [visibleTalkLine, setVisibleTalkLine] = useState<string | null>(null);
  const [talkWordByWord, setTalkWordByWord] = useState(false);
  const [talkAudioDurationMs, setTalkAudioDurationMs] = useState<number | null>(null);
  const [playActive, setPlayActive] = useState(false);
  const [playStep, setPlayStep] = useState(0);
  const [heartBurst, setHeartBurst] = useState<{
    id: number;
    intensity: BondingHeartIntensity;
  } | null>(null);
  const heartBurstId = useRef(0);
  const petRef = useRef<AnimalWebHandle | null>(null);
  const talkRequest = useRef(0);
  const previousTalkPhraseIdRef = useRef<string | null>(null);
  /** Server presence band — happy | resting only (quiet hours, not a miss penalty) */
  const [presence, setPresence] = useState<CompanionPresence>('happy');
  /** Client presentation — may include waving / excited / curious / sleepy */
  const [expression, setExpression] = useState<CompanionExpression>('happy');
  const expressionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nappingRef = useRef(false);
  nappingRef.current = napping;
  const celebrateRef = useRef(Boolean(celebrate));
  celebrateRef.current = Boolean(celebrate);
  const speakingRef = useRef(false);
  speakingRef.current = speaking;

  useEffect(() => {
    if (!talkLine) {
      setVisibleTalkLine(null);
      return;
    }
    if (!talkWordByWord) {
      setVisibleTalkLine(talkLine);
      return;
    }
    setVisibleTalkLine(null);
    return startCompanionTalkReveal(
      talkLine,
      talkAudioDurationMs,
      (frame) => setVisibleTalkLine(frame)
    ).cancel;
  }, [talkAudioDurationMs, talkLine, talkWordByWord]);

  // The original default was muted=true. A Talk tap migrates that legacy
  // default to audible playback; only an explicit switch action suppresses
  // the call. This preserves both accessibility and a real sound-off control.
  const muted = settings.companionMuted && settings.companionMuteIntentional;
  const animalAudio = useAnimalAudio(muted);

  const updateCompanion = useCallback(
    (next: CompanionState) => {
      setLocalCompanion(next);
      setContextCompanion(next);
    },
    [setContextCompanion]
  );

  const stopTalk = useCallback(() => {
    talkRequest.current += 1;
    animalAudio.stop();
    if (expressionTimer.current) {
      clearTimeout(expressionTimer.current);
      expressionTimer.current = null;
    }
    petRef.current?.stopSpeaking();
    setSpeaking(false);
    setTalkLine(null);
    setVisibleTalkLine(null);
    setTalkWordByWord(false);
    setTalkAudioDurationMs(null);
  }, [animalAudio]);

  const showHeartBurst = useCallback((intensity: BondingHeartIntensity = 'small') => {
    heartBurstId.current += 1;
    setHeartBurst({ id: heartBurstId.current, intensity });
  }, []);

  const finishHeartBurst = useCallback((burstId: number) => {
    setHeartBurst((current) => current?.id === burstId ? null : current);
  }, []);

  // Onboarding hands the complete companion response through AuthContext so
  // the selected species is visible during the navigator transition. A cold
  // start still begins with null and is filled by the authoritative API load.
  useEffect(() => {
    if (handoffCompanion) setLocalCompanion(handoffCompanion);
  }, [handoffCompanion]);

  // Demo account jumps remount Home via key={user.id}; also clear if user changes in-place.
  useEffect(() => {
    setLocalCompanion(null);
    setLoading(true);
    setShowMilestone(false);
    setPendingUnlocks([]);
    setShowCheckup(false);
    setCheckupMoment(null);
    setTalkLine(null);
    setVisibleTalkLine(null);
    setPlayActive(false);
    setNapping(false);
    setExpression('happy');
  }, [user?.id]);

  const clearExpressionTimer = () => {
    if (expressionTimer.current) {
      clearTimeout(expressionTimer.current);
      expressionTimer.current = null;
    }
  };

  /** After a short gesture, return to vitality-/quiet-appropriate calm expression. */
  const settleAfterGesture = useCallback(
    (preferQuiet: boolean) => {
      const vitality = companion?.vitality;
      const quietBand =
        preferQuiet ||
        presence === 'resting' ||
        isEngagementResting(vitality);
      if (!quietBand) {
        setExpression('happy');
        return;
      }
      setExpression(
        isEngagementResting(vitality)
          ? calmExpressionForVitality(vitality)
          : 'sleepy'
      );
    },
    [companion?.vitality, presence]
  );

  /** Lightweight anytime play — bounce/trick, never gated or required. */
  const runPlayBonding = useCallback(() => {
    stopTalk();
    setNapping(false);
    clearExpressionTimer();
    setExpression('excited');
    showHeartBurst('small');
    petRef.current?.wake();
    petRef.current?.react();
    expressionTimer.current = setTimeout(() => {
      settleAfterGesture(false);
    }, REACTION_MS.play);
  }, [settleAfterGesture, showHeartBurst, stopTalk]);

  /** Explicit Wave button only — animation runs; no auto chirp. */
  const playWave = useCallback(
    (nap: boolean) => {
      // Don't interrupt a check-in hello or an in-progress Talk.
      if (celebrateRef.current || speakingRef.current) return;
      clearExpressionTimer();
      setNapping(false);
      setExpression('waving');
      showHeartBurst('small');
      petRef.current?.wake();
      petRef.current?.wave();
      expressionTimer.current = setTimeout(() => {
        settleAfterGesture(nap);
      }, REACTION_MS.wave);
    },
    [settleAfterGesture, showHeartBurst]
  );

  /**
   * Talk with optional cute call. Visual mouth/head always runs; audio is
   * skipped when muted. Button source may migrate legacy soft-mute.
   */
  const runTalk = useCallback(
    (source: 'button' | 'checkin' | 'tap') => {
      if (!companion) return;
      stopTalk();
      const selectedTalk = selectCompanionTalk({
        petName: companion.petName,
        previousId: previousTalkPhraseIdRef.current,
      });
      previousTalkPhraseIdRef.current = selectedTalk.id;
      setNapping(false);
      clearExpressionTimer();
      setExpression('happy');
      const renderedSpecies = characterForLiveCompanion(companion.petType).id;
      const explicitlyMuted =
        settings.companionMuted && settings.companionMuteIntentional;
      if (
        source === 'button' &&
        settings.companionMuted &&
        !settings.companionMuteIntentional
      ) {
        void updateSettings({ companionMuted: false });
      }
      const line = animalTalkBubble(
        animalPresentationFor(renderedSpecies).voice.caption,
        selectedTalk.text
      );
      const showBubble = source !== 'tap';
      setTalkAudioDurationMs(null);
      setVisibleTalkLine(null);
      setTalkWordByWord(showBubble);
      if (showBubble) {
        setTalkLine(
          explicitlyMuted && source === 'button'
            ? `${line} Voice is muted in Settings.`
            : line
        );
      } else {
        setTalkLine(null);
      }
      showHeartBurst(source === 'checkin' ? 'celebration' : 'small');
      petRef.current?.wake();
      const requestId = ++talkRequest.current;
      setSpeaking(true);
      void animalAudio
        .play(renderedSpecies, 'talk')
        .then((result) => {
          if (requestId !== talkRequest.current) return;
          setTalkAudioDurationMs(result.durationMs > 0 ? result.durationMs : null);
          if (!result.played && source === 'button' && !explicitlyMuted) {
            setTalkLine(
              `${line} I couldn't make a sound just now. Check this site's sound and your device volume, then try Talk again.`
            );
          }
          petRef.current?.dispatch(createAnimalIntent('talk', result.durationMs));
          const visualDuration = talkVisualDurationMs(result.durationMs, reducedMotion);
          expressionTimer.current = setTimeout(() => {
            if (requestId !== talkRequest.current) return;
            setSpeaking(false);
            settleAfterGesture(false);
          }, visualDuration + 180);
        })
        .catch(() => {
          if (requestId !== talkRequest.current) return;
          setTalkAudioDurationMs(null);
          if (source === 'button') {
            setTalkLine(
              `${line} I couldn't make a sound just now. Check this site's sound and your device volume, then try Talk again.`
            );
          }
          petRef.current?.dispatch(createAnimalIntent('talk'));
          setSpeaking(false);
          settleAfterGesture(false);
        });
    },
    [
      animalAudio,
      companion,
      reducedMotion,
      settings.companionMuteIntentional,
      settings.companionMuted,
      settleAfterGesture,
      showHeartBurst,
      stopTalk,
      updateSettings,
    ]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const data = await fetchCompanion(user.id);
      updateCompanion(data);
      if (data.newlyUnlocked?.some((unlock) => isGrowthMilestoneDay(unlock.milestoneDay))) {
        growthCelebrationPending.current = true;
      }
      void syncClinicianReminder(data.clinicianReminder).catch(() => {
        /* Expo Go / permission — in-app card still shows */
      });
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
  }, [newUnlocks.length, updateCompanion, user]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  // Navigation away or a focused-screen interruption stops both the native
  // call and the renderer's Talk intent before the next screen takes over.
  useFocusEffect(
    useCallback(() => () => stopTalk(), [stopTalk])
  );

  useEffect(() => {
    if (muted) stopTalk();
  }, [muted, stopTalk]);

  useEffect(() => {
    if (newUnlocks.length) {
      setPendingUnlocks(newUnlocks);
      setShowMilestone(true);
      if (newUnlocks.some((unlock) => isGrowthMilestoneDay(unlock.milestoneDay))) {
        growthCelebrationPending.current = true;
      }
    }
  }, [newUnlocks]);

  useEffect(() => {
    return () => {
      if (growthCelebrationTimer.current) {
        clearTimeout(growthCelebrationTimer.current);
      }
    };
  }, []);

  // Soft hello after a meal check-in — excited gesture, then a warm talk chirp.
  useEffect(() => {
    if (!celebrate) return;
    setHelloBanner(true);
    setNapping(false);
    clearExpressionTimer();
    setExpression('excited');
    const talkTimer = setTimeout(() => {
      runTalk('checkin');
    }, REACTION_MS.celebrateTalkDelay);
    const bannerTimer = setTimeout(() => {
      setHelloBanner(false);
      navigation.setParams?.({ celebrate: undefined });
    }, 4200);
    return () => {
      clearTimeout(talkTimer);
      clearTimeout(bannerTimer);
    };
  }, [celebrate, navigation, runTalk]);

  useEffect(() => {
    if (!companion) return;
    const quietHoursBand = companion.mood === 'resting';
    const engagementRest = isEngagementResting(companion.vitality);
    setPresence(quietHoursBand ? 'resting' : 'happy');
    // Active engagement only clears Quiet-Time napping; vitality rest keeps calm idle.
    if (!quietHoursBand && !engagementRest) {
      setNapping(false);
    }
    setExpression((prev) => {
      if (prev === 'waving' || prev === 'excited') return prev;
      if (nappingRef.current) return 'sleepy';
      if (quietHoursBand) return 'sleepy';
      if (engagementRest) return calmExpressionForVitality(companion.vitality);
      return 'happy';
    });
  }, [
    companion?.petType,
    companion?.mood,
    companion?.vitality,
    companion?.hat,
    companion?.neck,
    companion?.scene,
    companion?.petName,
  ]);

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

  // No auto wave/sound on Home focus or app resume — companion switches (and
  // returning from Style) must stay silent. Wave / Talk are button-only.

  const engagementResting = isEngagementResting(companion?.vitality);
  const quietPresentation =
    napping || presence === 'resting' || engagementResting;

  // While in quiet / engagement-rest presentation: soft quiet idle rotation
  useEffect(() => {
    if (!quietPresentation) return;
    if (expression === 'waving' || expression === 'excited') return;
    const id = setInterval(() => {
      setExpression((prev) => nextQuietIdle(prev));
    }, 14000);
    return () => clearInterval(id);
  }, [quietPresentation, expression]);

  // Ambient naps during awake idle — clock-based only (not check-in / miss gated)
  useEffect(() => {
    if (quietPresentation) return;
    if (expression === 'waving' || expression === 'excited') return;
    const id = setInterval(() => {
      setExpression((prev) => {
        const next = nextAmbientIdle(prev, new Date());
        return next ?? prev;
      });
    }, 20000);
    return () => clearInterval(id);
  }, [quietPresentation, expression]);

  if (loading && !companion) {
    return (
      <LinearGradient colors={[...gradients.loading]} style={styles.centered}>
        <ActivityIndicator color={colors.sageDeep} size="large" />
        <SupportChip />
      </LinearGradient>
    );
  }

  const quietHours = presence === 'resting';
  const cozyLook = quietPresentation;
  // Scene color applies only inside AnimalWebView's companion box — keep the
  // Home chrome on the brand cream gradient.
  const gradient = cozyLook ? gradients.homeResting : gradients.home;
  const growthIndex = GROWTH_CHAPTERS.indexOf(companion?.growthStage || 'baby');

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
          if (growthCelebrationPending.current) {
            growthCelebrationPending.current = false;
            setShowGrowthCelebration(true);
            if (growthCelebrationTimer.current) {
              clearTimeout(growthCelebrationTimer.current);
            }
            growthCelebrationTimer.current = setTimeout(() => {
              setShowGrowthCelebration(false);
              growthCelebrationTimer.current = null;
            }, 4200);
          }
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
                updateCompanion(next);
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
          <BuddiBrand
            textStyle={[styles.brand, cozyLook && styles.brandResting]}
          />
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

        {showGrowthCelebration ? (
          <View style={styles.growthBanner} accessibilityRole="summary">
            <Text style={styles.growthBannerTitle}>Buddi grew!</Text>
            <Text style={styles.growthBannerBody}>
              A new chapter for {companion?.petName || 'your companion'}.
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {companion && (
          <View style={styles.hero}>
            <View
              accessibilityLabel={`${companion.petName}. Drag to look around, tap to play, hold to talk.`}
              style={styles.hero3d}
            >
              <AnimalWebView
                ref={petRef}
                key={`home-${companion.petType}-${companion.hat}-${companion.face}-${companion.neck}-${companion.held}-${companion.scene}`}
                character={characterForLiveCompanion(companion.petType)}
                growthStage={companion.growthStage}
                expression={expression}
                muted={muted}
                style={styles.hero3dContent}
                accessibilityLabel={
                  isEngagementResting(companion.vitality)
                    ? `${companion.petName} companion, resting`
                    : `${companion.petName} companion`
                }
                onPetTap={runPlayBonding}
                onPetLongPress={() => runTalk('tap')}
                outfit={{
                  hat: companion.hat,
                  face: companion.face,
                  neck: companion.neck,
                  held: companion.held,
                  scene: companion.scene,
                }}
              />
              {heartBurst ? (
                <BondingHeartBurst
                  key={heartBurst.id}
                  burstId={heartBurst.id}
                  intensity={heartBurst.intensity}
                  reducedMotion={reducedMotion}
                  onFinished={finishHeartBurst}
                />
              ) : null}
              {playActive ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Catch the glow with ${companion.petName}, step ${playStep + 1} of ${PLAY_TARGETS.length}`}
                  onPress={() => {
                    const result = advancePlayStep(playStep);
                    clearExpressionTimer();
                    setNapping(false);
                    setExpression('excited');
                    showHeartBurst(result.complete ? 'celebration' : 'small');
                    petRef.current?.wake();
                    petRef.current?.react();
                    if (result.complete) {
                      setPlayActive(false);
                      setPlayStep(0);
                      setTalkLine(`${companion.petName} caught the glow — nice teamwork!`);
                    } else {
                      setPlayStep(result.nextStep);
                      setTalkLine(`${companion.petName} is chasing it…`);
                    }
                    expressionTimer.current = setTimeout(() => {
                      settleAfterGesture(false);
                    }, 1500);
                  }}
                  style={[
                    styles.playGlowHit,
                    {
                      left: PLAY_TARGETS[playStep].left,
                      top: PLAY_TARGETS[playStep].top,
                    },
                  ]}
                >
                  <View style={styles.playGlowOuter}>
                    <Text style={styles.playGlowStar}>✦</Text>
                  </View>
                </Pressable>
              ) : null}
            </View>
            <Text style={styles.petName}>{companion.petName}</Text>
            <Text style={styles.petSpecies}>
              {petTypeLabel(companion.petType)}
              {' · '}{({ baby: 'Baby', little: 'Little', growing: 'Growing', playful: 'Playful', adventurer: 'Adventurer', grown: 'Grown' } as const)[companion.growthStage || 'baby']}
            </Text>
            <View
              style={styles.growthPath}
              accessibilityRole="progressbar"
              accessibilityLabel={`${companion.petName} is in the ${companion.growthStage || 'baby'} growth chapter`}
              accessibilityValue={{ min: 1, max: GROWTH_CHAPTERS.length, now: growthIndex + 1 }}
            >
              {GROWTH_CHAPTERS.map((stage, index) => (
                <View
                  key={stage}
                  style={[
                    styles.growthDot,
                    { width: 7 + index * 2, height: 7 + index * 2, borderRadius: 8 },
                    index <= growthIndex && styles.growthDotReached,
                    index === growthIndex && styles.growthDotCurrent,
                  ]}
                />
              ))}
            </View>
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
                <Text style={styles.speechBubbleText} accessibilityLiveRegion="polite">
                  {talkWordByWord
                    ? visibleTalkLine ?? companionTalkFrame(talkLine, 1)
                    : visibleTalkLine ?? talkLine}
                </Text>
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
                        .then((next) => updateCompanion(next))
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
                onPress={() => runTalk('button')}
              >
                <Text style={styles.petBtnText}>{speaking ? `${companion.petName} says…` : 'Talk'}</Text>
              </Pressable>
              <Pressable
                style={styles.petBtn}
                accessibilityRole="button"
                accessibilityLabel="Wave hello"
                onPress={() => {
                  if (!companion) return;
                  playWave(false);
                }}
              >
                <Text style={styles.petBtnText}>Wave</Text>
              </Pressable>
              <Pressable
                style={[styles.petBtn, playActive && styles.petBtnActive]}
                accessibilityRole="button"
                accessibilityLabel={playActive ? 'End glow chase' : `Play glow chase with ${companion.petName}`}
                onPress={() => {
                  stopTalk();
                  setNapping(false);
                  clearExpressionTimer();
                  petRef.current?.wake();
                  if (playActive) {
                    setTalkWordByWord(false);
                    setPlayActive(false);
                    setPlayStep(0);
                    setTalkLine('We can play again anytime.');
                    settleAfterGesture(false);
                  } else {
                    runPlayBonding();
                    setTalkWordByWord(false);
                    setPlayActive(true);
                    setPlayStep(0);
                    setTalkLine(`Tap the glow so ${companion.petName} can chase it — or just tap ${companion.petName} anytime.`);
                  }
                }}
              >
                <Text style={styles.petBtnText}>{playActive ? 'End play' : 'Play together'}</Text>
              </Pressable>
            </View>
          </View>
        )}

        {companion && user ? (
          <HelloCalendar helloDays={companion.helloDays || []} userId={user.id} />
        ) : null}

        {(napping || engagementResting) && companion ? (
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
          accessibilityLabel="Take a check-in photo of food or drink"
        >
          <Text style={styles.primaryText}>Check-in photo</Text>
        </Pressable>
        <Text style={styles.skipHint}>Optional · skip anytime</Text>

        <View style={styles.linkRow}>
          {companion ? (
            <Pressable
              onPress={() => navigation.navigate('Together')}
              accessibilityRole="button"
              accessibilityLabel="Open Quiet time"
              style={styles.quietTimeBtn}
            >
              <Text style={styles.quietTimeBtnText}>Quiet time</Text>
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
  growthBanner: {
    marginTop: spacing.sm,
    marginBottom: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(232,240,246,0.9)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  growthBannerTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
    color: colors.teal,
  },
  growthBannerBody: {
    marginTop: 2,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
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
    overflow: 'hidden',
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hero3dContent: {
    width: '100%',
    height: '100%',
  },
  petName: {
    marginTop: 10,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 24,
    color: colors.ink,
  },
  playGlowHit: {
    position: 'absolute',
    width: 68,
    height: 68,
    marginLeft: -34,
    marginTop: -34,
    zIndex: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playGlowOuter: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF0B8',
    borderWidth: 2,
    borderColor: colors.white,
    shadowColor: '#E8C86F',
    shadowOpacity: 0.55,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 7,
  },
  playGlowStar: {
    color: colors.sageDeep,
    fontSize: 28,
    lineHeight: 32,
  },
  petSpecies: {
    marginTop: 2,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.sageDeep,
  },
  growthPath: {
    minHeight: 26,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  growthDot: { backgroundColor: colors.sand, borderWidth: 1, borderColor: colors.border },
  growthDotReached: { backgroundColor: colors.sage },
  growthDotCurrent: { backgroundColor: colors.sageDeep, borderColor: colors.white, borderWidth: 2 },
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
  petBtnActive: {
    backgroundColor: colors.teal,
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
    gap: 12,
    alignItems: 'stretch',
  },
  quietTimeBtn: {
    minHeight: Math.max(tapTarget.min, 52),
    borderRadius: 18,
    backgroundColor: colors.sage,
    borderWidth: 1.5,
    borderColor: colors.sageDeep,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  quietTimeBtnText: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 17,
    color: colors.white,
  },
  linkHit: {
    minHeight: tapTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  linkMuted: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
  },
});
