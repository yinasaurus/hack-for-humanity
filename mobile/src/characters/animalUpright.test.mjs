import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const RENDERERS = [
  './AnimalWebView.tsx',
  './AnimalWebView.web.tsx',
  './AnimalWebView.native.tsx',
];

test('resting and sleepy presence never tilts the whole companion root', () => {
  for (const renderer of RENDERERS) {
    const source = readFileSync(new URL(renderer, import.meta.url), 'utf8');
    const start = source.indexOf('function applyQuietPose');
    const end = source.indexOf('\nfunction ', start + 10);
    assert.ok(start >= 0, `${renderer} must define applyQuietPose`);
    const presencePose = source.slice(start, end > start ? end : undefined);

    assert.doesNotMatch(
      presencePose,
      /root\.rotate[ZX]\(/,
      `${renderer} must keep the planted body upright during rest`
    );
    assert.match(
      presencePose,
      /root\.quaternion\.copy\(baseQuat\)/,
      `${renderer} must restore the authored upright root pose`
    );
  }
});
