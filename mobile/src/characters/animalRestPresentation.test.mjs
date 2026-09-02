import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const RENDERERS = [
  './AnimalWebView.tsx',
  './AnimalWebView.web.tsx',
  './AnimalWebView.native.tsx',
];

test('rest presentation uses eyes + breath, not opacity or root tilt', () => {
  for (const renderer of RENDERERS) {
    const source = readFileSync(new URL(renderer, import.meta.url), 'utf8');
    assert.match(source, /function applyRestingEyes/, `${renderer} needs soft eye close`);
    assert.match(source, /function startRestBreath/, `${renderer} needs looping rest breath`);
    assert.match(source, /fade:\s*0\.85/, `${renderer} should fade into rest clips`);
    assert.doesNotMatch(
      source,
      /opacity\s*=\s*.*vitality|vitality.*opacity/i,
      `${renderer} must not dim by vitality`
    );
  }
});
