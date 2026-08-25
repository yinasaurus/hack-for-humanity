import type { Unlock } from './api';
import type { PetAppearance } from './pets';

export type WardrobeField = 'hat' | 'face' | 'neck' | 'held' | 'scene';

export type WardrobeItem = {
  field: WardrobeField;
  value: string;
  /** Backend keepsake id required to equip this item. Null means available at hello. */
  unlockId: string | null;
};

export const WARDROBE_ITEMS: readonly WardrobeItem[] = [
  { field: 'hat', value: 'none', unlockId: null },
  { field: 'face', value: 'none', unlockId: null },
  { field: 'neck', value: 'none', unlockId: null },
  { field: 'held', value: 'none', unlockId: null },
  { field: 'scene', value: 'sky', unlockId: null },
  { field: 'neck', value: 'scarf', unlockId: 'soft_scarf' },
  { field: 'scene', value: 'sunny_meadow', unlockId: 'sunny_meadow' },
  { field: 'hat', value: 'flower', unlockId: 'flower_crown' },
  { field: 'scene', value: 'cozy_nook', unlockId: 'cozy_nook' },
  { field: 'held', value: 'star', unlockId: 'star_pendant' },
  { field: 'hat', value: 'bow', unlockId: 'ribbon_ball' },
  { field: 'scene', value: 'quiet_garden', unlockId: 'quiet_garden' },
  { field: 'hat', value: 'beanie', unlockId: 'cozy_beanie' },
  { field: 'hat', value: 'party_hat', unlockId: null },
  { field: 'face', value: 'glasses', unlockId: 'round_glasses' },
  { field: 'hat', value: 'crown_soft', unlockId: 'soft_crown' },
  { field: 'held', value: 'heart', unlockId: 'pocket_heart' },
];

const ITEM_BY_KEY = new Map(
  WARDROBE_ITEMS.map((item) => [`${item.field}:${item.value}`, item])
);

export function wardrobeItem(field: WardrobeField, value: string): WardrobeItem | undefined {
  return ITEM_BY_KEY.get(`${field}:${value}`);
}

export function unlockedKeepsakeIds(unlocks: readonly Pick<Unlock, 'id'>[]): Set<string> {
  return new Set(unlocks.map(({ id }) => id));
}

export function canEquipWardrobeItem(
  field: WardrobeField,
  value: string,
  unlockIds: ReadonlySet<string>
): boolean {
  const item = wardrobeItem(field, value);
  return Boolean(item && (item.unlockId == null || unlockIds.has(item.unlockId)));
}

export function wardrobeLabel(appearance: PetAppearance): string {
  const worn = [appearance.hat, appearance.face, appearance.neck, appearance.held]
    .filter((value) => value !== 'none').length;
  return worn ? `${worn} item${worn === 1 ? '' : 's'} worn` : 'A simple look';
}
