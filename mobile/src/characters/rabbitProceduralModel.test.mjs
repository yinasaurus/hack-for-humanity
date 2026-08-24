import assert from 'node:assert/strict';
import test from 'node:test';
import {
  RABBIT_PROCEDURAL_MODEL,
} from './rabbitProceduralModel.ts';
import { getSpeciesGrowthStagePresentation } from './growthStage.ts';

const REQUIRED_PARTS = [
  'RabbitRoot',
  'Body',
  'Chest',
  'Haunch_L',
  'Haunch_R',
  'Neck',
  'Head',
  'Jaw',
  'Muzzle_L',
  'Muzzle_R',
  'Nose',
  'Eye_L',
  'Eye_R',
  'EyeHighlight_L',
  'EyeHighlight_R',
  'Ear_L',
  'Ear_R',
  'InnerEar_L',
  'InnerEar_R',
  'Forelimb_L',
  'Forelimb_R',
  'ForePaw_L',
  'ForePaw_R',
  'Hindlimb_L',
  'Hindlimb_R',
  'HindFoot_L',
  'HindFoot_R',
  'Tail',
];

const finiteVector = (vector) => vector.every((value) => Number.isFinite(value));

function luma(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test('Rabbit spec has a stable named low-poly hierarchy', () => {
  assert.equal(RABBIT_PROCEDURAL_MODEL.id, 'rabbit-v2');
  assert.equal(RABBIT_PROCEDURAL_MODEL.coordinateSystem, 'y-up');
  assert.equal(RABBIT_PROCEDURAL_MODEL.root, 'RabbitRoot');

  const names = RABBIT_PROCEDURAL_MODEL.parts.map((part) => part.name);
  assert.equal(new Set(names).size, names.length);
  for (const required of REQUIRED_PARTS) assert.ok(names.includes(required), `${required} is missing`);

  const byName = new Map(RABBIT_PROCEDURAL_MODEL.parts.map((part) => [part.name, part]));
  assert.equal(byName.get('RabbitRoot').parent, null);
  for (const part of RABBIT_PROCEDURAL_MODEL.parts) {
    assert.ok(part.parent === null || byName.has(part.parent), `${part.name} has a missing parent`);
    assert.ok(finiteVector(part.position), `${part.name} position is not finite`);
    assert.ok(finiteVector(part.scale), `${part.name} scale is not finite`);
    assert.ok(part.scale.every((value) => value > 0), `${part.name} must have positive dimensions`);
    assert.ok(finiteVector(part.rotation), `${part.name} rotation is not finite`);
    assert.ok(finiteVector(part.pivot), `${part.name} pivot is not finite`);
    assert.ok(part.segments === 1 || (part.segments >= 4 && part.segments <= 10), `${part.name} needs intentional low-poly geometry`);
  }

  for (const name of ['Body', 'Chest', 'Haunch_L', 'Haunch_R', 'Neck', 'Head']) {
    assert.equal(byName.get(name).primitive, 'polyhedron', `${name} must use broad planar facets`);
  }
  assert.equal(byName.get('Jaw').primitive, 'wedge', 'the muzzle must project as one tapered wedge');
  assert.equal(byName.get('Ear_L').primitive, 'cone', 'ears must end in a sharp point');
  assert.equal(byName.get('InnerEar_L').primitive, 'cone', 'inner-ear planes must echo the outer blade');
  assert.equal(byName.get('Forelimb_L').primitive, 'box', 'front legs must read as angular columns');
  assert.equal(byName.get('ForePaw_L').primitive, 'wedge', 'front paws must be long, flat, and tapered');
  assert.equal(byName.get('HindFoot_L').primitive, 'wedge', 'hind feet must be long, flat, and tapered');
  assert.equal(RABBIT_PROCEDURAL_MODEL.parts.some((part) => part.primitive === 'ellipsoid'), false);
  assert.ok(byName.get('Ear_L').scale[1] > byName.get('Head').scale[1], 'ears must read as long and upright');
  assert.ok(RABBIT_PROCEDURAL_MODEL.framing.fit <= 0.65, 'Rabbit must fill the companion stage closely');
  assert.ok(byName.get('Haunch_L').scale[0] > byName.get('Forelimb_L').scale[0] * 2.5, 'rear haunch must dominate the seated silhouette');
  assert.ok(byName.get('HindFoot_L').scale[2] > byName.get('HindFoot_L').scale[1] * 2.5, 'hind feet must be long and planted');
});

test('Rabbit palette matches the ivory reference with charcoal ears and glossy black eyes', () => {
  const { materials, framing } = RABBIT_PROCEDURAL_MODEL;
  assert.equal(materials.fur.color, '#CFC0A2');
  assert.equal(materials.cream.color, '#E6D8BC');
  assert.equal(materials.innerEar.color, '#34383A');
  assert.equal(materials.nose.color, '#B89D7D');
  assert.equal(materials.eye.color, '#101315');
  assert.equal(materials.fur.flatShading, true);
  assert.equal(materials.cream.flatShading, true);
  assert.equal(materials.innerEar.flatShading, true);
  assert.ok(luma(materials.fur.color) - luma(framing.ground) > 0.15);
  assert.ok(luma(materials.catchlight.color) > luma(materials.eye.color) + 0.7);
  assert.ok(materials.eye.roughness < 0.2);
  assert.ok(materials.eye.clearcoat > 0.3);
  assert.equal(materials.eye.metalness, 0);
  assert.ok(materials.nose.roughness <= 0.4);
});

test('Rabbit exposes action, growth, eye, and accessory anchors without topology assumptions', () => {
  const names = new Set(RABBIT_PROCEDURAL_MODEL.parts.map((part) => part.name));
  for (const [anchor, targets] of Object.entries(RABBIT_PROCEDURAL_MODEL.motionAnchors)) {
    assert.ok(anchor);
    assert.ok(targets.length > 0, `${anchor} anchor is empty`);
    for (const target of targets) assert.ok(names.has(target), `${anchor} targets ${target} not in hierarchy`);
  }
  for (const [channel, targets] of Object.entries(RABBIT_PROCEDURAL_MODEL.growthTargets)) {
    assert.ok(channel);
    for (const target of targets) assert.ok(names.has(target), `${channel} targets ${target} not in hierarchy`);
  }
  for (const targets of Object.values(RABBIT_PROCEDURAL_MODEL.actionTargets)) {
    assert.ok(targets.length > 0);
    for (const target of targets) assert.ok(names.has(target), `${target} action target not in hierarchy`);
  }
  assert.deepEqual(RABBIT_PROCEDURAL_MODEL.accessoryAnchors, {
    head: 'Head',
    neck: 'Neck',
    forelimb: 'ForePaw_L',
  });
});

test('Rabbit growth channels resolve to named parts and show monotonic kit-to-grown cues', () => {
  const baby = getSpeciesGrowthStagePresentation('baby', 'rabbit');
  const grown = getSpeciesGrowthStagePresentation('grown', 'rabbit');
  assert.ok(baby.channels.ears < grown.channels.ears);
  assert.ok(baby.channels.legs < grown.channels.legs);
  assert.ok(baby.channels.head > grown.channels.head);
  assert.ok(baby.channels.eyes > grown.channels.eyes);

  const claimedByChannel = new Map();
  for (const [channel, targets] of Object.entries(RABBIT_PROCEDURAL_MODEL.growthTargets)) {
    for (const target of targets) {
      assert.equal(claimedByChannel.has(target), false, `${target} receives more than one growth channel`);
      claimedByChannel.set(target, channel);
    }
  }

  const stages = ['baby', 'little', 'growing', 'playful', 'adventurer', 'grown'];
  for (const stage of stages) {
    const presentation = getSpeciesGrowthStagePresentation(stage, 'rabbit');
    assert.ok(presentation.scale > 0);
    for (const targets of Object.values(RABBIT_PROCEDURAL_MODEL.growthTargets)) {
      for (const target of targets) {
        assert.ok(RABBIT_PROCEDURAL_MODEL.parts.some((part) => part.name === target), `${stage}/${target} missing`);
      }
    }
  }
});
