import assert from 'node:assert/strict';
import test from 'node:test';
import { upcomingKeepsakeSteps } from './keepsakePath.ts';

test('presents only backend-confirmed milestones as earned', () => {
  const steps = upcomingKeepsakeSteps([1, 5], 4);

  assert.equal(steps.find((step) => step.milestoneDay === 5)?.unlocked, true);
  assert.equal(steps.find((step) => step.milestoneDay === 10)?.unlocked, false);
  assert.equal('hellosAway' in steps[0], false);
});

test('continues permanent wardrobe chapters after the grown milestone', () => {
  const steps = upcomingKeepsakeSteps([1, 5, 10, 20, 50, 100, 120], 4);

  assert.equal(steps.find((step) => step.milestoneDay === 120)?.unlocked, true);
  assert.equal(steps.find((step) => step.milestoneDay === 140)?.unlocked, false);
});
