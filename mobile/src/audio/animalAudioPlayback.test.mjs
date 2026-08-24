import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceAndPlayAnimalCall } from './animalAudioPlayback.ts';

test('dynamic Talk waits until the local recording is loaded before play', async () => {
  let playedBeforeReady = false;
  const player = {
    isLoaded: false,
    replace() {
      this.isLoaded = false;
      setTimeout(() => { this.isLoaded = true; }, 20);
    },
    async seekTo() {},
    play() {
      playedBeforeReady = !this.isLoaded;
    },
  };

  const played = await replaceAndPlayAnimalCall(player, 1, () => false);

  assert.equal(played, true);
  assert.equal(playedBeforeReady, false);
});
