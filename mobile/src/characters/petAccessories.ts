/**
 * Shared low-poly cosmetic attachments for live animal models.
 *
 * Accessories parent to the head bone so they follow head rotation, but Mesh2Motion
 * (and many other) head bones do NOT use anatomical local axes — local +Y often
 * points along the muzzle. Placement therefore uses landmark-derived anatomical
 * frames (ears / chin / nose) and per-species fits expressed as fractions of the
 * measured head span, not one absolute world offset.
 */

export type AccessorySlot = 'hat' | 'face' | 'neck' | 'held';

export type Vec3 = readonly [number, number, number];

export type AccessoryFit = {
  /** Offset along anatomical up, as a fraction of headSpan. */
  up: number;
  /** Offset along anatomical forward (out of the face), as a fraction of headSpan. */
  forward: number;
  /** Offset along anatomical right, as a fraction of headSpan. */
  right?: number;
  /** World size as a fraction of headSpan. */
  size: number;
  /** Extra pitch (radians) in the anatomical frame — hats tip slightly back. */
  tilt?: number;
};

export type SpeciesAccessoryFit = Record<AccessorySlot, AccessoryFit>;

export type HeadLandmarks = {
  head: Vec3;
  earL?: Vec3 | null;
  earR?: Vec3 | null;
  muzzle?: Vec3 | null;
  crown?: Vec3 | null;
};

export type AnatomicalHeadFrame = {
  origin: Vec3;
  /** Midpoint between ears when available — natural party-hat seat. */
  crown: Vec3;
  up: Vec3;
  forward: Vec3;
  right: Vec3;
  /** Characteristic head width used to scale offsets/size per animal. */
  span: number;
};

/** Landmark name hints tried against the live bone map (order = preference). */
export const HEAD_LANDMARK_HINTS = {
  head: ['Head', 'head', 'b_Head_05', 'Head_Bone', 'Bone.003_03', 'Bone.003'],
  crown: ['Head.tip', 'Head_Tip', 'head_tip'],
  muzzle: ['Chin', 'chin', 'Nose', 'nose', 'Jaw', 'jaw', 'Muzzle', 'muzzle'],
  // Prefer ear *base* joints (ear01) over mid/tip (ear02) so crown sits on the skull.
  earL: [
    'Ear_L',
    'ear_l',
    'EarLeft',
    'LeftEar',
    'ear01.L_04',
    'ear01.L',
    'ear02.L_05',
    'ear02.L',
  ],
  earR: [
    'Ear_R',
    'ear_r',
    'EarRight',
    'RightEar',
    'ear01.R_06',
    'ear01.R',
    'ear02.R_07',
    'ear02.R',
  ],
  neck: ['Neck', 'neck', 'b_Neck_04', 'Spine_4', 'Spine_3', 'Bone.002_02', 'Bone.002'],
} as const;

const DEFAULT_FIT: SpeciesAccessoryFit = {
  hat: { up: 0.12, forward: -0.1, size: 0.48, tilt: 0.18 },
  face: { up: 0.06, forward: 0.48, size: 0.4 },
  neck: { up: -0.15, forward: 0.12, size: 0.42 },
  held: { up: 0.05, forward: 0.2, size: 0.28 },
};

/**
 * Span-relative fits. `size`/`up`/`forward` multiply the live head span so the
 * same party hat / glasses adapt across fox, dog, panda, horse, rabbit, etc.
 */
