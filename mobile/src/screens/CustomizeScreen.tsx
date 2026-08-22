import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import { SupportChip } from '../components/SupportChip';
import { AnimalWebView, characterForLiveCompanion } from '../characters';
import { colors, gradients, spacing, tapTarget } from '../theme';
import { useAuth } from '../AuthContext';
import { fetchCompanion, updateAppearance, type CompanionState, type Unlock } from '../api';
import { upcomingKeepsakeSteps } from '../keepsakePath';
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

/** Top-level categories: animal vs layered outfit (independent fields). */
type TabId = 'outfit';

const TABS: { id: TabId; label: string }[] = [
  { id: 'outfit', label: 'Outfit' },
];

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

/** Milestone unlock id → appearance field it relates to (decorative only). */
const UNLOCK_TO_COSMETIC: Record<string, { field: keyof PetAppearance; value: string }> = {
  soft_scarf: { field: 'neck', value: 'scarf' },
  sunny_meadow: { field: 'scene', value: 'sunny_meadow' },
  flower_crown: { field: 'hat', value: 'flower' },
  cozy_nook: { field: 'scene', value: 'cozy_nook' },
  star_pendant: { field: 'held', value: 'star' },
  quiet_garden: { field: 'scene', value: 'quiet_garden' },
};

function appearanceFromPartial(
  p?: Partial<CompanionState> | null
): PetAppearance {
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
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  unlockedIds,
}: {
  options: readonly { id: T; label: string; blurb?: string }[];
  value: T;
  onChange: (id: T) => void;
  /** Cosmetic ids unlocked via keepsakes — informational, never punishment-gated */
  unlockedIds?: Set<string>;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => {
        const on = o.id === value;
        const keepsake = unlockedIds?.has(o.id);
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.label}${keepsake ? ', unlocked keepsake' : ''}`}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipTitle, on && styles.chipTitleOn]}>{o.label}</Text>
            {o.blurb ? <Text style={styles.chipBlurb}>{o.blurb}</Text> : null}
            {keepsake ? <Text style={styles.keepsakeTag}>Keepsake</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

export function CustomizeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [a, setA] = useState<PetAppearance>(() => appearanceFromPartial(route?.params));
  const [unlocks, setUnlocks] = useState<Unlock[]>([]);
  const [helloDayCount, setHelloDayCount] = useState(0);
  const [tab, setTab] = useState<TabId>('outfit');
  const [busy, setBusy] = useState(false);
  const [loadingLook, setLoadingLook] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** Once the user edits, never let a late fetch overwrite their choice. */
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!user) {
      setLoadingLook(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchCompanion(user.id);
        if (cancelled) return;
        setUnlocks(c.unlocks || []);
        setHelloDayCount((c.helloDays || []).length);
        // Only hydrate from server if the user hasn't started editing
        if (!dirtyRef.current) {
          const next = appearanceFromPartial(c);
          setA(next);
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.log('[Customize] loaded appearance', {
              petType: next.petType,
              hat: next.hat,
              neck: next.neck,
              scene: next.scene,
            });
          }
        }
      } catch {
        /* keep route/defaults */
      } finally {
        if (!cancelled) setLoadingLook(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const unlockedCosmeticIds = useMemo(() => {
    const ids = new Set<string>();
    for (const u of unlocks) {
      const map = UNLOCK_TO_COSMETIC[u.id];
      if (map) ids.add(map.value);
      // Also treat unlock id itself as a tag when it matches a scene/accessory id
      ids.add(u.id);
    }
    return ids;
  }, [unlocks]);

  const keepsakePath = useMemo(
    () => upcomingKeepsakeSteps(helloDayCount, 4),
    [helloDayCount]
  );

  const patch = <K extends keyof PetAppearance>(key: K, value: PetAppearance[K]) => {
    dirtyRef.current = true;
    setA((prev) => {
      const next = { ...prev, [key]: value };
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[Customize] patch', key, value, '→ petType=', next.petType);
      }
      return next;
    });
  };

  const save = async () => {
    if (!user) return;
    setBusy(true);
    setError(null);
    try {
      const companion = await updateAppearance(user.id, {
        ...a,
        petName: a.petName.trim() || 'Companion',
      });
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[Customize] saved', {
          petType: companion.petType,
          hat: companion.hat,
          neck: companion.neck,
          scene: companion.scene,
        });
      }
      dirtyRef.current = false;
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save right now');
    } finally {
      setBusy(false);
    }
  };

  const liveCharacter = useMemo(() => characterForLiveCompanion(a.petType), [a.petType]);

  return (
    <LinearGradient colors={[...gradients.customize]} style={styles.root}>
      <View
        style={[
          styles.previewFixed,
          { paddingTop: Math.max(insets.top, 8) + 4 },
        ]}
      >
        <Text style={styles.title}>Style</Text>
        <Text style={styles.sub}>Looks only — never body size.</Text>
        {loadingLook ? (
          <ActivityIndicator color={colors.sageDeep} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <AnimalWebView
              key={`live-${liveCharacter.modelPath}`}
              character={liveCharacter}
              expression="happy"
              muted
              style={styles.preview3d}
              accessibilityLabel={`${a.petName || 'Companion'} 3D preview`}
              outfit={{
                hat: a.hat,
                face: a.face,
                neck: a.neck,
                held: a.held,
                scene: a.scene,
              }}
            />
            <Text style={styles.previewName} accessibilityLiveRegion="polite">
              {a.petName.trim() || 'Companion'} ·{' '}
              {PET_TYPES.find((p) => p.id === a.petType)?.label || a.petType}
              {a.hat !== 'none' ? ` · ${a.hat}` : ''}
              {a.neck !== 'none' ? ` · ${a.neck}` : ''}
            </Text>
          </>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 16) + 72 },
        ]}
      >
        <View style={styles.pathCard} accessibilityRole="summary">
          <Text style={styles.pathTitle}>Coming up</Text>
          <Text style={styles.pathBlurb}>Soft keepsakes from hello days — no deadlines.</Text>
          {keepsakePath.map((step) => (
            <View key={step.milestoneDay} style={styles.pathRow}>
              <Text style={[styles.pathLabel, step.unlocked && styles.pathLabelOn]}>
                {step.label}
              </Text>
              <Text style={styles.pathAway}>
                {step.unlocked
                  ? 'Yours'
                  : step.hellosAway === 1
                    ? '~1 hello'
                    : `~${step.hellosAway} hellos`}
              </Text>
            </View>
          ))}
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
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === t.id }}
            >
              <Text style={[styles.tabText, tab === t.id && styles.tabTextOn]}>{t.label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {tab === 'outfit' && (
          <>
            <Text style={styles.section}>Hat</Text>
            <ChipRow
              options={WEAR_HATS}
              value={a.hat}
              onChange={(id) => patch('hat', id)}
              unlockedIds={unlockedCosmeticIds}
            />
            <Text style={styles.section}>Face</Text>
            <ChipRow
              options={WEAR_FACES}
              value={a.face}
              onChange={(id) => patch('face', id)}
              unlockedIds={unlockedCosmeticIds}
            />
            <Text style={styles.section}>Neck</Text>
            <ChipRow
              options={WEAR_NECKS}
              value={a.neck}
              onChange={(id) => patch('neck', id)}
              unlockedIds={unlockedCosmeticIds}
            />
            <Text style={styles.section}>Held item</Text>
            <ChipRow
              options={HOLD_ITEMS}
              value={a.held}
              onChange={(id) => patch('held', id)}
              unlockedIds={unlockedCosmeticIds}
            />
            <Text style={styles.section}>Scene</Text>
            <View style={styles.swatches}>
              {PET_SCENES.map((s) => {
                const on = s.id === a.scene;
                const keepsake = unlockedCosmeticIds.has(s.id);
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => patch('scene', s.id)}
                    style={[styles.swatchWide, { backgroundColor: s.fill }, on && styles.swatchOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={styles.swatchLabel}>{s.label}</Text>
                    {keepsake ? <Text style={styles.keepsakeTag}>Keepsake</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={styles.cta}
          onPress={save}
          disabled={busy || loadingLook}
          accessibilityRole="button"
          accessibilityLabel="Save companion look"
        >
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
          <Text style={styles.back}>Cancel</Text>
        </Pressable>
      </ScrollView>
      <SupportChip />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  previewFixed: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: 'rgba(255,248,242,0.96)',
  },
  preview3d: {
    width: '100%',
    height: 160,
    borderRadius: 20,
    marginTop: 4,
  },
  content: { paddingHorizontal: spacing.lg, paddingTop: 8 },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: colors.ink,
    alignSelf: 'flex-start',
  },
  sub: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    color: colors.inkSoft,
    marginTop: 4,
    marginBottom: 4,
    lineHeight: 20,
    alignSelf: 'flex-start',
  },
  previewName: {
    marginTop: 4,
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.sageDeep,
    textAlign: 'center',
  },
  section: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
    marginTop: 14,
    marginBottom: 8,
  },
  colorHint: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
    marginBottom: 8,
    lineHeight: 18,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.white,
    minHeight: tapTarget.min,
  },
  tabs: { marginTop: 12, marginBottom: 4, flexGrow: 0 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.sageWash,
    marginRight: 8,
    minHeight: tapTarget.min,
    justifyContent: 'center',
  },
  tabOn: { backgroundColor: colors.sageDeep },
  tabText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.inkSoft },
  tabTextOn: { color: colors.white },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    minHeight: tapTarget.min,
    justifyContent: 'center',
  },
  chipOn: { borderColor: colors.sageDeep, backgroundColor: colors.mist },
  chipTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.ink },
  chipTitleOn: { color: colors.sageDeep },
  chipBlurb: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: colors.inkSoft, marginTop: 2 },
  pathCard: {
    marginTop: 0,
    marginBottom: spacing.md,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pathTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 16,
    color: colors.ink,
  },
  pathBlurb: {
    marginTop: 4,
    marginBottom: 8,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    lineHeight: 17,
    color: colors.inkSoft,
  },
  pathRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pathLabel: {
    flex: 1,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.inkSoft,
  },
  pathLabelOn: {
    color: colors.sageDeep,
  },
  pathAway: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
  },
  keepsakeTag: {
    marginTop: 4,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: colors.teal,
  },
  swatches: { gap: 8 },
  swatchWide: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    minHeight: tapTarget.min,
    justifyContent: 'center',
  },
  swatchOn: { borderColor: colors.sageDeep },
  swatchLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.ink },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.sageDeep,
    borderRadius: 16,
    minHeight: tapTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: { fontFamily: 'Nunito_700Bold', color: colors.white, fontSize: 16 },
  back: {
    marginTop: 12,
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
    color: colors.inkSoft,
    fontSize: 15,
  },
  error: {
    marginTop: 12,
    fontFamily: 'Nunito_600SemiBold',
    color: '#A65D5D',
    fontSize: 14,
  },
});
