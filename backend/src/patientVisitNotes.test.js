import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  appendPatientVisitNote,
  assertNoVisitNotesInAiPayload,
  countPatientVisitNotesSince,
  countUnreadPatientVisitNotes,
  listPatientVisitNotes,
  markPatientVisitNotesRead,
  normalizePatientVisitNoteText,
  startOfCurrentMonthIso,
} from './patientVisitNotes.js';

describe('patient visit notes (verbatim, no AI)', () => {
  it('only trims and length-caps — does not rewrite wording', () => {
    const raw = '  Feeling anxious about dinner this week.  ';
    assert.equal(normalizePatientVisitNoteText(raw), 'Feeling anxious about dinner this week.');
    const long = 'x'.repeat(5000);
    assert.equal(normalizePatientVisitNoteText(long).length, 4000);
  });

  it('stores notes unread and counts them; mark-read clears unread', () => {
    const db = { patientVisitNotes: {} };
    appendPatientVisitNote(db, {
      id: 'n1',
      userId: 'u1',
      text: 'Note one — please read this exactly.',
      createdAt: '2026-08-10T12:00:00.000Z',
    });
    appendPatientVisitNote(db, {
      id: 'n2',
      userId: 'u1',
      text: 'Second note with emoji 🙂 and numbers 123.',
      createdAt: '2026-08-20T12:00:00.000Z',
    });
    const notes = listPatientVisitNotes(db, 'u1');
    assert.equal(notes.length, 2);
    assert.equal(notes[0].text, 'Second note with emoji 🙂 and numbers 123.');
    assert.equal(countUnreadPatientVisitNotes(notes), 2);
    markPatientVisitNotesRead(db, 'u1', '2026-08-25T00:00:00.000Z');
    assert.equal(countUnreadPatientVisitNotes(listPatientVisitNotes(db, 'u1')), 0);
    assert.equal(listPatientVisitNotes(db, 'u1')[0].text, 'Second note with emoji 🙂 and numbers 123.');
  });

  it('counts notes this month without inspecting note content', () => {
    const notes = [
      { createdAt: '2026-08-02T10:00:00.000Z', text: 'A' },
      { createdAt: '2026-07-28T10:00:00.000Z', text: 'B' },
      { createdAt: '2026-08-15T10:00:00.000Z', text: 'C' },
    ];
    const monthStart = '2026-08-01T00:00:00.000Z';
    assert.equal(countPatientVisitNotesSince(notes, monthStart), 2);
    assert.match(startOfCurrentMonthIso(new Date('2026-08-25T12:00:00Z')), /^2026-08-01/);
  });

  it('blocks visit-note fields from AI summary payloads', () => {
    assert.throws(() =>
      assertNoVisitNotesInAiPayload({
        patientName: 'Ada',
        patientVisitNotes: [{ text: 'secret' }],
      })
    );
    assert.equal(
      assertNoVisitNotesInAiPayload({
        patientName: 'Ada',
        metrics: { rate7: 0.5 },
        analyses: [{ foodType: 'Rice', estimatedCalories: 400 }],
      }),
      true
    );
  });

  it('AI summary builders never take visit-note fields in their contract payload', () => {
    const secret = 'UNIQUE_VISIT_NOTE_PHRASE_XYZ_SHOULD_NOT_LEAK';
    const summaryPayload = {
      patientName: 'Ada',
      metrics: { rate7: 0.5, rate30: 0.6, streak: 2, misses: 0, totalDays: 10 },
      analyses: [
        {
          createdAt: '2026-08-20T12:00:00.000Z',
          foodType: 'Toast',
          estimatedCalories: 300,
          confidence: 'medium',
        },
      ],
      alertReasons: [],
    };
    assert.equal(assertNoVisitNotesInAiPayload(summaryPayload), true);
    assert.equal(
      JSON.stringify(summaryPayload).includes(secret),
      false
    );
  });
});
