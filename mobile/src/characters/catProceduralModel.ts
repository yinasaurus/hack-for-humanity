/**
 * Renderer-neutral specification for Buddi's original standing Cat v2.
 *
 * Cat v2 uses the same declarative seam as Rabbit v2: a renderer builds
 * low-poly primitives below named pivots, while growth, action, and accessory
 * code only deal in stable semantic names.
 *
 * Visual authority: warm gold/tan low-poly cat face/ears/tail reference, rebuilt
 * in a standing/walking pose (horizontal torso, four planted legs).
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
  | 'Mouth'
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
  | 'Tail'
  | 'TailTip';

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
  segments = 8
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

/** Warm gold/tan body with pink ear/nose accents — matched to the face reference. */
const CAT_MATERIALS: Readonly<Record<CatMaterialId, ProceduralMaterialSpec>> = {
  fur: { color: '#E0B878', roughness: 0.88, metalness: 0, clearcoat: 0.02, flatShading: true },
  cream: { color: '#F2D4B0', roughness: 0.86, metalness: 0, clearcoat: 0.02, flatShading: true },
  whisker: { color: '#E8D2B0', roughness: 0.75, metalness: 0, clearcoat: 0.02, flatShading: true },
  innerEar: { color: '#E8A090', roughness: 0.8, metalness: 0, clearcoat: 0.04, flatShading: true },
  nose: { color: '#E89A8C', roughness: 0.35, metalness: 0, clearcoat: 0.1, flatShading: true },
  eye: { color: '#101315', roughness: 0.1, metalness: 0, clearcoat: 0.4, flatShading: true },
  pupil: { color: '#0A0B0C', roughness: 0.08, metalness: 0, clearcoat: 0.42, flatShading: true },
  catchlight: { color: '#FFF8EC', roughness: 0.08, metalness: 0, clearcoat: 0.3, flatShading: true },
};

/**
 * Standing gold low-poly cat: horizontal torso, four planted legs, large
 * forward face (black eyes + pink nose + whiskers), upright pink-inset ears,
 * and exactly one tail chain rooted in the rump.
 *
 * Pivot convention: `position` is the mesh center in parent space; `pivot` is
 * the joint offset from that center. Builder places the bone at position+pivot
 * and the mesh at -pivot so joints rotate without detaching shells.
 */
