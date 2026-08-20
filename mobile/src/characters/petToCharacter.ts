import type { CharacterDef } from './types';
import { CHARACTER_CATALOG, getCharacter } from './characterCatalog';

/** Map KindPlate petType → 3D catalog id */
const PET_TO_CHARACTER: Record<string, string> = {
  fox: 'fox',
  pup: 'horse',
  kit: 'fox',
  bun: 'flamingo',
  bean: 'stork',
  chick: 'parrot',
  panda: 'horse',
  otter: 'fox',
};

export function characterForPetType(petType?: string): CharacterDef {
  const id = (petType && PET_TO_CHARACTER[petType]) || 'fox';
  return getCharacter(id) || CHARACTER_CATALOG[0];
}
