/**
 * Shared appearance allowlists (kept in sync with mobile/src/pets.ts).
 * Cosmetics only — never body size / proportions.
 */

export const ALLOWED = {
  petType: ['bun', 'pup', 'kit', 'bean', 'fox', 'chick', 'panda', 'otter'],
  petColor: [
    'peach',
    'honey',
    'mint',
    'sky',
    'lilac',
    'cream',
    'rose',
    'butter',
    'sage',
    'cocoa',
    'cloud',
    'coral',
  ],
  pattern: ['solid', 'freckles', 'patches', 'soft_stripes', 'belly_heart'],
  eyes: ['round', 'sparkle', 'lash', 'dot'],
  hat: [
    'none',
    'bow',
    'flower',
    'beanie',
    'leaf',
    'cloud_hat',
    'beret',
    'crown_soft',
    'headband',
  ],
  face: ['none', 'glasses', 'blush', 'freckle_face', 'star_mark'],
  neck: ['none', 'scarf', 'ribbon', 'bell', 'pearls', 'bandana'],
  held: ['none', 'star', 'heart', 'yarn', 'flower_stem', 'tea', 'book'],
  scene: [
    'sky',
    'sunny_meadow',
    'cozy_nook',
    'quiet_garden',
    'dusk',
    'cloudscape',
    'window',
    'lavender_field',
  ],
  accent: ['none', 'sparkles', 'warm_glow', 'tiny_hearts', 'petals'],
};

export const DEFAULT_APPEARANCE = {
  petName: 'Companion',
  petType: 'bun',
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

export function appearanceFromUser(user = {}) {
  return {
    petName: user.petName || DEFAULT_APPEARANCE.petName,
    petType: ALLOWED.petType.includes(user.petType)
      ? user.petType
      : DEFAULT_APPEARANCE.petType,
    petColor: ALLOWED.petColor.includes(user.petColor)
      ? user.petColor
      : DEFAULT_APPEARANCE.petColor,
    pattern: ALLOWED.pattern.includes(user.pattern)
      ? user.pattern
      : DEFAULT_APPEARANCE.pattern,
    eyes: ALLOWED.eyes.includes(user.eyes) ? user.eyes : DEFAULT_APPEARANCE.eyes,
    hat: ALLOWED.hat.includes(user.hat) ? user.hat : DEFAULT_APPEARANCE.hat,
    face: ALLOWED.face.includes(user.face) ? user.face : DEFAULT_APPEARANCE.face,
    neck: ALLOWED.neck.includes(user.neck) ? user.neck : DEFAULT_APPEARANCE.neck,
    held: ALLOWED.held.includes(user.held) ? user.held : DEFAULT_APPEARANCE.held,
    scene: ALLOWED.scene.includes(user.scene) ? user.scene : DEFAULT_APPEARANCE.scene,
    accent: ALLOWED.accent.includes(user.accent)
      ? user.accent
      : DEFAULT_APPEARANCE.accent,
  };
}

export function applyAppearancePatch(user, body = {}) {
  const fields = [
    'petType',
    'petColor',
    'pattern',
    'eyes',
    'hat',
    'face',
    'neck',
    'held',
    'scene',
    'accent',
  ];
  for (const key of fields) {
    if (body[key] != null && ALLOWED[key].includes(body[key])) {
      user[key] = body[key];
    }
  }
  if (typeof body.petName === 'string') {
    const cleaned = body.petName.trim().slice(0, 24);
    user.petName = cleaned || 'Companion';
  }
}
