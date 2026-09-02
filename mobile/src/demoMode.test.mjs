import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEMO_PATIENT_ACCOUNTS,
  canShowDemoAccountSwitcher,
  findDemoPatientAccount,
  isDemoLocalEmail,
  isDemoToolsEnabled,
} from './demoMode.ts';

test('seeded demo patient list covers the six presentation accounts', () => {
  assert.equal(DEMO_PATIENT_ACCOUNTS.length, 6);
  assert.deepEqual(
    DEMO_PATIENT_ACCOUNTS.map((a) => a.email),
    [
      'maya@demo.local',
      'riley@demo.local',
      'jordan@demo.local',
      'blake@demo.local',
      'casey@demo.local',
      'sam@demo.local',
    ]
  );
});

test('demo.local email detection', () => {
  assert.equal(isDemoLocalEmail('maya@demo.local'), true);
  assert.equal(isDemoLocalEmail('patient@example.com'), false);
  assert.equal(isDemoLocalEmail(null), false);
});

test('switcher requires demo tools + demo.local email', () => {
  // Without DEMO_MODE env, tools follow __DEV__. In Node test runners __DEV__
  // is typically undefined → tools off unless we only assert the email half.
  assert.equal(canShowDemoAccountSwitcher('patient@example.com'), false);
  assert.equal(findDemoPatientAccount('Jordan@demo.local')?.label, 'Jordan');
});

test('isDemoToolsEnabled stays false when DEMO_MODE is not set and __DEV__ is off', () => {
  const prev = process.env.EXPO_PUBLIC_DEMO_MODE;
  delete process.env.EXPO_PUBLIC_DEMO_MODE;
  // In this runner __DEV__ is undefined → should be false.
  assert.equal(isDemoToolsEnabled(), false);
  process.env.EXPO_PUBLIC_DEMO_MODE = '1';
  assert.equal(isDemoToolsEnabled(), true);
  if (prev === undefined) delete process.env.EXPO_PUBLIC_DEMO_MODE;
  else process.env.EXPO_PUBLIC_DEMO_MODE = prev;
});
