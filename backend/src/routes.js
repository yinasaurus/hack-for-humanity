import { v4 as uuid } from 'uuid';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { readDb, updateDb, DATA_DIR } from './db.js';
import {
  currentStreak,
  milestonesReached,
  petMood,
  rewardForMilestone,
  uniqueSortedDays,
  walksUnlocked,
  checkInRate,
  toDateKey,
  shiftDay,
  vitalityState,
} from './streaks.js';
import { evaluateAlerts } from './alerts.js';
import { analyzeFoodPhoto, generateClinicianSummary, isNotAMeal, NOT_A_MEAL_ERROR, hasLiveAi, aiProvider, planGentleCareSchedule } from './ai.js';
import { appearanceFromUser, applyAppearancePatch, DEFAULT_APPEARANCE } from './appearance.js';
import { publicUser, requireAuth, signToken } from './auth.js';
import { decideUploadAccess, findCheckInByUploadFile } from './uploadAccess.js';
import {
  canDeleteCheckInPhoto,
  purgeCheckInPhoto,
} from './deletePhoto.js';
import {
  clinicIdOf,
  clinicianCanAccessPatient,
  patientsInClinic,
  DEFAULT_CLINIC_ID,
} from './clinicAccess.js';
import {
  listCelebrationsForPatient,
  normalizeAttendedOn,
  normalizeEncouragementNote,
  pendingCelebrationForPatient,
  toPatientPendingCelebration,
} from './checkupCelebration.js';
import {
  getClinicianReminder,
  normalizeReminderFrequency,
  normalizeReminderHour,
  normalizeReminderNote,
} from './clinicianReminder.js';
import {
  redistributePendingSlots,
  toPatientCarePlan,
} from './careSchedule.js';
import {
  clinicalProfileFromUser,
  normalizeClinicalProfile,
  patientReminderFromClinicalProfile,
} from './clinical.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS)) fs.mkdirSync(UPLOADS, { recursive: true });

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

/** Strip nutrition fields — patient payloads must never include these. */
export function toPatientSafeCheckIn(checkIn) {
  return {
    id: checkIn.id,
    userId: checkIn.userId,
    createdAt: checkIn.createdAt,
    photoUrl: checkIn.photoUrl,
    // Intentionally no analysis / nutrition fields
  };
}

export function toPatientCompanionState(userId) {
  const db = readDb();
  const user = db.users.find((u) => u.id === userId);
  const checkIns = db.checkIns.filter((c) => c.userId === userId);
  // Compute streaks/milestones server-side; do not expose counts to patients.
  const streak = currentStreak(checkIns);
  const totalDays = uniqueSortedDays(checkIns).length;
  const mood = petMood(checkIns);
  const analyses = Object.values(db.analyses || {}).filter((a) => a.userId === userId);
  const { metrics: clinicalMetrics } = evaluateAlerts(user || {}, checkIns, analyses);
  const latestAt = [...checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]?.createdAt;
  const recentlyRestored = latestAt && Date.now() - new Date(latestAt).getTime() < 24 * 36e5;
  const vitality = vitalityState(
    checkIns,
    recentlyRestored ? null : clinicalMetrics.dailyDeficitPct,
    new Date(),
    user?.createdAt
  );
  const milestoneDays = milestonesReached(totalDays);
  const unlocks = db.unlocks[userId] || [];
  const newUnlocks = [];

  for (const day of milestoneDays) {
    if (!unlocks.some((u) => u.milestoneDay === day)) {
      const reward = rewardForMilestone(day);
      newUnlocks.push({
        milestoneDay: day,
        ...reward,
        unlockedAt: new Date().toISOString(),
      });
    }
  }

  if (newUnlocks.length) {
    updateDb((d) => {
      d.unlocks[userId] = [...(d.unlocks[userId] || []), ...newUnlocks];
    });
  }

  const allUnlocks = [...unlocks, ...newUnlocks];
  const appearance = appearanceFromUser(user);
  const pendingCheckup = pendingCelebrationForPatient(db, userId);
  const clinicianReminder = toPatientCarePlan(getClinicianReminder(db, userId));

  return {
    mood,
    vitality,
    walksAvailable: walksUnlocked(checkIns),
    unlocks: allUnlocks,
    newlyUnlocked: newUnlocks,
    helloDays: uniqueSortedDays(checkIns),
    checkupCelebration: toPatientPendingCelebration(pendingCheckup),
    clinicianReminder,
    careGoals: patientReminderFromClinicalProfile(user?.clinicalProfile),
    ...appearance,
    // No calories, macros, scores, streak counts, or days-since metrics
  };
}

