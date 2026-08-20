import assert from 'assert';
import {
  DEFAULT_CHECKUP_CELEBRATION_MESSAGE,
  normalizeAttendedOn,
  normalizeEncouragementNote,
  patientFacingCelebrationMessage,
  pendingCelebrationForPatient,
  toPatientPendingCelebration,
} from './checkupCelebration.js';

assert.strictEqual(
  patientFacingCelebrationMessage(null),
  DEFAULT_CHECKUP_CELEBRATION_MESSAGE
);
assert.strictEqual(
  patientFacingCelebrationMessage('  great session today  '),
  'great session today'
);
assert.strictEqual(normalizeEncouragementNote(''), null);
assert.strictEqual(normalizeAttendedOn('2026-08-20'), '2026-08-20');
assert.match(normalizeAttendedOn('nope'), /^\d{4}-\d{2}-\d{2}$/);

const db = {
  checkupCelebrations: {
    'patient-a': [
      {
        id: 'new',
        attendedOn: '2026-08-21',
        note: 'newest',
        createdAt: '2026-08-21T12:00:00.000Z',
        acknowledgedAt: null,
      },
      {
        id: 'old',
        attendedOn: '2026-08-10',
        note: null,
        createdAt: '2026-08-10T12:00:00.000Z',
        acknowledgedAt: null,
      },
    ],
  },
};

const pending = pendingCelebrationForPatient(db, 'patient-a');
assert.strictEqual(pending.id, 'old', 'show oldest unacknowledged first');
const payload = toPatientPendingCelebration(pending);
assert.strictEqual(payload.message, DEFAULT_CHECKUP_CELEBRATION_MESSAGE);
assert.ok(!('bmi' in payload));
assert.ok(!('weight' in payload));

console.log('checkupCelebration.test.js ok');
