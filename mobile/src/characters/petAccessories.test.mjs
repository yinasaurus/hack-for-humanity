import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accessoryFitForSpecies,
  buildAnatomicalHeadFrame,
  placeHeadAccessory,
  SPECIES_ACCESSORY_FIT,
  HEAD_LANDMARK_HINTS,
} from './petAccessories.ts';
import { CHARACTER_CATALOG } from './characterCatalog.ts';

test('every catalog species has a head-fit profile for reusable cosmetics', () => {
  for (const character of CHARACTER_CATALOG) {
    const fit = accessoryFitForSpecies(character.id);
    assert.ok(fit.hat.size > 0.2 && fit.hat.size < 1.2, `${character.id} hat size fraction`);
    assert.ok(fit.face.size > 0.2 && fit.face.size < 1.0, `${character.id} face size fraction`);
    assert.ok(fit.face.forward > 0.2, `${character.id} glasses need forward fraction`);
    assert.ok(fit.hat.forward <= 0.05, `${character.id} hat should sit at/behind crown`);
  }
});

test('cat and rabbit fits differ so accessories adapt across head shapes', () => {
  const cat = SPECIES_ACCESSORY_FIT.cat;
  const rabbit = SPECIES_ACCESSORY_FIT.rabbit;
  const horse = SPECIES_ACCESSORY_FIT.horse;
  assert.notDeepEqual(cat.face, rabbit.face);
  assert.ok(horse.hat.size > cat.hat.size, 'horse head needs a larger hat fraction');
});

test('landmark hints expose head, ears, and muzzle anchors', () => {
  assert.ok(HEAD_LANDMARK_HINTS.head.includes('Head'));
  assert.ok(HEAD_LANDMARK_HINTS.earL.includes('Ear_L'));
  assert.ok(HEAD_LANDMARK_HINTS.earR.includes('Ear_R'));
  assert.ok(HEAD_LANDMARK_HINTS.muzzle.includes('Chin'));
});

test('anatomical frame prefers ear-mid crown and muzzle forward over bone axes', () => {
  const frame = buildAnatomicalHeadFrame({
    head: [0, 1.2, 0.6],
    earL: [-0.2, 1.5, 0.55],
    earR: [0.2, 1.5, 0.55],
    muzzle: [0, 1.05, 0.95],
  });
  assert.ok(frame.span > 0.35);
  assert.ok(Math.abs(frame.crown[0]) < 1e-9);
  assert.ok(frame.crown[1] > frame.origin[1], 'crown sits above head origin');
  assert.ok(frame.forward[2] > 0.4, 'forward points out the muzzle');
  assert.ok(frame.up[1] > 0.4, 'up is mostly world-up after orthonormalize');
});

test('hat seats on crown; glasses sit forward at eye line', () => {
  const frame = buildAnatomicalHeadFrame({
    head: [0, 1.2, 0.6],
    earL: [-0.25, 1.45, 0.58],
    earR: [0.25, 1.45, 0.58],
    muzzle: [0, 1.0, 1.0],
  });
  const hat = placeHeadAccessory('hat', frame, SPECIES_ACCESSORY_FIT.dog.hat);
  const glasses = placeHeadAccessory('face', frame, SPECIES_ACCESSORY_FIT.dog.face);
  assert.ok(hat.position[1] >= frame.crown[1] - 0.05, 'hat near crown height');
  assert.ok(glasses.position[2] > hat.position[2], 'glasses further forward than hat');
  assert.ok(glasses.size > 0.05 && hat.size > 0.05);
});
