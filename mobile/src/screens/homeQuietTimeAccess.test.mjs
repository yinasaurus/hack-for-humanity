import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const homePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'HomeScreen.tsx');

test('Quiet time is always offered once a companion is loaded (no walks gate)', () => {
  const source = fs.readFileSync(homePath, 'utf8');
  assert.match(source, /accessibilityLabel="Open Quiet time"/);
  assert.match(source, /navigate\('Together'\)/);
  assert.match(source, /styles\.quietTimeBtn/);
  assert.doesNotMatch(source, /walksAvailable/);
  assert.doesNotMatch(source, /quietTimeBtnLocked/);
  assert.doesNotMatch(source, /Unlocks after a few check-ins/);
  // Active CTA only needs companion present — brand-new accounts with zero check-ins still qualify.
  assert.match(source, /\{companion \? \(/);
});
