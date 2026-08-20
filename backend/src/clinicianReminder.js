/**
 * Clinician-scheduled reminders — note + frequency set manually by the clinician.
 * Not AI-parsed or auto-scheduled from free text.
 */

export const REMINDER_FREQUENCIES = ['daily', 'weekly', 'every_2_days', 'every_3_days'];

const DEFAULT_HOUR = 12;

export function normalizeReminderFrequency(value) {
  const raw = String(value || '').trim();
  return REMINDER_FREQUENCIES.includes(raw) ? raw : null;
}

export function normalizeReminderNote(value) {
  const note = String(value || '').trim().slice(0, 280);
  return note || null;
}

export function normalizeReminderHour(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_HOUR;
  return Math.min(23, Math.max(0, Math.round(n)));
}

/** Patient-safe reminder payload (no clinic-only metadata beyond schedule). */
export function toPatientClinicianReminder(record) {
  if (!record || !record.note) return null;
  return {
    id: record.id,
    note: record.note,
    frequency: record.frequency,
    hour: record.hour ?? DEFAULT_HOUR,
  };
}

export function getClinicianReminder(db, patientId) {
  if (!db.clinicianReminders) return null;
  return db.clinicianReminders[patientId] || null;
}
