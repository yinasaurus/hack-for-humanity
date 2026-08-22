/**
 * Clinician-scheduled reminders — note + frequency set manually by the clinician.
 * Not AI-parsed or auto-scheduled from free text.
 */

export const REMINDER_FREQUENCIES = ['daily', 'weekly', 'every_2_days', 'every_3_days'];

/** Rough time-of-day slots for meal-aware OS notifications (not minute-level). */
export const REMINDER_TIME_SLOTS = {
  morning: { id: 'morning', label: 'Morning', hour: 8 },
  midday: { id: 'midday', label: 'Midday', hour: 12 },
  evening: { id: 'evening', label: 'Evening', hour: 18 },
};

export const DEFAULT_HOUR = REMINDER_TIME_SLOTS.midday.hour;

export function normalizeReminderFrequency(value) {
  const raw = String(value || '').trim();
  return REMINDER_FREQUENCIES.includes(raw) ? raw : null;
}

export function normalizeReminderNote(value) {
  const note = String(value || '').trim().slice(0, 280);
  return note || null;
}

/** Map Morning / Midday / Evening (or a clock hour) → 0–23. */
export function normalizeReminderHour(value, timeOfDay) {
  const slotKey = String(timeOfDay || value || '')
    .trim()
    .toLowerCase();
  if (REMINDER_TIME_SLOTS[slotKey]) {
    return REMINDER_TIME_SLOTS[slotKey].hour;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) return DEFAULT_HOUR;
  return Math.min(23, Math.max(0, Math.round(n)));
}

export function timeOfDayFromHour(hour) {
  const h = normalizeReminderHour(hour);
  if (h <= 10) return 'morning';
  if (h <= 15) return 'midday';
  return 'evening';
}

/** Patient-safe reminder payload (no clinic-only metadata beyond schedule). */
export function toPatientClinicianReminder(record) {
  if (!record || !record.note) return null;
  const hour = record.hour ?? DEFAULT_HOUR;
  return {
    id: record.id,
    note: record.note,
    frequency: record.frequency,
    hour,
    timeOfDay: timeOfDayFromHour(hour),
  };
}

export function getClinicianReminder(db, patientId) {
  if (!db.clinicianReminders) return null;
  return db.clinicianReminders[patientId] || null;
}
