import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ANIMAL_PRESENTATIONS,
  animalPresentationFor,
  companionVitalityOpacity,
} from './animalPresentation.ts';
import { PET_TYPES } from '../pets.ts';

const SPECIES = PET_TYPES.map(({ id }) => id);

test('every selectable animal has action and gentle voice direction', () => {
  for (const species of SPECIES) {
    const presentation = animalPresentationFor(species);
    assert.ok(presentation.actions.wave.durationMs > 0);
    assert.ok(presentation.actions.play.durationMs > 0);
    assert.ok(presentation.voice.pitch > 0);
    assert.ok(presentation.voice.rate > 0);
    assert.ok(presentation.voice.call.length > 0);
  }
  assert.equal(Object.keys(ANIMAL_PRESENTATIONS).length, SPECIES.length);
});

test('every selectable animal keeps stable framing so growth remains visible', () => {
  for (const species of SPECIES) {
    const framing = animalPresentationFor(species).framing;
    assert.ok(framing?.fit > 0, `${species} needs a fixed camera fit`);
    assert.ok(framing?.groundRadius > 0, `${species} needs a stable ground radius`);
  }
});

test('every selectable animal stays inside the smooth toy-like visual profile bounds', () => {
  for (const species of SPECIES) {
    const { surface, eyes, lighting } = animalPresentationFor(species).visual;
    assert.equal(surface.smoothNormals, true, `${species} should request smooth normals`);
    assert.ok(surface.roughness >= 0.45 && surface.roughness <= 0.95);
    assert.ok(surface.metalness >= 0 && surface.metalness <= 0.08);
    assert.ok(surface.clearcoat >= 0 && surface.clearcoat <= 0.35);
    assert.ok(eyes.scale >= 0.9 && eyes.scale <= 1.18);
    assert.ok(eyes.roughness >= 0.08 && eyes.roughness <= 0.4);
    assert.ok(eyes.highlight >= 0 && eyes.highlight <= 0.95);
    assert.ok(lighting.key > 0 && lighting.key <= 2);
    assert.ok(lighting.fill > 0 && lighting.fill <= 1.25);
    assert.ok(lighting.rim >= 0 && lighting.rim <= 1);
  }
});

test('horse presentation keeps its warm coat without forcing synthetic eyes', () => {
  const horse = animalPresentationFor('horse');
  assert.match(horse.material.tint, /^#[0-9a-f]{6}$/i);
  const [r, g, b] = horse.material.tint
    .slice(1)
    .match(/.{2}/g)
    .map((hex) => Number.parseInt(hex, 16));

  assert.ok(r > g && g > b, 'horse tint should be a visibly warm brown');
  assert.ok(horse.material.strength >= 0.5);
  assert.ok(horse.material.roughness >= 0.5);
  assert.ok(horse.framing.fit > 0);
  assert.ok(horse.framing.groundRadius > 0);
  assert.equal(horse.visual.eyes.color, undefined);
});

test('cat face profile stays soft and recognisably feline', () => {
  const cat = animalPresentationFor('cat');
  assert.ok(cat.visual.face);
  assert.ok(cat.visual.face.muzzleScale >= 1 && cat.visual.face.muzzleScale <= 1.12);
  assert.ok(cat.visual.face.noseScale >= 0.75 && cat.visual.face.noseScale <= 1);
  assert.ok(cat.visual.face.earScale >= 0.9 && cat.visual.face.earScale <= 1.12);
  assert.match(cat.voice.caption.toLowerCase(), /mew|purr|meow/);
});

test('long-legged birds use a closer but safe viewer fit', () => {
  assert.ok(animalPresentationFor('flamingo').framing.fit <= 1.25);
  assert.ok(animalPresentationFor('stork').framing.fit <= 1.25);
  assert.ok(animalPresentationFor('flamingo').framing.groundRadius > 0);
  assert.ok(animalPresentationFor('stork').framing.groundRadius > 0);
});

test('penguin eye cue is slightly smaller while legacy hamster resolves to Rabbit', () => {
  assert.ok(animalPresentationFor('penguin').visual.eyes.scale < 1);
  assert.equal(animalPresentationFor('hamster'), animalPresentationFor('rabbit'));
});

test('species voices remain distinct without becoming harsh', () => {
  const voices = SPECIES.map((species) => animalPresentationFor(species).voice);
  assert.equal(new Set(voices.map(({ pitch, rate }) => `${pitch}:${rate}`)).size, SPECIES.length);
  for (const voice of voices) {
    assert.ok(voice.pitch >= 0.78 && voice.pitch <= 1.35);
    assert.ok(voice.rate >= 0.78 && voice.rate <= 1.02);
    assert.ok(voice.volume <= 0.26);
  }
});

test('vitality feedback keeps the animal recognizable', () => {
  assert.equal(companionVitalityOpacity('bright'), 1);
  assert.ok(companionVitalityOpacity('fatigued') > companionVitalityOpacity('dim'));
  assert.ok(companionVitalityOpacity('dim') > companionVitalityOpacity('dormant'));
  assert.ok(companionVitalityOpacity('dormant') >= 0.6);
});
