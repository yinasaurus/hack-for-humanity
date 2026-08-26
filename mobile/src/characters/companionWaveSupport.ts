/**
 * Paw/wing/flipper wave needs a real joint on the loaded model.
 * Poly Pizza companions are static meshes (synthetic Head/Neck only for accessories).
 * Mesh2Motion + procedural rabbit/cat expose real forelimbs and can wave.
 */
const PAW_WAVE_READY = new Set([
  'fox',
  'horse',
  'dog',
  'panda',
  // Procedural rabbits keep Forelimb_L.
  'rabbit',
  // Birds use wing channels when the Mesh2Motion / bird GLB exposes wings.
  'parrot',
  'flamingo',
  'stork',
  'penguin',
]);

/** Static Poly Pizza companions — Wave is intentionally a no-op until rigged. */
export const PAW_WAVE_BLOCKED_STATIC_MESH = [
  'capybara',
  'hamster',
  'koala',
  'bear',
  'raccoon',
  'duck',
  'sheep',
  'seal',
  'sloth',
  'cat', // bundled Poly Pizza cat is also a static mesh in this build
] as const;

export function companionSupportsPawWave(species: string | undefined | null): boolean {
  if (!species) return false;
  if ((PAW_WAVE_BLOCKED_STATIC_MESH as readonly string[]).includes(species)) return false;
  return PAW_WAVE_READY.has(species);
}