async function saveCheckInFromBuffer(user, buffer, mimeType) {
  // Meal gate runs before we log — non-food photos must not create a check-in.
  // (This waits on vision; client still captures smaller JPEGs to keep it quicker.)
  const analysis = await analyzeFoodPhoto({
    imageBase64: buffer.toString('base64'),
    mimeType: mimeType || 'image/jpeg',
  });

  if (isNotAMeal(analysis)) {
    const err = new Error(NOT_A_MEAL_ERROR);
    err.status = 400;
    err.code = 'NOT_A_MEAL';
    throw err;
  }

  const checkInId = uuid();
  const ext = (mimeType || '').includes('png') ? 'png' : 'jpg';
  const filename = `${checkInId}.${ext}`;
  const diskPath = path.join(UPLOADS, filename);
  fs.writeFileSync(diskPath, buffer);

  const createdAt = new Date().toISOString();
  const checkIn = {
    id: checkInId,
    userId: user.id,
    createdAt,
    photoUrl: `/uploads/${filename}`,
    photoPath: diskPath,
  };

  updateDb((d) => {
    d.checkIns.push(checkIn);
    d.analyses[checkInId] = {
      checkInId,
      userId: user.id,
      createdAt,
      ...analysis,
      pending: false,
      alertSeverity: evaluateAlerts(
        user,
        d.checkIns.filter((c) => c.userId === user.id),
        [...Object.values(d.analyses).filter((a) => a.userId === user.id), { createdAt, ...analysis }]
      ).metrics.intakeSeverity,
    };
  });

  return {
    checkIn: toPatientSafeCheckIn(checkIn),
    companion: toPatientCompanionState(user.id),
  };
}

