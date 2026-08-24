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

test('Rabbit is selectable and Hamster legacy records render through Rabbit', () => {
  const rabbit = getCharacter('rabbit');
  assert.equal(rabbit?.id, 'rabbit');
  assert.equal(rabbit?.proceduralModel, 'rabbit-v2');
  assert.equal(rabbit?.modelPath, '');
  assert.equal(rabbit?.modelPath.includes('human-bunny.glb'), false);
  assert.equal(characterForPetType('rabbit').id, 'rabbit');
  assert.equal(characterForPetType('rabbit').proceduralModel, 'rabbit-v2');
  assert.equal(characterForPetType('hamster').id, 'rabbit');
  assert.equal(characterForPetType('hamster').proceduralModel, 'rabbit-v2');
});

test('Cat keeps its selectable identity while using the original Cat v2 seam', () => {
  const cat = getCharacter('cat');
  assert.equal(cat?.id, 'cat');
  assert.equal(cat?.proceduralModel, 'cat-v2');
  assert.equal(cat?.modelPath, '');
  assert.equal(characterForPetType('cat').id, 'cat');
  assert.equal(characterForPetType('cat').proceduralModel, 'cat-v2');
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
