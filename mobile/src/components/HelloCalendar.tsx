import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function shiftDays(from: Date, delta: number) {
  const d = new Date(from);
  d.setDate(d.getDate() + delta);
  return d;
}

type Props = {
  helloDays: string[];
};

const WINDOW = 14;

/**
 * Soft presence strip — filled dots for recent hellos.
 * No streak counts, totals, or "N days" scoring language.
 */
export function HelloCalendar({ helloDays }: Props) {
  const helloSet = useMemo(() => new Set(helloDays), [helloDays]);

  const dots = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const out: { key: string; hello: boolean; isToday: boolean }[] = [];
    for (let i = WINDOW - 1; i >= 0; i--) {
      const d = shiftDays(today, -i);
      const key = toKey(d);
      out.push({
        key,
        hello: helloSet.has(key),
        isToday: i === 0,
      });
    }
    return out;
  }, [helloSet]);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel="Recent hello days shown as soft dots. Filled means you said hello that day."
    >
      <Text style={styles.title}>Hellos</Text>

      <View style={styles.dotRow}>
        {dots.map((d) => (
          <View
            key={d.key}
            style={[
              styles.dot,
              d.hello ? styles.dotFilled : styles.dotEmpty,
              d.isToday && styles.dotToday,
            ]}
            accessibilityElementsHidden
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 18,
    color: colors.ink,
  },
  sub: {
    marginTop: 4,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    lineHeight: 18,
    color: colors.inkSoft,
  },
  dotRow: {
    marginTop: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotFilled: {
    backgroundColor: colors.sageDeep,
  },
  dotEmpty: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dotToday: {
    shadowColor: colors.sageDeep,
    shadowOpacity: 0.25,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 0 },
  },
  legendRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legend: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
    marginRight: 10,
  },
});
