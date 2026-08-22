import React, { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import { completeOnboarding, type PetGender } from '../api';
import type { PetTypeId } from '../pets';
import { colors, gradients, spacing, tapTarget } from '../theme';

const PETS = [
  { id: 'panda', label: 'Panda', icon: '🐼' },
  { id: 'dog', label: 'Dog', icon: '🐶' },
  { id: 'cat', label: 'Cat', icon: '🐱' },
  { id: 'capybara', label: 'Capybara', icon: '🦫' },
  { id: 'cow', label: 'Cow', icon: '🐮' },
  { id: 'chipmunk', label: 'Chipmunk', icon: '🐿️' },
  { id: 'monkey', label: 'Monkey', icon: '🐒' },
  { id: 'rabbit', label: 'Rabbit', icon: '🐰' },
  { id: 'penguin', label: 'Penguin', icon: '🐧' },
  { id: 'otter', label: 'Otter', icon: '🦦' },
] as const satisfies ReadonlyArray<{ id: PetTypeId; label: string; icon: string }>;

export function PetSelectionScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user, setUser } = useAuth();
  const [species, setSpecies] = useState<PetTypeId | null>(null);
  const [name, setName] = useState('');
  const [gender, setGender] = useState<PetGender | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardWidth = useMemo(() => Math.min(168, (width - spacing.lg * 2 - 12) / 2), [width]);

  const continueToHome = async () => {
    const petName = name.trim();
    if (!species) return setError('Choose a Buddi to continue.');
    if (!gender) return setError('Choose male or female for your Buddi.');
    if (!petName) return setError('Give your new Buddi a name.');
    if (!user) return setError('Please sign in again.');
    setBusy(true);
    setError(null);
    try {
      // RootNavigator observes onboarded=true and replaces this screen with Home.
      await setUser(await completeOnboarding(user.id, species, petName, gender));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your Buddi.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[...gradients.welcome]} style={styles.root}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 12) + 20, paddingBottom: Math.max(insets.bottom, 16) + 28 }]}>
          <Text style={styles.eyebrow}>ONE LAST HELLO</Text>
          <Text style={styles.title}>Choose your Buddi</Text>
          <Text style={styles.intro}>Pick the friend you’d like beside you, then give them a name.</Text>
          <View style={styles.grid} accessibilityLabel="Choose one pet species">
            {PETS.map((pet) => {
              const selected = species === pet.id;
              return (
                <Pressable key={pet.id} onPress={() => { setSpecies(pet.id); setError(null); }} accessibilityRole="radio" accessibilityLabel={pet.label} accessibilityState={{ checked: selected }} style={[styles.petCard, { width: cardWidth }, selected && styles.petCardSelected]}>
                  <Text style={styles.petIcon} importantForAccessibility="no">{pet.icon}</Text>
                  <Text style={[styles.petLabel, selected && styles.petLabelSelected]}>{pet.label}</Text>
                  <View style={[styles.radio, selected && styles.radioSelected]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>Is your Buddi male or female?</Text>
          <View style={styles.genderRow} accessibilityLabel="Choose pet gender">
            {(['male', 'female'] as const).map((option) => {
              const selected = gender === option;
              return (
                <Pressable key={option} onPress={() => { setGender(option); setError(null); }} accessibilityRole="radio" accessibilityLabel={option === 'male' ? 'Male' : 'Female'} accessibilityState={{ checked: selected }} style={styles.genderOption}>
                  <View style={[styles.genderRadio, selected && styles.genderRadioSelected]}>
                    {selected ? <View style={styles.genderRadioDot} /> : null}
                  </View>
                  <Text style={[styles.genderText, selected && styles.genderTextSelected]}>{option === 'male' ? 'Male' : 'Female'}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>What should we call them?</Text>
          <TextInput value={name} onChangeText={(value) => { setName(value); setError(null); }} maxLength={24} placeholder="e.g. Maple" placeholderTextColor={colors.inkSoft} style={styles.input} autoCapitalize="words" autoCorrect={false} returnKeyType="done" onSubmitEditing={() => void continueToHome()} accessibilityLabel="Buddi name" />
          <Text style={styles.counter}>{name.length}/24</Text>
          {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
          <Pressable onPress={() => void continueToHome()} disabled={busy} accessibilityRole="button" accessibilityLabel="Continue to home" style={({ pressed }) => [styles.cta, (busy || pressed) && styles.ctaPressed]}>
            {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.ctaText}>Continue</Text>}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, alignItems: 'center', paddingHorizontal: spacing.lg },
  eyebrow: { alignSelf: 'flex-start', color: colors.sageDeep, fontFamily: 'Nunito_800ExtraBold', fontSize: 12, letterSpacing: 1.2 },
  title: { alignSelf: 'flex-start', marginTop: 7, color: colors.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 34, lineHeight: 41 },
  intro: { alignSelf: 'flex-start', marginTop: 8, color: colors.inkSoft, fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23 },
  grid: { width: '100%', marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  petCard: { position: 'relative', minHeight: 154, padding: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 2, borderColor: colors.sand, borderRadius: 22 },
  petCardSelected: { borderColor: colors.sageDeep, backgroundColor: colors.white },
  petIcon: { fontSize: 58, lineHeight: 72 },
  petLabel: { marginTop: 2, color: colors.ink, fontFamily: 'Nunito_700Bold', fontSize: 16 },
  petLabelSelected: { color: colors.sageDeep },
  radio: { position: 'absolute', top: 11, right: 11, width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  radioSelected: { borderColor: colors.sageDeep },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sageDeep },
  label: { width: '100%', marginTop: spacing.xl, marginBottom: 8, color: colors.ink, fontFamily: 'Nunito_700Bold', fontSize: 15 },
  genderRow: { width: '100%', flexDirection: 'row', gap: 12 },
  genderOption: { flex: 1, minHeight: tapTarget.min, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderWidth: 1.5, borderColor: colors.sand, borderRadius: 16, backgroundColor: colors.white },
  genderRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.inkSoft, alignItems: 'center', justifyContent: 'center' },
  genderRadioSelected: { borderColor: colors.sageDeep },
  genderRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sageDeep },
  genderText: { color: colors.ink, fontFamily: 'Nunito_700Bold', fontSize: 16 },
  genderTextSelected: { color: colors.sageDeep },
  input: { width: '100%', minHeight: tapTarget.min, paddingHorizontal: 15, paddingVertical: 13, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.sand, borderRadius: 16, color: colors.ink, fontFamily: 'Nunito_600SemiBold', fontSize: 17 },
  counter: { width: '100%', marginTop: 5, textAlign: 'right', color: colors.inkSoft, fontFamily: 'Nunito_400Regular', fontSize: 12 },
  error: { width: '100%', marginTop: 8, color: colors.coral, fontFamily: 'Nunito_700Bold', fontSize: 14 },
  cta: { width: '100%', minHeight: 54, marginTop: spacing.lg, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.sageDeep },
  ctaPressed: { opacity: 0.68 },
  ctaText: { color: colors.white, fontFamily: 'Nunito_800ExtraBold', fontSize: 17 },
});
