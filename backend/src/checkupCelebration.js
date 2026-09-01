/**
 * Checkup celebration — attendance + clinician judgment only.
 * Never stores or uses body metrics (BMI, weight, scores, etc.).
 */

import { redactPatientFacingNutritionLanguage } from './patientNutritionRedact.js';

/** Patient-facing default when the clinician leaves no note. */
export const DEFAULT_CHECKUP_CELEBRATION_MESSAGE =
  'Your clinician wanted you to know they are proud of you for being here today.';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeAttendedOn(value) {
  const raw = String(value || '').trim().slice(0, 10);
  if (DATE_RE.test(raw)) return raw;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeEncouragementNote(value) {
  const note = String(value || '').trim().slice(0, 280);
  return note || null;
}

/** Message shown on the patient device — note if present, else warm default. */
export function patientFacingCelebrationMessage(note) {
  const trimmed = redactPatientFacingNutritionLanguage(String(note || '').trim());
  return trimmed || DEFAULT_CHECKUP_CELEBRATION_MESSAGE;
}

export function listCelebrationsForPatient(db, patientId) {
  if (!db.checkupCelebrations) return [];
  return db.checkupCelebrations[patientId] || [];
}

/** Oldest unacknowledged celebration, if any (one-time, no loop). */
export function pendingCelebrationForPatient(db, patientId) {
  const list = listCelebrationsForPatient(db, patientId);
  const pending = list.filter((c) => !c.acknowledgedAt);
  if (!pending.length) return null;
  // list is newest-first; return oldest waiting so each is seen once in order
  return pending[pending.length - 1];
}

export function toPatientPendingCelebration(record) {
  if (!record) return null;
  return {
    id: record.id,
    attendedOn: record.attendedOn,
    message: patientFacingCelebrationMessage(record.note),
  };
}
