import type { CharacterDef } from './types';
import { CHARACTER_CATALOG, getCharacter } from './characterCatalog';

/** Older Bun/Pup labels → low-poly catalog animals */
const LEGACY_PET_TO_CHARACTER: Record<string, string> = {
  dog: 'horse',
  cat: 'fox',
  capybara: 'horse',
  cow: 'horse',
  chipmunk: 'fox',
  monkey: 'fox',
  rabbit: 'flamingo',
  penguin: 'stork',
  bun: 'flamingo',
  pup: 'horse',
  kit: 'fox',
  bean: 'stork',
  chick: 'parrot',
  panda: 'horse',
  otter: 'fox',
};

/**
 * petType is now the low-poly animal id (fox, horse, parrot, flamingo, stork).
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