export function registerRoutes(app) {
  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      aiStatus: hasLiveAi() ? 'live' : 'mock',
      aiProvider: aiProvider(),
    });
  });

  // --- Auth ---
  app.post('/api/auth/signup', async (req, res) => {
    const { email, password, name } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: 'password should be at least 6 characters' });
    }
    const normalized = String(email).trim().toLowerCase();
    const db = readDb();
    if (db.users.some((u) => u.email === normalized && u.role === 'patient')) {
      return res.status(409).json({ error: 'An account with this email already exists. Try logging in.' });
    }
    const bcrypt = (await import('bcryptjs')).default;
    const passwordHash = await bcrypt.hash(String(password), 10);
    const user = {
      id: uuid(),
      email: normalized,
      name: (name && String(name).trim()) || normalized.split('@')[0],
      role: 'patient',
      clinicId: DEFAULT_CLINIC_ID,
      onboarded: false,
      ...DEFAULT_APPEARANCE,
      petType: 'fox',
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    updateDb((d) => {
      d.users.push(user);
    });
    const safe = publicUser(user);
    res.status(201).json({ user: safe, token: signToken(user) });
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body || {};
    const userRole = role || 'patient';
    if (!email) {
      return res.status(400).json({ error: 'email required' });
    }
    const normalized = String(email).trim().toLowerCase();
    const db = readDb();
    let user = db.users.find((u) => u.email === normalized && u.role === userRole);

    if (!user && userRole === 'patient' && !password) {
      return res.status(404).json({ error: 'No account found. Please sign up first.' });
    }

    if (!user && userRole === 'clinician') {
      user = {
        id: uuid(),
        email: normalized,
        name: normalized.split('@')[0],
        role: 'clinician',
        clinicId: DEFAULT_CLINIC_ID,
        onboarded: true,
        createdAt: new Date().toISOString(),
      };
      updateDb((d) => {
        d.users.push(user);
      });
    }

    if (!user) {
      return res.status(404).json({ error: 'No account found. Please sign up first.' });
    }

    if (user.passwordHash) {
      if (!password) {
        return res.status(401).json({ error: 'password required' });
      }
      const bcrypt = (await import('bcryptjs')).default;
      const ok = await bcrypt.compare(String(password), user.passwordHash);
      if (!ok) {
        return res.status(401).json({ error: 'Email or password does not match' });
      }
    } else if (password && userRole === 'patient') {
      const bcrypt = (await import('bcryptjs')).default;
      const passwordHash = await bcrypt.hash(String(password), 10);
      updateDb((d) => {
        const u = d.users.find((x) => x.id === user.id);
        if (u) u.passwordHash = passwordHash;
      });
      user = { ...user, passwordHash };
    } else if (userRole === 'patient' && !user.passwordHash) {
      return res.status(401).json({ error: 'password required' });
    }

    res.json({ user: publicUser(user), token: signToken(user) });
  });

  app.get('/api/auth/me', requireAuth(), (req, res) => {
    const user = readDb().users.find((u) => u.id === req.auth.sub);
    if (!user) return res.status(401).json({ error: 'Please sign in again' });
    res.json({ user: publicUser(user) });
  });

  app.get('/api/users/:id', requireAuth(), (req, res) => {
    if (req.auth.sub !== req.params.id && req.auth.role !== 'clinician') {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const user = readDb().users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json({ user: publicUser(user) });
  });

  app.post('/api/users/:id/onboarded', requireAuth(), (req, res) => {
    if (req.auth.sub !== req.params.id) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    updateDb((d) => {
      const u = d.users.find((x) => x.id === req.params.id);
      if (u) u.onboarded = true;
    });
    const user = readDb().users.find((u) => u.id === req.params.id);
    res.json({ user: publicUser(user) });
  });

  // Atomic first-run setup: validates the avatar/name and only then marks onboarding complete.
  app.post('/api/patient/:userId/onboarding', requireAuth(['patient']), (req, res) => {
    if (req.auth.sub !== req.params.userId) return res.status(403).json({ error: 'Not allowed' });
    const petName = String(req.body?.petName || '').trim();
    if (!petName) return res.status(400).json({ error: 'petName required' });
    let found = false;
    updateDb((d) => {
      const user = d.users.find((u) => u.id === req.params.userId && u.role === 'patient');
      if (!user) return;
      found = true;
      applyAppearancePatch(user, { petType: req.body?.petType, petName });
      user.onboarded = true;
    });
    if (!found) return res.status(404).json({ error: 'patient not found' });
    const user = readDb().users.find((u) => u.id === req.params.userId);
    res.json({ user: publicUser(user), companion: toPatientCompanionState(user.id) });
  });

  // Cosmetic pet appearance only (species/color/outfits/scenes — never size/body)
  app.patch('/api/patient/:userId/appearance', requireAuth(['patient']), (req, res) => {
    if (req.auth.sub !== req.params.userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    updateDb((d) => {
      const u = d.users.find((x) => x.id === req.params.userId && x.role === 'patient');
      if (!u) return;
      applyAppearancePatch(u, req.body || {});
    });

    const user = readDb().users.find((u) => u.id === req.params.userId);
    if (!user) return res.status(404).json({ error: 'patient not found' });
    res.json({
      appearance: appearanceFromUser(user),
      companion: toPatientCompanionState(user.id),
    });
  });

  // --- Patient: companion state (no nutrition) ---
  app.get('/api/patient/:userId/companion', requireAuth(['patient']), (req, res) => {
    if (req.auth.sub !== req.params.userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const user = readDb().users.find((u) => u.id === req.params.userId);
    if (!user || user.role !== 'patient') {
      return res.status(404).json({ error: 'patient not found' });
    }
    res.json(toPatientCompanionState(user.id));
  });

  /** Patient acknowledges a checkup celebration (one-time; does not repeat). */
  app.post(
    '/api/patient/:userId/checkup-celebration/:celebrationId/ack',
    requireAuth(['patient']),
    (req, res) => {
      if (req.auth.sub !== req.params.userId) {
        return res.status(403).json({ error: 'Not allowed' });
      }
      const user = readDb().users.find((u) => u.id === req.params.userId);
      if (!user || user.role !== 'patient') {
        return res.status(404).json({ error: 'patient not found' });
      }

      let found = false;
      updateDb((d) => {
        if (!d.checkupCelebrations) d.checkupCelebrations = {};
        const list = d.checkupCelebrations[user.id] || [];
        const record = list.find((c) => c.id === req.params.celebrationId);
        if (!record) return;
        found = true;
        if (!record.acknowledgedAt) {
          record.acknowledgedAt = new Date().toISOString();
        }
      });

      if (!found) return res.status(404).json({ error: 'celebration not found' });
      res.json(toPatientCompanionState(user.id));
    }
  );

  app.get('/api/patient/:userId/check-ins', requireAuth(['patient']), (req, res) => {
    if (req.auth.sub !== req.params.userId) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    const checkIns = readDb()
      .checkIns.filter((c) => c.userId === req.params.userId)
      .map(toPatientSafeCheckIn)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ checkIns });
  });

  // Camera photo upload — multipart OR JSON base64 (Expo-friendly)
  app.post(
    '/api/patient/:userId/check-in',
    requireAuth(['patient']),
    upload.single('photo'),
    async (req, res) => {
      try {
        if (req.auth.sub !== req.params.userId) {
          return res.status(403).json({ error: 'Not allowed' });
        }
        const user = readDb().users.find((u) => u.id === req.params.userId);
        if (!user || user.role !== 'patient') {
          return res.status(404).json({ error: 'patient not found' });
        }

        let buffer = req.file?.buffer || null;
        let mimeType = req.file?.mimetype || 'image/jpeg';

        if (!buffer && req.body?.imageBase64) {
          const raw = String(req.body.imageBase64).replace(/^data:[^;]+;base64,/, '');
          buffer = Buffer.from(raw, 'base64');
          mimeType = req.body.mimeType || 'image/jpeg';
        }

        if (!buffer || buffer.length === 0) {
          return res.status(400).json({ error: 'photo required' });
        }

        const result = await saveCheckInFromBuffer(user, buffer, mimeType);
        res.status(201).json(result);
      } catch (err) {
        console.error('check-in error:', err);
        if (err?.code === 'NOT_A_MEAL' || err?.status === 400) {
          return res.status(400).json({
            error: err.message || NOT_A_MEAL_ERROR,
            code: 'NOT_A_MEAL',
          });
        }
        if (err?.code === 'VISION_UNAVAILABLE' || err?.status === 503) {
          return res.status(503).json({
            error: err.message || 'We couldn’t check that photo right now. Please try again in a moment.',
            code: 'VISION_UNAVAILABLE',
          });
        }
        res.status(500).json({ error: 'Could not save check-in right now' });
      }
    }
  );

  // --- Standalone AI routes (easy to demo independently) ---
  app.post('/api/analyze-photo', requireAuth(['clinician']), upload.single('photo'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'photo required' });
    try {
      const analysis = await analyzeFoodPhoto({
        imageBase64: req.file.buffer.toString('base64'),
        mimeType: req.file.mimetype || 'image/jpeg',
      });
      if (isNotAMeal(analysis)) {
        return res.status(400).json({
          error: 'Photo does not appear to be a meal. No estimate stored.',
          code: 'NOT_A_MEAL',
          analysis,
        });
      }
      res.json({ analysis });
    } catch (err) {
      if (err?.code === 'VISION_UNAVAILABLE') {
        return res.status(503).json({ error: err.message, code: 'VISION_UNAVAILABLE' });
      }
      console.error('analyze-photo error:', err);
      res.status(500).json({ error: 'Could not analyze photo' });
    }
  });

  app.post('/api/generate-summary', requireAuth(['clinician']), async (req, res) => {
    const { patientId } = req.body || {};
    if (!patientId) return res.status(400).json({ error: 'patientId required' });

    const db = readDb();
    const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
    if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
    const patient = db.users.find((u) => u.id === patientId && u.role === 'patient');
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!clinicianCanAccessPatient(clinician, patient)) {
      return res.status(403).json({ error: 'Not allowed for this clinic' });
    }

    const checkIns = db.checkIns.filter((c) => c.userId === patientId);
    const analyses = Object.values(db.analyses).filter((a) => a.userId === patientId);
    const { alerts, metrics } = evaluateAlerts(patient, checkIns, analyses);

    const ai = await generateClinicianSummary({
      patientName: patient.name,
      metrics,
      analyses,
      alertReasons: alerts.map((a) => a.reason),
    });

    const summaryRecord = {
      patientId,
      createdAt: new Date().toISOString(),
      ...ai,
      metrics,
    };

    updateDb((d) => {
      d.summaries[patientId] = summaryRecord;
      // Refresh alerts for this patient
      d.alerts = [
        ...d.alerts.filter((a) => a.patientId !== patientId),
        ...alerts.map((a) => ({ id: uuid(), ...a })),
      ];
      if (ai.shouldAlert && ai.alertReason) {
        const exists = d.alerts.some(
          (a) => a.patientId === patientId && a.reason === ai.alertReason
        );
        if (!exists) {
          d.alerts.push({
            id: uuid(),
            patientId,
            patientName: patient.name,
            reason: ai.alertReason,
            severity: 'attention',
            createdAt: new Date().toISOString(),
          });
        }
      }
    });

    res.json({ summary: summaryRecord, alerts: readDb().alerts.filter((a) => a.patientId === patientId) });
  });

  // --- Clinician endpoints (scoped to clinician's clinicId) ---
  app.get('/api/clinician/patients', requireAuth(['clinician']), (req, res) => {
    const db = readDb();
    const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
    if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
    const clinicId = clinicIdOf(clinician);
    const patients = patientsInClinic(db, clinicId).map((p) => {
      const checkIns = db.checkIns.filter((c) => c.userId === p.id);
      return {
        id: p.id,
        name: p.name,
        email: p.email,
        clinicId: clinicIdOf(p),
        rate7: checkInRate(checkIns, 7),
        rate30: checkInRate(checkIns, 30),
        streak: currentStreak(checkIns),
        lastCheckIn: checkIns.sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
          ?.createdAt,
        totalDays: uniqueSortedDays(checkIns).length,
      };
    });
    res.json({ patients, clinicId });
  });

  app.get('/api/clinician/patients/:id', requireAuth(['clinician']), (req, res) => {
    const db = readDb();
    const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
    if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
    const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
    if (!patient) return res.status(404).json({ error: 'not found' });
    if (!clinicianCanAccessPatient(clinician, patient)) {
      return res.status(403).json({ error: 'Not allowed for this clinic' });
    }

    const checkIns = db.checkIns
      .filter((c) => c.userId === patient.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const analyses = checkIns.map((c) => db.analyses[c.id]).filter(Boolean);
    const summary = db.summaries[patient.id] || null;
    const { alerts, metrics } = evaluateAlerts(patient, checkIns, analyses);

    const today = toDateKey(new Date());
    const loggedDays = new Set(uniqueSortedDays(checkIns));
    const consistency30 = [];
    for (let i = 29; i >= 0; i--) {
      const key = shiftDay(today, -i);
      consistency30.push({ date: key, logged: loggedDays.has(key) });
    }

    const calorieTrend = analyses
      .filter(
        (a) =>
          a.isMeal !== false &&
          a.confidence !== 'low' &&
          a.estimatedCalories > 0
      )
      .slice(-14)
      .map((a) => ({
        date: (a.createdAt || '').slice(0, 10),
        estimatedCalories: a.estimatedCalories,
        foodType: a.foodType,
        confidence: a.confidence,
      }));

    res.json({
      patient: {
        id: patient.id,
        name: patient.name,
        email: patient.email,
        clinicId: clinicIdOf(patient),
        clinicalProfile: clinicalProfileFromUser(patient),
      },
      metrics,
      consistency30,
      calorieTrend,
      clinicianNotes: db.clinicianNotes?.[patient.id] || [],
      checkupCelebrations: listCelebrationsForPatient(db, patient.id).map((c) => ({
        id: c.id,
        attendedOn: c.attendedOn,
        note: c.note || null,
        createdAt: c.createdAt,
        acknowledgedAt: c.acknowledgedAt || null,
      })),
      clinicianReminder: getClinicianReminder(db, patient.id),
      checkIns: checkIns.map((c) => ({
        ...toPatientSafeCheckIn(c),
        analysis: db.analyses[c.id] || null,
      })),
      summary,
      alerts,
      aiStatus: hasLiveAi() ? 'live' : 'mock',
      aiProvider: aiProvider(),
    });
  });

  app.patch('/api/clinician/patient/:id/clinical', requireAuth(['clinician']), async (req, res) => {
    const db = readDb();
    const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
    const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
    if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!clinicianCanAccessPatient(clinician, patient)) return res.status(403).json({ error: 'Not allowed for this clinic' });
    let clinicalProfile;
    try {
      clinicalProfile = normalizeClinicalProfile(req.body || {}, patient.clinicalProfile);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
    updateDb((d) => {
      const target = d.users.find((u) => u.id === patient.id);
      target.clinicalProfile = clinicalProfile;
    });
    res.json({ clinicalProfile });
  });

  const createDigest = async (req, res) => {
    const db = readDb();
    const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
    const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
    if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
    if (!patient) return res.status(404).json({ error: 'patient not found' });
    if (!clinicianCanAccessPatient(clinician, patient)) return res.status(403).json({ error: 'Not allowed for this clinic' });
    const weeks = Math.min(12, Math.max(1, Number(req.query.weeks) || 4));
    const cutoff = Date.now() - weeks * 7 * 864e5;
    const checkIns = db.checkIns.filter((c) => c.userId === patient.id && new Date(c.createdAt).getTime() >= cutoff);
    const analyses = Object.values(db.analyses).filter((a) => a.userId === patient.id && new Date(a.createdAt).getTime() >= cutoff);
    const { alerts, metrics } = evaluateAlerts(patient, checkIns, analyses);
    const digest = await generateClinicianSummary({ patientName: patient.name, metrics, analyses, alertReasons: alerts.map((a) => a.reason) });
    const record = { patientId: patient.id, weeks, createdAt: new Date().toISOString(), ...digest, metrics };
    updateDb((d) => { d.summaries[patient.id] = record; });
    res.json({ digest: record, alerts });
  };
  app.get('/api/clinician/patient/:id/digest', requireAuth(['clinician']), createDigest);
  app.post('/api/clinician/patient/:id/digest', requireAuth(['clinician']), createDigest);

  /**
   * Clinician-scheduled reminder — note + frequency; optional Gemini gentle care plan.
   */
  app.post(
    '/api/clinician/patients/:id/reminder',
    requireAuth(['clinician']),
    async (req, res) => {
      const db = readDb();
      const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
      if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
      const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
      if (!patient) return res.status(404).json({ error: 'not found' });
      if (!clinicianCanAccessPatient(clinician, patient)) {
        return res.status(403).json({ error: 'Not allowed for this clinic' });
      }

      const note = normalizeReminderNote(req.body?.note);
      const frequency = normalizeReminderFrequency(req.body?.frequency);
      if (!note) return res.status(400).json({ error: 'reminder note required' });
      if (!frequency) {
        return res.status(400).json({
          error: 'frequency must be daily, weekly, every_2_days, or every_3_days',
        });
      }

      let carePlan = null;
      if (req.body?.planWithAi || req.body?.carePlan) {
        if (req.body?.carePlan?.slots) {
          const { normalizePlan } = await import('./careSchedule.js');
          carePlan = normalizePlan(req.body.carePlan, note);
        } else {
          carePlan = await planGentleCareSchedule(note);
        }
      }

      const reminder = {
        id: uuid(),
        note,
        frequency,
        hour: normalizeReminderHour(req.body?.hour ?? req.body?.timeOfDay),
        carePlan,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: clinician.id,
      };

      updateDb((d) => {
        if (!d.clinicianReminders) d.clinicianReminders = {};
        d.clinicianReminders[patient.id] = reminder;
      });

      res.status(201).json({ reminder });
    }
  );

  /** Preview a Gemini/mock gentle schedule without saving. */
  app.post(
    '/api/clinician/patients/:id/reminder/plan',
    requireAuth(['clinician']),
    async (req, res) => {
      const db = readDb();
      const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
      if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
      const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
      if (!patient) return res.status(404).json({ error: 'not found' });
      if (!clinicianCanAccessPatient(clinician, patient)) {
        return res.status(403).json({ error: 'Not allowed for this clinic' });
      }
      const note = normalizeReminderNote(req.body?.note);
      if (!note) return res.status(400).json({ error: 'reminder note required' });
      const carePlan = await planGentleCareSchedule(note);
      res.json({ carePlan, aiProvider: aiProvider() });
    }
  );

  app.delete(
    '/api/clinician/patients/:id/reminder',
    requireAuth(['clinician']),
    (req, res) => {
      const db = readDb();
      const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
      if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
      const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
      if (!patient) return res.status(404).json({ error: 'not found' });
      if (!clinicianCanAccessPatient(clinician, patient)) {
        return res.status(403).json({ error: 'Not allowed for this clinic' });
      }

      updateDb((d) => {
        if (!d.clinicianReminders) d.clinicianReminders = {};
        delete d.clinicianReminders[patient.id];
      });

      res.json({ ok: true });
    }
  );

  /** Patient: move today's (or overdue) pending moments later — no catch-up stacking. */
  app.post(
    '/api/patient/:userId/care-plan/skip-today',
    requireAuth(['patient']),
    (req, res) => {
      if (req.auth.sub !== req.params.userId) {
        return res.status(403).json({ error: 'Not allowed' });
      }
      const user = readDb().users.find((u) => u.id === req.params.userId);
      if (!user || user.role !== 'patient') {
        return res.status(404).json({ error: 'patient not found' });
      }

      const today = toDateKey(new Date());
      let ok = false;
      updateDb((d) => {
        if (!d.clinicianReminders?.[user.id]?.carePlan?.slots) return;
        const reminder = d.clinicianReminders[user.id];
        const plan = reminder.carePlan;
        const stay = plan.slots.filter(
          (s) => s.status !== 'pending' || String(s.date) > today
        );
        const toMove = plan.slots.filter(
          (s) => s.status === 'pending' && String(s.date) <= today
        );
        if (!toMove.length) {
          ok = true;
          return;
        }
        const from = shiftDay(today, 1);
        let end = plan.endDate || shiftDay(today, Math.max(1, (plan.windowDays || 7) - 1));
        if (end < from) end = shiftDay(from, Math.max(0, toMove.length - 1));
        const moved = redistributePendingSlots(toMove, from, end);
        reminder.carePlan = {
          ...plan,
          endDate: end,
          slots: [...stay, ...moved].sort((a, b) => String(a.date).localeCompare(String(b.date))),
          updatedAt: new Date().toISOString(),
        };
        reminder.updatedAt = new Date().toISOString();
        ok = true;
      });

      if (!ok) return res.status(404).json({ error: 'no care plan' });
      res.json(toPatientCompanionState(user.id));
    }
  );

  /**
   * Clinician manually logs that a checkup was attended.
   * Fields: attendedOn (date) + optional free-text note only — no body metrics.
   */
  app.post(
    '/api/clinician/patients/:id/checkup-celebration',
    requireAuth(['clinician']),
    (req, res) => {
      const db = readDb();
      const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
      if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
      const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
      if (!patient) return res.status(404).json({ error: 'not found' });
      if (!clinicianCanAccessPatient(clinician, patient)) {
        return res.status(403).json({ error: 'Not allowed for this clinic' });
      }

      const celebration = {
        id: uuid(),
        attendedOn: normalizeAttendedOn(req.body?.attendedOn),
        note: normalizeEncouragementNote(req.body?.note),
        createdAt: new Date().toISOString(),
        createdBy: clinician.id,
        acknowledgedAt: null,
      };

      updateDb((d) => {
        if (!d.checkupCelebrations) d.checkupCelebrations = {};
        if (!d.checkupCelebrations[patient.id]) d.checkupCelebrations[patient.id] = [];
        d.checkupCelebrations[patient.id].unshift(celebration);
      });

      res.status(201).json({ celebration });
    }
  );

  app.post('/api/clinician/patients/:id/notes', requireAuth(['clinician']), (req, res) => {
    const text = String(req.body?.text || '').trim().slice(0, 2000);
    if (!text) return res.status(400).json({ error: 'note text required' });
    const db = readDb();
    const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
    if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
    const patient = db.users.find((u) => u.id === req.params.id && u.role === 'patient');
    if (!patient) return res.status(404).json({ error: 'not found' });
    if (!clinicianCanAccessPatient(clinician, patient)) {
      return res.status(403).json({ error: 'Not allowed for this clinic' });
    }

    const note = {
      id: uuid(),
      text,
      authorId: req.auth.sub,
      createdAt: new Date().toISOString(),
    };
    updateDb((d) => {
      if (!d.clinicianNotes) d.clinicianNotes = {};
      if (!d.clinicianNotes[patient.id]) d.clinicianNotes[patient.id] = [];
      d.clinicianNotes[patient.id].unshift(note);
    });
    res.status(201).json({ note });
  });

  app.get('/api/clinician/alerts', requireAuth(['clinician']), (req, res) => {
    const db = readDb();
    const clinician = db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician');
    if (!clinician) return res.status(401).json({ error: 'Please sign in again' });
    const live = [];
    for (const p of patientsInClinic(db, clinicIdOf(clinician))) {
      const checkIns = db.checkIns.filter((c) => c.userId === p.id);
      const analyses = Object.values(db.analyses).filter((a) => a.userId === p.id);
      const { alerts } = evaluateAlerts(p, checkIns, analyses);
      live.push(...alerts.map((a) => ({ id: `${p.id}-${a.reason}`, ...a })));
    }
    res.json({ alerts: live });
  });

  // Meal photos — JWT required; owner or same-clinic clinician only
  app.get('/uploads/:file', requireAuth(), (req, res) => {
    const filename = path.basename(req.params.file);
    const db = readDb();
    const checkIn = findCheckInByUploadFile(db, filename);
    const patientUser = checkIn
      ? db.users.find((u) => u.id === checkIn.userId)
      : null;
    const clinicianUser =
      req.auth.role === 'clinician'
        ? db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician')
        : null;
    const decision = decideUploadAccess(req.auth, checkIn, {
      clinicianUser,
      patientUser,
    });

    if (!decision.ok) {
      if (decision.status === 404) return res.status(404).end();
      return res.status(decision.status).json({ error: decision.error || 'Not allowed' });
    }

    const filePath = path.join(UPLOADS, filename);
    if (!fs.existsSync(filePath)) return res.status(404).end();
    res.sendFile(filePath);
  });

  /**
   * Delete a check-in meal photo: removes uploads/ file + store.json check-in/analysis.
   * Patient (owner) or same-clinic clinician.
   */
  app.delete('/api/check-ins/:id/photo', requireAuth(), (req, res) => {
    const db = readDb();
    const checkIn = db.checkIns.find((c) => c.id === req.params.id);
    if (!checkIn) return res.status(404).json({ error: 'not found' });

    const patientUser = db.users.find((u) => u.id === checkIn.userId);
    const clinicianUser =
      req.auth.role === 'clinician'
        ? db.users.find((u) => u.id === req.auth.sub && u.role === 'clinician')
        : null;

    if (!canDeleteCheckInPhoto(req.auth, checkIn, { clinicianUser, patientUser })) {
      return res.status(403).json({ error: 'Not allowed' });
    }

    let result = { deletedFile: false, hadRecord: false };
    updateDb((d) => {
      result = purgeCheckInPhoto(d, UPLOADS, checkIn.id);
    });

    res.json({
      ok: true,
      checkInId: checkIn.id,
      deletedFile: result.deletedFile,
    });
  });
}
