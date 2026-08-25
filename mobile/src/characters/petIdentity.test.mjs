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
  assert.equal(listReadyCharacters().some((character) => character.id === 'hamster'), true);
});

test('retired species remain readable as legacy labels', () => {
  for (const pet of LEGACY_PET_TYPES) {
    assert.equal(petTypeLabel(pet.id), pet.label);
  }
});

test('Rabbit is retired from onboarding but still renders for legacy profiles', () => {
  assert.equal(PET_TYPES.some((pet) => pet.id === 'rabbit'), false);
  assert.equal(LEGACY_PET_TYPES.some((pet) => pet.id === 'rabbit'), true);
  const rabbit = getCharacter('rabbit');
  assert.equal(rabbit?.id, 'rabbit');
  assert.equal(rabbit?.proceduralModel, 'rabbit-v2');
  assert.equal(characterForPetType('rabbit').id, 'rabbit');
});

test('Hamster and Capybara are selectable Poly Pizza companions', () => {
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

test('fox and horse use the smoother textured companion model family', () => {
  const fox = getCharacter('fox');
  const horse = getCharacter('horse');
  assert.match(fox?.modelPath || '', /Mesh2Motion.*fox-fox\.glb/i);
  assert.match(horse?.modelPath || '', /Mesh2Motion.*fox-horse\.glb/i);
  assert.equal(horse?.clips.idle, 'Idle');
  assert.equal(horse?.clips.talk, 'Idle');
  assert.equal(horse?.clips.react, 'Run');
});
