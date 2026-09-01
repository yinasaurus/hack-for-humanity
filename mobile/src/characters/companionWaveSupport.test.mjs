import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAW_WAVE_SPECIES,
  WAVE_BOUNCE_SPECIES,
  companionSupportsPawWave,
  companionUsesWaveBounce,
  companionWaveResponse,
} from './companionWaveSupport.ts';

test('Mesh2Motion / bird / penguin companions use the paw-wave path', () => {
  for (const id of PAW_WAVE_SPECIES) {
    assert.equal(companionWaveResponse(id), 'paw-wave', id);
    assert.equal(companionSupportsPawWave(id), true, id);
    assert.equal(companionUsesWaveBounce(id), false, id);
  }
});

test('static Poly Pizza companions use the bounce Wave fallback', () => {
  for (const id of WAVE_BOUNCE_SPECIES) {
    assert.equal(companionWaveResponse(id), 'bounce', id);
    assert.equal(companionSupportsPawWave(id), false, id);
    assert.equal(companionUsesWaveBounce(id), true, id);
  }
});

test('cat and hamster are bounce companions (no soft blocked state)', () => {
  for (const id of ['cat', 'hamster']) {
    assert.equal(companionWaveResponse(id), 'bounce');
  }
});

test('bounce species list stays aligned with choreography body greeting', async () => {
  const { getAnimalChoreography } = await import('./animalChoreography.ts');
  for (const id of WAVE_BOUNCE_SPECIES) {
    const wave = getAnimalChoreography(id, 'wave');
    assert.ok(wave.root.maxLift > 0, `${id} choreography missing bounce lift`);
  }
  for (const id of ['dog', 'fox', 'panda', 'horse', 'rabbit']) {
    assert.equal(getAnimalChoreography(id, 'wave').root.maxLift, 0, id);
  }
});
