import { v4 as uuid } from 'uuid';
import { writeDb } from './db.js';
import { mockAnalyze } from './ai.js';
import { shiftDay, toDateKey } from './streaks.js';
import { DEFAULT_APPEARANCE } from './appearance.js';

/**
 * Seed demo patients for clinician dashboard demos.
 * Default companion is fox (only model with full bone-attached accessories).
 */
const today = toDateKey(new Date());

function daysAgo(n) {
  return `${shiftDay(today, -n)}T12:00:00.000Z`;
}

const patients = [
  {
    id: 'patient-maya',
    email: 'maya@demo.local',
    name: 'Maya',
    role: 'patient',
    clinicId: 'clinic-demo',
    onboarded: true,
    ...DEFAULT_APPEARANCE,
    petName: 'Maple',
    petType: 'fox',
    clinicalProfile: { heightCm: 165, weightKg: 58, dailyCalorieTarget: 2100, customGoals: ['Two gentle apple moments this week'] },
    // password: demo
    passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
    createdAt: daysAgo(40),
  },
  {
    id: 'patient-jordan',
    email: 'jordan@demo.local',
    name: 'Jordan',
    role: 'patient',
    clinicId: 'clinic-demo',
    onboarded: true,
    ...DEFAULT_APPEARANCE,
    petType: 'fox',
    clinicalProfile: { heightCm: 178, weightKg: 72, dailyCalorieTarget: 2400, customGoals: [] },
    passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
    createdAt: daysAgo(40),
  },
  {
    id: 'patient-sam',
    email: 'sam@demo.local',
    name: 'Sam',
    role: 'patient',
    clinicId: 'clinic-demo',
    onboarded: true,
    ...DEFAULT_APPEARANCE,
    petType: 'fox',
    clinicalProfile: { heightCm: 170, weightKg: 64, dailyCalorieTarget: 2200, customGoals: ['Add an afternoon snack when it feels manageable'] },
    passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
    createdAt: daysAgo(40),
  },
  // Other-clinic patient — must not appear for clinic@demo.local
  {
    id: 'patient-alex-other',
    email: 'alex@other.local',
    name: 'Alex (other clinic)',
    role: 'patient',
    clinicId: 'clinic-other',
    onboarded: true,
    ...DEFAULT_APPEARANCE,
    petType: 'fox',
    passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
    createdAt: daysAgo(40),
  },
];

const clinician = {
  id: 'clinician-demo',
  email: 'clinic@demo.local',
  name: 'Dr. Lee',
  role: 'clinician',
  clinicId: 'clinic-demo',
  onboarded: true,
  // password: demo (bcrypt hash for "demo")
  passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
  createdAt: daysAgo(60),
};

// Maya: consistent logger
const mayaCheckIns = [];
for (let i = 0; i < 12; i++) {
  if (i === 3 || i === 7) continue; // a couple of gaps
  mayaCheckIns.push({
    id: uuid(),
    userId: 'patient-maya',
    createdAt: daysAgo(i),
    photoUrl: null,
  });
}

// Jordan: 6 consecutive misses (alert)
const jordanCheckIns = [];
for (let i = 6; i < 20; i++) {
  jordanCheckIns.push({
    id: uuid(),
    userId: 'patient-jordan',
    createdAt: daysAgo(i),
    photoUrl: null,
  });
}

// Sam: sharp drop — logged heavily days 11–20 ago, sparse recently
const samCheckIns = [];
for (let i = 11; i <= 20; i++) {
  samCheckIns.push({
    id: uuid(),
    userId: 'patient-sam',
    createdAt: daysAgo(i),
    photoUrl: null,
  });
}
samCheckIns.push({
  id: uuid(),
  userId: 'patient-sam',
  createdAt: daysAgo(9),
  photoUrl: null,
});

const analyses = {};
let i = 0;
for (const c of [...mayaCheckIns, ...jordanCheckIns, ...samCheckIns]) {
  const meal = mockAnalyze(`${c.userId}:${c.id}:${i++}`);
  analyses[c.id] = {
    checkInId: c.id,
    userId: c.userId,
    createdAt: c.createdAt,
    ...meal,
    notes: 'Seeded demo analysis (varied mock meals — not live vision)',
  };
}

writeDb({
  users: [...patients, clinician],
  checkIns: [...mayaCheckIns, ...jordanCheckIns, ...samCheckIns],
  unlocks: {
    'patient-maya': [
      {
        milestoneDay: 5,
        type: 'accessory',
        id: 'soft_scarf',
        label: 'Soft scarf',
        unlockedAt: daysAgo(5),
      },
      {
        milestoneDay: 10,
        type: 'background',
        id: 'sunny_meadow',
        label: 'Sunny meadow',
        unlockedAt: daysAgo(1),
      },
    ],
  },
  analyses,
  summaries: {},
  alerts: [],
  clinicianNotes: {},
  checkupCelebrations: {},
  clinicianReminders: {},
});

console.log(
  'Seeded demo data: Maya (steady), Jordan (misses), Sam (drop), clinic@demo.local — default companion = fox'
);
