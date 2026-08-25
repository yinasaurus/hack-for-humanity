/**
 * Renderer-neutral specification for Buddi's original seated Rabbit.
 *
 * This module contains no Three.js or WebView code. A renderer owns the small
 * adapter that turns these primitives into meshes, while this spec
 * remains the single source of truth for names, hierarchy, pivots, materials,
 * growth bindings, and accessory anchors.
 *
 * Visual authority: the cream low-poly seated rabbit reference (egg body,
 * diamond ears with charcoal insets, oversized haunches, tucked sitting pose).
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

export type RabbitPrimitive =
  | 'group'
  | 'sphere'
  | 'ellipsoid'
  | 'cone'
  | 'polyhedron'
  | 'box'
  | 'wedge'
  | 'capsule';

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
 * Seated low-poly rabbit matched to the cream faceted reference:
 * egg-like sitting silhouette, oversized rear haunches, large round head,
 * long upright diamond ears with charcoal insets, short blunt snout,
 * front paws tucked under the chest. FlatShading + polyhedron/box only —
 * no smooth ellipsoids, no pink accents, no wolf lean.
 */
export const RABBIT_PROCEDURAL_MODEL: RabbitProceduralModelSpec = {
  id: 'rabbit-v2',
  coordinateSystem: 'y-up',
  root: 'RabbitRoot',
  groundY: 0,
  materials: {
    // Uniform cream body — same hex for fur/cream so the silhouette stays solid.
    fur: { color: '#E8DFC8', roughness: 0.82, metalness: 0, clearcoat: 0.015, flatShading: true },
    cream: { color: '#E8DFC8', roughness: 0.82, metalness: 0, clearcoat: 0.015, flatShading: true },
    innerEar: { color: '#2C3032', roughness: 0.7, metalness: 0, clearcoat: 0.03, flatShading: true },
    nose: { color: '#E8DFC8', roughness: 0.82, metalness: 0, clearcoat: 0.015, flatShading: true },
    eye: { color: '#101315', roughness: 0.12, metalness: 0, clearcoat: 0.28, flatShading: true },
    catchlight: { color: '#F5F0E4', roughness: 0.1, metalness: 0, clearcoat: 0.2, flatShading: true },
  },
  parts: [
    // Slight yaw so the seated rabbit reads three-quarter like the reference.
    part('RabbitRoot', null, 'group', null, v(0, 0, 0), v(1, 1, 1), v(0, 0, 0), v(0, -0.55, 0), 1),

    // Egg loaf — compact, rounded, not a lean torso.
    part('Body', 'RabbitRoot', 'polyhedron', 'fur', v(0, 0.7, -0.02), v(0.5, 0.52, 0.48), v(0, 0, 0), v(0, 0, 0), 8),
    part('Chest', 'Body', 'polyhedron', 'fur', v(0, 0.06, 0.34), v(0.36, 0.4, 0.28), v(0, 0, 0), v(0, 0, 0), 8),

    // Haunches round the seated rear — present, not a cartoon giant butt.
    part('Haunch_L', 'Body', 'polyhedron', 'fur', v(-0.3, -0.04, -0.12), v(0.3, 0.38, 0.34), v(0, 0, 0), v(0, 0, 0), 8),
    part('Haunch_R', 'Body', 'polyhedron', 'fur', v(0.3, -0.04, -0.12), v(0.3, 0.38, 0.34), v(0, 0, 0), v(0, 0, 0), 8),

    // Short neck; large head ~1/3 of the sitting mass.
    part('Neck', 'Body', 'polyhedron', 'fur', v(0, 0.42, 0.2), v(0.3, 0.22, 0.26), v(0, -0.08, 0), v(0, 0, 0), 8),
    part('Head', 'Neck', 'polyhedron', 'fur', v(0, 0.32, 0.18), v(0.42, 0.38, 0.4), v(0, -0.16, 0), v(0, 0, 0), 8),

    // Short blunt snout — cream facets only, no elongated wolf wedge.
    part('Jaw', 'Head', 'polyhedron', 'fur', v(0, -0.08, 0.28), v(0.24, 0.16, 0.2), v(0, 0.04, -0.04), v(0, 0, 0), 8),
    part('Muzzle_L', 'Jaw', 'polyhedron', 'fur', v(-0.07, 0, 0.1), v(0.1, 0.08, 0.09), v(0, 0, 0), v(0, 0, 0), 6),
    part('Muzzle_R', 'Jaw', 'polyhedron', 'fur', v(0.07, 0, 0.1), v(0.1, 0.08, 0.09), v(0, 0, 0), v(0, 0, 0), 6),
    part('Nose', 'Jaw', 'polyhedron', 'nose', v(0, 0.02, 0.18), v(0.04, 0.032, 0.035), v(0, 0, 0), v(0, 0, 0), 6),

    // Dark faceted gem eyes on the front-side of the head.
    part('Eye_L', 'Head', 'polyhedron', 'eye', v(-0.2, 0.04, 0.34), v(0.07, 0.075, 0.05), v(0, 0, 0), v(0, 0.2, 0), 6),
    part('Eye_R', 'Head', 'polyhedron', 'eye', v(0.2, 0.04, 0.34), v(0.07, 0.075, 0.05), v(0, 0, 0), v(0, -0.2, 0), 6),
    part('EyeHighlight_L', 'Eye_L', 'polyhedron', 'catchlight', v(-0.02, 0.02, 0.045), v(0.018, 0.018, 0.012), v(0, 0, 0), v(0, 0, 0), 4),
    part('EyeHighlight_R', 'Eye_R', 'polyhedron', 'catchlight', v(-0.02, 0.02, 0.045), v(0.018, 0.018, 0.012), v(0, 0, 0), v(0, 0, 0), 4),

    // Long upright diamond leaf ears (4-sided cone = flat tip), soft V, charcoal inset.
    // Thin Z keeps them blade-like; mild roll only — not splayed slabs.
    part('Ear_L', 'Head', 'cone', 'fur', v(-0.12, 0.46, -0.04), v(0.11, 0.56, 0.045), v(0, -0.48, 0), v(0.04, 0.12, -0.22), 4),
    part('Ear_R', 'Head', 'cone', 'fur', v(0.12, 0.46, -0.04), v(0.11, 0.56, 0.045), v(0, -0.48, 0), v(0.04, -0.12, 0.22), 4),
    part('InnerEar_L', 'Ear_L', 'cone', 'innerEar', v(0, 0.06, 0.038), v(0.065, 0.4, 0.016), v(0, 0, 0), v(0, 0, 0), 4),
    part('InnerEar_R', 'Ear_R', 'cone', 'innerEar', v(0, 0.06, 0.038), v(0.065, 0.4, 0.016), v(0, 0, 0), v(0, 0, 0), 4),

    // Short angular forearms tucked under the chest.
    part('Forelimb_L', 'Chest', 'box', 'fur', v(-0.14, -0.34, 0.08), v(0.11, 0.28, 0.12), v(0, 0.14, 0), v(-0.12, 0, 0), 4),
    part('Forelimb_R', 'Chest', 'box', 'fur', v(0.14, -0.34, 0.08), v(0.11, 0.28, 0.12), v(0, 0.14, 0), v(-0.12, 0, 0), 4),
    part('ForePaw_L', 'Forelimb_L', 'box', 'fur', v(0, -0.3, 0.1), v(0.13, 0.07, 0.18), v(0, 0, 0), v(0, 0, 0), 4),
    part('ForePaw_R', 'Forelimb_R', 'box', 'fur', v(0, -0.3, 0.1), v(0.13, 0.07, 0.18), v(0, 0, 0), v(0, 0, 0), 4),

    // Hind legs under the haunches + long planted feet (sitting rabbit signature).
    part('Hindlimb_L', 'Haunch_L', 'polyhedron', 'fur', v(0.02, -0.3, 0.06), v(0.22, 0.28, 0.22), v(0, 0.12, 0), v(0, 0, 0), 8),
    part('Hindlimb_R', 'Haunch_R', 'polyhedron', 'fur', v(-0.02, -0.3, 0.06), v(0.22, 0.28, 0.22), v(0, 0.12, 0), v(0, 0, 0), 8),
    part('HindFoot_L', 'Hindlimb_L', 'box', 'fur', v(0, -0.28, 0.18), v(0.16, 0.07, 0.3), v(0, 0, 0), v(0, 0, 0), 4),
    part('HindFoot_R', 'Hindlimb_R', 'box', 'fur', v(0, -0.28, 0.18), v(0.16, 0.07, 0.3), v(0, 0, 0), v(0, 0, 0), 4),

    // Tiny tucked bobtail — barely visible from three-quarter front.
    part('Tail', 'Body', 'polyhedron', 'fur', v(0, 0.02, -0.5), v(0.12, 0.12, 0.12), v(0, 0, 0), v(0, 0, 0), 6),
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
    ears: ['Ear_L', 'Ear_R'],
    tail: ['Tail'],
    eyes: ['Eye_L', 'Eye_R', 'EyeHighlight_L', 'EyeHighlight_R'],
  },
  actionTargets: {
    idle: ['Head', 'Ear_L', 'Ear_R', 'Tail'],
    talk: ['Head', 'Jaw', 'Muzzle_L', 'Muzzle_R'],
    wave: ['Forelimb_L'],
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
    fit: 0.58,
    groundRadius: 0.95,
    background: '#F3E6DC',
    ground: '#9A8975',
  },
};

/** Short alias for renderers/tests that prefer a generic model-spec name. */
export const RABBIT_MODEL_SPEC = RABBIT_PROCEDURAL_MODEL;
