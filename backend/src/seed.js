import { v4 as uuid } from 'uuid';
import { writeDb } from './db.js';
import { shiftDay, toDateKey } from './streaks.js';

/**
 * Seed demo patients for clinician dashboard demos.
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
    onboarded: true,
    // password: demo
    passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
    createdAt: daysAgo(40),
  },
  {
    id: 'patient-jordan',
    email: 'jordan@demo.local',
    name: 'Jordan',
    role: 'patient',
    onboarded: true,
    passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
    createdAt: daysAgo(40),
  },
  {
    id: 'patient-sam',
    email: 'sam@demo.local',
    name: 'Sam',
    role: 'patient',
    onboarded: true,
    passwordHash: '$2b$10$v.ZZta4JZhcU1dCDcHh70.LkuhZJfOnaBAnn.7T5TcwDWyHp7dYNu',
    createdAt: daysAgo(40),
  },
];

const clinician = {
  id: 'clinician-demo',
  email: 'clinic@demo.local',
  name: 'Dr. Lee',
  role: 'clinician',
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
for (const c of [...mayaCheckIns, ...jordanCheckIns, ...samCheckIns]) {
  analyses[c.id] = {
    checkInId: c.id,
    userId: c.userId,
    createdAt: c.createdAt,
    foodType: 'Demo meal',
    estimatedCalories: 400 + Math.floor(Math.random() * 200),
    estimatedProteinG: 15,
    estimatedCarbsG: 45,
    estimatedFatG: 12,
    confidence: Math.random() > 0.85 ? 'low' : 'medium',
    notes: 'Seeded demo analysis',
    error: false,
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
});

console.log('Seeded demo data: Maya (steady), Jordan (misses), Sam (drop), clinic@demo.local');
