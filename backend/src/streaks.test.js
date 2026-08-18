import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  currentStreak,
  petMood,
  milestonesReached,
  consecutiveMisses,
  checkInRate,
  walksUnlocked,
  shiftDay,
  toDateKey,
} from './streaks.js';
import { evaluateAlerts } from './alerts.js';
import { toPatientSafeCheckIn } from './routes.js';

const today = toDateKey(new Date());

function ci(daysAgo, id = 'x') {
  return {
    id,
    userId: 'u1',
    createdAt: `${shiftDay(today, -daysAgo)}T15:00:00.000Z`,
  };
}

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    assert.equal(currentStreak([ci(0), ci(1), ci(2)], today), 3);
  });

  it('allows streak ending yesterday', () => {
    assert.equal(currentStreak([ci(1), ci(2)], today), 2);
  });

  it('resets when last log is older than yesterday', () => {
    assert.equal(currentStreak([ci(3), ci(4)], today), 0);
  });

  it('is zero with no check-ins', () => {
    assert.equal(currentStreak([], today), 0);
  });
});

describe('petMood', () => {
  it('is happy after today check-in', () => {
    assert.equal(petMood([ci(0)], today), 'happy');
  });

  it('is happy after yesterday check-in', () => {
    assert.equal(petMood([ci(1)], today), 'happy');
  });

  it('is resting after longer gap — never a suffering label', () => {
    assert.equal(petMood([ci(3)], today), 'resting');
  });
});

describe('milestonesReached', () => {
  it('unlocks at 5, 10, 20…', () => {
    assert.deepEqual(milestonesReached(10), [5, 10]);
    assert.deepEqual(milestonesReached(100), [5, 10, 20, 50, 100]);
    assert.ok(milestonesReached(120).includes(120));
  });
});

describe('consecutiveMisses & alerts', () => {
  it('counts misses from today backward', () => {
    assert.equal(consecutiveMisses([ci(5)], today), 5);
    assert.equal(consecutiveMisses([ci(0)], today), 0);
  });

  it('flags 5+ consecutive misses with explainable reason', () => {
    const checkIns = [ci(6), ci(7), ci(8)];
    const { alerts } = evaluateAlerts(
      { id: 'p1', name: 'Test' },
      checkIns
    );
    assert.ok(alerts.length >= 1);
    assert.ok(alerts[0].reason.includes('consecutive missed'));
    assert.ok(alerts[0].detail && alerts[0].detail.includes('Rule threshold'));
    assert.ok(alerts[0].guidance && alerts[0].guidance.includes('Clinician decides'));
  });
});

describe('checkInRate', () => {
  it('computes window rate', () => {
    const rate = checkInRate([ci(0), ci(1), ci(2)], 7, today);
    assert.ok(Math.abs(rate - 3 / 7) < 0.001);
  });
});

describe('walksUnlocked', () => {
  it('unlocks with streak >= 2', () => {
    assert.equal(walksUnlocked([ci(0), ci(1)]), true);
    assert.equal(walksUnlocked([ci(0)]), false);
  });
});

describe('patient data separation', () => {
  it('strips nutrition fields from patient check-in payload', () => {
    const raw = {
      id: '1',
      userId: 'u',
      createdAt: new Date().toISOString(),
      photoUrl: '/uploads/x.jpg',
      analysis: {
        estimatedCalories: 500,
        estimatedProteinG: 20,
      },
      estimatedCalories: 500,
    };
    const safe = toPatientSafeCheckIn(raw);
    assert.equal(safe.estimatedCalories, undefined);
    assert.equal(safe.analysis, undefined);
    assert.deepEqual(Object.keys(safe).sort(), [
      'createdAt',
      'id',
      'photoUrl',
      'userId',
    ]);
  });
});
