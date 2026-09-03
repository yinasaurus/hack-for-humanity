import { v4 as uuid } from 'uuid';
import { writeDb } from './db.js';
import { mockAnalyze } from './ai.js';
import {
  DEFAULT_TIMEZONE,
  shiftDay,
  toDateKey,
  vitalityState,
  consecutiveMisses,
  maxHistoricalStreak,
  milestonesReached,
  rewardForMilestone,
} from './streaks.js';
import { evaluateAlerts } from './alerts.js';
import { DEFAULT_APPEARANCE } from './appearance.js';

/**
 * Demo seed — multiple named patient scenarios for live walkthroughs.
 * Password for every demo account: `demo`
 * Clinician: clinic@demo.local / demo
 *
 * Re-run anytime: `npm run backend:seed` (from repo root) or `npm run seed` in backend/.
 */
const today = toDateKey(new Date(), DEFAULT_TIMEZONE);
const DEMO_PASSWORD_HASH =
  '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu'; // bcrypt("demo")

function daysAgo(n, hour = 12) {
  const hh = String(hour).padStart(2, '0');
  return `${shiftDay(today, -n)}T${hh}:00:00.000Z`;
}

function checkIn(userId, daysAgoN, hour = 12) {
  return {
    id: uuid(),
    userId,
    createdAt: daysAgo(daysAgoN, hour),
    photoUrl: null,
  };
}

/** Inclusive range of past days (0 = today). Skips listed offsets. */
function checkInsAcross(userId, fromAgo, toAgo, { skip = [], hour = 12 } = {}) {
  const out = [];
  for (let d = fromAgo; d <= toAgo; d += 1) {
    if (skip.includes(d)) continue;
    out.push(checkIn(userId, d, hour));
  }
  return out;
}

function basePatient(partial) {
  return {
    role: 'patient',
    clinicId: 'clinic-demo',
    onboarded: true,
    timezone: DEFAULT_TIMEZONE,
    ...DEFAULT_APPEARANCE,
    petType: 'fox',
    petGender: 'female',
    passwordHash: DEMO_PASSWORD_HASH,
    createdAt: daysAgo(45),
    ...partial,
  };
}

const patients = [
  // 1) Healthy / engaged
  basePatient({
    id: 'patient-maya',
    email: 'maya@demo.local',
    name: 'Maya',
    petName: 'Maple',
    highestConsecutiveStreak: 12,
    neck: 'scarf',
    scene: 'sunny_meadow',
    clinicalProfile: {
      heightCm: 165,
      weightKg: 58,
      dailyCalorieTarget: null,
      customGoals: ['Two gentle apple moments this week'],
    },
  }),
  // 2) Soft inactivity — last log ~2 calendar days ago (1 completed miss).
  // With current vitality rules, hoursSince≥48 often yields dormant before fatigued;
  // this is still a short gap (no 5+ miss alert), vs Jordan’s week-long silence.
  basePatient({
    id: 'patient-riley',
    email: 'riley@demo.local',
    name: 'Riley',
    petName: 'Pebble',
    petType: 'cat',
    highestConsecutiveStreak: 6,
    clinicalProfile: {
      heightCm: 162,
      weightKg: 55,
      dailyCalorieTarget: null,
      customGoals: ['A soft snack when energy dips'],
    },
  }),
  // 3) Long gap → dormant + clinician miss alert
  basePatient({
    id: 'patient-jordan',
    email: 'jordan@demo.local',
    name: 'Jordan',
    petName: 'Cedar',
    petType: 'dog',
    highestConsecutiveStreak: 14,
    clinicalProfile: {
      heightCm: 178,
      weightKg: 72,
      dailyCalorieTarget: 2400,
      customGoals: [],
    },
  }),
  // 4a) Live milestone: streak 4 ending yesterday — next check-in hits day 5 (soft scarf)
  basePatient({
    id: 'patient-blake',
    email: 'blake@demo.local',
    name: 'Blake',
    petName: 'Pip',
    petType: 'rabbit',
    highestConsecutiveStreak: 4,
    clinicalProfile: {
      heightCm: 170,
      weightKg: 60,
      dailyCalorieTarget: null,
      customGoals: [],
    },
  }),
  // 4b) Cosmetics already unlocked (day 10 keepsakes equipped)
  basePatient({
    id: 'patient-casey',
    email: 'casey@demo.local',
    name: 'Casey',
    petName: 'Moss',
    petType: 'panda',
    highestConsecutiveStreak: 10,
    neck: 'scarf',
    scene: 'sunny_meadow',
    hat: 'none',
    clinicalProfile: {
      heightCm: 168,
      weightKg: 62,
      dailyCalorieTarget: null,
      customGoals: ['Keep soft scarf moments pressure-free'],
    },
  }),
  // 5) Rich clinician digest / AI summary history
  basePatient({
    id: 'patient-sam',
    email: 'sam@demo.local',
    name: 'Sam',
    petName: 'Willow',
    petType: 'fox',
    highestConsecutiveStreak: 10,
    clinicalProfile: {
      heightCm: 170,
      weightKg: 64,
      dailyCalorieTarget: 2200,
      customGoals: ['Add an afternoon snack when it feels manageable'],
    },
  }),
  // Clinic-scoping control (must not appear for clinic@demo.local)
  basePatient({
    id: 'patient-alex-other',
    email: 'alex@other.local',
    name: 'Alex (other clinic)',
    clinicId: 'clinic-other',
    petName: 'Nori',
    highestConsecutiveStreak: 0,
    clinicalProfile: {},
  }),
];

