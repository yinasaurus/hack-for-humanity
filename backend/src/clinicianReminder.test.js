import assert from 'assert';
import {
  normalizeReminderFrequency,
  normalizeReminderHour,
  normalizeReminderNote,
  timeOfDayFromHour,
  toPatientClinicianReminder,
} from './clinicianReminder.js';

assert.equal(normalizeReminderFrequency('daily'), 'daily');
assert.equal(normalizeReminderFrequency('weekly'), 'weekly');
assert.equal(normalizeReminderFrequency('every_2_days'), 'every_2_days');
assert.equal(normalizeReminderFrequency('nope'), null);
assert.equal(normalizeReminderNote('  eat 2 apples each week  '), 'eat 2 apples each week');
assert.equal(normalizeReminderNote(''), null);

assert.equal(normalizeReminderHour(undefined, 'morning'), 8);
assert.equal(normalizeReminderHour(undefined, 'midday'), 12);
assert.equal(normalizeReminderHour(undefined, 'evening'), 18);
assert.equal(normalizeReminderHour('morning'), 8);
assert.equal(normalizeReminderHour(9), 9);
assert.equal(timeOfDayFromHour(8), 'morning');
assert.equal(timeOfDayFromHour(12), 'midday');
assert.equal(timeOfDayFromHour(18), 'evening');

const payload = toPatientClinicianReminder({
  id: 'r1',
  note: 'eat 2 apples each week',
  frequency: 'weekly',
  hour: 8,
});
assert.deepEqual(payload, {
  id: 'r1',
  note: 'eat 2 apples each week',
  frequency: 'weekly',
  hour: 8,
  timeOfDay: 'morning',
});
assert.equal(toPatientClinicianReminder(null), null);

console.log('clinicianReminder.test.js ok');
