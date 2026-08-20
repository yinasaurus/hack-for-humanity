import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalWebView, characterForLiveCompanion } from '../characters';
import { SupportChip } from '../components/SupportChip';
import { colors, gradients, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { CompanionState, fetchCompanion } from '../api';

type Props = {
  navigation: { goBack: () => void };
};

const ambientSource = require('../../assets/quiet-ambient.mp3');

/**
 * Quiet bonding time — music only after explicit opt-in (never on load by default).
 */
export function TogetherScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const player = useAudioPlayer(ambientSource);

  useEffect(() => {
    if (!user) return;
    fetchCompanion(user.id).then(setCompanion).catch(() => {});
  }, [user]);

  useEffect(() => {
    if (reducedMotion) {
      progress.setValue(1);
      return;
    }
    Animated.timing(progress, {
      toValue: 1,
      duration: 9000,
      easing: Easing.inOut(Easing.sin),
      useNativeDriver: false,
    }).start();
  }, [progress, reducedMotion]);

  useEffect(() => {
    try {
      player.loop = true;
      player.volume = 0.28;
      if (settings.togetherMusic) {
        player.play();
      } else {
        player.pause();
      }
    } catch {
      // Device / Expo Go audio quirks — fail quietly
    }
    return () => {
      try {
        player.pause();
      } catch {
        /* ignore */
      }
    };
  }, [settings.togetherMusic, player]);

  const warmth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const name = companion?.petName || 'your companion';

  return (
    <LinearGradient
      colors={[...gradients.together]}
      style={[
        styles.root,
        {
          paddingTop: Math.max(insets.top, 12) + 12,
          paddingBottom: Math.max(insets.bottom, 12) + 56,
        },
      ]}
    >
      <Pressable
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Leave quiet time"
        style={styles.backHit}
      >
        <Text style={styles.back}>← Leave anytime</Text>
      </Pressable>

      <Text style={styles.title} accessibilityRole="header">
        A quiet moment
      </Text>
      <Text style={styles.sub}>
        Just sitting with {name}. No steps to count, nothing to earn — company only. You can
        leave whenever you like.
      </Text>

      <AnimalWebView
        key={`together-${companion?.petType || 'fox'}`}
        character={characterForLiveCompanion(companion?.petType)}
        expression="happy"
        muted={settings.companionMuted}
        style={styles.hero3d}
        accessibilityLabel={`${name} companion`}
        outfit={{
          hat: companion?.hat,
          face: companion?.face,
          neck: companion?.neck,
          held: companion?.held,
          scene: companion?.scene || 'cozy_nook',
        }}
      />

      {!reducedMotion ? (
        <View
          style={styles.trail}
          accessible
          accessibilityLabel="Soft stillness indicator, decorative only"
        >
          <Animated.View style={[styles.trailFill, { width: warmth }]} />
        </View>
      ) : null}
      <Text style={styles.trailLabel}>Sharing a little stillness…</Text>

      <Pressable
        onPress={() => updateSettings({ togetherMusic: !settings.togetherMusic })}
        style={styles.musicBtn}
        accessibilityRole="button"
        accessibilityState={{ checked: settings.togetherMusic }}
        accessibilityLabel={
          settings.togetherMusic ? 'Mute soft music' : 'Play soft music'
        }
      >
        <Text style={styles.musicText}>
          {settings.togetherMusic ? 'Mute soft music' : 'Play soft music'}
        </Text>
      </Pressable>

      <Pressable
        style={styles.cta}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel="Back home"
      >
        <Text style={styles.ctaText}>Back home</Text>
      </Pressable>
      <SupportChip />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  backHit: {
    alignSelf: 'flex-start',
    minHeight: tapTarget.min,
    justifyContent: 'center',
    marginBottom: 4,
  },
  back: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.inkSoft,
    fontSize: 15,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: colors.ink,
    alignSelf: 'flex-start',
  },
  sub: {
    marginTop: 6,
    marginBottom: spacing.lg,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.inkSoft,
    alignSelf: 'flex-start',
    lineHeight: 22,
  },
  hero3d: {
    width: '100%',
    height: 320,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: colors.card,
  },
  trail: {
    marginTop: spacing.lg,
    width: '100%',
    height: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
  },
  trailFill: {
    height: '100%',
    backgroundColor: colors.sage,
    borderRadius: 6,
  },
  trailLabel: {
    marginTop: spacing.sm,
    fontFamily: 'Nunito_400Regular',
    color: colors.inkSoft,
  },
  musicBtn: {
    marginTop: spacing.md,
    minHeight: tapTarget.min,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  musicText: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.inkSoft,
    fontSize: 14,
  },
  cta: {
    marginTop: 'auto',
    marginBottom: 24,
    minHeight: tapTarget.min,
    paddingVertical: 12,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.sageDeep,
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
