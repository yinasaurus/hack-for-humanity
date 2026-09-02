/**
 * End-to-end smoke: login each seeded demo patient and assert companion state.
 * Run with backend up: node mobile/scripts/demoSwitchSmoke.mjs
 */
const API = process.env.API_URL || process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3001';

const ACCOUNTS = [
  {
    email: 'maya@demo.local',
    expect: { vitality: 'bright', petName: 'Maple', neck: 'scarf' },
  },
  {
    email: 'riley@demo.local',
    expect: { vitalityIn: ['fatigued', 'dim', 'dormant'], petName: 'Pebble' },
  },
  {
    email: 'jordan@demo.local',
    expect: { vitality: 'dormant', petName: 'Cedar' },
  },
  {
    email: 'blake@demo.local',
    expect: { vitality: 'bright', petName: 'Pip', neck: 'none' },
  },
  {
    email: 'casey@demo.local',
    expect: { vitality: 'bright', petName: 'Moss', neck: 'scarf', scene: 'sunny_meadow' },
  },
  {
    email: 'sam@demo.local',
    expect: { petName: 'Willow' },
  },
];

async function login(email) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'demo', role: 'patient' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${email}: ${data.error || res.status}`);
  return data;
}

async function companion(userId, token) {
  const res = await fetch(`${API}/api/patient/${userId}/companion`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`companion ${userId}: ${data.error || res.status}`);
  return data;
}

async function main() {
  const results = [];
  let previousUserId = null;
  for (const account of ACCOUNTS) {
    const { user, token } = await login(account.email);
    if (previousUserId && previousUserId === user.id) {
      throw new Error('session did not change between demo accounts');
    }
    const state = await companion(user.id, token);
    const e = account.expect;
    if (e.vitality && state.vitality !== e.vitality) {
      throw new Error(`${account.email}: vitality ${state.vitality} ≠ ${e.vitality}`);
    }
    if (e.vitalityIn && !e.vitalityIn.includes(state.vitality)) {
      throw new Error(`${account.email}: vitality ${state.vitality} not in ${e.vitalityIn}`);
    }
    if (e.petName && state.petName !== e.petName) {
      throw new Error(`${account.email}: petName ${state.petName} ≠ ${e.petName}`);
    }
    if (e.neck && state.neck !== e.neck) {
      throw new Error(`${account.email}: neck ${state.neck} ≠ ${e.neck}`);
    }
    if (e.scene && state.scene !== e.scene) {
      throw new Error(`${account.email}: scene ${state.scene} ≠ ${e.scene}`);
    }
    previousUserId = user.id;
    results.push({
      email: account.email,
      userId: user.id,
      petName: state.petName,
      petType: state.petType,
      vitality: state.vitality,
      neck: state.neck,
      scene: state.scene,
    });
  }

  const clinic = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'clinic@demo.local',
      password: 'demo',
      role: 'clinician',
    }),
  });
  const clinicData = await clinic.json();
  if (!clinic.ok) throw new Error(`clinic: ${clinicData.error || clinic.status}`);

  console.log(JSON.stringify({ ok: true, api: API, results, clinic: clinicData.user?.email }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
