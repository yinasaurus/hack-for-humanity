import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { colors, spacing, tapTarget } from '../theme';
import { API_BASE, fetchPatientCheckIns, getToken, type PatientCheckIn } from '../api';

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

function dayKeyFromIso(iso: string) {
  const d = new Date(iso);
  return toKey(d);
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

type Props = {
  helloDays: string[];
  userId: string;
};

const WINDOW = 14;

/**
 * Soft presence strip — filled dots for recent check-ins.
 * Tap a filled day for patient-safe detail (photo + time only — no nutrition).
 */
export function HelloCalendar({ helloDays, userId }: Props) {
  const helloSet = useMemo(() => new Set(helloDays), [helloDays]);
  const [checkIns, setCheckIns] = useState<PatientCheckIn[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchPatientCheckIns(userId);
        if (!cancelled) setCheckIns(rows);
      } catch {
        if (!cancelled) setCheckIns([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, helloDays]);

  const dots = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    // Most recent (today) starts on the left; older days shift right.
    const out: { key: string; hello: boolean; isToday: boolean }[] = [];
    for (let i = 0; i < WINDOW; i++) {
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

  const dayEntries = useMemo(() => {
    if (!selectedDay) return [];
    return checkIns.filter((c) => dayKeyFromIso(c.createdAt) === selectedDay);
  }, [checkIns, selectedDay]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    setPhotoUri(null);
    const first = dayEntries[0];
    if (!first?.photoUrl) return;

    (async () => {
      setPhotoBusy(true);
      try {
        const token = await getToken();
        const res = await fetch(`${API_BASE}${first.photoUrl}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!res.ok) throw new Error('photo');
        const blob = await res.blob();
        if (cancelled) return;
        // React Native Image can use a data URI when blob URLs are unavailable.
        const reader = new FileReader();
        const dataUri: string = await new Promise((resolve, reject) => {
          reader.onloadend = () => resolve(String(reader.result || ''));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
        if (!cancelled) setPhotoUri(dataUri || null);
      } catch {
        if (!cancelled) setPhotoUri(null);
      } finally {
        if (!cancelled) setPhotoBusy(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [dayEntries]);

  return (
    <View style={styles.card}>
      <Text
        style={styles.title}
        accessibilityRole="header"
        accessibilityLabel="Check-ins. Tap a filled day for details."
      >
        Check-ins
      </Text>
      <Text style={styles.sub}>Newest on the left · tap a filled day</Text>

      <View style={styles.dotRow}>
        {dots.map((d) => (
          <Pressable
            key={d.key}
            disabled={!d.hello}
            onPress={() => d.hello && setSelectedDay(d.key)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !d.hello }}
            accessibilityLabel={
              d.hello
                ? `Check-in on ${d.key}${d.isToday ? ', today' : ''}`
                : `No check-in on ${d.key}`
            }
            style={[
              styles.dot,
              d.hello ? styles.dotFilled : styles.dotEmpty,
              d.isToday && styles.dotToday,
              d.hello && styles.dotPressable,
            ]}
          />
        ))}
      </View>

      <Modal
        visible={Boolean(selectedDay)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDay(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSelectedDay(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Check-in</Text>
            {dayEntries[0] ? (
              <>
                <Text style={styles.sheetWhen}>{formatWhen(dayEntries[0].createdAt)}</Text>
                <View style={styles.photoWrap}>
                  {photoBusy ? (
                    <ActivityIndicator color={colors.sageDeep} />
                  ) : photoUri ? (
                    <Image
                      source={{ uri: photoUri }}
                      style={styles.photo}
                      accessibilityLabel="Your check-in photo"
                    />
                  ) : (
                    <Text style={styles.sheetMuted}>Photo unavailable</Text>
                  )}
                </View>
                <Text style={styles.sheetMuted}>
                  Just your photo and when you checked in — no scores or calorie numbers here.
                </Text>
              </>
            ) : (
              <Text style={styles.sheetMuted}>No entry found for this day.</Text>
            )}
            <Pressable
              style={styles.closeBtn}
              onPress={() => setSelectedDay(null)}
              accessibilityRole="button"
              accessibilityLabel="Close check-in detail"
            >
              <Text style={styles.closeBtnText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
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
    justifyContent: 'flex-start',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  dotPressable: {
    minWidth: tapTarget.min / 2,
    minHeight: tapTarget.min / 2,
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(47,54,52,0.4)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  sheet: {
    backgroundColor: colors.cream,
    borderRadius: 24,
    padding: spacing.lg,
  },
  sheetTitle: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: colors.ink,
  },
  sheetWhen: {
    marginTop: 6,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 15,
    color: colors.sageDeep,
  },
  photoWrap: {
    marginTop: spacing.md,
    minHeight: 180,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: {
    width: '100%',
    height: 220,
    resizeMode: 'cover',
  },
  sheetMuted: {
    marginTop: spacing.sm,
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  closeBtn: {
    marginTop: spacing.md,
    minHeight: tapTarget.min,
    borderRadius: 16,
    backgroundColor: colors.sageDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.white,
  },
});
