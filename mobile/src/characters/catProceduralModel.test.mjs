import assert from 'node:assert/strict';
import test from 'node:test';
import { CAT_PROCEDURAL_MODEL } from './catProceduralModel.ts';

const byName = new Map(CAT_PROCEDURAL_MODEL.parts.map((part) => [part.name, part]));

/** Child mesh AABB in parent-local space (`position` is mesh center). */
function childMeshExtents(part) {
  const [sx, sy, sz] = part.scale;
  const [px, py, pz] = part.position;
  return {
    min: [px - sx, py - sy, pz - sz],
    max: [px + sx, py + sy, pz + sz],
  };
}

/** Parent shell AABB in its own local space (mesh centered at origin). */
function parentLocalExtents(part) {
  const [sx, sy, sz] = part.scale;
  return {
    min: [-sx, -sy, -sz],
    max: [sx, sy, sz],
  };
}

function overlaps1d(aMin, aMax, bMin, bMax) {
  return aMin <= bMax && bMin <= aMax;
}

function boxesOverlap(a, b) {
  return (
    overlaps1d(a.min[0], a.max[0], b.min[0], b.max[0]) &&
    overlaps1d(a.min[1], a.max[1], b.min[1], b.max[1]) &&
    overlaps1d(a.min[2], a.max[2], b.min[2], b.max[2])
  );
}

test('Cat v2 exposes a complete standing gold-cat hierarchy', () => {
  assert.equal(CAT_PROCEDURAL_MODEL.id, 'cat-v2');
  assert.equal(CAT_PROCEDURAL_MODEL.root, 'CatRoot');

  for (const name of [
    'CatRoot', 'Body', 'Chest', 'Neck', 'Head', 'Jaw', 'Muzzle_L', 'Muzzle_R',
    'Nose', 'Mouth', 'Eye_L', 'Eye_R', 'Pupil_L', 'Pupil_R', 'Ear_L', 'Ear_R', 'InnerEar_L', 'InnerEar_R',
    'Whisker_L_1', 'Whisker_L_2', 'Whisker_L_3', 'Whisker_R_1', 'Whisker_R_2', 'Whisker_R_3',
    'Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Hindlimb_L',
    'Hindlimb_R', 'HindFoot_L', 'HindFoot_R', 'Tail', 'TailTip',
  ]) {
    assert.ok(byName.has(name), `missing named Cat v2 part: ${name}`);
  }

  assert.equal(byName.has('TailBase'), false, 'legacy TailBase removed');
  assert.equal(byName.has('TailMid'), false, 'legacy TailMid removed — caused triple-tail look');
  assert.equal(
    CAT_PROCEDURAL_MODEL.parts.filter((part) => /^Tail/.test(part.name)).length,
    2,
    'exactly one Tail + one TailTip'
  );
  assert.equal(
    CAT_PROCEDURAL_MODEL.parts.some((part) => /^Stripe/.test(part.name)),
    false,
    'gold reference has no tabby stripes'
  );

  for (const part of CAT_PROCEDURAL_MODEL.parts) {
    assert.ok(part.parent === null || byName.has(part.parent), `${part.name} has an unknown parent`);
    assert.ok(
      part.segments === 1 || (part.segments >= 3 && part.segments <= 10),
      `${part.name} needs intentional low-poly geometry`
    );
  }
  assert.equal(byName.get('CatRoot')?.parent, null);
  assert.equal(byName.get('TailTip')?.parent, 'Tail');
  assert.equal(byName.get('Tail')?.position[0], 0, 'tail must be centered (no lateral splay)');
  assert.equal(byName.get('TailTip')?.position[0], 0, 'tail tip must stay on the spine axis');
  assert.ok(byName.get('Body').scale[2] > byName.get('Body').scale[1] * 1.9, 'torso should read horizontally (standing)');
  assert.equal(byName.get('Forelimb_L')?.parent, 'Body', 'forelimbs must parent to Body so shoulders stay attached');
  assert.equal(byName.get('Hindlimb_L')?.parent, 'Body', 'hindlimbs must parent to Body so hips stay attached');
  assert.ok(byName.get('Forelimb_L').position[1] < -0.2, 'front legs should hang below the torso');
  assert.ok(byName.get('Hindlimb_L').position[1] < -0.2, 'hind legs should hang below the torso');
  assert.ok(
    byName.get('Tail').scale[2] > byName.get('Tail').scale[0] * 4,
    'tail should be long and tapered'
  );
  assert.ok(byName.get('Tail').position[2] < -0.6, 'tail extends back from the spine, not wrapping the body');
  assert.equal(byName.get('Ear_L').primitive, 'cone', 'ears are upright triangles');
  assert.equal(byName.get('InnerEar_L').material, 'innerEar');
  assert.deepEqual(
    ['Whisker_L_1', 'Whisker_L_2', 'Whisker_L_3'].map((name) => byName.get(name)?.parent),
    ['Muzzle_L', 'Muzzle_L', 'Muzzle_L'],
  );
  assert.deepEqual(
    ['Whisker_R_1', 'Whisker_R_2', 'Whisker_R_3'].map((name) => byName.get(name)?.parent),
    ['Muzzle_R', 'Muzzle_R', 'Muzzle_R'],
  );
  assert.equal(
    CAT_PROCEDURAL_MODEL.parts.filter((part) => part.primitive === 'cylinder').length,
    6,
    'whiskers are the only cylinder geometry and remain explicit named children',
  );
});

