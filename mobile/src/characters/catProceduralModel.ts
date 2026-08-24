/**
 * Renderer-neutral specification for Buddi's original seated Cat v2.
 *
 * Cat v2 deliberately uses the same declarative seam as Rabbit v2: a renderer
 * builds smooth primitives below the named pivots, while growth, action, and
 * accessory code only deals in stable semantic names. The model is original
 * to Buddi and is not a traced or imported photo/GLB.
 */

import type {
  ProceduralMaterialSpec,
  ProceduralModelSpec,
  ProceduralPartSpec,
  ProceduralPrimitive,
  ProceduralVector3,
} from './rabbitProceduralModel';

export type CatPartName =
  | 'CatRoot'
  | 'Body'
  | 'Chest'
  | 'Haunch_L'
  | 'Haunch_R'
  | 'Neck'
  | 'Head'
  | 'Jaw'
  | 'Muzzle_L'
  | 'Muzzle_R'
  | 'Nose'
  | 'Eye_L'
  | 'Eye_R'
  | 'Pupil_L'
  | 'Pupil_R'
  | 'EyeHighlight_L'
  | 'EyeHighlight_R'
  | 'Whisker_L_1'
  | 'Whisker_L_2'
  | 'Whisker_L_3'
  | 'Whisker_R_1'
  | 'Whisker_R_2'
  | 'Whisker_R_3'
  | 'Ear_L'
  | 'Ear_R'
  | 'InnerEar_L'
  | 'InnerEar_R'
  | 'Forelimb_L'
  | 'Forelimb_R'
  | 'ForePaw_L'
  | 'ForePaw_R'
  | 'Hindlimb_L'
  | 'Hindlimb_R'
  | 'HindFoot_L'
  | 'HindFoot_R'
  | 'TailBase'
  | 'TailMid'
  | 'TailTip'
  | 'StripeForehead'
  | 'StripeCheek_L'
  | 'StripeCheek_R'
  | 'StripeBody_L_1'
  | 'StripeBody_L_2'
  | 'StripeBody_L_3'
  | 'StripeBody_R_1'
  | 'StripeBody_R_2'
  | 'StripeBody_R_3'
  | 'StripeForeleg_L'
  | 'StripeForeleg_R'
  | 'StripeHindleg_L'
  | 'StripeHindleg_R'
  | 'StripeTailBase'
  | 'StripeTailMid'
  | 'StripeTailTip';

export type CatMotionAnchor =
  | 'root'
  | 'head'
  | 'jaw'
  | 'muzzle'
  | 'neck'
  | 'ear'
  | 'forelimb'
  | 'hindlimb'
  | 'tail'
  | 'eye';

export type CatGrowthChannel =
  | 'body'
  | 'head'
  | 'muzzle'
  | 'neck'
  | 'legs'
  | 'wings'
  | 'ears'
  | 'tail'
  | 'eyes';

export type CatMaterialId =
  | 'fur'
  | 'cream'
  | 'stripe'
  | 'whisker'
  | 'innerEar'
  | 'nose'
  | 'eye'
  | 'pupil'
  | 'catchlight';

/** Species-named aliases keep Cat's public seam as discoverable as Rabbit's. */
export type CatVector3 = ProceduralVector3;
export type CatPrimitive = ProceduralPrimitive;
export type CatMaterialSpec = ProceduralMaterialSpec;
export type CatPartSpec = ProceduralPartSpec;
export type CatProceduralModelSpec = ProceduralModelSpec<'cat-v2'>;

const v = (x: number, y: number, z: number): ProceduralVector3 => [x, y, z];

const part = (
  name: CatPartName,
  parent: CatPartName | null,
  primitive: ProceduralPrimitive,
  material: CatMaterialId | null,
  position: ProceduralVector3,
  scale: ProceduralVector3,
  pivot: ProceduralVector3 = v(0, 0, 0),
  rotation: ProceduralVector3 = v(0, 0, 0),
  segments = 32
): ProceduralPartSpec => ({
  name,
  parent,
  primitive,
  material,
  position,
  scale,
  rotation,
  pivot,
  segments,
});

const CAT_MATERIALS: Readonly<Record<CatMaterialId, ProceduralMaterialSpec>> = {
  fur: { color: '#626A70', roughness: 0.9, metalness: 0, clearcoat: 0.025 },
  cream: { color: '#7E878B', roughness: 0.9, metalness: 0, clearcoat: 0.025 },
  stripe: { color: '#4B5257', roughness: 0.88, metalness: 0, clearcoat: 0.02 },
  whisker: { color: '#ECECE7', roughness: 0.7, metalness: 0, clearcoat: 0.02 },
  innerEar: { color: '#9D7475', roughness: 0.8, metalness: 0, clearcoat: 0.04 },
  nose: { color: '#A86F62', roughness: 0.26, metalness: 0, clearcoat: 0.16 },
  eye: { color: '#B6B04D', roughness: 0.16, metalness: 0, clearcoat: 0.34 },
  pupil: { color: '#111315', roughness: 0.08, metalness: 0, clearcoat: 0.42 },
  catchlight: { color: '#FFFDF4', roughness: 0.08, metalness: 0, clearcoat: 0.32 },
};

