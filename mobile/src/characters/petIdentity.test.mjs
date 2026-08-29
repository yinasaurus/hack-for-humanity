import assert from 'node:assert/strict';
import test from 'node:test';
import {
  LEGACY_PET_TYPES,
  PET_TYPES,
  petTypeLabel,
} from '../pets.ts';
import { getCharacter } from './characterCatalog.ts';
import { listReadyCharacters } from './characterCatalog.ts';
import { characterForPetType } from './petToCharacter.ts';

test('each new onboarding species resolves to its same rendered character', () => {
  const paths = new Set();
  for (const pet of PET_TYPES) {
    const character = getCharacter(pet.id);
    assert.equal(character?.id, pet.id);
    assert.ok(character?.modelPath || character?.proceduralModel, `${pet.id} needs a model source`);
    if (character?.modelPath) {
      assert.equal(paths.has(character.modelPath), false, `${pet.id} must not reuse another species model`);
      paths.add(character.modelPath);
    }
  }
  assert.equal(listReadyCharacters().some((character) => character.id === 'rabbit'), true);
});

test('retired species remain readable as legacy labels', () => {
  for (const pet of LEGACY_PET_TYPES) {
    assert.equal(petTypeLabel(pet.id), pet.label);
  }
});

test('Rabbit is selectable and uses the supplied bundled model', () => {
  assert.equal(PET_TYPES.some((pet) => pet.id === 'rabbit'), true);
  assert.equal(LEGACY_PET_TYPES.some((pet) => pet.id === 'rabbit'), false);
  const rabbit = getCharacter('rabbit');
  assert.equal(rabbit?.id, 'rabbit');
  assert.equal(rabbit?.modelPath, 'bundled:rabbit');
  assert.equal(rabbit?.proceduralModel, undefined);
  assert.equal(characterForPetType('rabbit').id, 'rabbit');
});

test('Hamster remains readable for old saves while Capybara remains selectable', () => {
  assert.equal(PET_TYPES.some((pet) => pet.id === 'hamster'), false);
  assert.equal(LEGACY_PET_TYPES.some((pet) => pet.id === 'hamster'), true);
  assert.equal(characterForPetType('hamster').id, 'hamster');
  assert.match(characterForPetType('hamster').modelPath, /^bundled:hamster$/);
  assert.equal(characterForPetType('capybara').id, 'capybara');
  assert.match(characterForPetType('capybara').modelPath, /^bundled:capybara$/);
});

test('Cat and Sloth are selectable Poly Pizza bundled companions', () => {
  const cat = getCharacter('cat');
  assert.equal(cat?.id, 'cat');
  assert.match(cat?.modelPath || '', /^bundled:cat$/);
  assert.equal(cat?.proceduralModel, undefined);
  assert.equal(characterForPetType('cat').id, 'cat');
  assert.match(characterForPetType('cat').modelPath, /^bundled:cat$/);
  assert.equal(characterForPetType('sloth').id, 'sloth');
  assert.match(characterForPetType('sloth').modelPath, /^bundled:sloth$/);
});

test('Bun legacy records render through Rabbit rather than Flamingo', () => {
  assert.equal(characterForPetType('bun').id, 'rabbit');
});

test('fox stays remote while Horse uses the bundled animated companion', () => {
  const fox = getCharacter('fox');
  const horse = getCharacter('horse');
  assert.match(fox?.modelPath || '', /Mesh2Motion.*fox-fox\.glb/i);
  assert.equal(horse?.modelPath, 'bundled:horse');
  assert.equal(horse?.clips.idle, 'Idle');
  assert.equal(horse?.clips.talk, 'Talk');
  assert.equal(horse?.clips.react, 'Play');
  assert.deepEqual(horse?.actions?.wave, ['Wave']);
  assert.deepEqual(horse?.actions?.play, ['Play']);
  assert.deepEqual(horse?.actions?.curious, ['Curious']);
  assert.deepEqual(horse?.actions?.gentle, ['Gentle']);
});
