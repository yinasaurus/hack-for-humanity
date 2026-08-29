import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PAW_WAVE_BLOCKED_STATIC_MESH,
  companionSupportsPawWave,
} from './companionWaveSupport.ts';

test('Mesh2Motion / procedural companions can wave', () => {
  for (const id of ['fox', 'horse', 'dog', 'panda', 'rabbit', 'parrot']) {
    assert.equal(companionSupportsPawWave(id), true, id);
  }
});

test('only legacy static meshes without an approved greeting remain blocked', () => {
  for (const id of PAW_WAVE_BLOCKED_STATIC_MESH) {
    assert.equal(
      companionSupportsPawWave(id),
      false,
      `${id} must stay wave-blocked until a real forelimb/wing/flipper joint exists`
    );
  }
});
