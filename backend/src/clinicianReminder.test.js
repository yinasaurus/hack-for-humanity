import assert from 'assert';
import {
  normalizeReminderFrequency,
  normalizeReminderNote,
  toPatientClinicianReminder,
} from './clinicianReminder.js';

assert.equal(normalizeReminderFrequency('daily'), 'daily');
assert.equal(normalizeReminderFrequency('weekly'), 'weekly');
assert.equal(normalizeReminderFrequency('every_2_days'), 'every_2_days');
assert.equal(normalizeReminderFrequency('nope'), null);
assert.equal(normalizeReminderNote('  eat 2 apples each week  '), 'eat 2 apples each week');
assert.equal(normalizeReminderNote(''), null);

const payload = toPatientClinicianReminder({
  id: 'r1',
  note: 'eat 2 apples each week',
  frequency: 'weekly',
  hour: 12,
});
assert.deepEqual(payload, {
  id: 'r1',
  note: 'eat 2 apples each week',
  frequency: 'weekly',
  hour: 12,
});
assert.equal(toPatientClinicianReminder(null), null);

console.log('clinicianReminder.test.js ok');
