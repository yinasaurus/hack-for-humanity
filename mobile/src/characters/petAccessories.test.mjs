import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accessoryFitForSpecies,
  buildAnatomicalHeadFrame,
  placeHeadAccessory,
  placeNeckAccessory,
  formatSpeciesFitSnippet,
  formatSlotFitSnippet,
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
  // Narrow ear-span species need larger size fractions so cosmetics stay readable.
  assert.ok(rabbit.hat.size >= 0.7, 'rabbit hat compensates for close ear roots');
  assert.ok(rabbit.hat.up <= 0.05, 'rabbit hat seats low between tall ears');
  assert.ok(rabbit.face.forward > cat.face.forward, 'rabbit glasses sit further forward');
});

test('landmark hints expose head, ears, and muzzle anchors', () => {
  assert.ok(HEAD_LANDMARK_HINTS.head.includes('Head'));
  assert.ok(HEAD_LANDMARK_HINTS.head.includes('Bone.003_03'));
  assert.ok(HEAD_LANDMARK_HINTS.earL.includes('ear01.L_04'));
  assert.ok(HEAD_LANDMARK_HINTS.earR.includes('ear01.R_06'));
  // Base ear joints are preferred before tip joints.
  assert.ok(
    HEAD_LANDMARK_HINTS.earL.indexOf('ear01.L_04') <
      HEAD_LANDMARK_HINTS.earL.indexOf('ear02.L_05')
  );
  assert.ok(HEAD_LANDMARK_HINTS.muzzle.includes('Chin'));
});

test('rabbit-like narrow ear span still yields readable hat/glasses sizes', () => {
  const frame = buildAnatomicalHeadFrame({
    head: [0, 1.0, 0.5],
    earL: [-0.08, 1.32, 0.45],
    earR: [0.08, 1.32, 0.45],
  });
  const hat = placeHeadAccessory('hat', frame, SPECIES_ACCESSORY_FIT.rabbit.hat);
  const glasses = placeHeadAccessory('face', frame, SPECIES_ACCESSORY_FIT.rabbit.face);
  assert.ok(hat.size >= 0.1, `rabbit hat size ${hat.size}`);
  assert.ok(glasses.size >= 0.08, `rabbit glasses size ${glasses.size}`);
  assert.ok(glasses.position[2] > hat.position[2] - 0.02);
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

test('neck placement offsets from neck origin using head anatomical axes', () => {
  const frame = buildAnatomicalHeadFrame({
    head: [0, 1.2, 0.6],
    earL: [-0.25, 1.45, 0.58],
    earR: [0.25, 1.45, 0.58],
    muzzle: [0, 1.0, 1.0],
  });
  const neckOrigin = [0, 0.95, 0.45];
  const placed = placeNeckAccessory(neckOrigin, frame, SPECIES_ACCESSORY_FIT.dog.neck);
  assert.ok(placed.size > 0.05);
  assert.ok(placed.position[1] < frame.origin[1], 'scarf sits below head origin');
});

test('fit snippets match SPECIES_ACCESSORY_FIT paste shape', () => {
  const snippet = formatSpeciesFitSnippet('rabbit', SPECIES_ACCESSORY_FIT.rabbit);
  assert.match(snippet, /rabbit: \{/);
  assert.match(snippet, /hat: \{ up:/);
  assert.match(snippet, /neck: \{/);
  const slot = formatSlotFitSnippet('rabbit', 'neck', SPECIES_ACCESSORY_FIT.rabbit.neck);
  assert.match(slot, /rabbit\.neck/);
  assert.match(slot, /neck: \{/);
});
