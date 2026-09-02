import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calmExpressionForVitality,
  isEngagementResting,
} from './companionMood.ts';

test('engagement resting covers lower vitality bands only', () => {
  assert.equal(isEngagementResting('bright'), false);
  assert.equal(isEngagementResting(null), false);
  assert.equal(isEngagementResting('fatigued'), true);
  assert.equal(isEngagementResting('dim'), true);
  assert.equal(isEngagementResting('dormant'), true);
});

test('vitality maps to calm resting/sleepy presentation (never punish cues)', () => {
  assert.equal(calmExpressionForVitality('bright'), 'happy');
  assert.equal(calmExpressionForVitality('fatigued'), 'resting');
  assert.equal(calmExpressionForVitality('dim'), 'sleepy');
  assert.equal(calmExpressionForVitality('dormant'), 'sleepy');
  assert.equal(calmExpressionForVitality(undefined), 'happy');
});
