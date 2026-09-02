import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimalWebView } from '../characters/AnimalWebView';
import { listReadyCharacters } from '../characters/characterCatalog';
import {
  accessoryFitForSpecies,
  cloneAccessoryFit,
  formatSlotFitSnippet,
  formatSpeciesFitSnippet,
  type AccessoryFit,
  type AccessorySlot,
  type SpeciesAccessoryFit,
} from '../characters/petAccessories';
import { canShowCosmeticFitDebug } from '../demoMode';
import type { WardrobeField } from '../wardrobe';

type CosmeticOption = {
  field: Exclude<WardrobeField, 'scene'>;
  value: string;
  label: string;
  slot: AccessorySlot;
};

const COSMETICS: readonly CosmeticOption[] = [
  { field: 'hat', value: 'party_hat', label: 'Party hat', slot: 'hat' },
  { field: 'hat', value: 'beanie', label: 'Beanie', slot: 'hat' },
  { field: 'hat', value: 'bow', label: 'Bow', slot: 'hat' },
  { field: 'hat', value: 'flower', label: 'Flower', slot: 'hat' },
  { field: 'hat', value: 'crown_soft', label: 'Soft crown', slot: 'hat' },
  { field: 'face', value: 'glasses', label: 'Glasses', slot: 'face' },
  { field: 'neck', value: 'scarf', label: 'Scarf', slot: 'neck' },
  { field: 'held', value: 'star', label: 'Star', slot: 'held' },
  { field: 'held', value: 'heart', label: 'Heart', slot: 'held' },
] as const;

type FitParam = keyof AccessoryFit;

const FIT_PARAMS: readonly {
  key: FitParam;
  label: string;
  step: number;
  min: number;
  max: number;
}[] = [
  { key: 'up', label: 'up', step: 0.01, min: -1.2, max: 1.2 },
  { key: 'forward', label: 'forward', step: 0.01, min: -1.2, max: 1.2 },
  { key: 'right', label: 'right', step: 0.01, min: -1.2, max: 1.2 },
  { key: 'size', label: 'size', step: 0.01, min: 0.08, max: 1.6 },
  { key: 'tilt', label: 'tilt', step: 0.01, min: -1.2, max: 1.2 },
];