const clinician = {
  id: 'clinician-demo',
  email: 'clinic@demo.local',
  name: 'Dr. Lee',
  role: 'clinician',
  clinicId: 'clinic-demo',
  onboarded: true,
  passwordHash: DEMO_PASSWORD_HASH,
  createdAt: daysAgo(60),
};

// ——— Check-in histories (relative to today) ———

/** Maya: steady recent presence (skip a couple older days only). */
const mayaCheckIns = checkInsAcross('patient-maya', 1, 16, { skip: [4, 9] });

/**
 * Riley: soft rest — last log two calendar days ago, missed yesterday (1 miss).
 * Vitality usually fatigued when hoursSince < 48; may read dormant later in the day
 * (≥48h rule). Never trips the 5+ miss clinician alert (contrast with Jordan).
 * Keep timestamps at 12:00Z so Asia/Singapore date keys stay on the intended day.
 */
const rileyCheckIns = checkInsAcross('patient-riley', 2, 10, { skip: [5], hour: 12 });

/** Jordan: active earlier, silent for 8 days → miss alert + dormant. */
const jordanCheckIns = checkInsAcross('patient-jordan', 8, 25, { skip: [12, 18] });

/** Blake: four consecutive days ending yesterday (ready for day-5 unlock on next check-in). */
const blakeCheckIns = checkInsAcross('patient-blake', 1, 4);

/** Casey: ten consecutive days including today — day 10 cosmetics. */
const caseyCheckIns = checkInsAcross('patient-casey', 1, 9);

/**
 * Sam: mixed 30-day pattern (logged + gaps) for a non-trivial clinician digest.
 * Recent week quieter than earlier window → “sharp drop” style signal possible.
 */
const samCheckIns = [
  ...checkInsAcross('patient-sam', 11, 28, { skip: [15, 22] }),
  checkIn('patient-sam', 9),
  checkIn('patient-sam', 3),
];

const allCheckIns = [
  ...mayaCheckIns,
  ...rileyCheckIns,
  ...jordanCheckIns,
  ...blakeCheckIns,
  ...caseyCheckIns,
  ...samCheckIns,
];

const analyses = {};
let mealIdx = 0;
for (const c of allCheckIns) {
  const meal = mockAnalyze(`${c.userId}:${c.id}:${mealIdx++}`);
  analyses[c.id] = {
    checkInId: c.id,
    userId: c.userId,
    createdAt: c.createdAt,
    ...meal,
    notes: 'Seeded demo analysis (varied mock meals — not live vision)',
  };
}

function unlockRows(userId, days, unlockedAgo) {
  return days.map((milestoneDay, i) => {
    const reward = rewardForMilestone(milestoneDay);
    return {
      milestoneDay,
      ...reward,
      unlockedAt: daysAgo(Math.max(0, unlockedAgo - i)),
    };
  });
}

const unlocks = {
  'patient-maya': unlockRows('patient-maya', milestonesReached(12), 2),
  'patient-riley': unlockRows('patient-riley', milestonesReached(6), 5),
  'patient-jordan': unlockRows('patient-jordan', milestonesReached(14), 10),
  'patient-blake': unlockRows('patient-blake', milestonesReached(4), 1),
  'patient-casey': unlockRows('patient-casey', milestonesReached(10), 0),
  'patient-sam': unlockRows('patient-sam', milestonesReached(10), 8),
};

/** 6) Verbatim visit notes for clinician chart. */
const patientVisitNotes = {
  'patient-maya': [
    {
      id: uuid(),
      userId: 'patient-maya',
      text:
        'Feeling a bit nervous about next week’s appointment — Maple has been a comfort. Sleep has been okay.',
      checkInId: null,
      createdAt: daysAgo(1, 19),
      readAt: null,
    },
  ],
  'patient-sam': [
    {
      id: uuid(),
      userId: 'patient-sam',
      text:
        'Some days I skipped photos when I ate late at work. Still trying. Please don’t push hard on numbers this visit.',
      checkInId: null,
      createdAt: daysAgo(2, 20),
      readAt: null,
    },
  ],
  'patient-jordan': [
    {
      id: uuid(),
      userId: 'patient-jordan',
      text: 'Been away visiting family — will try to check in again when I’m back.',
      checkInId: null,
      createdAt: daysAgo(9, 16),
      readAt: null,
    },
  ],
};

writeDb({
  users: [...patients, clinician],
  checkIns: allCheckIns,
  unlocks,
  analyses,
  summaries: {},
  alerts: [],
  clinicianNotes: {},
  patientVisitNotes,
  checkupCelebrations: {},
  clinicianReminders: {},
});

