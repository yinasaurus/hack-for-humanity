/**
 * Renderer-neutral specification for Buddi's original seated Rabbit.
 *
 * This module contains no Three.js or WebView code. A renderer owns the small
 * adapter that turns these primitives into meshes, while this spec
 * remains the single source of truth for names, hierarchy, pivots, materials,
 * growth bindings, and accessory anchors.
 */

import type { ProceduralCharacterId } from './types';

/**
 * Renderer-neutral contract shared by every procedural character. The
 * renderer only needs stable names and normalized transforms; species specs
 * specialize the names and channels without requiring renderer branches.
 */
export type ProceduralVector3 = readonly [number, number, number];

export type ProceduralPrimitive =
  | 'group'
  | 'ellipsoid'
  | 'capsule'
  | 'sphere'
  | 'cone'
  | 'cylinder'
  | 'polyhedron'
  | 'box'
  | 'wedge';

export type ProceduralMaterialSpec = {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  /** Preserve intentional polygon planes for low-poly species materials. */
  flatShading?: boolean;
};

export type ProceduralPartSpec = {
  name: string;
  parent: string | null;
  primitive: ProceduralPrimitive;
  material: string | null;
  position: ProceduralVector3;
  scale: ProceduralVector3;
  rotation: ProceduralVector3;
  pivot: ProceduralVector3;
  segments: number;
};

export type ProceduralModelSpec<Id extends ProceduralCharacterId = ProceduralCharacterId> = {
  id: Id;
  coordinateSystem: 'y-up';
  root: string;
  groundY: 0;
  materials: Readonly<Record<string, ProceduralMaterialSpec>>;
  parts: readonly ProceduralPartSpec[];
  motionAnchors: Readonly<Record<string, readonly string[]>>;
  growthTargets: Readonly<Record<string, readonly string[]>>;
  actionTargets: Readonly<Record<string, readonly string[]>>;
  accessoryAnchors: Readonly<Record<string, string>>;
  framing: {
    fit: number;
    groundRadius: number;
    background: string;
    ground: string;
  };
};

export type RabbitVector3 = readonly [number, number, number];

export type RabbitPrimitive = 'group' | 'sphere' | 'cone' | 'polyhedron' | 'box' | 'wedge';

export type RabbitMaterialId =
  | 'fur'
  | 'cream'
  | 'innerEar'
  | 'nose'
  | 'eye'
  | 'catchlight';

export type RabbitPartName =
  | 'RabbitRoot'
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
  | 'EyeHighlight_L'
  | 'EyeHighlight_R'
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
  | 'Tail';

export type RabbitMotionAnchor =
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

export type RabbitGrowthChannel =
  | 'body'
  | 'head'
  | 'muzzle'
  | 'neck'
  | 'legs'
  | 'wings'
  | 'ears'
  | 'tail'
  | 'eyes';

export type RabbitMaterialSpec = {
  color: string;
  roughness: number;
  metalness: number;
  clearcoat: number;
  flatShading?: boolean;
};

export type RabbitPartSpec = {
  /** Stable node name used by growth, choreography, and accessory adapters. */
  name: RabbitPartName;
  parent: RabbitPartName | null;
  primitive: RabbitPrimitive;
  material: RabbitMaterialId | null;
  /** Local pivot/group position in normalized y-up units. */
  position: RabbitVector3;
  /** Primitive dimensions, applied after the renderer creates the shape. */
  scale: RabbitVector3;
  /** Local Euler rotation in radians before action overlays. */
  rotation: RabbitVector3;
  /** Joint origin relative to the part's local group. */
  pivot: RabbitVector3;
  /** Radial/longitudinal topology target; Rabbit deliberately stays faceted. */
  segments: number;
};

export type RabbitProceduralModelSpec = {
  id: Extract<ProceduralCharacterId, 'rabbit-v2'>;
  coordinateSystem: 'y-up';
  root: 'RabbitRoot';
  groundY: 0;
  materials: Readonly<Record<RabbitMaterialId, RabbitMaterialSpec>>;
  parts: readonly RabbitPartSpec[];
  /** One-to-many named targets for procedural actions and motion overlays. */
  motionAnchors: Readonly<Record<RabbitMotionAnchor, readonly RabbitPartName[]>>;
  /** One-to-many target lists for the shared bounded growth channels. */
  growthTargets: Readonly<Record<RabbitGrowthChannel, readonly RabbitPartName[]>>;
  /** Existing overlay actions can use these names without mesh knowledge. */
  actionTargets: Readonly<{
    idle: readonly RabbitPartName[];
    talk: readonly RabbitPartName[];
    wave: readonly RabbitPartName[];
    play: readonly RabbitPartName[];
    curious: readonly RabbitPartName[];
    gentle: readonly RabbitPartName[];
  }>;
  /** Cosmetic attachment points; missing adapter support is safe to ignore. */
  accessoryAnchors: Readonly<{
    head: 'Head';
    neck: 'Neck';
    forelimb: 'ForePaw_L' | 'ForePaw_R';
  }>;
  framing: {
    fit: number;
    groundRadius: number;
    background: string;
    ground: string;
  };
};

