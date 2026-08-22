import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { publicUser } from './auth.js';
import { normalizeClinicalProfile, patientReminderFromClinicalProfile } from './clinical.js';

describe('clinical privacy boundary', () => {
  it('never exposes clinical fields through publicUser', () => {
    const safe = publicUser({
      id: 'p', email: 'p@example.com', name: 'P', role: 'patient', onboarded: true,
      heightCm: 170, weightKg: 60, dailyCalorieTarget: 2100,
      clinicalProfile: { heightCm: 170, weightKg: 60, dailyCalorieTarget: 2100 },
    });
    const json = JSON.stringify(safe);
    for (const key of ['heightCm', 'weightKg', 'dailyCalorieTarget', 'clinicalProfile']) {
      assert.equal(json.includes(key), false);
    }
  });

  it('maps only text goals to the patient reminder', () => {
    const profile = normalizeClinicalProfile({ heightCm: 170, weightKg: 60, dailyCalorieTarget: 2100, customGoals: ['2 apples/week'] });
    const reminder = patientReminderFromClinicalProfile(profile);
    assert.deepEqual(reminder.messages, ['A gentle reminder: apples']);
    assert.equal(/\d/.test(JSON.stringify(reminder)), false);
    assert.equal(JSON.stringify(reminder).includes('2100'), false);
  });
});