export const SPECIES_ACCESSORY_FIT: Readonly<Record<string, SpeciesAccessoryFit>> = {
  fox: {
    hat: { up: 0.14, forward: -0.12, size: 0.5, tilt: 0.16 },
    face: { up: 0.04, forward: 0.52, size: 0.42 },
    neck: { up: -0.16, forward: 0.12, size: 0.4 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
  horse: {
    // Narrow ear span — lean on larger size + forward glasses for the long muzzle.
    hat: { up: 0.22, forward: -0.08, size: 0.95, tilt: 0.22 },
    face: { up: 0.02, forward: 0.7, size: 0.72 },
    neck: { up: -0.2, forward: 0.18, size: 0.7 },
    held: { up: 0.05, forward: 0.22, size: 0.35 },
  },
  dog: {
    hat: { up: 0.1, forward: -0.14, size: 0.42, tilt: 0.14 },
    face: { up: 0.02, forward: 0.45, size: 0.36 },
    neck: { up: -0.14, forward: 0.12, size: 0.38 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
  cat: {
    hat: { up: 0.16, forward: -0.08, size: 0.5, tilt: 0.12 },
    face: { up: 0.08, forward: 0.5, size: 0.4 },
    neck: { up: -0.14, forward: 0.12, size: 0.4 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
  panda: {
    hat: { up: 0.14, forward: -0.1, size: 0.58, tilt: 0.12 },
    face: { up: 0.05, forward: 0.5, size: 0.46 },
    neck: { up: -0.16, forward: 0.14, size: 0.48 },
    held: { up: 0.05, forward: 0.2, size: 0.3 },
  },
  penguin: {
    hat: { up: 0.18, forward: -0.05, size: 0.55, tilt: 0.1 },
    face: { up: 0.08, forward: 0.42, size: 0.4 },
    neck: { up: -0.1, forward: 0.1, size: 0.4 },
    held: { up: 0.05, forward: 0.18, size: 0.28 },
  },
  rabbit: {
    // New rigged rabbit: ear01 roots sit close together (narrow span) while ears
    // are tall — use a larger size fraction (like horse) and a low crown seat so
    // the party hat nests between ears instead of floating / clipping tips.
    hat: { up: 0.02, forward: -0.05, size: 0.78, tilt: 0.1 },
    face: { up: 0.1, forward: 0.62, size: 0.55 },
    neck: { up: -0.12, forward: 0.12, size: 0.42 },
    held: { up: 0.05, forward: 0.16, size: 0.26 },
  },
  parrot: {
    hat: { up: 0.16, forward: -0.04, size: 0.58, tilt: 0.08 },
    face: { up: 0.06, forward: 0.48, size: 0.42 },
    neck: { up: -0.12, forward: 0.1, size: 0.4 },
    held: { up: 0.05, forward: 0.18, size: 0.28 },
  },
  flamingo: {
    hat: { up: 0.14, forward: -0.03, size: 0.55, tilt: 0.08 },
    face: { up: 0.05, forward: 0.52, size: 0.4 },
    neck: { up: -0.22, forward: 0.1, size: 0.4 },
    held: { up: 0.05, forward: 0.18, size: 0.26 },
  },
  stork: {
    hat: { up: 0.14, forward: -0.03, size: 0.55, tilt: 0.08 },
    face: { up: 0.05, forward: 0.58, size: 0.42 },
    neck: { up: -0.24, forward: 0.1, size: 0.42 },
    held: { up: 0.05, forward: 0.18, size: 0.26 },
  },
  hamster: {
    hat: { up: 0.12, forward: -0.06, size: 0.55, tilt: 0.12 },
    face: { up: 0.08, forward: 0.52, size: 0.44 },
    neck: { up: -0.12, forward: 0.12, size: 0.4 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
  capybara: {
    hat: { up: 0.12, forward: -0.1, size: 0.52, tilt: 0.14 },
    face: { up: 0.04, forward: 0.5, size: 0.42 },
    neck: { up: -0.14, forward: 0.14, size: 0.45 },
    held: { up: 0.05, forward: 0.2, size: 0.3 },
  },
  koala: {
    hat: { up: 0.12, forward: -0.08, size: 0.52, tilt: 0.12 },
    face: { up: 0.06, forward: 0.5, size: 0.42 },
    neck: { up: -0.14, forward: 0.12, size: 0.42 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
  bear: {
    hat: { up: 0.14, forward: -0.1, size: 0.55, tilt: 0.12 },
    face: { up: 0.05, forward: 0.5, size: 0.44 },
    neck: { up: -0.16, forward: 0.14, size: 0.46 },
    held: { up: 0.05, forward: 0.2, size: 0.3 },
  },
  raccoon: {
    hat: { up: 0.12, forward: -0.1, size: 0.48, tilt: 0.14 },
    face: { up: 0.05, forward: 0.5, size: 0.4 },
    neck: { up: -0.14, forward: 0.12, size: 0.4 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
  duck: {
    hat: { up: 0.14, forward: -0.02, size: 0.55, tilt: 0.08 },
    face: { up: 0.06, forward: 0.55, size: 0.42 },
    neck: { up: -0.12, forward: 0.12, size: 0.4 },
    held: { up: 0.05, forward: 0.18, size: 0.26 },
  },
  sheep: {
    hat: { up: 0.14, forward: -0.1, size: 0.52, tilt: 0.14 },
    face: { up: 0.04, forward: 0.48, size: 0.4 },
    neck: { up: -0.16, forward: 0.14, size: 0.44 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
  seal: {
    // Round head + synthetic landmarks — seat slightly lower, glasses a touch larger.
    hat: { up: 0.1, forward: -0.02, size: 0.58, tilt: 0.08 },
    face: { up: 0.1, forward: 0.52, size: 0.46 },
    neck: { up: -0.1, forward: 0.12, size: 0.42 },
    held: { up: 0.05, forward: 0.18, size: 0.26 },
  },
  sloth: {
    hat: { up: 0.12, forward: -0.06, size: 0.52, tilt: 0.1 },
    face: { up: 0.08, forward: 0.52, size: 0.42 },
    neck: { up: -0.14, forward: 0.12, size: 0.42 },
    held: { up: 0.05, forward: 0.2, size: 0.28 },
  },
};

export function accessoryFitForSpecies(speciesId: string): SpeciesAccessoryFit {
  return SPECIES_ACCESSORY_FIT[speciesId] || DEFAULT_FIT;
}

const vAdd = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vSub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vScale = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
const vDot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vLen = (a: Vec3) => Math.hypot(a[0], a[1], a[2]);
const vNrm = (a: Vec3): Vec3 => {
  const l = vLen(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const vCross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/**
 * Build an anatomical head frame from landmarks. Independent of bone local axes
 * so Mesh2Motion muzzle-aligned Head bones still get crown/eye placement right.
 */
export function buildAnatomicalHeadFrame(landmarks: HeadLandmarks): AnatomicalHeadFrame {
  const head = landmarks.head;
  const earL = landmarks.earL || null;
  const earR = landmarks.earR || null;
  const muzzle = landmarks.muzzle || landmarks.crown || null;

  let span = 0.22;
  let crown: Vec3 = head;
  if (earL && earR) {
    span = Math.max(span, vLen(vSub(earL, earR)));
    crown = vScale(vAdd(earL, earR), 0.5);
  } else if (landmarks.crown) {
    crown = landmarks.crown;
    span = Math.max(span, vLen(vSub(landmarks.crown, head)) * 1.4);
  }
  if (muzzle) {
    span = Math.max(span, vLen(vSub(muzzle, head)) * 1.55);
  }

  let forward: Vec3;
  if (muzzle && vLen(vSub(muzzle, head)) > 1e-5) {
    forward = vNrm(vSub(muzzle, head));
  } else if (landmarks.crown && vLen(vSub(landmarks.crown, head)) > 1e-5) {
    forward = vNrm(vSub(landmarks.crown, head));
  } else {
    forward = [0, 0, 1];
  }

  // Prefer ear-mid as up hint; otherwise world-up orthonormalized against forward.
  let up: Vec3;
  if (earL && earR) {
    const earUp = vSub(crown, head);
    if (vLen(earUp) > 1e-5 && Math.abs(vDot(vNrm(earUp), forward)) < 0.92) {
      up = vNrm(vSub(earUp, vScale(forward, vDot(earUp, forward))));
    } else {
      const worldUp: Vec3 = [0, 1, 0];
      up = vNrm(vSub(worldUp, vScale(forward, vDot(worldUp, forward))));
    }
  } else {
    const worldUp: Vec3 = [0, 1, 0];
    const aligned = Math.abs(vDot(worldUp, forward));
    up =
      aligned > 0.95
        ? vNrm(vSub([0, 0, 1], vScale(forward, vDot([0, 0, 1], forward))))
        : vNrm(vSub(worldUp, vScale(forward, vDot(worldUp, forward))));
  }

  // Right-handed: X = up × forward when Z is forward and Y is up.
  let right = vNrm(vCross(up, forward));
  forward = vNrm(vCross(right, up));
  up = vNrm(vCross(forward, right));
  right = vNrm(vCross(up, forward));

  return { origin: head, crown, up, forward, right, span };
}

export type AccessoryPlacement = {
  position: Vec3;
  size: number;
  tilt: number;
  up: Vec3;
  forward: Vec3;
  right: Vec3;
};

/** Resolve world-space placement for a head-worn slot from an anatomical frame. */
export function placeHeadAccessory(
  slot: 'hat' | 'face',
  frame: AnatomicalHeadFrame,
  fit: AccessoryFit
): AccessoryPlacement {
  const base = slot === 'hat' ? frame.crown : frame.origin;
  // Glasses sit a touch above the head origin toward the crown (eye line).
  const eyeLift: Vec3 =
    slot === 'face' ? vScale(vSub(frame.crown, frame.origin), 0.22) : [0, 0, 0];
  const position = vAdd(
    vAdd(vAdd(base, eyeLift), vScale(frame.up, (fit.up || 0) * frame.span)),
    vAdd(
      vScale(frame.forward, (fit.forward || 0) * frame.span),
      vScale(frame.right, (fit.right || 0) * frame.span)
    )
  );
  return {
    position,
    size: Math.max(0.04, (fit.size || 0.4) * frame.span),
    tilt: fit.tilt || 0,
    up: frame.up,
    forward: frame.forward,
    right: frame.right,
  };
}

/**
 * Neck-worn placement: offsets from a neck-bone world origin, using the same
 * anatomical axes / headSpan as hats & glasses so scarves scale with the head
 * while sitting on an independent neck anchor.
 */
export function placeNeckAccessory(
  neckOrigin: Vec3,
  frame: AnatomicalHeadFrame,
  fit: AccessoryFit
): AccessoryPlacement {
  const position = vAdd(
    neckOrigin,
    vAdd(
      vScale(frame.up, (fit.up || 0) * frame.span),
      vAdd(
        vScale(frame.forward, (fit.forward || 0) * frame.span),
        vScale(frame.right, (fit.right || 0) * frame.span)
      )
    )
  );
  return {
    position,
    size: Math.max(0.04, (fit.size || 0.4) * frame.span),
    tilt: fit.tilt || 0,
    up: frame.up,
    forward: frame.forward,
    right: frame.right,
  };
}

export function cloneAccessoryFit(fit: SpeciesAccessoryFit): SpeciesAccessoryFit {
  return {
    hat: { ...fit.hat },
    face: { ...fit.face },
    neck: { ...fit.neck },
    held: { ...fit.held },
  };
}

function fmtNum(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

function formatFitObject(fit: AccessoryFit): string {
  const parts = [`up: ${fmtNum(fit.up)}`, `forward: ${fmtNum(fit.forward)}`];
  if (fit.right != null && fit.right !== 0) parts.push(`right: ${fmtNum(fit.right)}`);
  parts.push(`size: ${fmtNum(fit.size)}`);
  if (fit.tilt != null && fit.tilt !== 0) parts.push(`tilt: ${fmtNum(fit.tilt)}`);
  return `{ ${parts.join(', ')} }`;
}

/** Snippet matching SPECIES_ACCESSORY_FIT entries in petAccessories.ts. */
export function formatSpeciesFitSnippet(speciesId: string, fit: SpeciesAccessoryFit): string {
  return [
    `  ${speciesId}: {`,
    `    hat: ${formatFitObject(fit.hat)},`,
    `    face: ${formatFitObject(fit.face)},`,
    `    neck: ${formatFitObject(fit.neck)},`,
    `    held: ${formatFitObject(fit.held)},`,
    `  },`,
  ].join('\n');
}

export function formatSlotFitSnippet(
  speciesId: string,
  slot: AccessorySlot,
  fit: AccessoryFit
): string {
  return `  // ${speciesId}.${slot}\n  ${slot}: ${formatFitObject(fit)},`;
}

/** Hats / faces built as reusable low-poly attachments (not per-animal meshes). */
export const LOW_POLY_HATS = ['party_hat', 'beanie', 'bow', 'flower', 'crown_soft'] as const;
export const LOW_POLY_FACES = ['glasses'] as const;
export const LOW_POLY_NECKS = ['scarf'] as const;