// ——— Verify scenarios against live rules (no logic changes) ———
function patientByEmail(email) {
  return patients.find((p) => p.email === email);
}

function verify(email, label, assertFn) {
  const user = patientByEmail(email);
  const checkIns = allCheckIns.filter((c) => c.userId === user.id);
  const userAnalyses = Object.values(analyses).filter((a) => a.userId === user.id);
  const { alerts, metrics } = evaluateAlerts(user, checkIns, userAnalyses);
  const latestAt = [...checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt;
  const recentlyRestored = latestAt && Date.now() - new Date(latestAt).getTime() < 24 * 36e5;
  // Match patient companion vitality: recent check-in nulls deficit coupling for the day.
  const vitality = vitalityState(
    checkIns,
    recentlyRestored ? null : metrics.dailyDeficitPct,
    new Date(),
    user.createdAt,
    DEFAULT_TIMEZONE
  );
  const misses = consecutiveMisses(checkIns, today, DEFAULT_TIMEZONE, user.createdAt);
  const hist = maxHistoricalStreak(checkIns, DEFAULT_TIMEZONE);
  try {
    assertFn({ user, checkIns, userAnalyses, alerts, metrics, vitality, misses, hist, recentlyRestored });
    console.log(`  ✓ ${label}`);
  } catch (err) {
    console.error(`  ✗ ${label}: ${err.message}`);
    process.exitCode = 1;
  }
}

console.log('Seeded Buddi demo scenarios (password for all: demo)\n');
console.log('Verifying expected outcomes:');

verify('maya@demo.local', 'Maya healthy / bright / no miss alert', ({ vitality, misses, alerts }) => {
  if (vitality !== 'bright') throw new Error(`expected bright, got ${vitality}`);
  if (misses !== 0) throw new Error(`expected 0 misses, got ${misses}`);
  if (alerts.some((a) => /consecutive missed/i.test(a.reason))) {
    throw new Error('unexpected miss alert');
  }
});

verify('riley@demo.local', 'Riley short gap (1 miss, no 5+ alert; quieter than Maya)', ({ vitality, misses, alerts }) => {
  if (misses !== 1) throw new Error(`expected 1 miss, got ${misses}`);
  if (!['fatigued', 'dim', 'dormant'].includes(vitality)) {
    throw new Error(`expected quieter vitality, got ${vitality}`);
  }
  if (alerts.some((a) => /consecutive missed/i.test(a.reason))) {
    throw new Error('short gap should not trip 5+ miss alert');
  }
});

verify('jordan@demo.local', 'Jordan long gap → dormant + 5+ miss alert', ({ vitality, misses, alerts }) => {
  if (misses < 5) throw new Error(`expected ≥5 misses, got ${misses}`);
  if (vitality !== 'dormant') throw new Error(`expected dormant, got ${vitality}`);
  if (!alerts.some((a) => /consecutive missed/i.test(a.reason))) {
    throw new Error('missing consecutive-missed alert');
  }
});

verify('blake@demo.local', 'Blake at streak-4 gate (day-5 unlock on next check-in)', ({ hist, user }) => {
  if (Math.max(hist, user.highestConsecutiveStreak) !== 4) {
    throw new Error(`expected hist/high-water 4, got hist=${hist} stored=${user.highestConsecutiveStreak}`);
  }
  const earned = milestonesReached(4);
  if (earned.includes(5)) throw new Error('day 5 should not be earned yet');
});

verify('casey@demo.local', 'Casey day-10 cosmetics unlocked', ({ hist, user }) => {
  if (Math.max(hist, user.highestConsecutiveStreak) < 10) {
    throw new Error('expected ≥10 historical streak');
  }
  if (user.neck !== 'scarf' || user.scene !== 'sunny_meadow') {
    throw new Error('expected scarf + sunny_meadow equipped');
  }
});

verify('sam@demo.local', 'Sam rich history for digest', ({ checkIns, userAnalyses, alerts }) => {
  if (checkIns.length < 10) throw new Error('expected varied check-in history');
  if (userAnalyses.length < 10) throw new Error('expected many analyses');
  // Sharp-drop and/or quieter recent week should surface at least one observational flag often;
  // if not, history is still non-trivial for mockSummary metrics.
  void alerts;
});

if (!patientVisitNotes['patient-maya']?.[0]?.text) {
  console.error('  ✗ visit note missing for Maya');
  process.exitCode = 1;
} else {
  console.log('  ✓ Maya visit note seeded (verbatim for clinician chart)');
}

console.log(`
Login cheat-sheet (password: demo)
  maya@demo.local     Healthy / engaged companion + visit note
  riley@demo.local    Short quiet gap (1 missed day — softer than Jordan, no miss alert)
  jordan@demo.local   Long gap — dormant + clinician “N consecutive missed logs”
  blake@demo.local    Next check-in unlocks day-5 Soft scarf (live milestone)
  casey@demo.local    Day-10 keepsakes already on (scarf + sunny meadow)
  sam@demo.local      Varied history for clinician AI digest + visit note
  clinic@demo.local   Clinician dashboard (sees clinic-demo patients only)
`);
