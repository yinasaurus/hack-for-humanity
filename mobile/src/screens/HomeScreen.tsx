import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import * as Speech from 'expo-speech';
import { HelloCalendar } from '../components/HelloCalendar';
import { MilestoneCelebration } from '../components/MilestoneCelebration';
import { SupportChip } from '../components/SupportChip';
import { CompanionMuteBar } from '../components/CompanionMuteBar';
import {
  AnimalWebView,
  CHARACTER_CATALOG,
  CharacterSelector,
  characterForPetType,
  type AnimalWebHandle,
  type CharacterDef,
} from '../characters';
import { colors, gradients, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { CompanionState, Unlock, fetchCompanion } from '../api';

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
  const { settings, updateSettings } = useSettings();
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMilestone, setShowMilestone] = useState(false);
  const [pendingUnlocks, setPendingUnlocks] = useState<Unlock[]>([]);
  const [animal, setAnimal] = useState<CharacterDef>(() => characterForPetType('fox'));
  const [napping, setNapping] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const animalRef = useRef<AnimalWebHandle | null>(null);

  const muted = settings.companionMuted;

  const load = useCallback(async () => {
    if (!user) return;
    setError(null);
    try {
      const data = await fetchCompanion(user.id);
      setCompanion(data);
      if (data.newlyUnlocked?.length && !newUnlocks.length) {
        setPendingUnlocks(data.newlyUnlocked);
        setShowMilestone(true);
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
    setAnimal(characterForPetType(companion.petType));
    setNapping(companion.mood === 'resting');
  }, [companion?.petType, companion?.mood]);

  const stopVoice = () => {
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
    animalRef.current?.stopSpeaking();
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

  const resting = companion?.mood === 'resting' || napping;
  const gradient = resting ? gradients.homeResting : gradients.home;

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
          <Text style={[styles.brand, resting && styles.brandResting]} accessibilityRole="header">
            KindPlate
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Settings')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
            style={styles.topBtn}
          >
            <Text style={styles.signOut}>Settings</Text>
          </Pressable>
        </View>

        <Text style={styles.hello}>Hi {user?.name}</Text>
        <Text style={styles.sub}>
          {resting
            ? 'A quiet day is still a kind day. Your companion is resting until the next hello.'
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
            <CharacterSelector
              characters={CHARACTER_CATALOG}
              selectedId={animal.id}
              onSelect={(c) => {
                setAnimal(c);
                setNapping(false);
                stopVoice();
              }}
            />
            <AnimalWebView
              key={`${animal.id}-${companion.mood}`}
              ref={animalRef}
              character={animal}
              mood={resting ? 'resting' : 'happy'}
              muted={muted}
              style={styles.animal3d}
              accessibilityLabel={`${companion.petName}, ${animal.label} companion`}
              onReady={(h) => {
                animalRef.current = h as AnimalWebHandle;
              }}
            />
            <Text style={styles.petName}>{companion.petName}</Text>
            <Text style={styles.petCaption}>
              {resting
                ? `${companion.petName} is resting — Wake anytime, or say hello with a meal photo when you want`
                : `Drag gently to look around · buttons below when you feel like it`}
            </Text>

            <CompanionMuteBar
              muted={muted}
              speaking={speaking}
              onToggleMute={() => {
                if (!muted) stopVoice();
                updateSettings({ companionMuted: !muted });
              }}
              onStop={stopVoice}
            />

            <View style={styles.petActions}>
              {!resting ? (
                <>
                  <Pressable
                    style={styles.petBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Talk with ${companion.petName}`}
                    onPress={() => {
                      animalRef.current?.speak('');
                      if (!muted) {
                        setSpeaking(true);
                        Speech.speak(
                          `Hi. I'm ${companion.petName}. I'm glad you're here.`,
                          {
                            rate: 0.82,
                            pitch: 1.0,
                            onDone: () => setSpeaking(false),
                            onStopped: () => setSpeaking(false),
                          }
                        );
                      }
                    }}
                  >
                    <Text style={styles.petBtnText}>Talk</Text>
                  </Pressable>
                  <Pressable
                    style={styles.petBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Wave"
                    onPress={() => animalRef.current?.wave()}
                  >
                    <Text style={styles.petBtnText}>Wave</Text>
                  </Pressable>
                  <Pressable
                    style={styles.petBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Gentle play motion"
                    onPress={() => animalRef.current?.react()}
                  >
                    <Text style={styles.petBtnText}>Play</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.petBtn, styles.petBtnSleep]}
                    accessibilityRole="button"
                    accessibilityLabel="Let companion rest"
                    onPress={() => {
                      stopVoice();
                      setNapping(true);
                      animalRef.current?.sleep();
                    }}
                  >
                    <Text style={styles.petBtnText}>Sleep</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  style={styles.petBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Wake companion"
                  onPress={() => {
                    setNapping(false);
                    animalRef.current?.wake();
                  }}
                >
                  <Text style={styles.petBtnText}>Wake</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {companion ? (
          <HelloCalendar
            helloDays={companion.helloDays || []}
            streakDays={companion.streakDays}
            totalCheckInDays={companion.totalCheckInDays}
          />
        ) : null}

        {resting && companion ? (
          <View style={styles.restCard} accessibilityRole="summary">
            <Text style={styles.restTitle}>Resting together</Text>
            <Text style={styles.restBody}>
              {companion.petName} is not sad or fading — just resting quietly until you feel
              ready. Missed days never change how welcome you are. A meal photo is enough of a
              hello whenever you want one.
            </Text>
            {companion.daysSinceLastCheckIn != null && companion.daysSinceLastCheckIn > 0 ? (
              <Text style={styles.restMeta}>
                Last hello was {companion.daysSinceLastCheckIn} day
                {companion.daysSinceLastCheckIn === 1 ? '' : 's'} ago — that is okay.
              </Text>
            ) : null}
          </View>
        ) : null}

        <Pressable
          style={[styles.primary, resting && styles.primaryResting]}
          onPress={() => navigation.navigate('CheckIn')}
          accessibilityRole="button"
          accessibilityLabel="Take a meal photo check-in"
        >
          <Text style={styles.primaryText}>
            {resting ? 'Say hello with a meal photo' : 'Take a photo of your meal'}
          </Text>
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
          <Pressable
            onPress={() => navigation.navigate('Customize', companion || undefined)}
            accessibilityRole="link"
            style={styles.linkHit}
          >
            <Text style={styles.link}>Customize {companion?.petName || 'companion'}</Text>
          </Pressable>
          <Pressable
            onPress={() => navigation.navigate('Character')}
            accessibilityRole="link"
            style={styles.linkHit}
          >
            <Text style={styles.link}>Companion playground</Text>
          </Pressable>
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
  animal3d: {
    width: '100%',
    height: 360,
    borderRadius: 28,
    overflow: 'hidden',
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
