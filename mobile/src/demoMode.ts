/**
 * Demo-presenter tooling only.
 *
 * Visible when:
 *   - `__DEV__` is true (Expo Go / development builds), OR
 *   - `EXPO_PUBLIC_DEMO_MODE=1` is set explicitly for a staged demo build
 * AND the signed-in user is a seeded `@demo.local` account.
 *
 * Production / release builds without DEMO_MODE never enable this. Non-demo
 * patient emails never see the switcher even inside a dev client.
 */

export const DEMO_PASSWORD = 'demo';

export type DemoPatientAccount = {
  id: string;
  email: string;
  /** Short presenter label */
  label: string;
  /** One-line reminder for the live script */
  blurb: string;
};

export const DEMO_PATIENT_ACCOUNTS: readonly DemoPatientAccount[] = [
  {
    id: 'patient-maya',
    email: 'maya@demo.local',
    label: 'Maya',
    blurb: 'Healthy / engaged + visit note',
  },
  {
    id: 'patient-riley',
    email: 'riley@demo.local',
    label: 'Riley',
    blurb: 'Soft rest (short gap)',
  },
  {
    id: 'patient-jordan',
    email: 'jordan@demo.local',
    label: 'Jordan',
    blurb: 'Long gap / dormant + miss alert',
  },
  {
    id: 'patient-blake',
    email: 'blake@demo.local',
    label: 'Blake',
    blurb: 'Day-5 unlock on next check-in',
  },
  {
    id: 'patient-casey',
    email: 'casey@demo.local',
    label: 'Casey',
    blurb: 'Day-10 cosmetics unlocked',
  },
  {
    id: 'patient-sam',
    email: 'sam@demo.local',
    label: 'Sam',
    blurb: 'Rich digest history + visit note',
  },
] as const;

export const DEMO_CLINICIAN = {
  email: 'clinic@demo.local',
  label: 'Clinic',
  blurb: 'Clinician dashboard',
} as const;

/** True only in Expo/RN development or when EXPO_PUBLIC_DEMO_MODE=1. */
export function isDemoToolsEnabled(): boolean {
  const envFlag =
    typeof process !== 'undefined' &&
    process.env?.EXPO_PUBLIC_DEMO_MODE === '1';
  if (envFlag) return true;
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

export function isDemoLocalEmail(email?: string | null): boolean {
  return Boolean(email && /@demo\.local$/i.test(email.trim()));
}

/** Full gate for the in-app switcher UI. */
export function canShowDemoAccountSwitcher(userEmail?: string | null): boolean {
  return isDemoToolsEnabled() && isDemoLocalEmail(userEmail);
}

export function findDemoPatientAccount(email: string): DemoPatientAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return DEMO_PATIENT_ACCOUNTS.find((a) => a.email === normalized);
}
