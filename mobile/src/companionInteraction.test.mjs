import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLAY_TARGETS,
  animalTalkBubble,
  advancePlayStep,
} from './companionInteraction.ts';
import { animalPresentationFor } from './characters/animalPresentation.ts';
import { PET_TYPES } from './pets.ts';

const SPECIES = PET_TYPES.map(({ id }) => id);

test('animal talk keeps the greeting while showing a species call', () => {
  const greeting = 'Hi, I’m Maple. Glad you’re here.';
  const bubbles = SPECIES.map((species) =>
    animalTalkBubble(animalPresentationFor(species).voice.caption, greeting)
  );

  for (const bubble of bubbles) assert.match(bubble, /Hi, I’m Maple/);
  assert.equal(new Set(bubbles).size, SPECIES.length);
});

test('play moves a reachable target and completes without a timer', () => {
  assert.ok(PLAY_TARGETS.length >= 4);
  assert.equal(new Set(PLAY_TARGETS.map(({ left, top }) => `${left}:${top}`)).size, PLAY_TARGETS.length);

  let step = 0;
  for (let i = 0; i < PLAY_TARGETS.length - 1; i += 1) {
    const result = advancePlayStep(step);
    assert.equal(result.complete, false);
    assert.equal(result.nextStep, step + 1);
    step = result.nextStep;
  }
  assert.deepEqual(advancePlayStep(step), { nextStep: 0, complete: true });
});
