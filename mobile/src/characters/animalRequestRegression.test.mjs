import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { getAnimalSoundEntry, animalSoundIsPlayable } from '../audio/animalSounds.ts';
import { PET_TYPES, LEGACY_PET_TYPES } from '../pets.ts';
import { getAnimalChoreography } from './animalChoreography.ts';
import { getCharacter } from './characterCatalog.ts';
import {
  companionSupportsPawWave,
  companionUsesWaveBounce,
  companionWaveResponse,
} from './companionWaveSupport.ts';

const requestedWaveSpecies = [
  'penguin',
  'capybara',
  'rabbit',
  'koala',
  'bear',
  'raccoon',
  'duck',
  'sheep',
  'seal',
  'sloth',
];

const staticGreetingSpecies = [
  'cat',
  'hamster',
  'capybara',
  'rabbit',
  'koala',
  'bear',
  'raccoon',
  'duck',
  'sheep',
  'seal',
  'sloth',
];

function bundledGlb(name) {
  return new URL(`../../assets/characters/${name}.glb`, import.meta.url);
}

function glbAnimationNames(url) {
  const file = readFileSync(url);
  const jsonLength = file.readUInt32LE(12);
  const json = JSON.parse(file.subarray(20, 20 + jsonLength).toString('utf8'));
  return (json.animations || []).map((animation) => animation.name);
}

test('Horse starts facing the viewer and Dog uses a smaller proportional head', () => {
  assert.deepEqual(getCharacter('horse')?.rotation, [0, Math.PI, 0]);
  assert.ok((getCharacter('dog')?.proportions?.head || 1) < 1);
});

test('Rabbit replaces Hamster for new companions and uses the supplied bundled model', () => {
  assert.equal(PET_TYPES.some((pet) => pet.id === 'rabbit'), true);
  assert.equal(PET_TYPES.some((pet) => pet.id === 'hamster'), false);
  assert.equal(LEGACY_PET_TYPES.some((pet) => pet.id === 'hamster'), true);
  assert.equal(getCharacter('rabbit')?.modelPath, 'bundled:rabbit');
  assert.equal(getCharacter('rabbit')?.proceduralModel, undefined);
  assert.equal(existsSync(bundledGlb('rabbit')), true);
});

test('Seal uses the supplied dotted white model', () => {
  assert.equal(getCharacter('seal')?.modelPath, 'bundled:seal');
  assert.equal(existsSync(bundledGlb('seal')), true);
});

test('Penguin Wave has authored flipper motion', () => {
  assert.equal(getCharacter('penguin')?.modelPath, 'bundled:penguin');
  assert.deepEqual(getCharacter('penguin')?.actions?.wave, ['Wave']);
  assert.ok(getCharacter('penguin')?.rig?.flipper?.includes('Flipper_L'));
  assert.ok(getCharacter('penguin')?.rig?.flipper?.includes('Flipper_R'));
  assert.ok(glbAnimationNames(bundledGlb('penguin')).includes('Wave'));
});

test('Every requested companion exposes a visible Wave response', () => {
  assert.equal(companionWaveResponse('penguin'), 'paw-wave');
  assert.equal(companionSupportsPawWave('penguin'), true);
  for (const species of requestedWaveSpecies.filter((id) => id !== 'penguin')) {
    assert.equal(companionWaveResponse(species), 'bounce', species);
    assert.equal(companionUsesWaveBounce(species), true, species);
  }
  for (const species of staticGreetingSpecies) {
    const wave = getAnimalChoreography(species, 'wave');
    assert.ok(wave.root.maxLift > 0 || wave.root.maxScaleY > 0, `${species} has no root gesture`);
    assert.ok(
      wave.samples.some(
        (sample) => Math.abs(sample.root.lift) > 0.005 || Math.abs(sample.root.scaleY - 1) > 0.005
      ),
      `${species} Wave samples remain stationary`
    );
  }
});

test('Requested Talk actions use verified same-species recordings', () => {
  for (const species of ['capybara', 'rabbit', 'koala', 'bear', 'raccoon', 'sloth']) {
    const entry = getAnimalSoundEntry(species, 'talk');
    assert.equal(entry?.species, species);
    assert.equal(animalSoundIsPlayable(entry), true, species);
    assert.ok(entry?.provenance.sourceUrl, `${species} lacks provenance`);
    assert.match(entry?.provenance.sha256 || '', /^[a-f0-9]{64}$/, species);
  }
});
