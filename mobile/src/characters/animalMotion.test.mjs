import assert from 'node:assert/strict';
import test from 'node:test';
import {
  GROUNDED_PLAY_ROOT_POLICY,
  GROUNDED_WAVE_ROOT_POLICY,
  PLAY_ROOT_MAX_LIFT,
  WAVE_ROOT_MAX_LIFT,
  groundedPlayRootPose,
  groundedWaveRootPose,
  restoreTransform,
  snapshotTransform,
} from './animalMotion.ts';

test('grounded Wave forbids sideways translation, yaw, and roll', () => {
  assert.equal(GROUNDED_WAVE_ROOT_POLICY.allowX, false);
  assert.equal(GROUNDED_WAVE_ROOT_POLICY.allowZ, false);
  assert.equal(GROUNDED_WAVE_ROOT_POLICY.allowYaw, false);
  assert.equal(GROUNDED_WAVE_ROOT_POLICY.allowRoll, false);

  const base = {
    position: { x: 0.35, y: 0.8, z: -0.22 },
    rotation: { x: 0.1, y: 0.42, z: -0.08 },
  };
  const pose = groundedWaveRootPose(base, 0.25);

  assert.equal(pose.position.x, base.position.x);
  assert.equal(pose.position.z, base.position.z);
  assert.equal(pose.rotation.y, base.rotation.y);
  assert.equal(pose.rotation.z, base.rotation.z);
  assert.ok(Math.abs(pose.position.y - base.position.y) <= WAVE_ROOT_MAX_LIFT + 1e-9);
});

test('grounded Wave clamps optional lift to a tiny normalized amount', () => {
  const base = {
    position: { x: 0, y: 1, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
  };
  assert.equal(groundedWaveRootPose(base, 1).position.y, 1 + WAVE_ROOT_MAX_LIFT);
  assert.equal(groundedWaveRootPose(base, -1).position.y, 1 - WAVE_ROOT_MAX_LIFT);
});

test('grounded Play keeps X/Z and yaw/roll anchored while allowing a bounded hop', () => {
  assert.equal(GROUNDED_PLAY_ROOT_POLICY.allowX, false);
  assert.equal(GROUNDED_PLAY_ROOT_POLICY.allowZ, false);
  assert.equal(GROUNDED_PLAY_ROOT_POLICY.allowYaw, false);
  assert.equal(GROUNDED_PLAY_ROOT_POLICY.allowRoll, false);
  const base = {
    position: { x: 0.12, y: 0.4, z: -0.2 },
    rotation: { x: 0.1, y: -0.2, z: 0.3 },
  };
  const pose = groundedPlayRootPose(base, 1);
  assert.equal(pose.position.x, base.position.x);
  assert.equal(pose.position.z, base.position.z);
  assert.equal(pose.rotation.y, base.rotation.y);
  assert.equal(pose.rotation.z, base.rotation.z);
  assert.equal(pose.position.y, base.position.y + PLAY_ROOT_MAX_LIFT);
});

test('transform snapshots restore every bone component exactly after repeated overlays', () => {
  const bone = {
    position: { x: 0.1, y: 0.2, z: -0.3 },
    rotation: { x: 0.4, y: -0.5, z: 0.6 },
    scale: { x: 1, y: 0.9, z: 1.1 },
  };
  const snapshot = snapshotTransform(bone);
  bone.position.x += 4;
  bone.rotation.z -= 2;
  bone.scale.y = 1.8;
  restoreTransform(bone, snapshot);
  assert.deepEqual(bone, snapshot);
  bone.position.y -= 7;
  restoreTransform(bone, snapshot);
  assert.deepEqual(bone, snapshot);
});
