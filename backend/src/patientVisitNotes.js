/**
 * Patient → clinician free-text visit notes.
 * Verbatim storage only — never summarize, classify, or feed into AI.
 */

export const PATIENT_VISIT_NOTE_MAX = 4000;

/** Trim + length cap only. Do not paraphrase, redact keywords, or alter wording. */
export function normalizePatientVisitNoteText(raw) {
  const text = String(raw ?? '').trim();
  if (!text) return '';
  return text.slice(0, PATIENT_VISIT_NOTE_MAX);
}

export function listPatientVisitNotes(db, userId) {
  const notes = db.patientVisitNotes?.[userId] || [];
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function countUnreadPatientVisitNotes(notes) {
  return (notes || []).filter((n) => !n.readAt).length;
}

/** Notes created on or after `sinceIso` (inclusive). */
export function countPatientVisitNotesSince(notes, sinceIso) {
  if (!sinceIso) return (notes || []).length;
  const since = new Date(sinceIso).getTime();
  return (notes || []).filter((n) => new Date(n.createdAt).getTime() >= since).length;
}

/** Start of current calendar month (UTC) as ISO — for “this month” reporting counts. */
export function startOfCurrentMonthIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

export function appendPatientVisitNote(db, { userId, text, checkInId = null, id, createdAt }) {
  if (!db.patientVisitNotes) db.patientVisitNotes = {};
  if (!db.patientVisitNotes[userId]) db.patientVisitNotes[userId] = [];
  const note = {
    id,
    userId,
    text,
    checkInId: checkInId || null,
    createdAt: createdAt || new Date().toISOString(),
    readAt: null,
  };
  db.patientVisitNotes[userId].unshift(note);
  return note;
}

/** Mark all unread notes for a patient as read (clinician opened the chart). */
export function markPatientVisitNotesRead(db, userId, readAt = new Date().toISOString()) {
  const notes = db.patientVisitNotes?.[userId] || [];
  let changed = 0;
  for (const note of notes) {
    if (!note.readAt) {
      note.readAt = readAt;
      changed += 1;
    }
  }
  return changed;
}

/**
 * Confirm a payload destined for AI summarization does not include visit-note text.
 * Used in tests — summary builders must never receive this field.
 */
export function assertNoVisitNotesInAiPayload(payload) {
  const json = JSON.stringify(payload);
  if (/"patientVisitNotes"|"visitNoteText"|"patientNoteText"/i.test(json)) {
    throw new Error('Patient visit notes must not enter the AI summary pipeline');
  }
  return true;
}
