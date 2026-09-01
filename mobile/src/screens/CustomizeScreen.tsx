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
  petTypeLabel,
  type PetAppearance,
  type PetTypeId,
} from '../pets';
import {
  canEquipWardrobeItem,
  unlockedKeepsakeIds,
  wardrobeLabel,
  type WardrobeField,
} from '../wardrobe';


type Props = {
  navigation: { goBack: () => void };
  route?: { params?: Partial<CompanionState> };
};

/** Top-level categories: companion animal vs outfit accessories. */
type TabId = 'companion' | 'outfit';

const TABS: { id: TabId; label: string }[] = [
  { id: 'companion', label: 'Companion' },
  { id: 'outfit', label: 'Outfit' },
];

const WEAR_HATS = PET_HATS.filter((h) =>
  ['none', 'bow', 'flower', 'beanie', 'party_hat', 'crown_soft'].includes(h.id)
);
const WEAR_FACES = PET_FACES.filter((f) => ['none', 'glasses'].includes(f.id));
const WEAR_NECKS = PET_NECKS.filter((n) =>
  ['none', 'scarf'].includes(n.id)
);
const HOLD_ITEMS = PET_HELD.filter((h) =>
  ['none', 'star', 'heart'].includes(h.id)
);
const WEAR_SCENES = PET_SCENES.filter((scene) =>
  ['sky', 'sunny_meadow', 'cozy_nook', 'quiet_garden'].includes(scene.id)
);

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
  field,
  unlockIds,
}: {
  options: readonly { id: T; label: string; blurb?: string }[];
  value: T;
  onChange: (id: T) => void;
  field: WardrobeField;
  unlockIds: ReadonlySet<string>;
}) {
  return (
    <View style={styles.chipWrap}>
      {options.map((o) => {
        const on = o.id === value;
        const available = canEquipWardrobeItem(field, o.id, unlockIds);
        return (
          <Pressable
            key={o.id}
            onPress={() => available && onChange(o.id)}
            disabled={!available}
            accessibilityRole="button"
            accessibilityState={{ selected: on, disabled: !available }}
            accessibilityLabel={`${o.label}, ${available ? 'available' : 'locked future keepsake'}`}
            style={[styles.chip, !available && styles.chipLocked, on && styles.chipOn]}
          >
            <Text style={[styles.chipTitle, !available && styles.chipTitleLocked, on && styles.chipTitleOn]}>{o.label}</Text>
            {o.blurb ? <Text style={styles.chipBlurb}>{o.blurb}</Text> : null}
            <Text style={[styles.inventoryTag, available && styles.inventoryTagAvailable]}>
              {on ? 'Worn' : available ? 'Available' : 'Locked · future keepsake'}
            </Text>
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
  const [growthStage, setGrowthStage] = useState<CompanionState['growthStage']>('baby');
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
        setGrowthStage(c.growthStage || 'baby');
        // Only hydrate from server if the user hasn't started editing
        if (!dirtyRef.current) {
          const next = appearanceFromPartial(c);
          setA(next);
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

  const unlockIds = useMemo(() => unlockedKeepsakeIds(unlocks), [unlocks]);

  const keepsakePath = useMemo(
    () => upcomingKeepsakeSteps(unlocks.map((unlock) => unlock.milestoneDay), 4),
    [unlocks]
  );

  const patch = <K extends keyof PetAppearance>(key: K, value: PetAppearance[K]) => {
    dirtyRef.current = true;
    setA((prev) => {
      const next = { ...prev, [key]: value };
      return next;
    });
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
        {loadingLook ? (
          <ActivityIndicator color={colors.sageDeep} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={styles.previewStage}>
              <AnimalWebView
                key={`live-${liveCharacter.id}`}
                character={liveCharacter}
                growthStage={growthStage}
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
            </View>
            <Text style={styles.previewName} accessibilityLiveRegion="polite">
              {a.petName.trim() || 'Companion'} ·{' '}
              {petTypeLabel(a.petType)}
              {` · ${wardrobeLabel(a)}`}
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
          <Text style={styles.pathBlurb}>Soft keepsakes from check-in days — no deadlines.</Text>
          {keepsakePath.map((step) => (
            <View key={step.milestoneDay} style={styles.pathRow}>
              <Text style={[styles.pathLabel, step.unlocked && styles.pathLabelOn]}>
                {step.label}
              </Text>
              <Text style={styles.pathAway}>
                {step.unlocked ? 'Yours' : 'A future keepsake'}
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

        {tab === 'companion' && (
          <>
            <Text style={styles.section}>Companion</Text>
            <View style={styles.companionIntro} accessibilityRole="summary">
              <Text style={styles.companionIntroBody}>
                Pick a friend — hats and scenes stay with you. Preview updates above; tap Save look to keep the change.
              </Text>
            </View>
            <View style={styles.companionGrid} accessibilityLabel="Choose companion species">
              {PET_TYPES.map((pet) => {
                const on = a.petType === pet.id;
                return (
                  <Pressable
                    key={pet.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`Choose ${pet.label} as companion`}
                    style={[styles.companionCard, on && styles.companionCardOn]}
                    onPress={() => {
                      patch('petType', pet.id as PetTypeId);
                    }}
                  >
                    <View style={[styles.companionRadio, on && styles.companionRadioOn]}>
                      {on ? <View style={styles.companionRadioDot} /> : null}
                    </View>
                    <Text style={styles.companionIcon} importantForAccessibility="no">
                      {pet.icon}
                    </Text>
                    <Text style={[styles.companionLabel, on && styles.companionLabelOn]}>
                      {pet.label}
                    </Text>
                    {pet.blurb ? (
                      <Text style={styles.companionBlurb} importantForAccessibility="no">
                        {pet.blurb}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {tab === 'outfit' && (
          <>
            <View style={styles.inventoryIntro} accessibilityRole="summary">
              <Text style={styles.inventoryTitle}>Wardrobe</Text>
              <Text style={styles.inventoryBody}>
                Earned keepsakes stay yours. Locked pieces remain visible here and open automatically in a future chapter.
              </Text>
            </View>
            <Text style={styles.section}>Hat</Text>
            <ChipRow
              options={WEAR_HATS}
              value={a.hat}
              onChange={(id) => patch('hat', id)}
              field="hat"
              unlockIds={unlockIds}
            />
            <Text style={styles.section}>Face</Text>
            <ChipRow
              options={WEAR_FACES}
              value={a.face}
              onChange={(id) => patch('face', id)}
              field="face"
              unlockIds={unlockIds}
            />
            <Text style={styles.section}>Neck</Text>
            <ChipRow
              options={WEAR_NECKS}
              value={a.neck}
              onChange={(id) => patch('neck', id)}
              field="neck"
              unlockIds={unlockIds}
            />
            <Text style={styles.section}>Held item</Text>
            <ChipRow
              options={HOLD_ITEMS}
              value={a.held}
              onChange={(id) => patch('held', id)}
              field="held"
              unlockIds={unlockIds}
            />
            <Text style={styles.section}>Scene</Text>
            <View style={styles.swatches}>
              {WEAR_SCENES.map((s) => {
                const on = s.id === a.scene;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => patch('scene', s.id)}
                    style={[styles.swatchWide, { backgroundColor: s.fill }, on && styles.swatchOn]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                  >
                    <Text style={styles.swatchLabel}>{s.label}</Text>
                    <Text style={[styles.inventoryTag, styles.inventoryTagAvailable]}>
                      {on ? 'In use' : 'Available'}
                    </Text>
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
          style={styles.cancelBtn}
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
  },
  previewStage: { width: '100%', height: 160, marginTop: 4, position: 'relative' },
  content: { paddingHorizontal: spacing.lg, paddingTop: 8 },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: colors.ink,
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
  chipLocked: { backgroundColor: 'rgba(255,255,255,0.48)', borderColor: colors.sand, opacity: 0.68 },
  chipTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.ink },
  chipTitleOn: { color: colors.sageDeep },
  chipTitleLocked: { color: colors.inkSoft },
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
  inventoryIntro: {
    marginTop: 12,
    padding: 14,
    borderRadius: 16,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inventoryTitle: { fontFamily: 'Nunito_800ExtraBold', fontSize: 17, color: colors.ink },
  inventoryBody: { marginTop: 4, fontFamily: 'Nunito_400Regular', fontSize: 13, lineHeight: 19, color: colors.inkSoft },
  inventoryTag: { marginTop: 4, fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: colors.inkSoft },
  inventoryTagAvailable: { color: colors.teal },
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
  swatchLocked: { opacity: 0.62 },
  swatchLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: colors.ink },
  cta: {
    marginTop: spacing.lg,
    backgroundColor: colors.sageDeep,
    borderRadius: 17,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: { fontFamily: 'Nunito_800ExtraBold', color: colors.white, fontSize: 17 },
  cancelBtn: {
    marginTop: spacing.xs,
    minHeight: tapTarget.min,
    justifyContent: 'center',
    alignItems: 'center',
  },
  back: {
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
    color: colors.inkSoft,
    fontSize: 15,
  },
  error: {
    marginTop: spacing.sm,
    fontFamily: 'Nunito_600SemiBold',
    color: '#A65D5D',
    fontSize: 14,
  },
  companionIntro: {
    marginBottom: spacing.sm,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.border,
  },
  companionIntroBody: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    lineHeight: 19,
    color: colors.inkSoft,
  },
  companionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: spacing.xs,
  },
  companionCard: {
    position: 'relative',
    width: '47%',
    minHeight: 132,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.sand,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.md,
    paddingBottom: 14,
  },
  companionCardOn: {
    borderColor: colors.sageDeep,
    backgroundColor: colors.white,
  },
  companionRadio: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.sand,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  companionRadioOn: {
    borderColor: colors.sageDeep,
  },
  companionRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.sageDeep,
  },
  companionIcon: {
    fontSize: 48,
    lineHeight: 56,
  },
  companionLabel: {
    marginTop: 4,
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
  },
  companionLabelOn: {
    color: colors.sageDeep,
  },
  companionBlurb: {
    marginTop: 2,
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    lineHeight: 15,
    color: colors.inkSoft,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
});
