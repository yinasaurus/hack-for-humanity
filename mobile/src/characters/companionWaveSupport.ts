/**
 * Wave response modes:
 * - paw-wave: Mesh2Motion / bird / penguin rigs with a real forelimb, wing, or flipper
 * - bounce: static Poly Pizza meshes — whole-body vertical greeting (no limb joints)
 *
 * Keep this list in sync with animalChoreography body-greeting species.
 */

/** Rigged companions that animate a real limb on Wave. */
export const PAW_WAVE_SPECIES = new Set([
  'fox',
  'horse',
  'dog',
  'panda',
  'rabbit',
  'parrot',
  'flamingo',
  'stork',
  'penguin',
]);

/**
 * Static meshes with no approved forelimb/wing/flipper joint.
 * Wave uses a short centered bounce instead of a paw raise.
 */
export const WAVE_BOUNCE_SPECIES = [
  'cat',
  'hamster',
  'capybara',
  'koala',
  'bear',
  'raccoon',
  'duck',
  'sheep',
  'seal',
  'sloth',
] as const;

/** @deprecated Prefer WAVE_BOUNCE_SPECIES — kept for older imports/tests. */
export const PAW_WAVE_BLOCKED_STATIC_MESH = ['hamster', 'cat'] as const;

export type CompanionWaveResponse = 'paw-wave' | 'bounce';

export function companionWaveResponse(
  species: string | undefined | null
): CompanionWaveResponse {
  if (!species) return 'bounce';
  if (PAW_WAVE_SPECIES.has(species)) return 'paw-wave';
  return 'bounce';
}

/** True when Wave should drive a limb channel (not the bounce fallback). */
export function companionSupportsPawWave(species: string | undefined | null): boolean {
  return companionWaveResponse(species) === 'paw-wave';
}

export function companionUsesWaveBounce(species: string | undefined | null): boolean {
  return companionWaveResponse(species) === 'bounce';
}
