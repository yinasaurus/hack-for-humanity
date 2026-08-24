import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BONDING_HEART_MAX_PARTICLES,
  bondingHeartDurationMs,
  bondingHeartParticles,
} from './companionBonding.ts';

test('bonding feedback keeps one small and one bounded celebration recipe', () => {
  const small = bondingHeartParticles('small');
  const celebration = bondingHeartParticles('celebration');

  assert.ok(small.length >= 3 && small.length <= 5);
  assert.ok(celebration.length >= 7 && celebration.length <= 9);
  assert.equal(celebration.length, BONDING_HEART_MAX_PARTICLES);
  assert.ok(celebration.length > small.length);
});

test('reduced-motion feedback is shorter and every particle stays bounded', () => {
  assert.ok(bondingHeartDurationMs(true) < bondingHeartDurationMs(false));
  for (const particle of bondingHeartParticles('celebration')) {
    assert.ok(particle.xPercent >= 0 && particle.xPercent <= 100);
    assert.ok(particle.yPercent >= 0 && particle.yPercent <= 100);
    assert.ok(particle.size >= 18 && particle.size <= 36);
  }
});