test('Cat v2 major parts overlap their parents so nothing levitates', () => {
  const pairs = [
    ['Chest', 'Body'],
    ['Haunch_L', 'Body'],
    ['Haunch_R', 'Body'],
    ['Neck', 'Body'],
    ['Forelimb_L', 'Body'],
    ['Forelimb_R', 'Body'],
    ['Hindlimb_L', 'Body'],
    ['Hindlimb_R', 'Body'],
    ['Tail', 'Body'],
  ];
  for (const [childName, parentName] of pairs) {
    const child = byName.get(childName);
    const parent = byName.get(parentName);
    assert.ok(child && parent);
    assert.equal(child.parent, parentName);
    assert.ok(
      boxesOverlap(childMeshExtents(child), parentLocalExtents(parent)),
      `${childName} must overlap ${parentName} (no floating gap)`
    );
  }

  // Box limbs: paw sits near the distal tip (~ -2 * limb.scale.y in bone space).
  for (const limbName of ['Forelimb_L', 'Forelimb_R', 'Hindlimb_L', 'Hindlimb_R']) {
    const limb = byName.get(limbName);
    const pawName = limbName.startsWith('Fore')
      ? limbName.replace('limb', 'Paw')
      : limbName.replace('limb', 'Foot');
    const paw = byName.get(pawName);
    assert.ok(paw?.parent === limbName, `${pawName} parents to ${limbName}`);
    assert.ok(
      Math.abs(paw.position[1] + 2 * limb.scale[1]) < 0.12,
      `${paw.name} must sit at the limb tip of ${limbName}`
    );
  }

  const ear = byName.get('Ear_L');
  const head = byName.get('Head');
  assert.ok(ear.position[1] < head.scale[1] + 0.08, 'ear base must sit in the skull crown, not float above');
  assert.ok(ear.pivot[1] < 0, 'ear pivot must be below the mesh center so the base anchors into the head');
});

test('Cat v2 face is forward, readable, and matches the gold reference accents', () => {
  const head = byName.get('Head');
  const eyeL = byName.get('Eye_L');
  const nose = byName.get('Nose');
  const mouth = byName.get('Mouth');
  assert.ok(eyeL && head && nose && mouth);
  const headFront = Number(head.scale[2]) + Number(head.pivot[2] || 0);
  assert.ok(
    eyeL.position[2] > headFront * 0.75,
    'eyes must sit near the front of the head shell, not buried inside'
  );
  assert.ok(eyeL.scale[0] > head.scale[0] * 0.2, 'eyes must read as large round beads');
  assert.ok(nose.position[2] > 0.1, 'nose should project on the muzzle');
  assert.equal(mouth.parent, 'Jaw');
  assert.equal(nose.material, 'nose');
  assert.equal(byName.get('InnerEar_L').material, 'innerEar');

  const { fur, cream, innerEar, nose: noseMat, eye } = CAT_PROCEDURAL_MODEL.materials;
  assert.equal(fur.color, '#E0B878');
  assert.equal(cream.color, '#F2D4B0');
  assert.equal(innerEar.color, '#E8A090');
  assert.equal(noseMat.color, '#E89A8C');
  assert.equal(eye.color, '#101315');
  assert.equal(fur.flatShading, true);
  assert.equal(eye.flatShading, true);
  assert.equal(CAT_PROCEDURAL_MODEL.framing.background, '#F5EDE0');
});

test('Cat v2 declares shared motion, growth, and accessory seams', () => {
  assert.deepEqual(CAT_PROCEDURAL_MODEL.motionAnchors.root, ['CatRoot']);
  assert.deepEqual(CAT_PROCEDURAL_MODEL.motionAnchors.tail, ['Tail', 'TailTip']);
  assert.ok(CAT_PROCEDURAL_MODEL.actionTargets.wave.includes('Forelimb_L'));
  assert.equal(CAT_PROCEDURAL_MODEL.actionTargets.wave.length, 1, 'wave rotates only the shoulder pivot');
  assert.ok(!CAT_PROCEDURAL_MODEL.actionTargets.wave.includes('ForePaw_L'), 'paw inherits from Forelimb_L');
  assert.ok(!CAT_PROCEDURAL_MODEL.actionTargets.wave.includes('Tail'));
  assert.ok(CAT_PROCEDURAL_MODEL.actionTargets.play.includes('ForePaw_R'));
  assert.ok(CAT_PROCEDURAL_MODEL.actionTargets.play.includes('TailTip'));
  assert.equal(CAT_PROCEDURAL_MODEL.accessoryAnchors.head, 'Head');
  assert.equal(CAT_PROCEDURAL_MODEL.accessoryAnchors.neck, 'Neck');
  assert.equal(CAT_PROCEDURAL_MODEL.accessoryAnchors.forelimb, 'ForePaw_L');

  const growthNames = Object.values(CAT_PROCEDURAL_MODEL.growthTargets).flat();
  assert.equal(new Set(growthNames).size, growthNames.length, 'growth targets must have one channel');
  assert.deepEqual(CAT_PROCEDURAL_MODEL.growthTargets.tail, ['Tail']);
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.body.includes('Body'));
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.muzzle.includes('Nose'));
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.muzzle.includes('Mouth'));
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.ears.includes('Ear_L'));
  assert.equal(CAT_PROCEDURAL_MODEL.growthTargets.ears.includes('InnerEar_L'), false);
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.eyes.includes('EyeHighlight_R'));
  assert.equal(CAT_PROCEDURAL_MODEL.growthTargets.wings.length, 0, 'cat has no wing channel targets');

  for (const targets of Object.values(CAT_PROCEDURAL_MODEL.actionTargets)) {
    assert.equal(targets.includes('CatRoot'), false, 'actions may not translate the root');
  }
});
