import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import {
  FACE_IMAGES,
  HAT_IMAGES,
  HELD_IMAGES,
  NECK_IMAGES,
  faceStyle,
  hatStyle,
  heldStyle,
  neckStyle,
} from '../accessoryAssets';
import type { PetTypeId } from '../pets';

type Props = {
  size: number;
  petType: PetTypeId;
  hat?: string;
  face?: string;
  neck?: string;
  held?: string;
};

/**
 * A renderer-independent wardrobe layer. Bone-parented 3D accessories still
 * animate where available; this layer guarantees every species visibly wears
 * an unlocked item, including static and differently-rigged models.
 */
export function PetAccessoryOverlay({ size, petType, hat, face, neck, held }: Props) {
  const hatSource = hat && hat !== 'none' ? HAT_IMAGES[hat] : undefined;
  const faceSource = face && face !== 'none' ? FACE_IMAGES[face] : undefined;
  const neckSource = neck && neck !== 'none' ? NECK_IMAGES[neck] : undefined;
  const heldSource = held && held !== 'none' ? HELD_IMAGES[held] : undefined;

  if (!hatSource && !faceSource && !neckSource && !heldSource) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden>
      <View style={[overlayStyles.stage, { width: size, height: size }]}>
        {hatSource ? <Image source={hatSource} resizeMode="contain" style={hatStyle(petType, size)} /> : null}
        {faceSource ? <Image source={faceSource} resizeMode="contain" style={faceStyle(petType, size)} /> : null}
        {neckSource ? <Image source={neckSource} resizeMode="contain" style={neckStyle(petType, size)} /> : null}
        {heldSource ? <Image source={heldSource} resizeMode="contain" style={heldStyle(petType, size)} /> : null}
      </View>
    </View>
  );
}

const overlayStyles = StyleSheet.create({
  stage: {
    alignSelf: 'center',
    position: 'relative',
  },
});