const v = (x: number, y: number, z: number): RabbitVector3 => [x, y, z];

const part = (
  name: RabbitPartName,
  parent: RabbitPartName | null,
  primitive: RabbitPrimitive,
  material: RabbitMaterialId | null,
  position: RabbitVector3,
  scale: RabbitVector3,
  pivot: RabbitVector3 = v(0, 0, 0),
  rotation: RabbitVector3 = v(0, 0, 0),
  segments = 8
): RabbitPartSpec => ({
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

/**
 * Ivory low-poly seated silhouette derived from the supplied visual reference:
 * broad rear haunches, upright chest, long planted feet, a wedge-like muzzle,
 * glossy black eyes, and tall leaf ears with charcoal inset planes.
 */
export const RABBIT_PROCEDURAL_MODEL: RabbitProceduralModelSpec = {
  id: 'rabbit-v2',
  coordinateSystem: 'y-up',
  root: 'RabbitRoot',
  groundY: 0,
  materials: {
    fur: { color: '#CFC0A2', roughness: 0.78, metalness: 0, clearcoat: 0.02, flatShading: true },
    cream: { color: '#E6D8BC', roughness: 0.8, metalness: 0, clearcoat: 0.02, flatShading: true },
    innerEar: { color: '#34383A', roughness: 0.66, metalness: 0, clearcoat: 0.04, flatShading: true },
    nose: { color: '#B89D7D', roughness: 0.4, metalness: 0, clearcoat: 0.1, flatShading: true },
    eye: { color: '#101315', roughness: 0.1, metalness: 0, clearcoat: 0.42, flatShading: true },
    catchlight: { color: '#FFF5DE', roughness: 0.08, metalness: 0, clearcoat: 0.34, flatShading: true },
  },
  parts: [
    part('RabbitRoot', null, 'group', null, v(0, 0, 0), v(1, 1, 1), v(0, 0, 0), v(0, -0.42, 0), 1),
    part('Body', 'RabbitRoot', 'polyhedron', 'fur', v(0, 0.78, -0.06), v(0.62, 0.62, 0.5)),
    part('Chest', 'Body', 'polyhedron', 'cream', v(0, 0.08, 0.4), v(0.4, 0.5, 0.27), v(0, -0.17, 0)),
    part('Haunch_L', 'Body', 'polyhedron', 'fur', v(-0.4, -0.14, -0.08), v(0.42, 0.46, 0.43)),
    part('Haunch_R', 'Body', 'polyhedron', 'fur', v(0.4, -0.14, -0.08), v(0.42, 0.46, 0.43)),
    part('Neck', 'Body', 'polyhedron', 'fur', v(0, 0.5, 0.17), v(0.3, 0.32, 0.27), v(0, -0.15, 0)),
    part('Head', 'Neck', 'polyhedron', 'fur', v(0, 0.38, 0.2), v(0.46, 0.34, 0.38), v(0, -0.2, 0)),
    part('Jaw', 'Head', 'wedge', 'cream', v(0, -0.1, 0.39), v(0.34, 0.2, 0.34), v(0, 0.07, -0.08)),
    part('Muzzle_L', 'Jaw', 'polyhedron', 'cream', v(-0.12, -0.035, 0.2), v(0.15, 0.11, 0.15)),
    part('Muzzle_R', 'Jaw', 'polyhedron', 'cream', v(0.12, -0.035, 0.2), v(0.15, 0.11, 0.15)),
    part('Nose', 'Jaw', 'polyhedron', 'nose', v(0, 0.005, 0.38), v(0.055, 0.045, 0.04), v(0, 0, 0), v(0, 0, 0), 6),
    part('Eye_L', 'Head', 'polyhedron', 'eye', v(-0.18, 0.065, 0.34), v(0.06, 0.067, 0.047)),
    part('Eye_R', 'Head', 'polyhedron', 'eye', v(0.18, 0.065, 0.34), v(0.06, 0.067, 0.047)),
    part('EyeHighlight_L', 'Eye_L', 'sphere', 'catchlight', v(-0.025, 0.028, 0.052), v(0.025, 0.025, 0.017), v(0, 0, 0), v(0, 0, 0), 6),
    part('EyeHighlight_R', 'Eye_R', 'sphere', 'catchlight', v(-0.025, 0.028, 0.052), v(0.025, 0.025, 0.017), v(0, 0, 0), v(0, 0, 0), 6),
    part('Ear_L', 'Head', 'cone', 'fur', v(-0.22, 0.59, 0.015), v(0.18, 0.68, 0.085), v(0, -0.3, 0), v(-0.02, 0.55, -0.12), 4),
    part('Ear_R', 'Head', 'cone', 'fur', v(0.22, 0.6, -0.005), v(0.17, 0.66, 0.08), v(0, -0.3, 0), v(0.02, 0.35, 0.065), 4),
    part('InnerEar_L', 'Ear_L', 'cone', 'innerEar', v(0, 0.25, 0.1), v(0.12, 0.51, 0.02), v(0, 0, 0), v(0, 0, 0), 4),
    part('InnerEar_R', 'Ear_R', 'cone', 'innerEar', v(0, 0.245, 0.095), v(0.11, 0.49, 0.02), v(0, 0, 0), v(0, 0, 0), 4),
    part('Forelimb_L', 'Chest', 'box', 'fur', v(-0.21, -0.36, 0.15), v(0.14, 0.3, 0.14), v(0, 0.17, 0), v(-0.08, 0, -0.025)),
    part('Forelimb_R', 'Chest', 'box', 'fur', v(0.21, -0.36, 0.15), v(0.14, 0.3, 0.14), v(0, 0.17, 0), v(-0.08, 0, 0.025)),
    part('ForePaw_L', 'Forelimb_L', 'wedge', 'cream', v(0, -0.33, 0.2), v(0.18, 0.09, 0.3)),
    part('ForePaw_R', 'Forelimb_R', 'wedge', 'cream', v(0, -0.33, 0.2), v(0.18, 0.09, 0.3)),
    part('Hindlimb_L', 'Haunch_L', 'polyhedron', 'fur', v(0, -0.28, 0.04), v(0.29, 0.32, 0.28), v(0, 0.19, 0)),
    part('Hindlimb_R', 'Haunch_R', 'polyhedron', 'fur', v(0, -0.28, 0.04), v(0.29, 0.32, 0.28), v(0, 0.19, 0)),
    part('HindFoot_L', 'Hindlimb_L', 'wedge', 'cream', v(0, -0.28, 0.24), v(0.27, 0.1, 0.36)),
    part('HindFoot_R', 'Hindlimb_R', 'wedge', 'cream', v(0, -0.28, 0.24), v(0.27, 0.1, 0.36)),
    part('Tail', 'Body', 'polyhedron', 'cream', v(0.04, -0.03, -0.53), v(0.17, 0.18, 0.15), v(0, 0.07, 0)),
  ],
  motionAnchors: {
    root: ['RabbitRoot'],
    head: ['Head'],
    jaw: ['Jaw'],
    muzzle: ['Muzzle_L', 'Muzzle_R', 'Nose'],
    neck: ['Neck'],
    ear: ['Ear_L', 'Ear_R'],
    forelimb: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R'],
    hindlimb: ['Hindlimb_L', 'Hindlimb_R', 'HindFoot_L', 'HindFoot_R'],
    tail: ['Tail'],
    eye: ['Eye_L', 'Eye_R', 'EyeHighlight_L', 'EyeHighlight_R'],
  },
  growthTargets: {
    body: ['Body', 'Chest', 'Haunch_L', 'Haunch_R'],
    head: ['Head', 'Jaw'],
    muzzle: ['Muzzle_L', 'Muzzle_R', 'Nose'],
    neck: ['Neck'],
    legs: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Hindlimb_L', 'Hindlimb_R', 'HindFoot_L', 'HindFoot_R'],
    wings: [],
    ears: ['Ear_L', 'Ear_R', 'InnerEar_L', 'InnerEar_R'],
    tail: ['Tail'],
    eyes: ['Eye_L', 'Eye_R', 'EyeHighlight_L', 'EyeHighlight_R'],
  },
  actionTargets: {
    idle: ['Head', 'Ear_L', 'Ear_R', 'Tail'],
    talk: ['Head', 'Jaw', 'Muzzle_L', 'Muzzle_R'],
    wave: ['Forelimb_L', 'ForePaw_L', 'Ear_L', 'Ear_R', 'Tail'],
    play: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Ear_L', 'Ear_R', 'Tail'],
    curious: ['Head', 'Ear_L', 'Ear_R'],
    gentle: ['Head', 'Tail'],
  },
  accessoryAnchors: {
    head: 'Head',
    neck: 'Neck',
    forelimb: 'ForePaw_L',
  },
  framing: {
    fit: 0.6,
    groundRadius: 0.9,
    background: '#F3E6DC',
    ground: '#9A8975',
  },
};

/** Short alias for renderers/tests that prefer a generic model-spec name. */
export const RABBIT_MODEL_SPEC = RABBIT_PROCEDURAL_MODEL;
