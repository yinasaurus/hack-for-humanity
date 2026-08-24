import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANIMAL_SEMANTIC_ACTIONS,
  createAnimalIntent,
  legacyActionCandidates,
  mergeActionCandidates,
  resolveActionClip,
  resolveAnimalActions,
} from './animalCapabilities.ts';

test('resolves semantic actions only from declared candidates', () => {
  const candidates = {
    idle: ['Idle'],
    talk: ['Talk', 'Eat'],
    play: ['Jump'],
  };
  const available = ['Idle', 'Eat', 'Run'];

  assert.equal(resolveActionClip(available, 'idle', candidates).clip, 'Idle');
  assert.equal(resolveActionClip(available, 'talk', candidates).clip, 'Eat');
  assert.equal(resolveActionClip(available, 'play', candidates).clip, null);
  assert.equal(resolveActionClip(available, 'play', candidates).matched, 'none');
});

test('case-insensitive matching tolerates exporter casing without fuzzy guesses', () => {
  const candidates = { talk: ['talk'] };
  const result = resolveActionClip(['Talk', 'Survey'], 'talk', candidates);
  assert.deepEqual(result, {
    action: 'talk',
    clip: 'Talk',
    candidate: 'talk',
    matched: 'caseInsensitive',
  });

  const missing = resolveActionClip(['Survey'], 'talk', { talk: ['Talk'] });
  assert.equal(missing.clip, null);
});

test('resolution always returns every semantic action and never chooses the first clip', () => {
  const resolved = resolveAnimalActions(['Survey'], { talk: ['Talk'] });
  assert.deepEqual(Object.keys(resolved), [...ANIMAL_SEMANTIC_ACTIONS]);
  for (const action of ANIMAL_SEMANTIC_ACTIONS) {
    assert.equal(resolved[action].clip, null);
  }
});

test('semantic intents are explicit and carry only an optional duration hint', () => {
  for (const action of ANIMAL_SEMANTIC_ACTIONS) {
    assert.deepEqual(createAnimalIntent(action), { type: 'action', action });
  }
  assert.deepEqual(createAnimalIntent('play', 900), {
    type: 'action',
    action: 'play',
    durationMs: 900,
  });
});

test('legacy three-clip definitions remain usable through semantic adapters', () => {
  const legacy = legacyActionCandidates({ idle: 'Idle', talk: 'Survey', react: 'Run' });
  assert.deepEqual(legacy.idle, ['Idle']);
  assert.deepEqual(legacy.talk, ['Survey']);
  assert.deepEqual(legacy.wave, ['Survey']);
  assert.deepEqual(legacy.play, ['Run']);
  assert.deepEqual(legacy.gentle, ['Idle']);

  const merged = mergeActionCandidates({ talk: ['Talk', 'Eat'] }, {
    idle: 'Idle',
    talk: 'Survey',
    react: 'Run',
  });
  assert.deepEqual(merged.talk, ['Talk', 'Eat', 'Survey']);
  assert.deepEqual(merged.play, ['Run']);
});