function roundFit(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function slotValue(fit: AccessoryFit, key: FitParam): number {
  if (key === 'right' || key === 'tilt') return fit[key] ?? 0;
  return fit[key];
}

/**
 * Dev-only live cosmetic fitter. Ephemeral overrides never touch the companion
 * profile or SPECIES_ACCESSORY_FIT until you copy/share a snippet.
 */
export function CosmeticFitDebugPanel() {
  const insets = useSafeAreaInsets();
  const visible = canShowCosmeticFitDebug();
  const characters = useMemo(() => listReadyCharacters(), []);

  const [open, setOpen] = useState(false);
  const [speciesId, setSpeciesId] = useState(characters[0]?.id || 'fox');
  const [cosmetic, setCosmetic] = useState<CosmeticOption>(COSMETICS[0]);
  const [fit, setFit] = useState<SpeciesAccessoryFit>(() =>
    cloneAccessoryFit(accessoryFitForSpecies(characters[0]?.id || 'fox'))
  );
  const [copiedHint, setCopiedHint] = useState<string | null>(null);

  const baseline = useMemo(
    () => accessoryFitForSpecies(speciesId),
    [speciesId]
  );

  useEffect(() => {
    setFit(cloneAccessoryFit(accessoryFitForSpecies(speciesId)));
  }, [speciesId]);

  if (!visible) return null;

  const activeSlot = cosmetic.slot;
  const activeFit = fit[activeSlot];
  const baselineSlot = baseline[activeSlot];

  const outfit = {
    hat: cosmetic.field === 'hat' ? cosmetic.value : 'none',
    face: cosmetic.field === 'face' ? cosmetic.value : 'none',
    neck: cosmetic.field === 'neck' ? cosmetic.value : 'none',
    held: cosmetic.field === 'held' ? cosmetic.value : 'none',
    scene: 'sky',
  };

  const character =
    characters.find((c) => c.id === speciesId) || characters[0];

  const nudge = (key: FitParam, delta: number) => {
    const meta = FIT_PARAMS.find((p) => p.key === key)!;
    setFit((prev) => {
      const current = slotValue(prev[activeSlot], key);
      const next = roundFit(
        Math.min(meta.max, Math.max(meta.min, current + delta))
      );
      return {
        ...prev,
        [activeSlot]: {
          ...prev[activeSlot],
          [key]: next,
        },
      };
    });
  };

  const resetSlot = () => {
    setFit((prev) => ({
      ...prev,
      [activeSlot]: { ...baseline[activeSlot] },
    }));
  };

  const resetSpecies = () => {
    setFit(cloneAccessoryFit(baseline));
  };

  const exportText = (mode: 'species' | 'slot') => {
    return mode === 'species'
      ? formatSpeciesFitSnippet(speciesId, fit)
      : formatSlotFitSnippet(speciesId, activeSlot, fit[activeSlot]);
  };

  const shareSnippet = async (mode: 'species' | 'slot') => {
    const text = exportText(mode);
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.log('[CosmeticFitDebug]\n' + text);
    }
    try {
      await Share.share({ message: text });
      setCopiedHint(mode === 'species' ? 'Shared species block' : 'Shared slot');
    } catch {
      Alert.alert('Fit snippet', text);
    }
  };

  const headerClearance = Math.max(insets.top, 8) + 52;

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.anchor, { top: headerClearance + 36 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cosmetic fit debug panel"
          onPress={() => setOpen(true)}
          style={styles.chip}
        >
          <Text style={styles.chipText}>Fit ▾</Text>
        </Pressable>
      </View>

      <Modal
        visible={open}
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={[
            styles.modal,
            { paddingTop: Math.max(insets.top, 8), paddingBottom: insets.bottom + 8 },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>COSMETIC FIT · DEV</Text>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close fit panel"
              style={styles.closeBtn}
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <View style={styles.preview}>
            {character ? (
              <AnimalWebView
                key={speciesId}
                character={character}
                growthStage="teen"
                expression="happy"
                muted
                accessoryFit={fit}
                outfit={outfit}
                accessibilityLabel={`Fit preview ${speciesId} ${cosmetic.label}`}
                style={styles.previewWeb}
              />
            ) : null}
          </View>

          <ScrollView
            style={styles.controls}
            contentContainerStyle={styles.controlsInner}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>Species</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {characters.map((c) => {
                const active = c.id === speciesId;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setSpeciesId(c.id)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {c.label || c.id}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>Cosmetic</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {COSMETICS.map((item) => {
                const active =
                  item.field === cosmetic.field && item.value === cosmetic.value;
                return (
                  <Pressable
                    key={`${item.field}:${item.value}`}
                    onPress={() => setCosmetic(item)}
                    style={[styles.pill, active && styles.pillActive]}
                  >
                    <Text style={[styles.pillText, active && styles.pillTextActive]}>
                      {item.label}
                      {item.slot === 'neck' ? ' · neck' : item.slot === 'hat' || item.slot === 'face' ? ' · head' : ''}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionLabel}>
              {speciesId}.{activeSlot} · baseline vs live
            </Text>
            {FIT_PARAMS.map((param) => {
              const live = slotValue(activeFit, param.key);
              const base = slotValue(baselineSlot, param.key);
              return (
                <View key={param.key} style={styles.paramRow}>
                  <View style={styles.paramMeta}>
                    <Text style={styles.paramLabel}>{param.label}</Text>
                    <Text style={styles.paramBaseline}>base {roundFit(base)}</Text>
                  </View>
                  <Pressable
                    onPress={() => nudge(param.key, -param.step * 5)}
                    onLongPress={() => nudge(param.key, -param.step * 20)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>−−</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => nudge(param.key, -param.step)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>−</Text>
                  </Pressable>
                  <Text style={styles.paramValue}>{roundFit(live).toFixed(3)}</Text>
                  <Pressable
                    onPress={() => nudge(param.key, param.step)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => nudge(param.key, param.step * 5)}
                    onLongPress={() => nudge(param.key, param.step * 20)}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>++</Text>
                  </Pressable>
                </View>
              );
            })}

            <View style={styles.actions}>
              <Pressable onPress={resetSlot} style={styles.actionBtn}>
                <Text style={styles.actionText}>Reset slot</Text>
              </Pressable>
              <Pressable onPress={resetSpecies} style={styles.actionBtn}>
                <Text style={styles.actionText}>Reset species</Text>
              </Pressable>
              <Pressable
                onPress={() => shareSnippet('slot')}
                style={[styles.actionBtn, styles.actionPrimary]}
              >
                <Text style={[styles.actionText, styles.actionTextPrimary]}>
                  Copy slot
                </Text>
              </Pressable>
              <Pressable
                onPress={() => shareSnippet('species')}
                style={[styles.actionBtn, styles.actionPrimary]}
              >
                <Text style={[styles.actionText, styles.actionTextPrimary]}>
                  Copy species
                </Text>
              </Pressable>
            </View>

            <Text style={styles.snippetPreview} selectable>
              {formatSpeciesFitSnippet(speciesId, fit)}
            </Text>
            {copiedHint ? <Text style={styles.hint}>{copiedHint}</Text> : null}
            <Text style={styles.footer}>
              Ephemeral preview only — paste into petAccessories.ts to lock in.
              Scarves use the neck bone; hats/glasses use the head bone.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    left: 10,
    zIndex: 1000,
    elevation: 1000,
  },
  chip: {
    minWidth: 64,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(20, 24, 28, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    color: '#E8ECF0',
    fontSize: 11,
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: '#12161A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  modalTitle: {
    color: '#8B939C',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  closeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  closeText: {
    color: '#B8E0CC',
    fontSize: 14,
    fontWeight: '600',
  },
  preview: {
    height: 280,
    marginHorizontal: 10,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E8F0F6',
  },
  previewWeb: {
    flex: 1,
  },
  controls: {
    flex: 1,
    marginTop: 8,
  },
  controlsInner: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  sectionLabel: {
    color: '#8B939C',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillActive: {
    backgroundColor: 'rgba(90, 140, 120, 0.35)',
    borderColor: 'rgba(184, 224, 204, 0.4)',
  },
  pillText: {
    color: '#C5CDD4',
    fontSize: 12,
  },
  pillTextActive: {
    color: '#E8F6EF',
    fontWeight: '600',
  },
  paramRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  paramMeta: {
    width: 88,
  },
  paramLabel: {
    color: '#F2F4F6',
    fontSize: 12,
    fontWeight: '600',
  },
  paramBaseline: {
    color: '#6B737A',
    fontSize: 10,
  },
  stepBtn: {
    minWidth: 32,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  stepBtnText: {
    color: '#E8ECF0',
    fontSize: 12,
    fontWeight: '700',
  },
  paramValue: {
    width: 58,
    textAlign: 'center',
    color: '#B8E0CC',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  actionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionPrimary: {
    backgroundColor: 'rgba(90, 140, 120, 0.4)',
  },
  actionText: {
    color: '#C5CDD4',
    fontSize: 12,
    fontWeight: '600',
  },
  actionTextPrimary: {
    color: '#E8F6EF',
  },
  snippetPreview: {
    marginTop: 12,
    padding: 10,
    borderRadius: 6,
    backgroundColor: 'rgba(0,0,0,0.35)',
    color: '#9AA3AB',
    fontSize: 11,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  hint: {
    color: '#B8E0CC',
    fontSize: 11,
    marginTop: 6,
  },
  footer: {
    color: '#6B737A',
    fontSize: 10,
    marginTop: 10,
    lineHeight: 14,
  },
});
