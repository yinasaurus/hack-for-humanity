import assert from 'node:assert/strict';
import test from 'node:test';
import { playWebAnimalCall } from './webAnimalAudioPlayback.ts';

test('web Talk starts play synchronously inside the user gesture', async () => {
  let playCalled = false;
  let resolvePlayback;
  const playback = new Promise((resolve) => { resolvePlayback = resolve; });
  const audio = {
    currentTime: 8,
    volume: 1,
    play() {
      playCalled = true;
      return playback;
    },
    pause() {},
  };

  const resultPromise = playWebAnimalCall(audio, () => false);
  assert.equal(playCalled, true, 'play must run before the first await');
  assert.equal(audio.currentTime, 0);
  resolvePlayback();
  assert.equal(await resultPromise, true);
});

test('web Talk stops cleanly when a newer action cancels it', async () => {
  let cancelled = false;
  let paused = false;
  const audio = {
    currentTime: 3,
    volume: 1,
    async play() { cancelled = true; },
    pause() { paused = true; },
  };

  assert.equal(await playWebAnimalCall(audio, () => cancelled), false);
  assert.equal(paused, true);
  assert.equal(audio.currentTime, 0);
});
