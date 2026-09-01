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

test('rigged quadruped wave is paw-only: lift + side rock, no head/tail/root bob', () => {
  for (const species of ['dog', 'fox', 'horse', 'panda']) {
    const wave = getAnimalChoreography(species, 'wave');
    const play = getAnimalChoreography(species, 'play');
    assert.ok(wave.channels.every((channel) => channel.target === 'forelimb'));
    assert.ok(wave.channels.some((channel) => channel.axis === 'x' && channel.motion === 'lift'));
    assert.ok(wave.channels.some((channel) => channel.axis === 'z' && channel.cycles >= 2.4));
    assert.equal(wave.root.maxLift, 0);
    assert.ok(play.root.maxLift > wave.root.maxLift);
    assert.notEqual(wave.durationMs, play.durationMs);
    assert.ok(
      wave.samples.some((sample) => Math.abs(sample.channels.forelimb?.z || 0) > 0.15),
      `${species} wave should rock the forelimb`
    );
    assert.ok(
      wave.samples.every((sample) => !sample.channels.head && !sample.channels.tail && !sample.channels.ear),
      `${species} wave must leave head/ear/tail still`
    );
    assert.ok(wave.samples.every((sample) => sample.root.lift === 0));
  }
});

test('static companions use a multi-hop centered bounce greeting', () => {
  for (const species of [
    'cat',
    'hamster',
    'capybara',
    'rabbit',
    'koala',
    'bear',
    'raccoon',
    'duck',
    'sheep',
    'seal',
    'sloth',
  ]) {
    const wave = getAnimalChoreography(species, 'wave');
    const play = getAnimalChoreography(species, 'play');
    assert.ok(wave.root.maxLift > 0, `${species} needs visible lift`);
    assert.ok(wave.root.maxScaleY > 0, `${species} needs visible body compression`);
    assert.ok(wave.root.maxLift < play.root.maxLift, `${species} bounce stays below Play hop`);
    assert.ok(wave.samples.some((sample) => sample.root.lift > 0), `${species} wave is static`);
    assert.ok(wave.samples.every((sample) => sample.root.x === 0 && sample.root.z === 0));
    // Multi-cycle bounce: lift should leave and return more than once.
    let peaks = 0;
    let wasUp = false;
    for (const sample of wave.samples) {
      const up = sample.root.lift > wave.root.maxLift * 0.35;
      if (up && !wasUp) peaks += 1;
      wasUp = up;
    }
    assert.ok(peaks >= 2, `${species} Wave bounce should hop at least twice (got ${peaks})`);
  }
});

test('penguin flaps both flippers on their authored local axis', () => {
  const wave = getAnimalChoreography('penguin', 'wave');
  const flipper = wave.channels.find((channel) => channel.target === 'flipper');
  assert.equal(flipper?.axis, 'y');
  assert.equal(flipper?.allMatches, true);
  assert.equal(flipper?.mirrored, true);
  assert.ok(wave.samples.some((sample) => Math.abs(sample.channels.flipper?.y || 0) > 0.2));
});

test('play keeps stronger/faster tail movement than a quiet pose would', () => {
  for (const species of ['dog', 'cat', 'fox', 'horse', 'panda', 'rabbit']) {
    const play = getAnimalChoreography(species, 'play');
    const playTail = play.channels.find((channel) => channel.target === 'tail');
    assert.ok(playTail, `${species} play should expose tail intent`);
    assert.ok(playTail.amplitude > 0.3);
    assert.ok(playTail.cycles > 2);
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

test('hamster uses its own quadruped choreography rather than rabbit ears', () => {
  const hamster = getAnimalChoreography('hamster', 'wave');
  assert.equal(hamster.species, 'hamster');
  assert.ok(hamster.root.maxLift > 0, 'hamster Wave uses bounce root motion');
  assert.ok(hamster.channels.every((channel) => channel.target === 'forelimb'));
});
