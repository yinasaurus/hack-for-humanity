/**
 * Clinician dashboard demo-presenter tooling.
 * Enabled when Vite `import.meta.env.DEV` is true, or `VITE_DEMO_MODE=1`.
 */

export const DEMO_PASSWORD = 'demo';

export const DEMO_CLINICIAN = {
  email: 'clinic@demo.local',
  label: 'Clinic',
  blurb: 'Clinician dashboard (clinic-demo patients)',
} as const;

export function isDemoToolsEnabled(): boolean {
  try {
    if (import.meta.env?.VITE_DEMO_MODE === '1') return true;
    if (import.meta.env?.DEV) return true;
  } catch {
    /* non-Vite context */
  }
  return false;
}
