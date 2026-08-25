import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, tapTarget } from '../theme';
import { BuddiBrand } from '../components/BuddiBrand';
import { SupportChip } from '../components/SupportChip';

type Props = {
  onDone: () => void;
};

/**
 * Transparency screen — explains exactly what the clinician sees.
 */
export function TransparencyScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 12) + 16,
            paddingBottom: Math.max(insets.bottom, 16) + 72,
          },
        ]}
      >
        <BuddiBrand textStyle={styles.brand} style={styles.brandLockup} />
        <Text style={styles.title} accessibilityRole="header">
          What your clinic sees
        </Text>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Check-in photos</Text>
          <Text style={styles.blockBody}>
            Photos of food or drink you take, and which days you said hello.
          </Text>
        </View>

        <View style={styles.block}>
          <Text style={styles.blockTitle}>Pattern notes</Text>
          <Text style={styles.blockBody}>
            Soft AI summaries for appointments — observations only, not diagnoses.
          </Text>
        </View>

        <Pressable
          style={styles.cta}
          onPress={onDone}
          accessibilityRole="button"
          accessibilityLabel="Continue to pet selection"
        >
          <Text style={styles.ctaText}>Continue</Text>
        </Pressable>
        <Text style={styles.softNote}>Details also live in Settings.</Text>
      </ScrollView>
      <SupportChip />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  brand: {
    fontSize: 22,
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.sageDeep,
  },
  brandLockup: {
    marginBottom: spacing.md,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontFamily: 'Nunito_400Regular',
    color: colors.inkSoft,
    marginBottom: spacing.lg,
  },
  block: {
    backgroundColor: colors.white,
    borderRadius: 22,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  blockTitle: {
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
    color: colors.ink,
    marginBottom: 6,
  },
  blockBody: {
    fontSize: 15,
    lineHeight: 22,
    fontFamily: 'Nunito_400Regular',
    color: colors.inkSoft,
  },
  cta: {
    marginTop: spacing.md,
    backgroundColor: colors.sageDeep,
    borderRadius: 18,
    minHeight: tapTarget.min,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    color: colors.white,
    fontSize: 17,
    fontFamily: 'Nunito_700Bold',
  },
  softNote: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
  },
});
