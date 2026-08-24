import type { CharacterDef } from './types';
// @ts-ignore Expo's bundler resolves this sibling without a suffix; the
// explicit suffix keeps the strip-types Node test runner deterministic.
import { CHARACTER_CATALOG, getCharacter } from './characterCatalog.ts';

/** Retired onboarding ids → their closest available catalog animals. */
const LEGACY_PET_TO_CHARACTER: Record<string, string> = {
  capybara: 'horse',
  cow: 'horse',
  chipmunk: 'fox',
  monkey: 'fox',
  hamster: 'rabbit',
  bun: 'rabbit',
  pup: 'horse',
  kit: 'fox',
  bean: 'stork',
  chick: 'parrot',
  otter: 'fox',
};

/**
 * New petType values are one-to-one animal ids (including Rabbit). Retired
 * ids stay readable and render through this map; Hamster intentionally falls
 * back to the Rabbit model rather than crashing or showing a bird.
 */
export function characterForPetType(petType?: string): CharacterDef {
  const raw = petType || 'fox';
  const id = LEGACY_PET_TO_CHARACTER[raw] || raw;
  return getCharacter(id) || getCharacter('fox') || CHARACTER_CATALOG[0];
}

export function characterForLiveCompanion(petType?: string): CharacterDef {
  return characterForPetType(petType);
}

export function liveCompanionSupportsBoneOutfits(petType?: string): boolean {
  return characterForPetType(petType).id === 'fox';
}
