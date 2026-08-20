import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tapTarget } from '../theme';
import type { CharacterDef } from './types';

type Props = {
  characters: CharacterDef[];
  selectedId: string;
  onSelect: (character: CharacterDef) => void;
};

/**
 * Switch animals — passes different modelPath + clip maps into the same viewer.
 */
export function CharacterSelector({ characters, selectedId, onSelect }: Props) {
  return (
    <View style={styles.row} accessibilityRole="tablist">
      {characters.map((c) => {
        const on = c.id === selectedId;
        const ready = Boolean(c.modelPath);
        return (
          <Pressable
            key={c.id}
            disabled={!ready}
            onPress={() => onSelect(c)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on, disabled: !ready }}
            accessibilityLabel={`${c.label}${ready ? '' : ', model not available yet'}`}
            style={[styles.chip, on && styles.chipOn, !ready && styles.chipDisabled]}
          >
            <Text style={[styles.label, on && styles.labelOn]}>{c.label}</Text>
            {!ready ? <Text style={styles.hint}>add .glb</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: spacing.sm,
  },
  chip: {
    minHeight: tapTarget.min,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.border,
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: colors.sageDeep,
    borderColor: colors.sageDeep,
  },
  chipDisabled: { opacity: 0.45 },
  label: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  labelOn: { color: colors.white },
  hint: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: colors.inkSoft,
    marginTop: 2,
  },
});
