import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing, tapTarget } from '../theme';

type Props = {
  muted: boolean;
  onToggleMute: () => void;
  onStop?: () => void;
  speaking?: boolean;
};

/**
 * Always-visible mute / stop for companion speech — never auto-plays on its own.
 */
export function CompanionMuteBar({ muted, onToggleMute, onStop, speaking }: Props) {
  return (
    <View style={styles.row} accessibilityRole="toolbar">
      <Pressable
        onPress={onToggleMute}
        accessibilityRole="button"
        accessibilityState={{ checked: muted }}
        accessibilityLabel={muted ? 'Unmute companion voice' : 'Mute companion voice'}
        style={[styles.btn, muted && styles.btnOn]}
      >
        <Text style={[styles.btnText, muted && styles.btnTextOn]}>
          {muted ? 'Muted' : 'Mute'}
        </Text>
      </Pressable>
      {onStop ? (
        <Pressable
          onPress={onStop}
          accessibilityRole="button"
          accessibilityLabel="Stop companion speaking"
          disabled={!speaking && muted}
          style={[styles.btn, styles.btnGhost]}
        >
          <Text style={styles.btnGhostText}>Pause voice</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 8,
  },
  btn: {
    minHeight: tapTarget.min,
    minWidth: tapTarget.min,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOn: {
    backgroundColor: colors.mist,
    borderColor: colors.teal,
  },
  btnGhost: {
    backgroundColor: 'transparent',
  },
  btnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: colors.ink,
  },
  btnTextOn: { color: colors.teal },
  btnGhostText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: colors.inkSoft,
  },
});
