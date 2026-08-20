import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tapTarget } from '../theme';
import type { Unlock } from '../api';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = {
  unlocks: Unlock[];
  petName?: string;
  visible: boolean;
  onClose: () => void;
};

/** Soft keepsake unlock — never framed as a score or punishment. */
export function MilestoneCelebration({
  unlocks,
  petName = 'your companion',
  visible,
  onClose,
}: Props) {
  const reducedMotion = useReducedMotion();
  const scale = useRef(new Animated.Value(0.96)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    scale.setValue(reducedMotion ? 1 : 0.96);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(scale, {
        toValue: 1,
        duration: reducedMotion ? 0 : 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: reducedMotion ? 0 : 320,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, scale, opacity, reducedMotion]);

  if (!unlocks.length) return null;

  const labels = unlocks.map((u) => u.label).join(' · ');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
          accessibilityViewIsModal
          accessibilityRole="summary"
        >
          <Text style={styles.eyebrow}>A little keepsake</Text>
          <Text style={styles.title}>Something soft for {petName}</Text>
          <Text style={styles.gift}>{labels}</Text>
          <Text style={styles.body}>
            A cosmetic keepsake for being here — never a score, never a body change. Skip or
            continue whenever you like.
          </Text>
          <Pressable
            style={styles.cta}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(61,58,54,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFF9F3',
    borderRadius: 24,
    padding: 22,
  },
  eyebrow: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 12,
    color: colors.teal,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  title: {
    marginTop: 8,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: colors.ink,
  },
  gift: {
    marginTop: 14,
    fontFamily: 'Nunito_700Bold',
    fontSize: 18,
    color: colors.sageDeep,
  },
  body: {
    marginTop: 10,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  cta: {
    marginTop: 20,
    backgroundColor: colors.coral,
    borderRadius: 16,
    minHeight: tapTarget.min,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 16,
  },
});
