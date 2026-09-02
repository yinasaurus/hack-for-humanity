import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const SWITCHER = fs.readFileSync(
  new URL('./DemoAccountSwitcher.tsx', import.meta.url),
  'utf8'
);
const APP = fs.readFileSync(new URL('../../App.tsx', import.meta.url), 'utf8');
const AUTH = fs.readFileSync(new URL('../AuthContext.tsx', import.meta.url), 'utf8');
const DEMO = fs.readFileSync(new URL('../demoMode.ts', import.meta.url), 'utf8');

test('DemoAccountSwitcher is gated and labeled as demo-only', () => {
  assert.match(SWITCHER, /canShowDemoAccountSwitcher/);
  assert.match(SWITCHER, /DEMO ONLY/);
  assert.match(SWITCHER, /if \(!visible\) return null/);
  assert.match(APP, /DemoAccountSwitcher/);
  assert.match(APP, /demoSwitching/);
  assert.match(APP, /key=\{user\.id\}/);
});

test('switchDemoAccount refuses when demo tools are disabled', () => {
  assert.match(AUTH, /isDemoToolsEnabled/);
  assert.match(AUTH, /switchDemoAccount/);
  assert.match(AUTH, /Demo account switcher is disabled/);
  assert.match(DEMO, /EXPO_PUBLIC_DEMO_MODE/);
  assert.match(DEMO, /__DEV__/);
  assert.match(DEMO, /@demo\.local/);
});
