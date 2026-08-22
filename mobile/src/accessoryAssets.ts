import type { ImageSourcePropType, ImageStyle, StyleProp } from 'react-native';
import type { PetTypeId } from './pets';

export type AccAnchor = {
  top?: number | `${number}%`;
  left?: number | `${number}%`;
  right?: number | `${number}%`;
  bottom?: number | `${number}%`;
  width: number;
  height: number;
  rotate?: string;
};

/** Soft 3D accessory stills layered onto the companion portrait. */
export const HAT_IMAGES: Partial<Record<string, ImageSourcePropType>> = {
  bow: require('../assets/accessories/bow.png'),
  flower: require('../assets/accessories/flower.png'),
  beanie: require('../assets/accessories/beanie.png'),
  crown_soft: require('../assets/accessories/crown_soft.png'),
  // closest visual stand-ins for remaining hat ids
  leaf: require('../assets/accessories/flower.png'),
  cloud_hat: require('../assets/accessories/beanie.png'),
  beret: require('../assets/accessories/beanie.png'),
  headband: require('../assets/accessories/bow.png'),
};

export const FACE_IMAGES: Partial<Record<string, ImageSourcePropType>> = {
  glasses: require('../assets/accessories/glasses.png'),
};

export const NECK_IMAGES: Partial<Record<string, ImageSourcePropType>> = {
  scarf: require('../assets/accessories/scarf.png'),
  ribbon: require('../assets/accessories/bow.png'),
  bandana: require('../assets/accessories/scarf.png'),
  bell: require('../assets/accessories/star.png'),
  pearls: require('../assets/accessories/heart.png'),
};

export const HELD_IMAGES: Partial<Record<string, ImageSourcePropType>> = {
  star: require('../assets/accessories/star.png'),
  heart: require('../assets/accessories/heart.png'),
  yarn: require('../assets/accessories/heart.png'),
  flower_stem: require('../assets/accessories/flower.png'),
  tea: require('../assets/accessories/star.png'),
  book: require('../assets/accessories/star.png'),
};

/** Head / face / paw anchors tuned for the square 3D pet portraits. */
const BASE_HAT: AccAnchor = { top: '2%', left: '28%', width: 0.44, height: 0.3 };
const BASE_FACE: AccAnchor = { top: '34%', left: '26%', width: 0.48, height: 0.22 };
const BASE_NECK: AccAnchor = { top: '52%', left: '22%', width: 0.56, height: 0.28 };
const BASE_HELD: AccAnchor = { top: '58%', right: '2%', width: 0.28, height: 0.28 };

const HAT_BY_TYPE: Partial<Record<PetTypeId, AccAnchor>> = {
  fox: { top: '2%', left: '30%', width: 0.4, height: 0.26 },
  horse: { top: '4%', left: '27%', width: 0.46, height: 0.3 },
  parrot: { top: '8%', left: '28%', width: 0.44, height: 0.28 },
  flamingo: { top: '-2%', left: '28%', width: 0.44, height: 0.28 },
  stork: { top: '6%', left: '26%', width: 0.48, height: 0.32 },
};

export function hatStyle(petType: PetTypeId, imgSize: number): StyleProp<ImageStyle> {
  const a = HAT_BY_TYPE[petType] || BASE_HAT;
  return {
    position: 'absolute',
    top: a.top,
    left: a.left,
    width: imgSize * a.width,
    height: imgSize * a.height,
    zIndex: 4,
  };
}

export function faceStyle(petType: PetTypeId, imgSize: number): StyleProp<ImageStyle> {
  const a = BASE_FACE;
  const bump = petType === 'stork' ? 0.04 : petType === 'parrot' ? 0.02 : 0;
  return {
    position: 'absolute',
    top: typeof a.top === 'string' ? a.top : a.top,
    left: a.left,
    marginTop: imgSize * bump,
    width: imgSize * a.width,
    height: imgSize * a.height,
    zIndex: 5,
  };
}

export function neckStyle(_petType: PetTypeId, imgSize: number): StyleProp<ImageStyle> {
  const a = BASE_NECK;
  return {
    position: 'absolute',
    top: a.top,
    left: a.left,
    width: imgSize * a.width,
    height: imgSize * a.height,
    zIndex: 3,
  };
}

export function heldStyle(_petType: PetTypeId, imgSize: number): StyleProp<ImageStyle> {
  const a = BASE_HELD;
  return {
    position: 'absolute',
    top: a.top,
    right: a.right,
    width: imgSize * a.width,
    height: imgSize * a.height,
    zIndex: 6,
  };
}
