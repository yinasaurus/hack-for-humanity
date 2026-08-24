import assert from 'node:assert/strict';
import test from 'node:test';
import { BUDDI_BRAND_SPECS, getBuddiBrandSpec } from './buddiBrandSpec.ts';

test('brand lockup exposes stable size variants for every header context', () => {
  assert.deepEqual(Object.keys(BUDDI_BRAND_SPECS).sort(), [
    'compact',
    'large',
    'regular',
  ]);

  for (const size of ['large', 'regular', 'compact']) {
    const spec = getBuddiBrandSpec(size);
    assert.ok(spec.iconSize > 0);
    assert.ok(spec.gap > 0);
    assert.ok(spec.textSize > 0);
    assert.ok(spec.textLineHeight >= spec.textSize);
  }
});

test('regular lockup preserves the existing Home proportions', () => {
  assert.deepEqual(getBuddiBrandSpec('regular'), {
    iconSize: 34,
    gap: 8,
    textSize: 22,
    textLineHeight: 28,
  });
});
