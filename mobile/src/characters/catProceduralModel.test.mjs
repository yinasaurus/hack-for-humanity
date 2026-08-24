import assert from 'node:assert/strict';
import test from 'node:test';
import { CAT_PROCEDURAL_MODEL } from './catProceduralModel.ts';

const byName = new Map(CAT_PROCEDURAL_MODEL.parts.map((part) => [part.name, part]));

test('Cat v2 exposes a complete standing tabby hierarchy', () => {
  assert.equal(CAT_PROCEDURAL_MODEL.id, 'cat-v2');
  assert.equal(CAT_PROCEDURAL_MODEL.root, 'CatRoot');

  for (const name of [
    'CatRoot', 'Body', 'Chest', 'Neck', 'Head', 'Jaw', 'Muzzle_L', 'Muzzle_R',
    'Nose', 'Eye_L', 'Eye_R', 'Pupil_L', 'Pupil_R', 'Ear_L', 'Ear_R', 'InnerEar_L', 'InnerEar_R',
    'Whisker_L_1', 'Whisker_L_2', 'Whisker_L_3', 'Whisker_R_1', 'Whisker_R_2', 'Whisker_R_3',
    'Forelimb_L', 'Forelimb_R', 'ForePaw_L', 'ForePaw_R', 'Hindlimb_L',
    'Hindlimb_R', 'HindFoot_L', 'HindFoot_R', 'TailBase', 'TailMid', 'TailTip',
  ]) {
    assert.ok(byName.has(name), `missing named Cat v2 part: ${name}`);
  }

  for (const part of CAT_PROCEDURAL_MODEL.parts) {
    assert.ok(part.parent === null || byName.has(part.parent), `${part.name} has an unknown parent`);
    assert.ok(part.segments === 1 || part.segments >= 32, `${part.name} needs a smooth primitive`);
  }
  assert.equal(byName.get('CatRoot')?.parent, null);
  assert.equal(byName.get('TailMid')?.parent, 'TailBase');
  assert.equal(byName.get('TailTip')?.parent, 'TailMid');
  assert.ok(byName.get('Body').scale[2] > byName.get('Body').scale[1] * 1.9, 'torso should read horizontally');
  assert.ok(byName.get('Forelimb_L').position[1] < -0.4, 'front legs should extend to the ground');
  assert.ok(byName.get('Hindlimb_L').position[1] < -0.35, 'hind legs should extend to the ground');
  assert.ok(Math.max(byName.get('TailBase').scale[0], byName.get('TailBase').scale[2]) > byName.get('TailBase').scale[1] * 3, 'tail base should be long and tapered');
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

test('Cat v2 palette matches the grey-tabby reference without oversized eyes', () => {
  const { fur, cream, stripe, innerEar, nose, eye, pupil, catchlight } = CAT_PROCEDURAL_MODEL.materials;
  assert.equal(fur.color, '#626A70');
  assert.equal(cream.color, '#7E878B');
  assert.equal(stripe.color, '#4B5257');
  assert.equal(innerEar.color, '#9D7475');
  assert.equal(nose.color, '#A86F62');
  assert.equal(eye.color, '#B6B04D');
  assert.equal(pupil.color, '#111315');
  assert.equal(catchlight.color, '#FFFDF4');
  assert.equal(CAT_PROCEDURAL_MODEL.materials.whisker.color, '#ECECE7');
  assert.ok(eye.clearcoat > fur.clearcoat, 'eyes should receive the only strong gloss');
  assert.ok(byName.get('Eye_L').scale[0] < byName.get('Head').scale[0] * 0.25, 'eyes must not dominate the skull');
  assert.ok(byName.get('Pupil_L').scale[0] < byName.get('Eye_L').scale[0] * 0.35, 'pupils should remain narrow');
  assert.equal(CAT_PROCEDURAL_MODEL.framing.background, '#EEF1F0');
});

test('Cat v2 declares shared motion, growth, and accessory seams', () => {
  assert.deepEqual(CAT_PROCEDURAL_MODEL.motionAnchors.root, ['CatRoot']);
  assert.deepEqual(CAT_PROCEDURAL_MODEL.motionAnchors.tail, ['TailBase', 'TailMid', 'TailTip']);
  assert.ok(CAT_PROCEDURAL_MODEL.actionTargets.wave.includes('ForePaw_L'));
  assert.ok(CAT_PROCEDURAL_MODEL.actionTargets.wave.includes('TailMid'));
  assert.ok(CAT_PROCEDURAL_MODEL.actionTargets.play.includes('ForePaw_R'));
  assert.ok(CAT_PROCEDURAL_MODEL.actionTargets.play.includes('TailTip'));
  assert.equal(CAT_PROCEDURAL_MODEL.accessoryAnchors.head, 'Head');
  assert.equal(CAT_PROCEDURAL_MODEL.accessoryAnchors.neck, 'Neck');
  assert.equal(CAT_PROCEDURAL_MODEL.accessoryAnchors.forelimb, 'ForePaw_L');

  const growthNames = Object.values(CAT_PROCEDURAL_MODEL.growthTargets).flat();
  assert.equal(new Set(growthNames).size, growthNames.length, 'growth targets must have one channel');
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.body.includes('Body'));
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.muzzle.includes('Nose'));
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.muzzle.includes('Whisker_R_3'));
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.ears.includes('InnerEar_L'));
  assert.ok(CAT_PROCEDURAL_MODEL.growthTargets.eyes.includes('EyeHighlight_R'));
  assert.equal(CAT_PROCEDURAL_MODEL.growthTargets.wings.length, 0, 'cat has no wing channel targets');

  for (const targets of Object.values(CAT_PROCEDURAL_MODEL.actionTargets)) {
    assert.equal(targets.includes('CatRoot'), false, 'actions may not translate the root');
  }
});
