import assert from 'node:assert/strict';
import test from 'node:test';
import { canEquipWardrobeItem, unlockedKeepsakeIds, wardrobeItem } from './wardrobe.ts';

test('locked wardrobe pieces become usable only after their keepsake unlock', () => {
  const none = new Set();
  assert.equal(canEquipWardrobeItem('hat', 'none', none), true);
  assert.equal(canEquipWardrobeItem('hat', 'flower', none), false);
  assert.equal(canEquipWardrobeItem('hat', 'flower', new Set(['flower_crown'])), true);
  assert.equal(wardrobeItem('hat', 'flower')?.unlockId, 'flower_crown');
});

test('backend unlock payloads become stable inventory ids', () => {
  const ids = unlockedKeepsakeIds([{ id: 'soft_scarf' }, { id: 'quiet_garden' }]);
  assert.equal(ids.has('soft_scarf'), true);
  assert.equal(ids.has('quiet_garden'), true);
  assert.equal(ids.has('round_glasses'), false);
});
