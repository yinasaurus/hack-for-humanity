/**
 * Companion appearance and cosmetic wardrobe.
 * Appearance fields never change body size, weight, or proportions. Growth
 * stage sizing is supplied separately by the live 3D renderer.
 */

/**
 * New companions must have a one-to-one identity with the live 3D catalog.
 * Keep this list in lockstep with `characters/characterCatalog.ts`.
 */
export const PET_TYPES = [
  { id: 'fox', label: 'Fox', icon: '🦊', blurb: 'A bright, clever friend' },
  { id: 'horse', label: 'Horse', icon: '🐴', blurb: 'A steady, kind friend' },
  { id: 'parrot', label: 'Parrot', icon: '🦜', blurb: 'A colorful, curious friend' },
  { id: 'flamingo', label: 'Flamingo', icon: '🦩', blurb: 'A graceful, sunny friend' },
  { id: 'stork', label: 'Stork', icon: '🪽', blurb: 'A calm, caring friend' },
  { id: 'dog', label: 'Dog', icon: '🐶', blurb: 'A loyal, sunny friend' },
  { id: 'cat', label: 'Cat', icon: '🐱', blurb: 'A calm, curious friend' },
  { id: 'panda', label: 'Panda', icon: '🐼', blurb: 'A soft, playful friend' },
  { id: 'penguin', label: 'Penguin', icon: '🐧', blurb: 'A cool, caring friend' },
  { id: 'rabbit', label: 'Rabbit', icon: '🐰', blurb: 'A gentle, cozy friend' },
] as const;

export type SelectablePetTypeId = (typeof PET_TYPES)[number]['id'];

/**
 * IDs used by the first prototype. They remain valid/readable for existing
 * profiles, but are intentionally not offered to new patients.
 */
export const LEGACY_PET_TYPES = [
  { id: 'capybara', label: 'Capybara', icon: '🦫', blurb: 'A mellow, easygoing friend' },
  { id: 'cow', label: 'Cow', icon: '🐮', blurb: 'A sweet, steady friend' },
  { id: 'chipmunk', label: 'Chipmunk', icon: '🐿️', blurb: 'A bright, busy friend' },
  { id: 'monkey', label: 'Monkey', icon: '🐒', blurb: 'A cheerful, clever friend' },
  { id: 'hamster', label: 'Hamster', icon: '🐹', blurb: 'A tiny, cozy friend' },
  { id: 'otter', label: 'Otter', icon: '🦦', blurb: 'A warm, playful friend' },
] as const;

export type LegacyPetTypeId = (typeof LEGACY_PET_TYPES)[number]['id'];

/** Older names from the Bun/Pup prototype are also kept renderable. */
export type LegacyPetAliasId = 'bun' | 'pup' | 'kit' | 'bean' | 'chick';
export type PetTypeId = SelectablePetTypeId | LegacyPetTypeId | LegacyPetAliasId;

const LEGACY_ALIAS_LABELS: Record<LegacyPetAliasId, string> = {
  bun: 'Bunny',
  pup: 'Puppy',
  kit: 'Kitten',
  bean: 'Bean',
  chick: 'Chick',
};

export const PET_TYPE_LABELS: Record<string, string> = {
  ...Object.fromEntries(PET_TYPES.map((pet) => [pet.id, pet.label])),
  ...Object.fromEntries(LEGACY_PET_TYPES.map((pet) => [pet.id, pet.label])),
  ...LEGACY_ALIAS_LABELS,
};

/** Patient-safe readable label for stored catalog or legacy IDs. */
export function petTypeLabel(id: string | undefined): string {
  return (id && PET_TYPE_LABELS[id]) || id || 'Companion';
}
export type PetTypeId = (typeof PET_TYPES)[number]['id']
  | 'fox' | 'horse' | 'parrot' | 'flamingo' | 'stork';


export const PET_COLORS = [
  { id: 'peach', label: 'Peach', body: '#F6C6A8', cheek: '#F4A88A', resting: '#D7C4B5' },
  { id: 'honey', label: 'Honey', body: '#E8C48A', cheek: '#E0A86A', resting: '#D4C0A0' },
  { id: 'mint', label: 'Mint', body: '#B8D9C4', cheek: '#8FBF9A', resting: '#B0C4B8' },
  { id: 'sky', label: 'Sky', body: '#B7CFE8', cheek: '#8FB4D9', resting: '#B0BCC8' },
  { id: 'lilac', label: 'Lilac', body: '#D4C2E0', cheek: '#C4A8D4', resting: '#C4B8CC' },
  { id: 'cream', label: 'Cream', body: '#F3E6D4', cheek: '#E8C9B0', resting: '#D9CFC2' },
  { id: 'rose', label: 'Rose', body: '#F0C4C8', cheek: '#E8A0A8', resting: '#D4B8BC' },
  { id: 'butter', label: 'Butter', body: '#F5E6A8', cheek: '#E8D078', resting: '#D8CFA8' },
  { id: 'sage', label: 'Sage', body: '#C5D4B8', cheek: '#A8C090', resting: '#B8C4B0' },
  { id: 'cocoa', label: 'Cocoa', body: '#C4A892', cheek: '#B08870', resting: '#B8A898' },
  { id: 'cloud', label: 'Cloud', body: '#E8EEF4', cheek: '#C8D4E0', resting: '#D0D6DC' },
  { id: 'coral', label: 'Coral', body: '#F2B59A', cheek: '#E89070', resting: '#D8B8A8' },
] as const;

