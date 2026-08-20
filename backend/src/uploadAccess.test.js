import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { decideUploadAccess, findCheckInByUploadFile } from './uploadAccess.js';
import { signToken } from './auth.js';

describe('uploadAccess helpers', () => {
  const checkIn = {
    id: 'c1',
    userId: 'patient-a',
    photoUrl: '/uploads/meal-a.jpg',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
  const patientA = { id: 'patient-a', role: 'patient', clinicId: 'clinic-a' };
  const clinicianSame = { id: 'clinician-1', role: 'clinician', clinicId: 'clinic-a' };
  const clinicianOther = { id: 'clinician-2', role: 'clinician', clinicId: 'clinic-b' };

  it('finds check-in by upload basename', () => {
    const db = { checkIns: [checkIn] };
    assert.equal(findCheckInByUploadFile(db, 'meal-a.jpg')?.userId, 'patient-a');
    assert.equal(findCheckInByUploadFile(db, '../meal-a.jpg')?.userId, 'patient-a');
    assert.equal(findCheckInByUploadFile(db, 'missing.jpg'), null);
  });

  it('unauthenticated → 401', () => {
    const d = decideUploadAccess(null, checkIn);
    assert.equal(d.ok, false);
    assert.equal(d.status, 401);
  });

  it('patient A requesting patient B photo → 403', () => {
    const d = decideUploadAccess({ sub: 'patient-b', role: 'patient' }, checkIn);
    assert.equal(d.ok, false);
    assert.equal(d.status, 403);
  });

  it('patient requesting own photo → ok', () => {
    const d = decideUploadAccess({ sub: 'patient-a', role: 'patient' }, checkIn);
    assert.equal(d.ok, true);
  });

  it('same-clinic clinician → ok', () => {
    const d = decideUploadAccess({ sub: 'clinician-1', role: 'clinician' }, checkIn, {
      clinicianUser: clinicianSame,
      patientUser: patientA,
    });
    assert.equal(d.ok, true);
  });

  it('cross-clinic clinician → 403', () => {
    const d = decideUploadAccess({ sub: 'clinician-2', role: 'clinician' }, checkIn, {
      clinicianUser: clinicianOther,
      patientUser: patientA,
    });
    assert.equal(d.ok, false);
    assert.equal(d.status, 403);
  });

  it('clinician without clinic context → 403', () => {
    const d = decideUploadAccess({ sub: 'clinician-1', role: 'clinician' }, checkIn);
    assert.equal(d.ok, false);
    assert.equal(d.status, 403);
  });

  it('authenticated but unknown file → 404 (no existence leak to anon)', () => {
    const d = decideUploadAccess({ sub: 'patient-a', role: 'patient' }, null);
    assert.equal(d.ok, false);
    assert.equal(d.status, 404);
  });
});

describe('GET /uploads/:file HTTP', () => {
  let server;
  let baseUrl;
  let tmpDir;
  const patientA = {
    id: 'patient-a',
    role: 'patient',
    email: 'a@demo.local',
    clinicId: 'clinic-a',
  };
  const patientB = {
    id: 'patient-b',
    role: 'patient',
    email: 'b@demo.local',
    clinicId: 'clinic-b',
  };
  const clinician = {
    id: 'clinician-1',
    role: 'clinician',
    email: 'c@demo.local',
    clinicId: 'clinic-a',
  };

  before(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kindplate-uploads-'));
    fs.writeFileSync(path.join(tmpDir, 'meal-a.jpg'), Buffer.from('fake-jpeg-a'));
    fs.writeFileSync(path.join(tmpDir, 'meal-b.jpg'), Buffer.from('fake-jpeg-b'));

    const db = {
      users: [patientA, patientB, clinician],
      checkIns: [
        {
          id: 'c-a',
          userId: patientA.id,
          photoUrl: '/uploads/meal-a.jpg',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        {
          id: 'c-b',
          userId: patientB.id,
          photoUrl: '/uploads/meal-b.jpg',
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ],
    };

    const { requireAuth } = await import('./auth.js');
    const app = express();
    app.get('/uploads/:file', requireAuth(), (req, res) => {
      const filename = path.basename(req.params.file);
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
      const filePath = path.join(tmpDir, filename);
      if (!fs.existsSync(filePath)) return res.status(404).end();
      res.sendFile(filePath);
    });

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', resolve);
    });
    const { port } = server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('unauthenticated request → 401', async () => {
    const res = await fetch(`${baseUrl}/uploads/meal-a.jpg`);
    assert.equal(res.status, 401);
  });

  it('patient A requesting patient B photo → 403', async () => {
    const token = signToken(patientA);
    const res = await fetch(`${baseUrl}/uploads/meal-b.jpg`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
  });

  it('patient requesting their own photo → 200', async () => {
    const token = signToken(patientA);
    const res = await fetch(`${baseUrl}/uploads/meal-a.jpg`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.toString(), 'fake-jpeg-a');
  });

  it('same-clinic clinician → 200', async () => {
    const token = signToken(clinician);
    const res = await fetch(`${baseUrl}/uploads/meal-a.jpg`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 200);
    const buf = Buffer.from(await res.arrayBuffer());
    assert.equal(buf.toString(), 'fake-jpeg-a');
  });

  it('cross-clinic clinician → 403', async () => {
    const token = signToken(clinician);
    const res = await fetch(`${baseUrl}/uploads/meal-b.jpg`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(res.status, 403);
  });
});
