import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function toKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function monthLabel(d: Date) {
  return d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
}

type Props = {
  helloDays: string[];
  streakDays: number;
  totalCheckInDays: number;
};

/**
 * Soft calendar of hello days — companionship presence, not a competitive scoreboard.
 */
export function HelloCalendar({ helloDays, streakDays, totalCheckInDays }: Props) {
  const helloSet = useMemo(() => new Set(helloDays), [helloDays]);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return new Date(n.getFullYear(), n.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayKey = toKey(new Date());
    const out: {
      key: string;
      label: string;
      inMonth: boolean;
      hello: boolean;
      today: boolean;
    }[] = [];

    for (let i = 0; i < firstDow; i++) {
      out.push({ key: `pad-${i}`, label: '', inMonth: false, hello: false, today: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const key = toKey(new Date(year, month, day));
      out.push({
        key,
        label: String(day),
        inMonth: true,
        hello: helloSet.has(key),
        today: key === todayKey,
      });
    }
    return out;
  }, [cursor, helloSet]);

  const shiftMonth = (delta: number) => {
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Hello days</Text>
      <Text style={styles.sub}>
        Days you said hello — a soft calendar, not a scoreboard.
      </Text>

      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Gentle streak</Text>
          <Text style={styles.statValue}>
            {streakDays} day{streakDays === 1 ? '' : 's'}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Hellos</Text>
          <Text style={styles.statValue}>{totalCheckInDays}</Text>
        </View>
      </View>

      <View style={styles.monthRow}>
        <Pressable onPress={() => shiftMonth(-1)} hitSlop={10}>
          <Text style={styles.nav}>‹</Text>
        </Pressable>
        <Text style={styles.month}>{monthLabel(cursor)}</Text>
        <Pressable onPress={() => shiftMonth(1)} hitSlop={10}>
          <Text style={styles.nav}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={`${d}-${i}`} style={styles.weekday}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((c) => (
          <View
            key={c.key}
            style={[
              styles.cell,
              c.hello && styles.cellHello,
              c.today && styles.cellToday,
              !c.inMonth && styles.cellEmpty,
            ]}
          >
            {c.inMonth ? (
              <Text style={[styles.cellText, c.hello && styles.cellTextHello]}>{c.label}</Text>
            ) : null}
          </View>
        ))}
      </View>

      <Text style={styles.legend}>Filled days = a meal hello that day</Text>
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
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: {
    flex: 1,
    backgroundColor: colors.sageWash,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  statLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.inkSoft,
  },
  statValue: {
    marginTop: 2,
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 20,
    color: colors.ink,
  },
  monthRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  month: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
    color: colors.ink,
  },
  nav: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 26,
    color: colors.sageDeep,
    paddingHorizontal: 8,
  },
  weekRow: {
    marginTop: 10,
    flexDirection: 'row',
  },
  weekday: {
    width: '14.28%',
    textAlign: 'center',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: colors.inkSoft,
  },
  grid: {
    marginTop: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    marginBottom: 2,
  },
  cellEmpty: { opacity: 0 },
  cellHello: {
    backgroundColor: 'rgba(143,163,150,0.4)',
  },
  cellToday: {
    borderWidth: 1.5,
    borderColor: colors.sageDeep,
  },
  cellText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: colors.ink,
  },
  cellTextHello: {
    fontFamily: 'Nunito_800ExtraBold',
    color: colors.sageDeep,
  },
  legend: {
    marginTop: 8,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: colors.inkSoft,
    textAlign: 'center',
  },
});