export const CAT_PROCEDURAL_MODEL: CatProceduralModelSpec = {
  id: 'cat-v2',
  coordinateSystem: 'y-up',
  root: 'CatRoot',
  groundY: 0,
  materials: CAT_MATERIALS,
  parts: [
    part('CatRoot', null, 'group', null, v(0, 0, 0), v(1, 1, 1), v(0, 0, 0), v(0, 0.2, 0), 1),

    // Horizontal standing torso — egg-loaf length along Z.
    part('Body', 'CatRoot', 'polyhedron', 'fur', v(0, 0.7, 0), v(0.34, 0.3, 0.66), v(0, 0, 0), v(0, 0, 0), 8),
    part('Chest', 'Body', 'polyhedron', 'fur', v(0, 0.02, 0.46), v(0.3, 0.3, 0.28), v(0, 0, 0), v(0, 0, 0), 8),
    // Haunches merge into the rump (overlap body — never floating side blobs).
    part('Haunch_L', 'Body', 'polyhedron', 'fur', v(-0.2, -0.02, -0.4), v(0.24, 0.28, 0.28), v(0, 0, 0), v(0, 0, 0), 8),
    part('Haunch_R', 'Body', 'polyhedron', 'fur', v(0.2, -0.02, -0.4), v(0.24, 0.28, 0.28), v(0, 0, 0), v(0, 0, 0), 8),

    // Short thick neck bridging into a large round head.
    part('Neck', 'Body', 'polyhedron', 'fur', v(0, 0.18, 0.5), v(0.22, 0.18, 0.2), v(0, -0.06, 0), v(-0.15, 0, 0), 8),
    part('Head', 'Neck', 'polyhedron', 'fur', v(0, 0.24, 0.2), v(0.34, 0.32, 0.34), v(0, -0.12, -0.02), v(0, 0, 0), 8),
    part('Jaw', 'Head', 'polyhedron', 'cream', v(0, -0.1, 0.24), v(0.18, 0.1, 0.16), v(0, 0.04, -0.02), v(0, 0, 0), 8),
    part('Muzzle_L', 'Jaw', 'polyhedron', 'cream', v(-0.06, 0, 0.1), v(0.08, 0.06, 0.08), v(0, 0, 0), v(0, 0, 0), 6),
    part('Muzzle_R', 'Jaw', 'polyhedron', 'cream', v(0.06, 0, 0.1), v(0.08, 0.06, 0.08), v(0, 0, 0), v(0, 0, 0), 6),
    // Pink triangular nose + simple mouth crease.
    part('Nose', 'Jaw', 'cone', 'nose', v(0, 0.02, 0.18), v(0.05, 0.04, 0.04), v(0, 0, 0), v(1.2, 0, 0), 3),
    part('Mouth', 'Jaw', 'box', 'nose', v(0, -0.04, 0.14), v(0.04, 0.01, 0.02), v(0, 0, 0), v(0, 0, 0), 1),

    // Large forward black eyes (reference beady gloss).
    part('Eye_L', 'Head', 'polyhedron', 'eye', v(-0.12, 0.06, 0.32), v(0.085, 0.085, 0.07), v(0, 0, 0), v(0, 0, 0), 8),
    part('Eye_R', 'Head', 'polyhedron', 'eye', v(0.12, 0.06, 0.32), v(0.085, 0.085, 0.07), v(0, 0, 0), v(0, 0, 0), 8),
    part('Pupil_L', 'Eye_L', 'polyhedron', 'pupil', v(0, 0, 0.05), v(0.03, 0.03, 0.02), v(0, 0, 0), v(0, 0, 0), 6),
    part('Pupil_R', 'Eye_R', 'polyhedron', 'pupil', v(0, 0, 0.05), v(0.03, 0.03, 0.02), v(0, 0, 0), v(0, 0, 0), 6),
    part('EyeHighlight_L', 'Pupil_L', 'sphere', 'catchlight', v(-0.01, 0.012, 0.014), v(0.014, 0.014, 0.01), v(0, 0, 0), v(0, 0, 0), 6),
    part('EyeHighlight_R', 'Pupil_R', 'sphere', 'catchlight', v(-0.01, 0.012, 0.014), v(0.014, 0.014, 0.01), v(0, 0, 0), v(0, 0, 0), 6),

    // Thin horizontal whiskers from each cheek.
    part('Whisker_L_1', 'Muzzle_L', 'cylinder', 'whisker', v(-0.1, 0.03, 0.02), v(0.004, 0.12, 0.004), v(0, 0, 0), v(0, 0, -1.45), 6),
    part('Whisker_L_2', 'Muzzle_L', 'cylinder', 'whisker', v(-0.11, 0, 0.02), v(0.004, 0.13, 0.004), v(0, 0, 0), v(0, 0, -1.57), 6),
    part('Whisker_L_3', 'Muzzle_L', 'cylinder', 'whisker', v(-0.1, -0.03, 0.02), v(0.004, 0.12, 0.004), v(0, 0, 0), v(0, 0, -1.7), 6),
    part('Whisker_R_1', 'Muzzle_R', 'cylinder', 'whisker', v(0.1, 0.03, 0.02), v(0.004, 0.12, 0.004), v(0, 0, 0), v(0, 0, 1.45), 6),
    part('Whisker_R_2', 'Muzzle_R', 'cylinder', 'whisker', v(0.11, 0, 0.02), v(0.004, 0.13, 0.004), v(0, 0, 0), v(0, 0, 1.57), 6),
    part('Whisker_R_3', 'Muzzle_R', 'cylinder', 'whisker', v(0.1, -0.03, 0.02), v(0.004, 0.12, 0.004), v(0, 0, 0), v(0, 0, 1.7), 6),

    // Upright triangular ears with pink inner panels, slight outward lean.
    part('Ear_L', 'Head', 'cone', 'fur', v(-0.14, 0.3, -0.04), v(0.12, 0.26, 0.08), v(0, -0.2, 0), v(0.05, 0, -0.18), 3),
    part('Ear_R', 'Head', 'cone', 'fur', v(0.14, 0.3, -0.04), v(0.12, 0.26, 0.08), v(0, -0.2, 0), v(0.05, 0, 0.18), 3),
    part('InnerEar_L', 'Ear_L', 'cone', 'innerEar', v(0, 0.02, 0.055), v(0.07, 0.16, 0.02), v(0, 0, 0), v(0, 0, 0), 3),
    part('InnerEar_R', 'Ear_R', 'cone', 'innerEar', v(0, 0.02, 0.055), v(0.07, 0.16, 0.02), v(0, 0, 0), v(0, 0, 0), 3),

    // Four standing column legs parented to Body — shoulders/hips inside the torso.
    // Box half-height == scale.y; pivot at +scale.y puts the joint at the top.
    // Body at y=0.7 → limb center at -0.35 → bottoms plant at y≈0.
    part('Forelimb_L', 'Body', 'box', 'fur', v(-0.18, -0.35, 0.38), v(0.09, 0.35, 0.09), v(0, 0.35, 0), v(0, 0, 0), 4),
    part('Forelimb_R', 'Body', 'box', 'fur', v(0.18, -0.35, 0.38), v(0.09, 0.35, 0.09), v(0, 0.35, 0), v(0, 0, 0), 4),
    part('ForePaw_L', 'Forelimb_L', 'polyhedron', 'cream', v(0, -0.68, 0.04), v(0.11, 0.07, 0.14), v(0, 0, 0), v(0, 0, 0), 6),
    part('ForePaw_R', 'Forelimb_R', 'polyhedron', 'cream', v(0, -0.68, 0.04), v(0.11, 0.07, 0.14), v(0, 0, 0), v(0, 0, 0), 6),
    // Slight mid-stride offset on hind right for a walking-ready stance.
    part('Hindlimb_L', 'Body', 'box', 'fur', v(-0.16, -0.34, -0.36), v(0.1, 0.34, 0.1), v(0, 0.34, 0), v(0, 0, 0), 4),
    part('Hindlimb_R', 'Body', 'box', 'fur', v(0.16, -0.34, -0.42), v(0.1, 0.34, 0.1), v(0, 0.34, 0), v(0, 0, 0), 4),
    part('HindFoot_L', 'Hindlimb_L', 'polyhedron', 'cream', v(0, -0.66, 0.06), v(0.12, 0.07, 0.16), v(0, 0, 0), v(0, 0, 0), 6),
    part('HindFoot_R', 'Hindlimb_R', 'polyhedron', 'cream', v(0, -0.66, 0.06), v(0.12, 0.07, 0.16), v(0, 0, 0), v(0, 0, 0), 6),

    // Exactly one tail: root + tip along -Z, slight upward curve, rooted in rump.
    part('Tail', 'Body', 'polyhedron', 'fur', v(0, 0.14, -0.82), v(0.07, 0.08, 0.36), v(0, 0, 0.3), v(0.35, 0, 0), 8),
    part('TailTip', 'Tail', 'polyhedron', 'fur', v(0, 0.04, -0.4), v(0.05, 0.055, 0.22), v(0, 0, 0.16), v(0.25, 0, 0), 8),
  ],
  motionAnchors: {
    root: ['CatRoot'],
    head: ['Head'],
    jaw: ['Jaw'],
    muzzle: ['Muzzle_L', 'Muzzle_R', 'Nose', 'Mouth', 'Whisker_L_1', 'Whisker_L_2', 'Whisker_L_3', 'Whisker_R_1', 'Whisker_R_2', 'Whisker_R_3'],
    neck: ['Neck'],
    ear: ['Ear_L', 'Ear_R'],
    forelimb: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R'],
    hindlimb: ['Hindlimb_L', 'Hindlimb_R', 'HindFoot_L', 'HindFoot_R'],
    tail: ['Tail', 'TailTip'],
    eye: ['Eye_L', 'Eye_R', 'Pupil_L', 'Pupil_R', 'EyeHighlight_L', 'EyeHighlight_R'],
  },
  growthTargets: {
    body: ['Body', 'Chest', 'Haunch_L', 'Haunch_R'],
    head: ['Head', 'Jaw'],
    muzzle: ['Muzzle_L', 'Muzzle_R', 'Nose', 'Mouth', 'Whisker_L_1', 'Whisker_L_2', 'Whisker_L_3', 'Whisker_R_1', 'Whisker_R_2', 'Whisker_R_3'],
    neck: ['Neck'],
    legs: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Hindlimb_L', 'Hindlimb_R', 'HindFoot_L', 'HindFoot_R'],
    wings: [],
    ears: ['Ear_L', 'Ear_R'],
    // Scale only the root tail bone so Tip inherits — never duplicate limbs.
    tail: ['Tail'],
    eyes: ['Eye_L', 'Eye_R', 'Pupil_L', 'Pupil_R', 'EyeHighlight_L', 'EyeHighlight_R'],
  },
  actionTargets: {
    idle: ['Head', 'Ear_L', 'Ear_R', 'Tail', 'TailTip'],
    talk: ['Head', 'Jaw', 'Muzzle_L', 'Muzzle_R', 'Nose', 'Mouth'],
    wave: ['Forelimb_L'],
    play: ['Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Hindlimb_L', 'Hindlimb_R', 'Head', 'Ear_L', 'Ear_R', 'Tail', 'TailTip'],
    curious: ['Head', 'Ear_L', 'Ear_R'],
    gentle: ['Head', 'Jaw', 'Tail', 'TailTip'],
  },
  accessoryAnchors: {
    head: 'Head',
    neck: 'Neck',
    forelimb: 'ForePaw_L',
  },
  framing: {
    fit: 0.9,
    groundRadius: 0.98,
    background: '#F5EDE0',
    ground: '#C4B49A',
  },
};

/** Stable alias for generic renderer adapters and catalog tests. */
export const CAT_MODEL_SPEC = CAT_PROCEDURAL_MODEL;
