import fs from 'fs';
import path from 'path';
import { clinicianCanAccessPatient } from './clinicAccess.js';

/**
 * Resolve on-disk path for a check-in photo (basename-safe).
 */
export function resolveCheckInPhotoPath(uploadsDir, checkIn) {
  if (!checkIn) return null;
  if (checkIn.photoPath) {
    const base = path.basename(checkIn.photoPath);
    return path.join(uploadsDir, base);
  }
  if (checkIn.photoUrl) {
    return path.join(uploadsDir, path.basename(checkIn.photoUrl));
  }
  return null;
}

/**
 * Patient owner or same-clinic clinician may delete a meal photo.
 */
export function canDeleteCheckInPhoto(auth, checkIn, { clinicianUser, patientUser } = {}) {
  if (!auth || !checkIn) return false;
  if (auth.role === 'patient' && auth.sub === checkIn.userId) return true;
  if (auth.role === 'clinician') {
    return clinicianCanAccessPatient(clinicianUser, patientUser);
  }
  return false;
}

/**
 * Remove photo file (if present) and strip check-in + analysis from a db object.
 * Mutates `db` in place; returns { deletedFile, hadRecord }.
 */
export function purgeCheckInPhoto(db, uploadsDir, checkInId) {
  const checkIn = (db.checkIns || []).find((c) => c.id === checkInId);
  if (!checkIn) {
    return { deletedFile: false, hadRecord: false };
  }

  let deletedFile = false;
  const diskPath = resolveCheckInPhotoPath(uploadsDir, checkIn);
  if (diskPath && fs.existsSync(diskPath)) {
    fs.unlinkSync(diskPath);
    deletedFile = true;
  }

  db.checkIns = (db.checkIns || []).filter((c) => c.id !== checkInId);
  if (db.analyses && db.analyses[checkInId]) {
    delete db.analyses[checkInId];
  }

  return { deletedFile, hadRecord: true };
}
