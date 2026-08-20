import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, tapTarget } from '../theme';

type Props = {
  /** Hide on screens that already show a full support section */
  compact?: boolean;
};

/**
 * Always-reachable, low-pressure crisis / support entry — not buried in Settings.
 * Singapore-local resources. Never auto-calls or auto-plays audio.
 */
export function SupportChip({ compact = true }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Open support and crisis resources"
        style={[
          styles.chip,
          compact && styles.chipCompact,
          { bottom: Math.max(insets.bottom, 10) + 4 },
        ]}
        hitSlop={6}
      >
        <Text style={styles.chipText}>Support</Text>
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Dismiss support sheet"
        >
          <Pressable
            style={styles.sheet}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal
          >
            <Text style={styles.title}>You’re not alone</Text>
            <Text style={styles.body}>
              KindPlate is a companion for meal moments — not emergency care. This app is
              not monitored 24/7 and is not a substitute for crisis support. If you need
              real-time help in Singapore, these options are here whenever you want them.
            </Text>

            <Pressable
              style={styles.linkBtn}
              onPress={() => Linking.openURL('tel:1767')}
              accessibilityRole="link"
              accessibilityLabel="Call Samaritans of Singapore 24-hour hotline 1 7 6 7"
            >
              <Text style={styles.linkTitle}>Samaritans of Singapore (SOS)</Text>
              <Text style={styles.linkHint}>24-hour hotline · 1767</Text>
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={() => Linking.openURL('https://wa.me/6591511767')}
              accessibilityRole="link"
              accessibilityLabel="Open SOS CareText on WhatsApp"
            >
              <Text style={styles.linkTitle}>SOS CareText</Text>
              <Text style={styles.linkHint}>WhatsApp · 9151 1767</Text>
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={() => Linking.openURL('tel:63214377')}
              accessibilityRole="link"
              accessibilityLabel="Call eating disorder support at Singapore General Hospital"
            >
              <Text style={styles.linkTitle}>Eating disorder support</Text>
              <Text style={styles.linkHint}>
                SGH Eating Disorders Programme · 6321 4377
              </Text>
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={() => Linking.openURL('tel:999')}
              accessibilityRole="link"
              accessibilityLabel="Call 999 police emergency"
            >
              <Text style={styles.linkTitle}>Emergency — 999</Text>
              <Text style={styles.linkHint}>Police</Text>
            </Pressable>

            <Pressable
              style={styles.linkBtn}
              onPress={() => Linking.openURL('tel:995')}
              accessibilityRole="link"
              accessibilityLabel="Call 995 ambulance or fire"
            >
              <Text style={styles.linkTitle}>Emergency — 995</Text>
              <Text style={styles.linkHint}>Ambulance / fire</Text>
            </Pressable>

            <Pressable
              style={styles.close}
              onPress={() => setOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close support resources"
            >
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  chip: {
    position: 'absolute',
    left: spacing.md,
    zIndex: 40,
    minHeight: tapTarget.min,
    minWidth: tapTarget.min,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2F3634',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipCompact: {},
  chipText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: colors.teal,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(47,54,52,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.cream,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  title: {
    fontFamily: 'Nunito_800ExtraBold',
    fontSize: 22,
    color: colors.ink,
  },
  body: {
    marginTop: 8,
    marginBottom: spacing.md,
    fontFamily: 'Nunito_400Regular',
    fontSize: 15,
    lineHeight: 22,
    color: colors.inkSoft,
  },
  linkBtn: {
    minHeight: tapTarget.min,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  linkTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.ink,
  },
  linkHint: {
    marginTop: 2,
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: colors.inkSoft,
  },
  close: {
    marginTop: 8,
    minHeight: tapTarget.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    color: colors.sageDeep,
  },
});
