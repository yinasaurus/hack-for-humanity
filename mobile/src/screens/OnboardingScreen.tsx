import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import { completeOnboarding } from '../api';
import {
  DEFAULT_APPEARANCE,
  PET_COLORS,
  PET_TYPES,
  type PetColorId,
  type PetTypeId,
} from '../pets';
import { VirtualPet } from '../components/VirtualPet';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { BuddiBrand } from '../components/BuddiBrand';
import { SupportChip } from '../components/SupportChip';

type Props = {
  onDone: () => void;
};

export function OnboardingScreen({ onDone }: Props) {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const reducedMotion = useReducedMotion();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [petType, setPetType] = useState<PetTypeId>((user?.petType as PetTypeId) || 'fox');
  const [petColor, setPetColor] = useState<PetColorId>((user?.petColor as PetColorId) || 'peach');
  const [petName, setPetName] = useState(user?.petName || 'Maple');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewAppearance = {
    ...DEFAULT_APPEARANCE,
    petType,
    petColor,
    petName: petName.trim() || 'Companion',
  };

  const handleFinish = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const trimmedName = petName.trim() || 'Maple';
      const result = await completeOnboarding(user.id, {
        petType,
        petColor,
        petName: trimmedName,
      });
      setUser(result.user);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not finish setup');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[...gradients.welcome]} style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: Math.max(insets.top, 12) + 16,
              paddingBottom: Math.max(insets.bottom, 16) + 72,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <BuddiBrand textStyle={styles.brand} style={styles.brandLockup} />

          {/* Progress pill indicator */}
          <View style={styles.progressRow}>
            <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
            <View style={[styles.progressLine, step >= 3 && styles.progressLineActive]} />
            <View style={[styles.progressDot, step >= 3 && styles.progressDotActive]} />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {/* Step 1: Choose Avatar Species & Color */}
          {step === 1 && (
            <>
              <Text style={styles.title} accessibilityRole="header">
                Choose your companion
              </Text>
              <Text style={styles.sub}>
                Pick the animal friend who will accompany you on your daily routine.
              </Text>

              {/* Live Preview */}
              <View style={styles.previewBox}>
                <VirtualPet
                  appearance={previewAppearance}
                  mood="happy"
                  size={220}
                  reducedMotion={reducedMotion}
                />
              </View>

              {/* Species Chips */}
              <Text style={styles.sectionLabel}>Companion species</Text>
              <View style={styles.chipRow}>
                {PET_TYPES.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => setPetType(t.id)}
                    style={[styles.chip, petType === t.id && styles.chipActive]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: petType === t.id }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        petType === t.id && styles.chipTextActive,
                      ]}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Color Palette */}
              <Text style={styles.sectionLabel}>Color palette</Text>
              <View style={styles.colorRow}>
                {PET_COLORS.slice(0, 8).map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => setPetColor(c.id)}
                    style={[
                      styles.colorCircle,
                      { backgroundColor: c.body },
                      petColor === c.id && styles.colorCircleActive,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Choose ${c.label} color`}
                  />
                ))}
              </View>

              <Pressable
                style={styles.cta}
                onPress={() => setStep(2)}
                accessibilityRole="button"
              >
                <Text style={styles.ctaText}>Next: Name your companion →</Text>
              </Pressable>
            </>
          )}

          {/* Step 2: Name Your Companion */}
          {step === 2 && (
            <>
              <Text style={styles.title} accessibilityRole="header">
                Name your friend
              </Text>
              <Text style={styles.sub}>
                Give your companion a warm name you'll see every day.
              </Text>

              <View style={styles.previewBox}>
                <VirtualPet
                  appearance={previewAppearance}
                  mood="curious"
                  size={200}
                  reducedMotion={reducedMotion}
                />
              </View>

              <View style={styles.inputCard}>
                <Text style={styles.inputLabel}>Companion Name</Text>
                <TextInput
                  value={petName}
                  onChangeText={setPetName}
                  style={styles.nameInput}
                  placeholder="e.g. Maple, Pip, Sunny"
                  placeholderTextColor={colors.inkSoft}
                  maxLength={32}
                  autoFocus
                />
              </View>

              <View style={styles.btnRow}>
                <Pressable
                  style={styles.backBtn}
                  onPress={() => setStep(1)}
                  accessibilityRole="button"
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.cta, { flex: 1 }]}
                  onPress={() => setStep(3)}
                  accessibilityRole="button"
                >
                  <Text style={styles.ctaText}>Next: Clinic care →</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Step 3: Transparency & How Care Works */}
          {step === 3 && (
            <>
              <Text style={styles.title} accessibilityRole="header">
                How Buddi works with your clinic
              </Text>
              <Text style={styles.sub}>
                Designed for gentle support, peace of mind, and compassionate care.
              </Text>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Check-in photos</Text>
                <Text style={styles.infoBody}>
                  One photo of food or drink counts the same. Your care team can see them to understand your patterns.
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>✨ No Numbers Shown to You</Text>
                <Text style={styles.infoBody}>
                  No calories, weights, body metrics, or nutrition scores are ever displayed on your app.
                </Text>
              </View>

              <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>🐾 Companion Presence</Text>
                <Text style={styles.infoBody}>
                  {petName.trim() || 'Your companion'} stays vibrant and happy with consistent daily check-ins.
                </Text>
              </View>

              <View style={styles.btnRow}>
                <Pressable
                  style={styles.backBtn}
                  onPress={() => setStep(2)}
                  accessibilityRole="button"
                >
                  <Text style={styles.backBtnText}>← Back</Text>
                </Pressable>
                <Pressable
                  style={[styles.cta, { flex: 1 }]}
                  onPress={handleFinish}
                  disabled={busy}
                  accessibilityRole="button"
                >
                  {busy ? (
                    <ActivityIndicator color={colors.white} />
                  ) : (
                    <Text style={styles.ctaText}>Meet {petName.trim() || 'Companion'} 🎉</Text>
                  )}
                </Pressable>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <SupportChip />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  brand: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: colors.sageDeep,
  },
  brandLockup: {
    marginBottom: spacing.xs,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  progressDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  progressDotActive: {
    backgroundColor: colors.sageDeep,
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.10)',
    marginHorizontal: 6,
  },
  progressLineActive: {
    backgroundColor: colors.sageDeep,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: colors.ink,
    marginBottom: 6,
  },
  sub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
    marginBottom: spacing.md,
  },
  previewBox: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.sm,
  },
  sectionLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  chipText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.ink,
  },
  chipTextActive: {
    color: colors.white,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.lg,
  },
  colorCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  colorCircleActive: {
    borderColor: colors.sageDeep,
    transform: [{ scale: 1.15 }],
  },
  inputCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputLabel: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  nameInput: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 20,
    color: colors.ink,
    paddingVertical: 6,
  },
  infoCard: {
    backgroundColor: colors.white,
    borderRadius: 18,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: 4,
  },
  infoBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.md,
  },
  backBtn: {
    minHeight: tapTarget.min,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.inkSoft,
  },
  cta: {
    backgroundColor: colors.sageDeep,
    borderRadius: 18,
    minHeight: tapTarget.min,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  ctaText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 16,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.teal,
    marginBottom: spacing.sm,
  },
});
