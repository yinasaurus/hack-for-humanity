import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { getCharacter } from './characterCatalog.ts';

const MESH2MOTION_IDS = ['fox', 'dog', 'panda'];
const require = createRequire(import.meta.url);

function bundledAssetPath(id) {
  return fileURLToPath(new URL(`../../assets/characters/${id}.glb`, import.meta.url));
}

function readGlbJson(buffer, id) {
  assert.equal(buffer.readUInt32LE(0), 0x46546c67, `${id} model must be a GLB`);
  assert.equal(buffer.readUInt32LE(4), 2, `${id} model must use glTF 2`);
  assert.equal(buffer.readUInt32LE(8), buffer.byteLength, `${id} GLB length must match its payload`);
  const jsonLength = buffer.readUInt32LE(12);
  assert.equal(buffer.readUInt32LE(16), 0x4e4f534a, `${id} GLB must begin with a JSON chunk`);
  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString('utf8').trim());
}

test('selectable Mesh2Motion companions resolve to valid bundled GLBs', () => {
  for (const id of MESH2MOTION_IDS) {
    const character = getCharacter(id);
    assert.equal(character?.modelPath, `bundled:${id}`, `${id} must use its bundled model`);

    const assetPath = bundledAssetPath(id);
    const stat = statSync(assetPath);
    assert.ok(stat.isFile(), `${id} model must be a file`);
    assert.ok(stat.size > 4, `${id} model must not be empty`);
    const gltf = readGlbJson(readFileSync(assetPath), id);
    assert.equal(gltf.asset?.version, '2.0', `${id} model must declare glTF 2.0`);
    assert.ok(gltf.scene !== undefined || gltf.scenes?.length, `${id} model must declare a scene`);
    assert.ok(gltf.meshes?.length, `${id} model must contain a mesh`);
  }
});

test('Metro keeps GLB files on the static asset path', () => {
  const config = require('../../metro.config.js');
  assert.ok(config.resolver.assetExts.includes('glb'));
  assert.ok(config.resolver.assetExts.includes('gltf'));
});
