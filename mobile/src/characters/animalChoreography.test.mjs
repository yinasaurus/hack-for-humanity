import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CHOREOGRAPHY_PHASES,
  getAnimalChoreography,
  sampleAnimalChoreography,
} from './animalChoreography.ts';

const SPECIES = ['dog', 'cat', 'fox', 'horse', 'panda', 'rabbit', 'parrot', 'flamingo', 'stork', 'penguin'];

test('every species/action has continuous bounded anticipation, primary, secondary, and settle phases', () => {
  for (const species of SPECIES) {
    for (const action of ['wave', 'play']) {
      const profile = getAnimalChoreography(species, action);
      assert.deepEqual(profile.phases.map((phase) => phase.name), CHOREOGRAPHY_PHASES);
      assert.equal(profile.phases[0].start, 0);
      assert.equal(profile.phases.at(-1).end, 1);
      profile.phases.forEach((phase, index) => {
        assert.ok(phase.start <= phase.end);
        assert.ok(phase.intensity >= 0 && phase.intensity <= 1);
        if (index > 0) assert.equal(phase.start, profile.phases[index - 1].end);
      });
      assert.equal(profile.samples.length, 49);
      assert.equal(profile.samples[0].root.x, 0);
      assert.equal(profile.samples[0].root.z, 0);
    }
  }
});

test('wave and play are intentionally different, with play using stronger/faster tail movement', () => {
  for (const species of ['dog', 'cat', 'fox', 'horse', 'panda', 'rabbit']) {
    const wave = getAnimalChoreography(species, 'wave');
    const play = getAnimalChoreography(species, 'play');
    const waveTail = wave.channels.find((channel) => channel.target === 'tail');
    const playTail = play.channels.find((channel) => channel.target === 'tail');
    assert.ok(waveTail && playTail, `${species} should expose tail intent`);
    assert.ok(playTail.amplitude > waveTail.amplitude);
    assert.ok(playTail.cycles > waveTail.cycles);
    assert.notEqual(wave.durationMs, play.durationMs);
    assert.ok(play.root.maxLift > wave.root.maxLift);
  }
});

test('bird profiles flap both wings and long-legged birds get a more visible flap', () => {
  for (const species of ['parrot', 'flamingo', 'stork']) {
    const wave = getAnimalChoreography(species, 'wave');
    const play = getAnimalChoreography(species, 'play');
    const waveWing = wave.channels.find((channel) => channel.target === 'wing');
    const playWing = play.channels.find((channel) => channel.target === 'wing');
    assert.equal(wave.rig.wings, 'both');
    assert.equal(waveWing.allMatches, true);
    assert.equal(waveWing.mirrored, true);
    assert.ok(playWing.amplitude > waveWing.amplitude);
    assert.ok(wave.samples.some((sample) => Math.abs(sample.channels.wing?.z || 0) > 0.05));
    assert.ok(play.samples.some((sample) => Math.abs(sample.channels.wing?.z || 0) > 0.05));
  }
});

test('root motion remains centered and only permits bounded vertical play lift', () => {
  for (const species of SPECIES) {
    for (const action of ['wave', 'play']) {
      const profile = getAnimalChoreography(species, action);
      assert.equal(profile.root.allowX, false);
      assert.equal(profile.root.allowZ, false);
      assert.equal(profile.root.allowYaw, false);
      assert.equal(profile.root.allowRoll, false);
      profile.samples.forEach((sample) => {
        assert.equal(sample.root.x, 0);
        assert.equal(sample.root.z, 0);
        assert.equal(sample.root.yaw, 0);
        assert.equal(sample.root.roll, 0);
        assert.ok(sample.root.lift >= 0);
        assert.ok(sample.root.lift <= profile.root.maxLift + 1e-9);
        assert.ok(sample.root.scaleY >= 1 - profile.root.maxScaleY - 1e-9);
      });
    }
  }
});

test('reduced motion removes repeated limb/wing beats and stays centered', () => {
  const profile = getAnimalChoreography('flamingo', 'play');
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const sample = sampleAnimalChoreography(profile, t, true);
    assert.equal(sample.root.x, 0);
    assert.equal(sample.root.z, 0);
    assert.equal(sample.root.yaw, 0);
    assert.equal(sample.root.roll, 0);
    assert.deepEqual(sample.channels, {});
    assert.ok(sample.root.lift <= 0.008 + 1e-9);
  }
});

test('legacy hamster id safely resolves to rabbit choreography', () => {
  const legacy = getAnimalChoreography('hamster', 'wave');
  assert.equal(legacy.species, 'rabbit');
  assert.ok(legacy.channels.some((channel) => channel.target === 'ear'));
});
