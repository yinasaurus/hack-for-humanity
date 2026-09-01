/**
 * Gentle care-moment schedules — timing only.
 * No calories, weight, BMI, or scores. Never stacks missed moments onto one day.
 */

import { v4 as uuid } from 'uuid';
import { redactPatientFacingNutritionLanguage } from './patientNutritionRedact.js';
import { shiftDay, toDateKey } from './streaks.js';

const MEAL_LABELS = ['morning', 'midday', 'afternoon', 'evening', 'anytime'];

export function normalizeMealLabel(value) {
  const raw = String(value || '').trim().toLowerCase();
  return MEAL_LABELS.includes(raw) ? raw : 'anytime';
}

/** Spread N pending moments across remaining days without stacking on one day when possible. */
export function redistributePendingSlots(slots, fromDateKey, windowEndKey) {
  const pending = (Array.isArray(slots) ? slots : [])
    .filter((s) => s && s.status === 'pending')
    .map((s) => ({ ...s }));
  if (!pending.length) return [];

  const days = [];
  let cursor = fromDateKey;
  if (fromDateKey > windowEndKey) {
    windowEndKey = fromDateKey;
  }
  while (cursor <= windowEndKey) {
    days.push(cursor);
    cursor = shiftDay(cursor, 1);
    if (days.length > 60) break;
  }
  if (!days.length) return pending;

  const placed = [];
  if (pending.length <= days.length) {
    for (let i = 0; i < pending.length; i++) {
      const step = days.length / pending.length;
      const idx = Math.min(days.length - 1, Math.floor(i * step + step / 2));
      placed.push({ ...pending[i], date: days[idx], status: 'pending' });
    }
  } else {
    for (let i = 0; i < pending.length; i++) {
      placed.push({ ...pending[i], date: days[i % days.length], status: 'pending' });
    }
  }

  // Resolve collisions when we have spare days
  if (pending.length <= days.length) {
    const used = new Set();
    for (let i = 0; i < placed.length; i++) {
      let d = placed[i].date;
      let guard = 0;
      while (used.has(d) && guard < days.length) {
        const pos = days.indexOf(d);
        d = days[(pos + 1) % days.length];
        guard += 1;
      }
      used.add(d);
      placed[i] = { ...placed[i], date: d };
    }
  }

  return placed.sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function markSlotsOnDateSkipped(slots, dateKey) {
  return (slots || []).map((s) =>
    s.date === dateKey && s.status === 'pending' ? { ...s, status: 'skipped' } : { ...s }
  );
}

export function mockPlanCareSchedule(goalText, { startDate = toDateKey(new Date()) } = {}) {
  const text = String(goalText || '').trim();
  const lower = text.toLowerCase();

  let total = 3;
  let windowDays = 7;

  const inDays = lower.match(/(\d+)\s*(?:apples?|moments?|times?|items?)?[^\d]{0,24}(?:in|over|across)\s*(\d+)\s*days?/);
  const perWeek = lower.match(/(\d+)\s*(?:apples?|moments?|times?|items?)?[^\d]{0,24}(?:per|each|a|every)\s*week/);
  const weekly = lower.match(/(\d+)\s*(?:apples?|moments?|times?)?[^\d]{0,16}weekly/);
  const solelyCount = lower.match(/(\d+)\s*apples?/);

  if (inDays) {
    total = Math.max(1, Math.min(14, Number(inDays[1]) || 3));
    windowDays = Math.max(1, Math.min(21, Number(inDays[2]) || 7));
  } else if (perWeek || weekly) {
    total = Math.max(1, Math.min(14, Number((perWeek || weekly)[1]) || 3));
    windowDays = 7;
  } else if (solelyCount) {
    total = Math.max(1, Math.min(14, Number(solelyCount[1]) || 3));
    windowDays = 7;
  }

  const endDate = shiftDay(startDate, windowDays - 1);
  const mealCycle = windowDays <= 2 ? ['morning', 'afternoon', 'evening'] : ['afternoon', 'midday', 'evening'];
  const slots = [];
  for (let i = 0; i < total; i++) {
    const dayIndex =
      total === 1 ? 0 : Math.round((i * (windowDays - 1)) / Math.max(1, total - 1));
    const date = shiftDay(startDate, Math.min(windowDays - 1, dayIndex));
    slots.push({
      id: uuid(),
      date,
      mealLabel: mealCycle[i % mealCycle.length],
      prompt: softPromptFor(text, mealCycle[i % mealCycle.length]),
      status: 'pending',
    });
  }

  // If multiple slots landed on the same day and we have room, redistribute
  const redistributed = redistributePendingSlots(slots, startDate, endDate);

  return {
    goalText: text,
    summary: `Gentle plan: ${total} soft moment(s) across ${windowDays} day(s) — never stacked as a catch-up.`,
    windowDays,
    startDate,
    endDate,
    slots: redistributed,
    source: 'mock',
  };
}

function softPromptFor(goalText, mealLabel) {
  const short = String(goalText || 'a gentle care moment').trim().slice(0, 80);
  return `A soft ${mealLabel} hello about “${short}” — only if it feels okay. Nothing to score.`;
}

export function normalizePlan(plan, goalText) {
  const startDate = plan?.startDate || toDateKey(new Date());
  const windowDays = Math.max(1, Math.min(21, Number(plan?.windowDays) || 7));
  const endDate = plan?.endDate || shiftDay(startDate, windowDays - 1);
  const slots = Array.isArray(plan?.slots)
    ? plan.slots.slice(0, 21).map((s) => ({
        id: s.id || uuid(),
        date: String(s.date || startDate).slice(0, 10),
        mealLabel: normalizeMealLabel(s.mealLabel),
        prompt: String(s.prompt || softPromptFor(goalText, s.mealLabel)).slice(0, 240),
        status: ['pending', 'done', 'skipped'].includes(s.status) ? s.status : 'pending',
      }))
    : [];

  return {
    goalText: String(goalText || plan?.goalText || '').trim().slice(0, 280),
    summary: String(plan?.summary || '').trim().slice(0, 400),
    windowDays,
    startDate,
    endDate,
    slots,
    source: plan?.source || 'unknown',
  };
}

/** Patient-safe view of today's (or next) gentle moment. */
export function toPatientCarePlan(reminder) {
  if (!reminder?.note) return null;
  const hour = reminder.hour ?? 12;
  const timeOfDay = hour <= 10 ? 'morning' : hour <= 15 ? 'midday' : 'evening';
  // Scrub calorie/macro numbers at the patient boundary only — clinician
  // storage and dashboard views keep the original text.
  const note = redactPatientFacingNutritionLanguage(reminder.note);
  if (!reminder?.carePlan?.slots?.length) {
    return {
      id: reminder.id,
      note,
      frequency: reminder.frequency,
      hour,
      timeOfDay,
      carePlan: null,
      todayMoment: null,
    };
  }
  const today = toDateKey(new Date());
  const slots = reminder.carePlan.slots;
  const todayPending = slots.find((s) => s.date === today && s.status === 'pending');
  const nextPending = slots.find((s) => s.status === 'pending' && s.date >= today);
  const moment = todayPending || nextPending || null;
  return {
    id: reminder.id,
    note,
    frequency: reminder.frequency,
    hour,
    timeOfDay,
    carePlan: {
      summary: redactPatientFacingNutritionLanguage(reminder.carePlan.summary),
      startDate: reminder.carePlan.startDate,
      endDate: reminder.carePlan.endDate,
      slots: slots.map((s) => ({
        id: s.id,
        date: s.date,
        mealLabel: s.mealLabel,
        prompt: redactPatientFacingNutritionLanguage(s.prompt),
        status: s.status,
      })),
    },
    todayMoment: moment
      ? {
          id: moment.id,
          date: moment.date,
          mealLabel: moment.mealLabel,
          prompt: redactPatientFacingNutritionLanguage(moment.prompt),
          isToday: moment.date === today,
        }
      : null,
  };
}
