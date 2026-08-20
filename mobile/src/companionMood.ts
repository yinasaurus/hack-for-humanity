/**
 * Companion emotional range — positive-to-neutral only.
 * Hard constraint: never sadness, hunger, disappointment, loneliness, or neediness.
 *
 * Presence (from check-ins, server): happy | resting
 * Presentation (client overlays): waving | excited | curious | sleepy
 */

export const COMPANION_PRESENCE = ['happy', 'resting'] as const;
export type CompanionPresence = (typeof COMPANION_PRESENCE)[number];

export const COMPANION_EXPRESSIONS = [
  'happy',
  'resting',
  'waving',
  'excited',
  'curious',
  'sleepy',
] as const;
export type CompanionExpression = (typeof COMPANION_EXPRESSIONS)[number];

/** Forbidden labels — keep this list for grep / future guards */
export const FORBIDDEN_MOOD_LABELS = [
  'sad',
  'hungry',
  'disappointed',
  'lonely',
  'needy',
  'dying',
  'sick',
  'angry',
  'punish',
  'guilt',
] as const;

export function isCompanionExpression(v: unknown): v is CompanionExpression {
  return typeof v === 'string' && (COMPANION_EXPRESSIONS as readonly string[]).includes(v);
}

export function isQuietBand(expression: CompanionExpression): boolean {
  return expression === 'resting' || expression === 'sleepy' || expression === 'curious';
}

export function isAwakeBand(expression: CompanionExpression): boolean {
  return expression === 'happy' || expression === 'waving' || expression === 'excited';
}

/** Soft accessibility + caption copy — never guilt-coded */
export function expressionCaption(petName: string, expression: CompanionExpression): string {
  const n = petName || 'Your companion';
  switch (expression) {
    case 'waving':
      return `${n} is saying hello`;
    case 'excited':
      return `${n} is glowing with a little celebration`;
    case 'curious':
      return `${n} is looking around softly`;
    case 'sleepy':
      return `${n} is cozy and sleepy`;
    case 'resting':
      return `${n} is resting quietly`;
    case 'happy':
    default:
      return `${n} is glad you are here`;
  }
}

export function expressionA11yLabel(petName: string, expression: CompanionExpression): string {
  return `${petName || 'Companion'}, ${expressionCaption(petName, expression).replace(`${petName || 'Your companion'} is `, '')}`;
}

/**
 * Quiet-band idle rotation: resting ↔ sleepy ↔ curious.
 * Breaks up static resting without introducing neediness.
 */
export function nextQuietIdle(current: CompanionExpression): CompanionExpression {
  if (current === 'curious') return 'sleepy';
  if (current === 'sleepy') return 'resting';
  return 'curious';
}

/**
 * Ambient nap windows (local clock) — ordinary pet behavior, not check-in gated.
 * Midday + late evening soft nap bands.
 */
export function isAmbientNapHour(now = new Date()): boolean {
  const hour = now.getHours();
  return (hour >= 13 && hour < 15) || (hour >= 22 && hour < 24);
}

/**
 * During awake/happy idle: occasionally drift into a short nap, then wake.
 * Deterministic on clock slice so it does not correlate with logging streaks.
 * Returns null when no ambient transition this tick.
 */
export function nextAmbientIdle(
  current: CompanionExpression,
  now = new Date()
): CompanionExpression | null {
  if (current === 'waving' || current === 'excited') return null;

  const minute = now.getMinutes();
  // ~every 3rd 5-minute slice in a nap hour → sleepy; otherwise happy/curious
  const inNapSlot = isAmbientNapHour(now) && minute % 15 < 5;

  if (inNapSlot) {
    if (current === 'sleepy') return null;
    return 'sleepy';
  }

  if (current === 'sleepy') return 'happy';
  // Soft variety while awake — not miss-coded
  if (minute % 10 === 0 && current === 'happy') return 'curious';
  if (minute % 10 === 5 && current === 'curious') return 'happy';
  return null;
}
