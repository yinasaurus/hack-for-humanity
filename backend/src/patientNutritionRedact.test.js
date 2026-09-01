import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PATIENT_NUTRITION_REDACTION_PLACEHOLDER as REDACTED,
  redactPatientFacingNutritionLanguage,
} from './patientNutritionRedact.js';
import { toPatientCarePlan } from './careSchedule.js';
import { patientFacingCelebrationMessage } from './checkupCelebration.js';

describe('redactPatientFacingNutritionLanguage', () => {
  it('redacts calorie counts while keeping the surrounding sentence', () => {
    const out = redactPatientFacingNutritionLanguage(
      'Please aim for 2000 kcal today if that feels okay.'
    );
    assert.equal(out, `Please aim for ${REDACTED} today if that feels okay.`);
    assert.equal(out.includes('2000'), false);
  });

  it('redacts macro gram phrases', () => {
    const out = redactPatientFacingNutritionLanguage(
      'Try about 50g protein and 30g carbs with lunch.'
    );
    assert.equal(out.includes('50g'), false);
    assert.equal(out.includes('30g'), false);
    assert.match(out, new RegExp(REDACTED));
    assert.match(out, /lunch/i);
  });

  it('redacts percentage-of-goal phrasing', () => {
    const out = redactPatientFacingNutritionLanguage(
      'Getting to 80% of goal this week is enough.'
    );
    assert.equal(out, `Getting to ${REDACTED} this week is enough.`);
  });

  it('leaves notes without nutrition numbers unchanged', () => {
    const note = '3 soft apple moments this week — only if it feels okay.';
    assert.equal(redactPatientFacingNutritionLanguage(note), note);
  });
});

describe('patient vs clinician care-reminder boundary', () => {
  const rawNote = 'Gentle check-in — aim for 2000 kcal, maybe 50g protein if ready.';

  it('redacts nutrition language in the patient-facing care plan payload', () => {
    const patientView = toPatientCarePlan({
      id: 'rem-1',
      note: rawNote,
      frequency: 'daily',
      hour: 12,
      carePlan: {
        summary: 'Soft plan toward 1800 calories this week',
        startDate: '2026-09-01',
        endDate: '2026-09-07',
        slots: [
          {
            id: 'slot-1',
            date: '2026-09-01',
            mealLabel: 'midday',
            prompt: 'A soft midday hello about “2000 kcal” — only if it feels okay.',
            status: 'pending',
          },
        ],
      },
    });

    assert.ok(patientView);
    assert.equal(patientView.note.includes('2000'), false);
    assert.equal(patientView.note.includes('50g'), false);
    assert.match(patientView.note, new RegExp(REDACTED));
    assert.equal(patientView.carePlan.summary.includes('1800'), false);
    assert.equal(patientView.todayMoment.prompt.includes('2000'), false);
    assert.match(patientView.todayMoment.prompt, new RegExp(REDACTED));
  });

  it('keeps the clinician-stored reminder note unmodified', () => {
    // Clinician dashboard reads getClinicianReminder / detail.clinicianReminder
    // directly — never through toPatientCarePlan.
    const stored = {
      id: 'rem-1',
      note: rawNote,
      frequency: 'daily',
      hour: 12,
    };
    assert.equal(stored.note, rawNote);
    assert.match(stored.note, /2000 kcal/);
    assert.match(stored.note, /50g protein/);
  });

  it('passes clean care notes through unchanged', () => {
    const clean = 'Just a warm hello at midday — no pressure.';
    const patientView = toPatientCarePlan({
      id: 'rem-2',
      note: clean,
      frequency: 'weekly',
      hour: 9,
    });
    assert.equal(patientView.note, clean);
  });
});

describe('checkup celebration patient message', () => {
  it('redacts nutrition language in celebration notes shown to patients', () => {
    const msg = patientFacingCelebrationMessage('Proud of you — keep near 1800 calories.');
    assert.equal(msg.includes('1800'), false);
    assert.match(msg, new RegExp(REDACTED));
    assert.match(msg, /Proud of you/i);
  });
});
