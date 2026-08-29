import type { CharacterDef } from './types';
// @ts-ignore Expo's bundler resolves this sibling without a suffix; the
// explicit suffix keeps the strip-types Node test runner deterministic.
import { CHARACTER_CATALOG, getCharacter } from './characterCatalog.ts';

/** Retired onboarding ids → their closest available catalog animals. */
const LEGACY_PET_TO_CHARACTER: Record<string, string> = {
  cow: 'horse',
  chipmunk: 'fox',
  monkey: 'fox',
  bun: 'rabbit',
  pup: 'horse',
  kit: 'fox',
  bean: 'stork',
  chick: 'parrot',
  otter: 'fox',
};

/**
 * New petType values are one-to-one animal ids. Retired ids stay readable and
 * render through this map. Rabbit and Capybara are selectable catalog animals;
 * the old Hamster id stays directly renderable for saved profiles.
 */
export function characterForPetType(petType?: string): CharacterDef {
  const raw = petType || 'fox';
  const id = LEGACY_PET_TO_CHARACTER[raw] || raw;
  return getCharacter(id) || getCharacter('fox') || CHARACTER_CATALOG[0];
}

export function characterForLiveCompanion(petType?: string): CharacterDef {
  return characterForPetType(petType);
}

/** All characters now support accessories — Fox uses real skeleton bones,
 *  others use synthetic virtual nodes injected at load time. */
export function liveCompanionSupportsBoneOutfits(_petType?: string): boolean {
  return true;
}

/** Shape hint used for accessory placement tuning. */
export function characterShapeHint(petType?: string): 'quadruped' | 'tall_bird' | 'compact_bird' | 'fox' {
  const id = characterForPetType(petType).id;
  if (id === 'fox') return 'fox';
  if (id === 'horse') return 'quadruped';
  if (id === 'flamingo' || id === 'stork') return 'tall_bird';
  return 'compact_bird'; // parrot
}
