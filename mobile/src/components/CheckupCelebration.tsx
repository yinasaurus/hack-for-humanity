import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tapTarget } from '../theme';
import { useReducedMotion } from '../hooks/useReducedMotion';

type Props = {
  visible: boolean;
  petName?: string;
  message: string;
  onClose: () => void;
};

/**
 * One-time warm hello after a clinician-logged checkup attendance.
 * Attendance / care acknowledgment only — never outcomes, scores, or body metrics.
 */
export function CheckupCelebration({
  visible,
  petName = 'your companion',
  message,
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

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[styles.card, { opacity, transform: [{ scale }] }]}
          accessibilityViewIsModal
          accessibilityRole="summary"
        >
          <Text style={styles.eyebrow}>From your care team</Text>
          <Text style={styles.title}>{petName} has a warm note for you</Text>
          <Text style={styles.body}>{message}</Text>
          <Text style={styles.soft}>
            Just a gentle hello for showing up and being cared for — nothing to measure.
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
  body: {
    marginTop: 14,
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    lineHeight: 24,
    color: colors.sageDeep,
  },
  soft: {
    marginTop: 10,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 20,
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
