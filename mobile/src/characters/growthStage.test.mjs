import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GROWTH_STAGE_PRESENTATIONS,
  SPECIES_GROWTH_PROFILES,
  getGrowthStagePresentation,
  getSpeciesGrowthStagePresentation,
} from './growthStage.ts';

test('maps every patient growth stage to a distinct gentle presentation', () => {
  const stages = ['baby', 'little', 'growing', 'playful', 'adventurer', 'grown'];
  const presentations = stages.map((stage) => getGrowthStagePresentation(stage));

  assert.deepEqual(presentations, stages.map((stage) => GROWTH_STAGE_PRESENTATIONS[stage]));
  assert.equal(new Set(presentations.map((presentation) => presentation.scale)).size, stages.length);
  assert.equal(new Set(presentations.map((presentation) => presentation.position[1])).size, stages.length);
  assert.equal(presentations[0].lifePhase, 'baby');
  assert.equal(presentations[3].lifePhase, 'teen');
  assert.equal(presentations.at(-1).lifePhase, 'youngAdult');
  assert.ok(presentations[0].proportions.headScale > presentations[3].proportions.headScale);
  assert.ok(presentations[3].proportions.headScale > presentations.at(-1).proportions.headScale);
  assert.ok(presentations[0].proportions.bodyScale[1] < presentations.at(-1).proportions.bodyScale[1]);
});

test('unknown backend stages render safely as the smallest companion', () => {
  assert.deepEqual(getGrowthStagePresentation('unknown'), GROWTH_STAGE_PRESENTATIONS.baby);
  assert.deepEqual(getGrowthStagePresentation(undefined), GROWTH_STAGE_PRESENTATIONS.baby);
});

test('growth keeps source animal anatomy within proportionate bounds', () => {
  const stages = ['baby', 'little', 'growing', 'playful', 'adventurer', 'grown'];

  for (const stage of stages) {
    const { bodyScale, headScale } = getGrowthStagePresentation(stage).proportions;
    assert.ok(headScale >= 0.98 && headScale <= 1.1, `${stage} head scale ${headScale}`);
    for (const axisScale of bodyScale) {
      assert.ok(axisScale >= 0.94 && axisScale <= 1.04, `${stage} body scale ${axisScale}`);
    }
  }
});

test('every selectable animal receives a conservative species calibration', () => {
  const species = [
    'fox', 'horse', 'parrot', 'flamingo', 'stork',
    'dog', 'cat', 'panda', 'penguin',
    'capybara', 'rabbit', 'koala', 'bear', 'raccoon', 'duck', 'sheep', 'seal', 'sloth',
  ];
  const stages = ['baby', 'little', 'growing', 'playful', 'adventurer', 'grown'];

  for (const animal of species) {
    for (const stage of stages) {
      const { bodyScale, headScale } = getSpeciesGrowthStagePresentation(stage, animal).proportions;
      assert.ok(headScale >= 0.94 && headScale <= 1.1, `${animal}/${stage} head scale ${headScale}`);
      for (const axisScale of bodyScale) {
        assert.ok(axisScale >= 0.94 && axisScale <= 1.04, `${animal}/${stage} body scale ${axisScale}`);
      }
    }
  }

  assert.ok(
    getSpeciesGrowthStagePresentation('baby', 'dog').proportions.headScale <= 1,
    'the already head-heavy dog mesh must not receive additional head enlargement'
  );
});

test('species channels expose obvious bounded baby-to-grown silhouette cues', () => {
  const requiredDeltas = {
    horse: { legs: 0.2, neck: 0.12, muzzle: 0.12 },
    parrot: { wings: 0.2, tail: 0.2 },
    flamingo: { neck: 0.35, legs: 0.35, wings: 0.2 },
    stork: { neck: 0.35, legs: 0.35, wings: 0.2 },
    panda: { legs: 0.2, head: 0.08 },
    rabbit: { ears: 0.25, legs: 0.25, head: 0.08 },
  };
  const stages = ['baby', 'little', 'growing', 'playful', 'adventurer', 'grown'];

  for (const [species, deltas] of Object.entries(requiredDeltas)) {
    assert.ok(SPECIES_GROWTH_PROFILES[species], `${species} profile is missing`);
    const presentations = stages.map((stage) => getSpeciesGrowthStagePresentation(stage, species));
    assert.ok(
      presentations.every((presentation, index) => index === 0 || presentation.scale > presentations[index - 1].scale),
      `${species} overall scale must increase at every stage`
    );
    for (const [channel, minimumDelta] of Object.entries(deltas)) {
      const baby = presentations[0].channels[channel];
      const grown = presentations.at(-1).channels[channel];
      assert.ok(Math.abs(grown - baby) >= minimumDelta, `${species} ${channel} baby/grown delta is too subtle`);
    }
    for (const presentation of presentations) {
      for (const [channel, value] of Object.entries(presentation.channels)) {
        if (channel === 'body') {
          for (const axis of value) assert.ok(axis >= 0.94 && axis <= 1.06, `${species} body axis ${axis}`);
        } else {
          assert.ok(value >= 0.45 && value <= 1.12, `${species}/${channel} ${value}`);
        }
      }
    }
  }
});

test('long-form growth channels lengthen without changing the grounded root', () => {
  for (const species of Object.keys(SPECIES_GROWTH_PROFILES)) {
    const baby = getSpeciesGrowthStagePresentation('baby', species);
    const grown = getSpeciesGrowthStagePresentation('grown', species);
    for (const channel of ['neck', 'legs', 'wings', 'ears', 'tail']) {
      assert.ok(grown.channels[channel] >= baby.channels[channel], `${species}/${channel} regressed`);
    }
    assert.equal(baby.position[0], grown.position[0]);
    assert.equal(baby.position[2] - 0.02, 0);
    assert.equal(grown.position[2], -0.03);
  }
});
