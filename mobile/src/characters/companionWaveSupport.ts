/**
 * Rigged pets wave a limb; static pets use a restrained whole-body greeting.
 */
const PAW_WAVE_READY = new Set([
  'fox',
  'horse',
  'dog',
  'panda',
  // Birds use wing channels when the Mesh2Motion / bird GLB exposes wings.
  'parrot',
  'flamingo',
  'stork',
  'penguin',
  'capybara',
  'rabbit',
  'koala',
  'bear',
  'raccoon',
  'duck',
  'sheep',
  'seal',
  'sloth',
]);

/** Legacy static meshes that still lack an approved greeting. */
export const PAW_WAVE_BLOCKED_STATIC_MESH = [
  'hamster',
  'cat', // bundled Poly Pizza cat is also a static mesh in this build
] as const;

export function companionSupportsPawWave(species: string | undefined | null): boolean {
  if (!species) return false;
  if ((PAW_WAVE_BLOCKED_STATIC_MESH as readonly string[]).includes(species)) return false;
  return PAW_WAVE_READY.has(species);
}
