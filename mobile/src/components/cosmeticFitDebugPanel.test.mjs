import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const PANEL = fs.readFileSync(
  new URL('./CosmeticFitDebugPanel.tsx', import.meta.url),
  'utf8'
);
const APP = fs.readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const NATIVE = fs.readFileSync(
  new URL('../characters/AnimalWebView.native.tsx', import.meta.url),
  'utf8'
);
const DEMO = fs.readFileSync(new URL('../demoMode.ts', import.meta.url), 'utf8');

test('CosmeticFitDebugPanel is gated and mounted like other demo tools', () => {
  assert.match(PANEL, /canShowCosmeticFitDebug/);
  assert.match(PANEL, /if \(!visible\) return null/);
  assert.match(PANEL, /accessoryFit=\{fit\}/);
  assert.match(PANEL, /formatSpeciesFitSnippet/);
  assert.match(PANEL, /Ephemeral/);
  assert.match(APP, /CosmeticFitDebugPanel/);
  assert.match(DEMO, /canShowCosmeticFitDebug/);
});

test('AnimalWebView accepts live accessory fit overrides and neck anchoring', () => {
  assert.match(NATIVE, /setAccessoryFit/);
  assert.match(NATIVE, /applyAccessoryFit/);
  assert.match(NATIVE, /attachNeckAccessory/);
  assert.match(NATIVE, /accessoryFit\?:/);
  assert.match(NATIVE, /let ACCESSORY_FIT/);
});