export type PetColorId = (typeof PET_COLORS)[number]['id'];

export const PET_PATTERNS = [
  { id: 'solid', label: 'Solid' },
  { id: 'freckles', label: 'Freckles' },
  { id: 'patches', label: 'Patches' },
  { id: 'soft_stripes', label: 'Soft stripes' },
  { id: 'belly_heart', label: 'Belly heart' },
] as const;

export type PetPatternId = (typeof PET_PATTERNS)[number]['id'];

export const PET_EYES = [
  { id: 'round', label: 'Round' },
  { id: 'sparkle', label: 'Sparkle' },
  { id: 'lash', label: 'Soft lashes' },
  { id: 'dot', label: 'Tiny dots' },
] as const;

export type PetEyesId = (typeof PET_EYES)[number]['id'];

export const PET_HATS = [
  { id: 'none', label: 'None' },
  { id: 'bow', label: 'Bow' },
  { id: 'flower', label: 'Flower' },
  { id: 'beanie', label: 'Beanie' },
  { id: 'leaf', label: 'Leaf' },
  { id: 'cloud_hat', label: 'Cloud' },
  { id: 'beret', label: 'Beret' },
  { id: 'crown_soft', label: 'Soft crown' },
  { id: 'headband', label: 'Headband' },
] as const;

export type PetHatId = (typeof PET_HATS)[number]['id'];

export const PET_FACES = [
  { id: 'none', label: 'None' },
  { id: 'glasses', label: 'Round glasses' },
  { id: 'blush', label: 'Extra blush' },
  { id: 'freckle_face', label: 'Cheek freckles' },
  { id: 'star_mark', label: 'Star mark' },
] as const;

export type PetFaceId = (typeof PET_FACES)[number]['id'];

export const PET_NECKS = [
  { id: 'none', label: 'None' },
  { id: 'scarf', label: 'Scarf' },
  { id: 'ribbon', label: 'Ribbon' },
  { id: 'bell', label: 'Tiny bell' },
  { id: 'pearls', label: 'Soft pearls' },
  { id: 'bandana', label: 'Bandana' },
] as const;

export type PetNeckId = (typeof PET_NECKS)[number]['id'];

export const PET_HELD = [
  { id: 'none', label: 'None' },
  { id: 'star', label: 'Star' },
  { id: 'heart', label: 'Heart' },
  { id: 'yarn', label: 'Yarn ball' },
  { id: 'flower_stem', label: 'Flower' },
  { id: 'tea', label: 'Tiny cup' },
  { id: 'book', label: 'Little book' },
] as const;

export type PetHeldId = (typeof PET_HELD)[number]['id'];

export const PET_SCENES = [
  { id: 'sky', label: 'Soft sky', fill: '#E8F0F6' },
  { id: 'sunny_meadow', label: 'Meadow', fill: '#C8E6D0' },
  { id: 'cozy_nook', label: 'Cozy nook', fill: '#E8D9F0' },
  { id: 'quiet_garden', label: 'Garden', fill: '#D6E8F5' },
  { id: 'dusk', label: 'Dusk', fill: '#F0D8D0' },
  { id: 'cloudscape', label: 'Clouds', fill: '#F4F7FB' },
  { id: 'window', label: 'Window light', fill: '#FFF0E0' },
  { id: 'lavender_field', label: 'Lavender', fill: '#E4D8F0' },
] as const;

export type PetSceneId = (typeof PET_SCENES)[number]['id'];

export const PET_ACCENTS = [
  { id: 'none', label: 'None' },
  { id: 'sparkles', label: 'Sparkles' },
  { id: 'warm_glow', label: 'Warm glow' },
  { id: 'tiny_hearts', label: 'Tiny hearts' },
  { id: 'petals', label: 'Petals' },
] as const;

export type PetAccentId = (typeof PET_ACCENTS)[number]['id'];

export type PetAppearance = {
  petName: string;
  petType: PetTypeId;
  petColor: PetColorId;
  pattern: PetPatternId;
  eyes: PetEyesId;
  hat: PetHatId;
  face: PetFaceId;
  neck: PetNeckId;
  held: PetHeldId;
  scene: PetSceneId;
  accent: PetAccentId;
};

export const DEFAULT_APPEARANCE: PetAppearance = {
  petName: 'Companion',
  petType: 'fox',
  petColor: 'peach',
  pattern: 'solid',
  eyes: 'round',
  hat: 'none',
  face: 'none',
  neck: 'none',
  held: 'none',
  scene: 'sky',
  accent: 'none',
};

export function resolveColor(id: string | undefined) {
  return PET_COLORS.find((c) => c.id === id) || PET_COLORS[0];
}

export function resolveScene(id: string | undefined) {
  return PET_SCENES.find((s) => s.id === id) || PET_SCENES[0];
}

export const APPEARANCE_IDS = {
  petType: PET_TYPES.map((x) => x.id),
  petColor: PET_COLORS.map((x) => x.id),
  pattern: PET_PATTERNS.map((x) => x.id),
  eyes: PET_EYES.map((x) => x.id),
  hat: PET_HATS.map((x) => x.id),
  face: PET_FACES.map((x) => x.id),
  neck: PET_NECKS.map((x) => x.id),
  held: PET_HELD.map((x) => x.id),
  scene: PET_SCENES.map((x) => x.id),
  accent: PET_ACCENTS.map((x) => x.id),
};
