/**
 * Buddi palette — therapist / counsellor professional branding
 * (sage + soft blue-gray + warm cream + deep slate).
 * Inspired by: https://au.pinterest.com/pin/color-palette-for-therapists-psychologists-and-counsellors-professional-branding--563935184608786962/
 */
export const colors = {
  /** Warm ivory page background */
  cream: '#F7F4EF',
  /** Soft blue-gray wash */
  mist: '#E8EEF0',
  /** Pale sage panel */
  sageWash: '#E6EDE8',
  /** Warm sand / taupe */
  sand: '#D9CFC3',
  /** Soft sky blue */
  sky: '#B7C9D1',
  /** Primary calm sage */
  sage: '#8FA396',
  /** Deeper sage for CTAs / brand — bumped for AA contrast on cream/white */
  sageDeep: '#4E6B5A',
  /** Muted teal-blue accent (links, focus) — AA on cream */
  teal: '#3F6A75',
  /** Soft peach kept only for gentle warmth accents */
  peach: '#E5D5C8',
  /** Alias — primary action (was coral; now sage) */
  coral: '#4E6B5A',
  softCoral: '#A8B9AE',
  mint: '#D5E3D9',
  lavender: '#D8DEE3',
  /** Deep slate text — WCAG AA on cream */
  ink: '#2F3634',
  /** Soft body text — darkened for AA on cream (~5.2:1) */
  inkSoft: '#4F5B57',
  white: '#FFFFFF',
  restingBlue: '#C5D0D6',
  happyGlow: '#E8E4D8',
  /** Primary actions — keep ≥4.5:1 on white/cream */
  brand: '#4E6B5A',
  border: 'rgba(143, 163, 150, 0.45)',
  card: 'rgba(255,255,255,0.88)',
};

/** Minimum interactive size (iOS HIG / WCAG target ≈ 44×44) */
export const tapTarget = {
  min: 44,
};

export const gradients = {
  home: ['#F7F4EF', '#E8EEF0', '#E6EDE8'] as const,
  homeResting: ['#E8EEF0', '#DDE5E8', '#D5E0DC'] as const,
  welcome: ['#F7F4EF', '#E8EEF0', '#E6EDE8'] as const,
  customize: ['#F7F4EF', '#EDE8E2', '#E6EDE8'] as const,
  together: ['#E6EDE8', '#E8EEF0', '#F7F4EF'] as const,
  settings: ['#F7F4EF', '#EDE8E2', '#E8EEF0'] as const,
  loading: ['#F7F4EF', '#E6EDE8'] as const,
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 36,
};
