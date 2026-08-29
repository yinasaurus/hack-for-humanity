import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  ANIMAL_SOUND_MANIFEST,
  animalSoundIsPlayable,
  getAnimalSoundEntry,
} from './animalSounds.ts';
import { PET_TYPES } from '../pets.ts';

test('manifest covers exactly the selectable species and both call kinds', () => {
  assert.deepEqual(Object.keys(ANIMAL_SOUND_MANIFEST).sort(), PET_TYPES.map((pet) => pet.id).sort());
  for (const species of PET_TYPES.map((pet) => pet.id)) {
    assert.equal(ANIMAL_SOUND_MANIFEST[species].talk.species, species);
    assert.equal(ANIMAL_SOUND_MANIFEST[species].talk.kind, 'talk');
    assert.equal(ANIMAL_SOUND_MANIFEST[species].play.kind, 'play');
  }
});

test('Talk has a verified playable recording for every ready pilot species', () => {
  for (const species of PET_TYPES.map((pet) => pet.id)) {
    const entry = getAnimalSoundEntry(species, 'talk');
    assert.ok(entry, `${species} missing talk entry`);
    if (entry.status !== 'ready') continue;
    assert.equal(typeof entry.source, 'number', `${species} has no bundled asset`);
    assert.ok((entry.durationMs || 0) > 0, `${species} has no measured duration`);
    assert.ok((entry.byteSize || 0) > 0, `${species} has no measured size`);
    assert.ok(entry.provenance.sourceUrl, `${species} has no source URL`);
    assert.ok(entry.provenance.author, `${species} has no author`);
    assert.ok(entry.provenance.license, `${species} has no license`);
    assert.match(entry.provenance.sha256 || '', /^[a-f0-9]{64}$/, `${species} has no SHA-256`);
    assert.equal(animalSoundIsPlayable(entry), true, `${species} is not playable`);
  }
});

test('unknown calls fail closed and Play stays silent without a separate cue', () => {
  assert.equal(getAnimalSoundEntry('not-an-animal', 'talk'), null);
  for (const species of ['koala', 'bear', 'raccoon', 'sloth']) {
    assert.equal(getAnimalSoundEntry(species, 'play')?.status, 'pilot-pending', species);
    assert.equal(animalSoundIsPlayable(getAnimalSoundEntry(species, 'play')), false, species);
  }
});

test('new and repaired companions have verified same-species Talk cues', () => {
  for (const species of ['sheep', 'duck', 'rabbit', 'seal', 'capybara', 'koala', 'bear', 'raccoon', 'sloth']) {
    const entry = getAnimalSoundEntry(species, 'talk');
    assert.equal(entry?.status, 'ready', species);
    assert.ok(['CC0', 'CC-BY', 'Public-Domain'].includes(entry?.provenance.license), species);
    assert.equal(animalSoundIsPlayable(entry), true, species);
    assert.match(entry?.provenance.sha256 || '', /^[a-f0-9]{64}$/, species);
  }
});

test('Rabbit Talk uses the verified local rabbit recording', () => {
  const rabbit = getAnimalSoundEntry('rabbit', 'talk');
  const asset = readFileSync(new URL('../../assets/audio/animal-calls/rabbit-talk.wav', import.meta.url));
  assert.equal(rabbit?.status, 'ready');
  assert.equal(rabbit?.provenance.license, 'CC0');
  assert.equal(rabbit?.byteSize, asset.byteLength);
  assert.equal(rabbit?.provenance.sha256, createHash('sha256').update(asset).digest('hex'));
});

test('Capybara, Rabbit, and Sloth Talk assets match their verified call excerpts', () => {
  const assets = {
    capybara: '../../assets/audio/animal-calls/capybara-talk.m4a',
    rabbit: '../../assets/audio/animal-calls/rabbit-talk.wav',
    sloth: '../../assets/audio/animal-calls/sloth-talk.m4a',
  };
  for (const [species, relativePath] of Object.entries(assets)) {
    const entry = getAnimalSoundEntry(species, 'talk');
    const asset = readFileSync(new URL(relativePath, import.meta.url));
    assert.equal(entry?.status, 'ready', species);
    assert.equal(entry?.byteSize, asset.byteLength, `${species} byte size`);
    assert.equal(
      entry?.provenance.sha256,
      createHash('sha256').update(asset).digest('hex'),
      `${species} checksum`
    );
    assert.match(entry?.provenance.modifications || '', /high-pass filtered/i, species);
    assert.match(entry?.provenance.modifications || '', /loudness-normalized/i, species);
  }
});

test('Cat Talk is the verified local CC0 domestic-cat meow derivative', () => {
  const cat = getAnimalSoundEntry('cat', 'talk');
  const asset = readFileSync(new URL('../../assets/audio/animal-calls/cat-talk.m4a', import.meta.url));
  const hash = createHash('sha256').update(asset).digest('hex');

  assert.equal(cat?.status, 'ready');
  assert.equal(cat?.provenance.license, 'CC0');
  assert.match(cat?.provenance.sourceUrl || '', /freesound\.org\/people\/swatkamus\/sounds\/260179/);
  assert.equal(cat?.provenance.acquisitionUrl, 'https://cdn.freesound.org/previews/260/260179_4400688-hq.mp3');
  assert.equal(cat?.provenance.author, 'swatkamus');
  assert.equal(cat?.byteSize, asset.byteLength);
  assert.equal(cat?.provenance.sha256, hash);
  assert.ok((cat?.durationMs || 0) >= 600 && (cat?.durationMs || 0) <= 1800);
  assert.match(cat?.provenance.modifications || '', /mono 44\.1 kHz/);
  assert.match(cat?.provenance.modifications || '', /40 ms linear fades/);
  assert.match(cat?.provenance.modifications || '', /AAC-LC 64 kbps M4A/);
  assert.match(cat?.provenance.modifications || '', /trailing silence/);
});

test('Expo web URL assets pass the same verified recording gate', () => {
  const webEntry = {
    ...ANIMAL_SOUND_MANIFEST.fox.talk,
    source: '/assets/fox-talk.hash.m4a',
  };
  assert.equal(animalSoundIsPlayable(webEntry), true);
});