/**
 * Standing silver-tabby silhouette derived from the supplied 3D reference:
 * horizontal torso, four grounded legs, narrow adult-feline face, yellow-green
 * irises with vertical pupils, upright ears, long tapered tail, and restrained
 * charcoal stripes. Cosmetic markings never participate in choreography.
 */
export const CAT_PROCEDURAL_MODEL: CatProceduralModelSpec = {
  id: 'cat-v2',
  coordinateSystem: 'y-up',
  root: 'CatRoot',
  groundY: 0,
  materials: CAT_MATERIALS,
  parts: [
    part('CatRoot', null, 'group', null, v(0, 0, 0), v(1, 1, 1), v(0, 0, 0), v(0, 0.18, 0), 1),
    part('Body', 'CatRoot', 'ellipsoid', 'fur', v(0, 0.98, -0.04), v(0.38, 0.34, 0.78)),
    part('Chest', 'Body', 'ellipsoid', 'fur', v(0, 0.01, 0.54), v(0.32, 0.34, 0.34)),
    part('Haunch_L', 'Body', 'ellipsoid', 'fur', v(-0.18, -0.02, -0.47), v(0.27, 0.32, 0.32)),
    part('Haunch_R', 'Body', 'ellipsoid', 'fur', v(0.18, -0.02, -0.47), v(0.27, 0.32, 0.32)),
    part('Neck', 'Body', 'capsule', 'fur', v(0, 0.18, 0.58), v(0.25, 0.32, 0.23), v(0, -0.14, 0), v(-0.12, 0, 0)),
    part('Head', 'Neck', 'ellipsoid', 'fur', v(0, 0.27, 0.24), v(0.29, 0.26, 0.39), v(0, -0.14, -0.06)),
    part('Jaw', 'Head', 'ellipsoid', 'cream', v(0, -0.075, 0.3), v(0.18, 0.09, 0.15), v(0, 0.045, -0.025)),
    part('Muzzle_L', 'Jaw', 'ellipsoid', 'cream', v(-0.072, 0, 0.105), v(0.1, 0.07, 0.1)),
    part('Muzzle_R', 'Jaw', 'ellipsoid', 'cream', v(0.072, 0, 0.105), v(0.1, 0.07, 0.1)),
    part('Nose', 'Jaw', 'sphere', 'nose', v(0, 0.005, 0.34), v(0.052, 0.042, 0.04)),
    part('Whisker_L_1', 'Muzzle_L', 'cylinder', 'whisker', v(-0.085, 0.04, 0.07), v(0.004, 0.13, 0.004), v(0, 0, 0), v(0, -0.18, -0.42)),
    part('Whisker_L_2', 'Muzzle_L', 'cylinder', 'whisker', v(-0.09, 0, 0.07), v(0.004, 0.14, 0.004), v(0, 0, 0), v(0, -0.12, -0.22)),
    part('Whisker_L_3', 'Muzzle_L', 'cylinder', 'whisker', v(-0.085, -0.04, 0.07), v(0.004, 0.13, 0.004), v(0, 0, 0), v(0, -0.08, -0.03)),
    part('Whisker_R_1', 'Muzzle_R', 'cylinder', 'whisker', v(0.085, 0.04, 0.07), v(0.004, 0.13, 0.004), v(0, 0, 0), v(0, 0.18, 0.42)),
    part('Whisker_R_2', 'Muzzle_R', 'cylinder', 'whisker', v(0.09, 0, 0.07), v(0.004, 0.14, 0.004), v(0, 0, 0), v(0, 0.12, 0.22)),
    part('Whisker_R_3', 'Muzzle_R', 'cylinder', 'whisker', v(0.085, -0.04, 0.07), v(0.004, 0.13, 0.004), v(0, 0, 0), v(0, 0.08, 0.03)),
    part('Eye_L', 'Head', 'ellipsoid', 'eye', v(-0.12, 0.05, 0.31), v(0.055, 0.064, 0.028)),
    part('Eye_R', 'Head', 'ellipsoid', 'eye', v(0.12, 0.05, 0.31), v(0.055, 0.064, 0.028)),
    part('Pupil_L', 'Eye_L', 'ellipsoid', 'pupil', v(0, 0, 0.029), v(0.014, 0.049, 0.01)),
    part('Pupil_R', 'Eye_R', 'ellipsoid', 'pupil', v(0, 0, 0.029), v(0.014, 0.049, 0.01)),
    part('EyeHighlight_L', 'Pupil_L', 'sphere', 'catchlight', v(-0.006, 0.018, 0.013), v(0.01, 0.012, 0.008)),
    part('EyeHighlight_R', 'Pupil_R', 'sphere', 'catchlight', v(-0.006, 0.018, 0.013), v(0.01, 0.012, 0.008)),
    part('Ear_L', 'Head', 'cone', 'fur', v(-0.15, 0.28, -0.02), v(0.13, 0.31, 0.1), v(0, -0.13, 0), v(0, 0, -0.07)),
    part('Ear_R', 'Head', 'cone', 'fur', v(0.15, 0.28, -0.02), v(0.13, 0.31, 0.1), v(0, -0.13, 0), v(0, 0, 0.07)),
    part('InnerEar_L', 'Ear_L', 'ellipsoid', 'innerEar', v(0, 0.025, 0.095), v(0.064, 0.19, 0.02)),
    part('InnerEar_R', 'Ear_R', 'ellipsoid', 'innerEar', v(0, 0.025, 0.095), v(0.064, 0.19, 0.02)),
    part('Forelimb_L', 'Chest', 'capsule', 'fur', v(-0.17, -0.48, 0.08), v(0.085, 0.56, 0.085), v(0, 0.24, 0)),
    part('Forelimb_R', 'Chest', 'capsule', 'fur', v(0.17, -0.48, 0.08), v(0.085, 0.56, 0.085), v(0, 0.24, 0)),
    part('ForePaw_L', 'Forelimb_L', 'ellipsoid', 'cream', v(0, -0.72, 0.07), v(0.12, 0.08, 0.17)),
    part('ForePaw_R', 'Forelimb_R', 'ellipsoid', 'cream', v(0, -0.72, 0.07), v(0.12, 0.08, 0.17)),
    part('Hindlimb_L', 'Haunch_L', 'capsule', 'fur', v(0, -0.44, 0.02), v(0.11, 0.52, 0.11), v(0, 0.22, 0)),
    part('Hindlimb_R', 'Haunch_R', 'capsule', 'fur', v(0, -0.44, 0.02), v(0.11, 0.52, 0.11), v(0, 0.22, 0)),
    part('HindFoot_L', 'Hindlimb_L', 'ellipsoid', 'cream', v(0, -0.66, 0.08), v(0.15, 0.09, 0.2)),
    part('HindFoot_R', 'Hindlimb_R', 'ellipsoid', 'cream', v(0, -0.66, 0.08), v(0.15, 0.09, 0.2)),
    part('TailBase', 'Body', 'ellipsoid', 'fur', v(0.14, 0.08, -0.68), v(0.08, 0.09, 0.35), v(0, 0, 0.28), v(0, -0.5, -0.04)),
    part('TailMid', 'TailBase', 'ellipsoid', 'fur', v(0.16, 0.025, -0.4), v(0.068, 0.075, 0.3), v(0, 0, 0.25), v(0, -0.38, -0.04)),
    part('TailTip', 'TailMid', 'ellipsoid', 'fur', v(0.14, 0.03, -0.34), v(0.052, 0.058, 0.24), v(0, 0, 0.2), v(0, -0.28, -0.03)),
    part('StripeForehead', 'Head', 'ellipsoid', 'stripe', v(0, 0.13, 0.36), v(0.026, 0.12, 0.012)),
    part('StripeCheek_L', 'Head', 'ellipsoid', 'stripe', v(-0.29, -0.01, 0.18), v(0.012, 0.035, 0.12), v(0, 0, 0), v(0.18, 0, 0.18)),
    part('StripeCheek_R', 'Head', 'ellipsoid', 'stripe', v(0.29, -0.01, 0.18), v(0.012, 0.035, 0.12), v(0, 0, 0), v(0.18, 0, -0.18)),
    part('StripeBody_L_1', 'Body', 'ellipsoid', 'stripe', v(-0.37, 0.07, 0.24), v(0.012, 0.12, 0.045), v(0, 0, 0), v(-0.2, 0, -0.12)),
    part('StripeBody_L_2', 'Body', 'ellipsoid', 'stripe', v(-0.38, 0.07, 0), v(0.012, 0.13, 0.045)),
    part('StripeBody_L_3', 'Body', 'ellipsoid', 'stripe', v(-0.37, 0.07, -0.24), v(0.012, 0.12, 0.045), v(0, 0, 0), v(0.2, 0, 0.12)),
    part('StripeBody_R_1', 'Body', 'ellipsoid', 'stripe', v(0.37, 0.07, 0.24), v(0.012, 0.12, 0.045), v(0, 0, 0), v(-0.2, 0, 0.12)),
    part('StripeBody_R_2', 'Body', 'ellipsoid', 'stripe', v(0.38, 0.07, 0), v(0.012, 0.13, 0.045)),
    part('StripeBody_R_3', 'Body', 'ellipsoid', 'stripe', v(0.37, 0.07, -0.24), v(0.012, 0.12, 0.045), v(0, 0, 0), v(0.2, 0, -0.12)),
    part('StripeForeleg_L', 'Forelimb_L', 'ellipsoid', 'stripe', v(0, 0.08, 0.105), v(0.085, 0.045, 0.014)),
    part('StripeForeleg_R', 'Forelimb_R', 'ellipsoid', 'stripe', v(0, 0.08, 0.105), v(0.085, 0.045, 0.014)),
    part('StripeHindleg_L', 'Hindlimb_L', 'ellipsoid', 'stripe', v(0, 0.05, 0.145), v(0.11, 0.05, 0.014)),
    part('StripeHindleg_R', 'Hindlimb_R', 'ellipsoid', 'stripe', v(0, 0.05, 0.145), v(0.11, 0.05, 0.014)),
    part('StripeTailBase', 'TailBase', 'ellipsoid', 'stripe', v(0, 0, 0.078), v(0.05, 0.07, 0.012)),
    part('StripeTailMid', 'TailMid', 'ellipsoid', 'stripe', v(0, 0, 0.068), v(0.045, 0.058, 0.01)),
    part('StripeTailTip', 'TailTip', 'ellipsoid', 'stripe', v(0, 0, 0.052), v(0.038, 0.045, 0.008)),
  ],
  motionAnchors: {
    root: ['CatRoot'],
    head: ['Head'],
    jaw: ['Jaw'],
    muzzle: ['Muzzle_L', 'Muzzle_R', 'Nose', 'Whisker_L_1', 'Whisker_L_2', 'Whisker_L_3', 'Whisker_R_1', 'Whisker_R_2', 'Whisker_R_3'],
    neck: ['Neck'],
    ear: ['Ear_L', 'Ear_R', 'InnerEar_L', 'InnerEar_R'],
    forelimb: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R'],
    hindlimb: ['Hindlimb_L', 'Hindlimb_R', 'HindFoot_L', 'HindFoot_R'],
    tail: ['TailBase', 'TailMid', 'TailTip'],
    eye: ['Eye_L', 'Eye_R', 'Pupil_L', 'Pupil_R', 'EyeHighlight_L', 'EyeHighlight_R'],
  },
  growthTargets: {
    body: ['Body', 'Chest', 'Haunch_L', 'Haunch_R'],
    head: ['Head', 'Jaw'],
    muzzle: ['Muzzle_L', 'Muzzle_R', 'Nose', 'Whisker_L_1', 'Whisker_L_2', 'Whisker_L_3', 'Whisker_R_1', 'Whisker_R_2', 'Whisker_R_3'],
    neck: ['Neck'],
    legs: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Hindlimb_L', 'Hindlimb_R', 'HindFoot_L', 'HindFoot_R'],
    wings: [],
    ears: ['Ear_L', 'Ear_R', 'InnerEar_L', 'InnerEar_R'],
    tail: ['TailBase', 'TailMid', 'TailTip', 'StripeTailBase', 'StripeTailMid', 'StripeTailTip'],
    eyes: ['Eye_L', 'Eye_R', 'Pupil_L', 'Pupil_R', 'EyeHighlight_L', 'EyeHighlight_R'],
  },
  actionTargets: {
    idle: ['Head', 'Ear_L', 'Ear_R', 'TailBase', 'TailMid', 'TailTip'],
    talk: ['Head', 'Jaw', 'Muzzle_L', 'Muzzle_R', 'Nose'],
    wave: ['Forelimb_L', 'ForePaw_L', 'Head', 'Ear_L', 'Ear_R', 'TailBase', 'TailMid', 'TailTip'],
    play: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Hindlimb_L', 'Hindlimb_R', 'Head', 'Ear_L', 'Ear_R', 'TailBase', 'TailMid', 'TailTip'],
    curious: ['Head', 'Ear_L', 'Ear_R'],
    gentle: ['Head', 'Jaw', 'TailBase', 'TailMid', 'TailTip'],
  },
  accessoryAnchors: {
    head: 'Head',
    neck: 'Neck',
    forelimb: 'ForePaw_L',
  },
  framing: {
    fit: 0.92,
    groundRadius: 0.96,
    background: '#EEF1F0',
    ground: '#A8AFAE',
  },
};

/** Stable alias for generic renderer adapters and catalog tests. */
export const CAT_MODEL_SPEC = CAT_PROCEDURAL_MODEL;
