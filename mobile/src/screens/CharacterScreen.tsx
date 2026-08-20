import React, { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import {
  AnimalWebView,
  CHARACTER_CATALOG,
  CharacterSelector,
  listReadyCharacters,
  type AnimalWebHandle,
  type CharacterDef,
} from '../characters';
import { SupportChip } from '../components/SupportChip';
import { useSettings } from '../SettingsContext';
import { colors, gradients, spacing, tapTarget } from '../theme';
import type { CompanionExpression } from '../companionMood';

type Props = {
  navigation: { goBack: () => void; navigate: (screen: string) => void };
};

const EXPR_CHIPS: { id: CompanionExpression; label: string }[] = [
  { id: 'happy', label: 'Happy' },
  { id: 'waving', label: 'Wave' },
  { id: 'excited', label: 'Excited' },
  { id: 'curious', label: 'Curious' },
  { id: 'sleepy', label: 'Sleepy' },
  { id: 'resting', label: 'Resting' },
];

export function CharacterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const ready = useMemo(() => listReadyCharacters(), []);
  const [selected, setSelected] = useState<CharacterDef>(() => ready[0] || CHARACTER_CATALOG[0]);
  const [expression, setExpression] = useState<CompanionExpression>('happy');
  const [speaking, setSpeaking] = useState(false);
  const handleRef = useRef<AnimalWebHandle | null>(null);
  const muted = settings.companionMuted;

  const stopVoice = () => {
    try {
      Speech.stop();
    } catch {
      /* ignore */
    }
    handleRef.current?.stopSpeaking();
    setSpeaking(false);
  };

  return (
    <LinearGradient
      colors={[...gradients.home]}
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 8) + 8,
          paddingBottom: Math.max(insets.bottom, 12) + 56,
        },
      ]}
    >
      <Pressable
        onPress={() => {
          stopVoice();
          navigation.goBack();
        }}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        style={styles.backHit}
      >
        <Text style={styles.back}>â† Back</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        Companion playground
      </Text>
      <Text style={styles.sub}>
        Try soft expressions (positive to neutral only). Leave anytime â€” nothing is required.
      </Text>

      <CharacterSelector
        characters={CHARACTER_CATALOG}
        selectedId={selected.id}
        onSelect={(c) => {
          stopVoice();
          setSelected(c);
          setExpression('happy');
        }}
      />

      <View style={styles.exprRow}>
        {EXPR_CHIPS.map((chip) => {
          const on = expression === chip.id;
          return (
            <Pressable
              key={chip.id}
              onPress={() => setExpression(chip.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${chip.label} expression`}
              style={[styles.exprChip, on && styles.exprChipOn]}
            >
              <Text style={[styles.exprText, on && styles.exprTextOn]}>{chip.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.stage}>
        <AnimalWebView
          key={selected.id}
          character={selected}
          expression={expression}
          muted={muted}
          style={styles.web}
          accessibilityLabel={`${selected.label} companion`}
          onReady={(h) => {
            handleRef.current = h as AnimalWebHandle;
          }}
        />
      </View>

      <Text style={styles.muteHint}>
        Voice mute lives in Settings (gear on Home). Talk never starts on its own.
      </Text>

      <View style={styles.actions}>
        <Pressable
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="Talk"
          onPress={() => {
            handleRef.current?.speak('');
            if (!muted) {
              setSpeaking(true);
              Speech.speak(`Hi. I'm your ${selected.label} friend.`, {
                rate: 0.82,
                pitch: 1.0,
                onDone: () => setSpeaking(false),
                onStopped: () => setSpeaking(false),
              });
            }
          }}
        >
          <Text style={styles.btnText}>Talk</Text>
        </Pressable>
        {speaking ? (
          <Pressable
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel="Stop speaking"
            onPress={stopVoice}
          >
            <Text style={styles.btnText}>Stop</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="Open settings"
          onPress={() => navigation.navigate('Settings')}
        >
          <Text style={styles.btnText}>Settings</Text>
        </Pressable>
      </View>
      <SupportChip />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.lg },
  backHit: { minHeight: tapTarget.min, justifyContent: 'center', alignSelf: 'flex-start' },
  back: { fontFamily: 'Nunito_600SemiBold', color: colors.inkSoft, marginBottom: 6 },
  title: { fontFamily: 'Nunito_800ExtraBold', fontSize: 28, color: colors.ink },
  sub: {
    marginTop: 4,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
    marginBottom: 8,
    lineHeight: 20,
  },
  exprRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  exprChip: {
    minHeight: tapTarget.min,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exprChipOn: { backgroundColor: colors.sageDeep, borderColor: colors.sageDeep },
  exprText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: colors.ink },
  exprTextOn: { color: colors.white },
  stage: { flex: 1, minHeight: 300, marginTop: 4 },
  web: { flex: 1, height: '100%', borderRadius: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  muteHint: {
    marginTop: 10,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    lineHeight: 18,
  },
  btn: {
    flexGrow: 1,
    minHeight: tapTarget.min,
    backgroundColor: colors.sageDeep,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { fontFamily: 'Nunito_700Bold', color: colors.white, fontSize: 14 },
});
