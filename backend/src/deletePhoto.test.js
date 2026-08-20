import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  canDeleteCheckInPhoto,
  purgeCheckInPhoto,
  resolveCheckInPhotoPath,
} from './deletePhoto.js';

describe('deletePhoto', () => {
  let tmpDir;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kindplate-delete-'));
  });

  after(() => {
    if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('owner patient can delete; other patient cannot', () => {
    const checkIn = { id: 'c1', userId: 'p1', photoUrl: '/uploads/c1.jpg' };
    assert.equal(
      canDeleteCheckInPhoto({ sub: 'p1', role: 'patient' }, checkIn),
      true
    );
    assert.equal(
      canDeleteCheckInPhoto({ sub: 'p2', role: 'patient' }, checkIn),
      false
    );
  });

  it('same-clinic clinician can delete; cross-clinic cannot', () => {
    const checkIn = { id: 'c1', userId: 'p1', photoUrl: '/uploads/c1.jpg' };
    const patient = { id: 'p1', role: 'patient', clinicId: 'clinic-a' };
    assert.equal(
      canDeleteCheckInPhoto(
        { sub: 'c1', role: 'clinician' },
        checkIn,
        {
          clinicianUser: { id: 'c1', role: 'clinician', clinicId: 'clinic-a' },
          patientUser: patient,
        }
      ),
      true
    );
    assert.equal(
      canDeleteCheckInPhoto(
        { sub: 'c2', role: 'clinician' },
        checkIn,
        {
          clinicianUser: { id: 'c2', role: 'clinician', clinicId: 'clinic-b' },
          patientUser: patient,
        }
      ),
      false
    );
  });

  it('purge removes file from disk and records from store', () => {
    const filename = 'meal-del.jpg';
    const diskPath = path.join(tmpDir, filename);
    fs.writeFileSync(diskPath, Buffer.from('photo-bytes'));

    const db = {
      checkIns: [
        {
          id: 'c-del',
          userId: 'p1',
          photoUrl: `/uploads/${filename}`,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      analyses: {
        'c-del': { checkInId: 'c-del', estimatedCalories: 100 },
      },
    };

    assert.equal(resolveCheckInPhotoPath(tmpDir, db.checkIns[0]), diskPath);
    const result = purgeCheckInPhoto(db, tmpDir, 'c-del');
    assert.equal(result.hadRecord, true);
    assert.equal(result.deletedFile, true);
    assert.equal(fs.existsSync(diskPath), false);
    assert.equal(db.checkIns.length, 0);
    assert.equal(db.analyses['c-del'], undefined);
  });

  it('purge of missing id is a no-op', () => {
    const db = { checkIns: [], analyses: {} };
    const result = purgeCheckInPhoto(db, tmpDir, 'missing');
    assert.equal(result.hadRecord, false);
    assert.equal(result.deletedFile, false);
  });
});
