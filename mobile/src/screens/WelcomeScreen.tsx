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
import { colors, gradients, spacing } from '../theme';
import { useAuth } from '../AuthContext';
import { useSettings } from '../SettingsContext';
import { BuddiBrand } from '../components/BuddiBrand';
import { SupportChip } from '../components/SupportChip';

export function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { signIn, signUp } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        if (!name.trim()) throw new Error('Please add your name');
        if (password.length < 6) throw new Error('Password needs at least 6 characters');
        if (password !== confirm) throw new Error('Passwords do not match');
        await signUp(email, password, name.trim());
      } else {
        if (!password) throw new Error('Password required');
        await signIn(email, password);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not continue right now');
    } finally {
      setBusy(false);
    }
  };

  const demoLogin = async () => {
    setBusy(true);
    setError(null);
    setMode('login');
    setEmail('maya@demo.local');
    setPassword('demo');
    try {
      await signIn('maya@demo.local', 'demo');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[...gradients.welcome]} style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 12}
      >
        <ScrollView
          contentContainerStyle={[
            styles.inner,
            {
              paddingTop: Math.max(insets.top, 12) + 16,
              paddingBottom: Math.max(insets.bottom, 16) + 32,
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <BuddiBrand size="large" textStyle={styles.brand} />
          <Text style={styles.tagline}>Your gentle meal companion.</Text>

          <Pressable style={styles.demoBtn} onPress={demoLogin} disabled={busy}>
            {busy && mode === 'login' ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.demoBtnText}>Try demo</Text>
            )}
          </Pressable>
          <Text style={styles.demoHint}>maya@demo.local · password demo</Text>

          <View style={styles.tabs}>
            <Pressable
              onPress={() => setMode('login')}
              style={[styles.tab, mode === 'login' && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextOn]}>Log in</Text>
            </Pressable>
            <Pressable
              onPress={() => setMode('signup')}
              style={[styles.tab, mode === 'signup' && styles.tabOn]}
            >
              <Text style={[styles.tabText, mode === 'signup' && styles.tabTextOn]}>Sign up</Text>
            </Pressable>
          </View>

          <View style={styles.card}>
            {mode === 'signup' && (
              <>
                <Text style={styles.label}>Your name</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor={colors.inkSoft}
                />
              </>
            )}
            <Text style={styles.label}>Email</Text>
            <TextInput
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={colors.inkSoft}
            />
            <Text style={styles.label}>Password</Text>
            <TextInput
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.inkSoft}
            />
            {mode === 'signup' ? (
              <>
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  secureTextEntry
                  value={confirm}
                  onChangeText={setConfirm}
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={colors.inkSoft}
                />
              </>
            ) : null}

            <Pressable
              style={styles.checkRow}
              onPress={() => updateSettings({ staySignedIn: !settings.staySignedIn })}
            >
              <View style={[styles.check, settings.staySignedIn && styles.checkOn]}>
                {settings.staySignedIn ? <Text style={styles.checkMark}>✓</Text> : null}
              </View>
              <Text style={styles.checkLabel}>Stay signed in on this phone</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable style={styles.cta} onPress={onSubmit} disabled={busy}>
              {busy ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.ctaText}>
                  {mode === 'login' ? 'Log in' : 'Create account'}
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <SupportChip />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { paddingHorizontal: spacing.lg },
  brand: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 40,
    color: colors.ink,
  },
  tagline: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    lineHeight: 23,
    color: colors.inkSoft,
  },
  demoBtn: {
    backgroundColor: colors.sageDeep,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  demoBtnText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 16,
  },
  demoHint: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
  },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: colors.card,
  },
  tabOn: { backgroundColor: colors.sageDeep },
  tabText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.inkSoft,
  },
  tabTextOn: { color: colors.white },
  card: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: spacing.lg,
  },
  label: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.sand,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.ink,
    marginBottom: spacing.md,
    backgroundColor: colors.white,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.md,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  checkMark: { color: colors.white, fontSize: 12, fontWeight: '700' },
  checkLabel: {
    fontFamily: 'Nunito_400Regular',
    color: colors.ink,
    flex: 1,
  },
  cta: {
    backgroundColor: colors.sageDeep,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 17,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.teal,
    marginBottom: spacing.sm,
  },
});
