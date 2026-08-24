import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TIMEZONE,
  growthStageForDays,
  maxHistoricalStreak,
  milestonesReached,
  normalizeTimeZone,
  toDateKey,
  uniqueSortedDays,
} from './streaks.js';
import { toPatientCompanionState } from './routes.js';

function checkIn(id, createdAt) {
  return { id, userId: 'patient-1', createdAt };
}

describe('patient-local progression days', () => {
  it('deduplicates accepted check-ins by the patient IANA-local calendar day', () => {
    const checkIns = [
      checkIn('late', '2026-08-22T23:30:00.000Z'),
      checkIn('early', '2026-08-23T08:15:00.000Z'),
    ];

    assert.deepEqual(uniqueSortedDays(checkIns, 'Asia/Singapore'), ['2026-08-23']);
    assert.equal(maxHistoricalStreak(checkIns, 'Asia/Singapore'), 1);
    assert.equal(uniqueSortedDays(checkIns, 'America/Los_Angeles').length, 2);
  });

  it('uses Asia/Singapore when a missing or invalid timezone is supplied', () => {
    assert.equal(normalizeTimeZone(), DEFAULT_TIMEZONE);
    assert.equal(normalizeTimeZone('not/a-timezone'), DEFAULT_TIMEZONE);
    assert.equal(normalizeTimeZone('Europe/London'), 'Europe/London');
    assert.equal(toDateKey('2026-08-22T23:30:00.000Z', DEFAULT_TIMEZONE), '2026-08-23');
  });

  it('finds the longest historical consecutive run, even when the active streak has ended', () => {
    const checkIns = [
      checkIn('a', '2026-08-10T10:00:00.000Z'),
      checkIn('b', '2026-08-11T10:00:00.000Z'),
      checkIn('c', '2026-08-12T10:00:00.000Z'),
      checkIn('d', '2026-08-15T10:00:00.000Z'),
      checkIn('e', '2026-08-16T10:00:00.000Z'),
    ];

    assert.equal(maxHistoricalStreak(checkIns, 'Asia/Singapore'), 3);
  });
});

describe('permanent companion progression', () => {
  it('keeps the highest historical stage, keepsakes, and wardrobe after a break', () => {
    const db = {
      users: [{
        id: 'patient-1',
        role: 'patient',
        name: 'Maya',
        timezone: 'Asia/Singapore',
        createdAt: '2026-08-01T00:00:00.000Z',
        petType: 'panda',
      }],
      checkIns: [
        checkIn('1', '2026-08-10T10:00:00.000Z'),
        checkIn('2', '2026-08-11T10:00:00.000Z'),
        checkIn('3', '2026-08-12T10:00:00.000Z'),
        checkIn('4', '2026-08-13T10:00:00.000Z'),
        checkIn('5', '2026-08-14T10:00:00.000Z'),
        checkIn('6', '2026-08-20T10:00:00.000Z'),
      ],
      // Legacy cumulative-day unlock: it must not promote this five-day run.
      unlocks: { 'patient-1': [{ milestoneDay: 10, type: 'legacy', id: 'legacy-10', label: 'Legacy reward' }] },
      analyses: {},
      checkupCelebrations: {},
      clinicianReminders: {},
    };

    const companion = toPatientCompanionState('patient-1', db);

    assert.equal(companion.growthStage, 'little');
    assert.deepEqual(companion.unlocks.map((u) => u.milestoneDay), [1, 5]);
    assert.deepEqual(companion.helloDays, [
      '2026-08-10',
      '2026-08-11',
      '2026-08-12',
      '2026-08-13',
      '2026-08-14',
      '2026-08-20',
    ]);
  });

  it('honors a persisted historical streak when old check-ins are no longer present', () => {
    const db = {
      users: [{
        id: 'patient-1',
        role: 'patient',
        name: 'Maya',
        timezone: 'Asia/Singapore',
        highestConsecutiveStreak: 120,
        createdAt: '2026-08-01T00:00:00.000Z',
      }],
      checkIns: [],
      unlocks: {},
      analyses: {},
      checkupCelebrations: {},
      clinicianReminders: {},
    };

    const companion = toPatientCompanionState('patient-1', db);

    assert.equal(companion.growthStage, growthStageForDays(120));
    assert.deepEqual(milestonesReached(120), [1, 5, 10, 20, 50, 100, 120]);
    assert.deepEqual(companion.unlocks.map((u) => u.milestoneDay), [1, 5, 10, 20, 50, 100, 120]);
  });
});
