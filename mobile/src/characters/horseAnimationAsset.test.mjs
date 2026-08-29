import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const horseUrl = new URL('../../assets/characters/horse.glb', import.meta.url);

function readGlbJson(url) {
  const file = fs.readFileSync(url);
  assert.equal(file.toString('ascii', 0, 4), 'glTF');
  assert.equal(file.readUInt32LE(4), 2, 'Horse must remain glTF 2.0');
  const jsonLength = file.readUInt32LE(12);
  assert.equal(file.readUInt32LE(16), 0x4e4f534a, 'First GLB chunk must be JSON');
  return { file, json: JSON.parse(file.toString('utf8', 20, 20 + jsonLength)) };
}

test('bundled Horse exposes every authored companion animation clip', () => {
  const { file, json } = readGlbJson(horseUrl);
  assert.ok(file.length < 6 * 1024 * 1024, 'animated Horse should stay below 6 MB');

  const animations = new Map(json.animations.map((animation) => [animation.name, animation]));
  assert.deepEqual([...animations.keys()].sort(), ['Curious', 'Gentle', 'Idle', 'Play', 'Run', 'Talk', 'Wave']);
  for (const [name, animation] of animations) {
    assert.ok(animation.channels.length > 0, `${name} needs animated channels`);
    assert.ok(animation.samplers.length > 0, `${name} needs sampled motion`);
  }
});

test('bundled Horse retains the rig and source attribution', () => {
  const { json } = readGlbJson(horseUrl);
  const nodeNames = new Set(json.nodes.map((node) => node.name));
  for (const name of [
    'HorseRig',
    'HorseMesh',
    'head0_040',
    'tail0_017',
    'leg_front_left_top0_03',
    'leg_front_left_hoof_07',
  ]) {
    assert.ok(nodeNames.has(name), `Horse GLB is missing ${name}`);
  }
  assert.match(json.asset.copyright || '', /Jungle Jim.*CC BY 4\.0/i);
  assert.equal(nodeNames.has('Light'), false, 'source lighting helpers should not ship in-app');
});
