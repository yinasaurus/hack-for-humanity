import assert from 'node:assert/strict';
import test from 'node:test';
import { getCharacter } from './characterCatalog.ts';
import { mergeActionCandidates, resolveActionClip } from './animalCapabilities.ts';

const AUTHORED_CLIPS = {
  flamingo: 'flamingo_flyA_',
  stork: 'storkFly_B_',
};

for (const species of Object.keys(AUTHORED_CLIPS)) {
  test(`${species} uses the authored morph clip for Wave and Play fallback`, () => {
    const character = getCharacter(species);
    const clip = AUTHORED_CLIPS[species];
    const actions = mergeActionCandidates(character?.actions, character?.clips);
    assert.equal(character?.clips.idle, clip);
    assert.equal(actions.wave[0], clip);
    assert.equal(actions.play[0], clip);
    assert.equal(resolveActionClip([clip], 'wave', character?.actions).clip, clip);
    assert.equal(resolveActionClip([clip], 'play', character?.actions).clip, clip);
  });
}
