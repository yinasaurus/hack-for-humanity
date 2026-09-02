import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../AuthContext';
import {
  DEMO_PATIENT_ACCOUNTS,
  canShowDemoAccountSwitcher,
} from '../demoMode';

/**
 * Presenter-only account jumper. Renders nothing unless demo tools are enabled
 * and the current session is a @demo.local account.
 */
export function DemoAccountSwitcher() {
  const insets = useSafeAreaInsets();
  const { user, switchDemoAccount, demoSwitching } = useAuth();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = canShowDemoAccountSwitcher(user?.email);

  const currentEmail = useMemo(
    () => (user?.email || '').toLowerCase(),
    [user?.email]
  );

  if (!visible) return null;

  const onPick = async (email: string) => {
    if (email === currentEmail || demoSwitching) {
      setOpen(false);
      return;
    }
    setError(null);
    try {
      await switchDemoAccount(email);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Switch failed');
    }
  };

  return (
    <>
      <View
        pointerEvents="box-none"
        style={[styles.anchor, { top: Math.max(insets.top, 8) + 4 }]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Demo account switcher"
          onPress={() => setOpen((v) => !v)}
          style={styles.chip}
        >
          {demoSwitching ? (
            <ActivityIndicator color="#E8ECF0" size="small" />
          ) : (
            <Text style={styles.chipText}>Demo ▾</Text>
          )}
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[styles.menu, { top: Math.max(insets.top, 8) + 44 }]}
            // Prevent backdrop press from closing when tapping inside the menu
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.menuTitle}>DEMO ONLY</Text>
            {DEMO_PATIENT_ACCOUNTS.map((account) => {
              const active = account.email === currentEmail;
              return (
                <Pressable
                  key={account.email}
                  disabled={demoSwitching}
                  onPress={() => onPick(account.email)}
                  style={[styles.row, active && styles.rowActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${account.label}`}
                >
                  <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
                    {account.label}
                    {active ? ' · now' : ''}
                  </Text>
                  <Text style={styles.rowBlurb}>{account.blurb}</Text>
                </Pressable>
              );
            })}
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Text style={styles.footer}>Dev/demo builds only · not a product feature</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: 'absolute',
    right: 10,
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
    fontFamily: 'System',
    letterSpacing: 0.3,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  menu: {
    position: 'absolute',
    right: 10,
    width: 260,
    backgroundColor: '#1A1F24',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  menuTitle: {
    color: '#8B939C',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
    marginLeft: 4,
  },
  row: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 2,
  },
  rowActive: {
    backgroundColor: 'rgba(90, 140, 120, 0.28)',
  },
  rowLabel: {
    color: '#F2F4F6',
    fontSize: 14,
    fontWeight: '600',
  },
  rowLabelActive: {
    color: '#B8E0CC',
  },
  rowBlurb: {
    color: '#9AA3AB',
    fontSize: 11,
    marginTop: 2,
  },
  error: {
    color: '#F0A8A8',
    fontSize: 11,
    marginTop: 6,
    marginHorizontal: 4,
  },
  footer: {
    color: '#6B737A',
    fontSize: 9,
    marginTop: 8,
    marginHorizontal: 4,
  },
});
