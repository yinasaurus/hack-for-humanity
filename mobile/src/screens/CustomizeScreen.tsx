import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CompanionPet } from '../components/CompanionPet';
import { SupportChip } from '../components/SupportChip';
import { colors, gradients, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import { fetchCompanion, updateAppearance, type CompanionState } from '../api';
import {
  DEFAULT_APPEARANCE,
  PET_FACES,
  PET_HATS,
  PET_HELD,
  PET_NECKS,
  PET_SCENES,
  PET_TYPES,
  type PetAppearance,
} from '../pets';

type Props = {
  navigation: { goBack: () => void };
  route?: { params?: Partial<CompanionState> };
};

type TabId = 'friend' | 'wear' | 'hold' | 'place';

const TABS: { id: TabId; label: string }[] = [
  { id: 'friend', label: 'Friend' },
  { id: 'wear', label: 'Wear' },
  { id: 'hold', label: 'Hold' },
  { id: 'place', label: 'Place' },
];

/** Hats that have real 3D prop layers (not emoji). */
const WEAR_HATS = PET_HATS.filter((h) =>
  ['none', 'bow', 'flower', 'beanie', 'crown_soft'].includes(h.id)
);

const WEAR_FACES = PET_FACES.filter((f) => ['none', 'glasses'].includes(f.id));

const WEAR_NECKS = PET_NECKS.filter((n) =>
  ['none', 'scarf', 'ribbon'].includes(n.id)
);

const HOLD_ITEMS = PET_HELD.filter((h) =>
  ['none', 'star', 'heart', 'flower_stem'].includes(h.id)
);

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string; blurb?: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipTitle, on && styles.chipTitleOn]}>{o.label}</Text>
            {o.blurb ? <Text style={styles.chipBlurb}>{o.blurb}</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function CustomizeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const initial = useMemo<PetAppearance>(() => {
    const p = route?.params;
    const hat = p?.hat || DEFAULT_APPEARANCE.hat;
    const face = p?.face || DEFAULT_APPEARANCE.face;
    const neck = p?.neck || DEFAULT_APPEARANCE.neck;
    const held = p?.held || DEFAULT_APPEARANCE.held;
    return {
      petName: p?.petName || DEFAULT_APPEARANCE.petName,
      petType: p?.petType || DEFAULT_APPEARANCE.petType,
      petColor: p?.petColor || DEFAULT_APPEARANCE.petColor,
      pattern: p?.pattern || DEFAULT_APPEARANCE.pattern,
      eyes: p?.eyes || DEFAULT_APPEARANCE.eyes,
      hat: WEAR_HATS.some((h) => h.id === hat) ? hat : 'none',
      face: WEAR_FACES.some((f) => f.id === face) ? face : 'none',
      neck: WEAR_NECKS.some((n) => n.id === neck) ? neck : 'none',
      held: HOLD_ITEMS.some((h) => h.id === held) ? held : 'none',
      scene: p?.scene || DEFAULT_APPEARANCE.scene,
      accent: p?.accent || DEFAULT_APPEARANCE.accent,
    };
  }, [route?.params]);

  const [a, setA] = useState<PetAppearance>(initial);
  const [tab, setTab] = useState<TabId>('friend');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || route?.params?.petType) return;
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchCompanion(user.id);
        if (cancelled) return;
        setA({
          petName: c.petName || DEFAULT_APPEARANCE.petName,
          petType: c.petType || DEFAULT_APPEARANCE.petType,
          petColor: c.petColor || DEFAULT_APPEARANCE.petColor,
          pattern: c.pattern || DEFAULT_APPEARANCE.pattern,
          eyes: c.eyes || DEFAULT_APPEARANCE.eyes,
          hat: WEAR_HATS.some((h) => h.id === c.hat) ? c.hat : 'none',
          face: WEAR_FACES.some((f) => f.id === c.face) ? c.face : 'none',
          neck: WEAR_NECKS.some((n) => n.id === c.neck) ? c.neck : 'none',
          held: HOLD_ITEMS.some((h) => h.id === c.held) ? c.held : 'none',
          scene: c.scene || DEFAULT_APPEARANCE.scene,
          accent: c.accent || DEFAULT_APPEARANCE.accent,
        });
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, route?.params?.petType]);

  const patch = <K extends keyof PetAppearance>(key: K, value: PetAppearance[K]) => {
    setA((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      await updateAppearance(user.id, {
        ...a,
        petName: a.petName.trim() || 'Companion',
      });
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save right now');
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={[...gradients.customize]} style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 8) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 72,
          },
        ]}
        stickyHeaderIndices={[1]}
      >
        <View>
          <Text style={styles.title}>Style your companion</Text>
          <Text style={styles.sub}>
            Optional dress-up layers for your companion — leave anytime without saving.
          </Text>
        </View>

        <View style={styles.previewSticky}>
          <CompanionPet
            key={`${a.petType}-${a.hat}-${a.face}-${a.neck}-${a.held}-${a.scene}`}
            mood="happy"
            size={230}
            showCaption={false}
            muted
            {...a}
          />
          <Text style={styles.previewName}>{a.petName.trim() || 'Companion'}</Text>
        </View>

        <Text style={styles.section}>Name</Text>
        <TextInput
          value={a.petName}
          onChangeText={(t) => patch('petName', t)}
          maxLength={24}
          style={styles.input}
          placeholder="A gentle name"
          placeholderTextColor={colors.inkSoft}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabs}>
          {TABS.map((t) => (
            <Pressable
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[styles.tab, tab === t.id && styles.tabOn]}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'friend' && (
          <>
            <Text style={styles.section}>Choose your pet</Text>
            <Text style={styles.colorHint}>
              Each friend is a soft 3D companion. Extras clip on top — they never change body size.
            </Text>
            <ChipRow
              options={PET_TYPES}
              value={a.petType}
              onChange={(id) => patch('petType', id)}
            />
          </>
        )}

        {tab === 'wear' && (
          <>
            <Text style={styles.section}>Hat</Text>
            <ChipRow options={WEAR_HATS} value={a.hat} onChange={(id) => patch('hat', id)} />
            <Text style={styles.section}>Face</Text>
            <ChipRow options={WEAR_FACES} value={a.face} onChange={(id) => patch('face', id)} />
            <Text style={styles.section}>Neck</Text>
            <ChipRow options={WEAR_NECKS} value={a.neck} onChange={(id) => patch('neck', id)} />
          </>
        )}

        {tab === 'hold' && (
          <>
            <Text style={styles.section}>Held item</Text>
            <Text style={styles.colorHint}>A little toy clipped into their paws.</Text>
            <ChipRow options={HOLD_ITEMS} value={a.held} onChange={(id) => patch('held', id)} />
          </>
        )}

        {tab === 'place' && (
          <>
            <Text style={styles.section}>Scene</Text>
            <View style={styles.swatches}>
              {PET_SCENES.map((s) => {
                const on = s.id === a.scene;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => patch('scene', s.id)}
                    style={[styles.swatchWide, { backgroundColor: s.fill }, on && styles.swatchOn]}
                  >
                    <Text style={styles.swatchLabel}>{s.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.cta} onPress={save} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.ctaText}>Save look</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Leave without saving"
          style={{ minHeight: tapTarget.min, justifyContent: 'center' }}
        >
          <Text style={styles.back}>Not now — that’s okay</Text>
        </Pressable>
      </ScrollView>
      <SupportChip />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 28,
    color: colors.ink,
  },
  sub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    color: colors.inkSoft,
    marginTop: 6,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  previewSticky: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,248,242,0.94)',
    paddingVertical: 8,
    marginBottom: 4,
  },
  previewName: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.ink,
    marginTop: 4,
  },
  section: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  colorHint: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 10,
    lineHeight: 18,
    marginTop: -4,
  },
  input: {
    backgroundColor: colors.white,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.ink,
    borderWidth: 1.5,
    borderColor: colors.sand,
  },
  tabs: { marginTop: spacing.md, marginBottom: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.card,
    marginRight: 8,
  },
  tabOn: { backgroundColor: colors.sageDeep },
  tabText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.inkSoft,
    fontSize: 13,
  },
  tabTextOn: { color: colors.white },
  chipWrap: { gap: 8 },
  chip: {
    backgroundColor: colors.card,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipOn: {
    borderColor: colors.sageDeep,
    backgroundColor: colors.white,
  },
  chipTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
  },
  chipTitleOn: { color: colors.sageDeep },
  chipBlurb: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
    marginTop: 2,
  },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: {
    width: 68,
    height: 68,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchWide: {
    width: '47%',
    minWidth: 140,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchOn: { borderColor: colors.ink },
  swatchLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.ink,
  },
  cta: {
    marginTop: spacing.xl,
    backgroundColor: colors.sageDeep,
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    fontFamily: 'Nunito_700Bold',
    color: colors.white,
    fontSize: 17,
  },
  back: {
    fontFamily: 'Nunito_600SemiBold',
    textAlign: 'center',
    marginTop: spacing.md,
    color: colors.inkSoft,
  },
  error: {
    fontFamily: 'Nunito_600SemiBold',
    color: colors.teal,
    marginTop: spacing.md,
  },
});
