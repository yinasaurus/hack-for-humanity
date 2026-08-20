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
import { CompanionMuteBar } from '../components/CompanionMuteBar';
import { SupportChip } from '../components/SupportChip';
import { useSettings } from '../SettingsContext';
import { colors, gradients, spacing, tapTarget } from '../theme';

type Props = {
  navigation: { goBack: () => void };
};

export function CharacterScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useSettings();
  const ready = useMemo(() => listReadyCharacters(), []);
  const [selected, setSelected] = useState<CharacterDef>(() => ready[0] || CHARACTER_CATALOG[0]);
  const [napping, setNapping] = useState(false);
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
        <Text style={styles.back}>← Back</Text>
      </Pressable>
      <Text style={styles.title} accessibilityRole="header">
        Companion playground
      </Text>
      <Text style={styles.sub}>
        Optional space to try animals and gentle motions. Leave anytime — nothing is required.
      </Text>

      <CharacterSelector
        characters={CHARACTER_CATALOG}
        selectedId={selected.id}
        onSelect={(c) => {
          stopVoice();
          setSelected(c);
          setNapping(false);
        }}
      />

      <View style={styles.stage}>
        <AnimalWebView
          key={selected.id}
          character={selected}
          mood={napping ? 'resting' : 'happy'}
          muted={muted}
          style={styles.web}
          accessibilityLabel={`${selected.label} companion`}
          onReady={(h) => {
            handleRef.current = h as AnimalWebHandle;
          }}
        />
      </View>

      <CompanionMuteBar
        muted={muted}
        speaking={speaking}
        onToggleMute={() => {
          if (!muted) stopVoice();
          updateSettings({ companionMuted: !muted });
        }}
        onStop={stopVoice}
      />

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
        <Pressable
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="Wave"
          onPress={() => handleRef.current?.wave()}
        >
          <Text style={styles.btnText}>Wave</Text>
        </Pressable>
        <Pressable
          style={styles.btn}
          accessibilityRole="button"
          accessibilityLabel="Gentle play"
          onPress={() => handleRef.current?.react()}
        >
          <Text style={styles.btnText}>Play</Text>
        </Pressable>
        {napping ? (
          <Pressable
            style={styles.btn}
            accessibilityRole="button"
            accessibilityLabel="Wake"
            onPress={() => {
              setNapping(false);
              handleRef.current?.wake();
            }}
          >
            <Text style={styles.btnText}>Wake</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[styles.btn, styles.btnMuted]}
            accessibilityRole="button"
            accessibilityLabel="Sleep"
            onPress={() => {
              stopVoice();
              setNapping(true);
              handleRef.current?.sleep();
            }}
          >
            <Text style={styles.btnText}>Sleep</Text>
          </Pressable>
        )}
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
  stage: { flex: 1, minHeight: 340, marginTop: 4 },
  web: { flex: 1, height: '100%', borderRadius: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  btn: {
    flexGrow: 1,
    minWidth: '22%',
    minHeight: tapTarget.min,
    backgroundColor: colors.sageDeep,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnMuted: { backgroundColor: colors.teal },
  btnText: { fontFamily: 'Nunito_700Bold', color: colors.white, fontSize: 14 },
});
