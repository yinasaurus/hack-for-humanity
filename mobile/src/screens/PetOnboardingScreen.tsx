import React, { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import { completeOnboarding } from '../api';
import { PET_TYPES } from '../pets';
import { colors, spacing } from '../theme';

export function PetOnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();
  const [petType, setPetType] = useState('fox');
  const [petName, setPetName] = useState('');
  const [petGender, setPetGender] = useState<'male' | 'female'>('female');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
    if (!user || !petName.trim()) return setError('Give your new friend a name');
    setBusy(true); setError(null);
    try { await setUser(await completeOnboarding(user.id, petType, petName.trim(), petGender)); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not save your companion'); }
    finally { setBusy(false); }
  };

  return (
    <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 28 }]}>
      <Text style={styles.eyebrow}>One last hello</Text>
      <Text style={styles.title}>Choose your Buddi</Text>
      <Text style={styles.copy}>Pick the friend you’d like beside you.</Text>
      <View style={styles.grid}>
        {PET_TYPES.map((pet) => (
          <Pressable key={pet.id} onPress={() => setPetType(pet.id)} style={[styles.pet, petType === pet.id && styles.petOn]} accessibilityRole="radio" accessibilityState={{ checked: petType === pet.id }}>
            <Text style={styles.petEmoji}>{pet.id === 'fox' ? '🦊' : pet.id === 'horse' ? '🐴' : pet.id === 'parrot' ? '🦜' : pet.id === 'flamingo' ? '🦩' : '🕊️'}</Text>
            <Text style={styles.petLabel}>{pet.label}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>Is your Buddi male or female?</Text>
      <View style={styles.genderRow}>
        {(['male', 'female'] as const).map((option) => (
          <Pressable key={option} onPress={() => setPetGender(option)} accessibilityRole="radio" accessibilityState={{ checked: petGender === option }} style={styles.genderButton}>
            <View style={[styles.genderRadio, petGender === option && styles.genderRadioSelected]}>
              {petGender === option ? <View style={styles.genderRadioDot} /> : null}
            </View>
            <Text style={styles.petLabel}>{option === 'male' ? 'Male' : 'Female'}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.label}>What should we call them?</Text>
      <TextInput value={petName} onChangeText={setPetName} maxLength={24} placeholder="Maple" placeholderTextColor={colors.inkSoft} style={styles.input} autoCorrect={false} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={finish} disabled={busy} style={[styles.cta, busy && { opacity: 0.6 }]}>
        {busy ? <ActivityIndicator color={colors.white} /> : <Text style={styles.ctaText}>Meet my Buddi</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, backgroundColor: colors.cream, paddingHorizontal: spacing.lg },
  eyebrow: { color: colors.sageDeep, fontFamily: 'Nunito_700Bold', fontSize: 14 },
  title: { color: colors.ink, fontFamily: 'Nunito_800ExtraBold', fontSize: 34, marginTop: 6 },
  copy: { color: colors.inkSoft, fontFamily: 'Nunito_400Regular', fontSize: 16, lineHeight: 23, marginVertical: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.xl },
  pet: { width: '30%', minWidth: 92, backgroundColor: colors.card, borderWidth: 2, borderColor: colors.sand, borderRadius: 18, paddingVertical: 14, alignItems: 'center' },
  petOn: { borderColor: colors.sageDeep, backgroundColor: colors.white },
  petEmoji: { fontSize: 34 }, petLabel: { marginTop: 5, color: colors.ink, fontFamily: 'Nunito_700Bold' },
  label: { color: colors.ink, fontFamily: 'Nunito_700Bold', marginBottom: 8 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: spacing.lg },
  genderButton: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 10, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.sand, borderRadius: 16, paddingHorizontal: 14, alignItems: 'center' },
  genderRadio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.inkSoft, alignItems: 'center', justifyContent: 'center' },
  genderRadioSelected: { borderColor: colors.sageDeep },
  genderRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.sageDeep },
  input: { backgroundColor: colors.white, borderWidth: 2, borderColor: colors.sand, borderRadius: 16, padding: 14, fontSize: 17, color: colors.ink, fontFamily: 'Nunito_600SemiBold' },
  error: { color: colors.coral, marginTop: 10, fontFamily: 'Nunito_600SemiBold' },
  cta: { marginTop: spacing.lg, backgroundColor: colors.sageDeep, borderRadius: 17, padding: 15, alignItems: 'center' },
  ctaText: { color: colors.white, fontFamily: 'Nunito_700Bold', fontSize: 16 },
});
