/**
 * Streak & check-in helpers.
 * A "day" is a calendar day in the local timezone of the server (demo: UTC date string YYYY-MM-DD).
 * Rewards are based only on presence of a log — never on photo content.
 */

export function toDateKey(isoOrDate) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toISOString().slice(0, 10);
}

export function uniqueSortedDays(checkIns) {
  const set = new Set(checkIns.map((c) => toDateKey(c.createdAt)));
  return [...set].sort();
}

/** Consecutive days ending on the most recent check-in day (or today if checked in today). */
export function currentStreak(checkIns, todayKey = toDateKey(new Date())) {
  const days = uniqueSortedDays(checkIns);
  if (days.length === 0) return 0;

  const last = days[days.length - 1];
  // If last log is older than yesterday, streak is 0 (resting companion).
  const yesterday = shiftDay(todayKey, -1);
  if (last !== todayKey && last !== yesterday) return 0;

  let streak = 1;
  let cursor = last;
  for (let i = days.length - 2; i >= 0; i--) {
    const expected = shiftDay(cursor, -1);
    if (days[i] === expected) {
      streak += 1;
      cursor = days[i];
    } else {
      break;
    }
  }
  return streak;
}

export function shiftDay(dayKey, delta) {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function daysSinceLastCheckIn(checkIns, todayKey = toDateKey(new Date())) {
  const days = uniqueSortedDays(checkIns);
  if (days.length === 0) return null;
  const last = days[days.length - 1];
  const a = new Date(`${last}T12:00:00.000Z`);
  const b = new Date(`${todayKey}T12:00:00.000Z`);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Pet presence from check-ins: happy | resting only.
 * Client may overlay waving / excited / curious / sleepy — never sadness, hunger, or neediness.
 */
export function petMood(checkIns, todayKey = toDateKey(new Date())) {
  const days = uniqueSortedDays(checkIns);
  if (days.length === 0) return 'resting';
  const last = days[days.length - 1];
  const yesterday = shiftDay(todayKey, -1);
  if (last === todayKey || last === yesterday) return 'happy';
  return 'resting';
}

export function checkInRate(checkIns, windowDays, todayKey = toDateKey(new Date())) {
  if (windowDays <= 0) return 0;
  const days = new Set(uniqueSortedDays(checkIns));
  let hit = 0;
  for (let i = 0; i < windowDays; i++) {
    const key = shiftDay(todayKey, -i);
    if (days.has(key)) hit += 1;
  }
  return hit / windowDays;
}

/** Consecutive calendar days without a check-in, counting back from today. */
export function consecutiveMisses(checkIns, todayKey = toDateKey(new Date())) {
  const days = new Set(uniqueSortedDays(checkIns));
  let misses = 0;
  let cursor = todayKey;
  while (!days.has(cursor)) {
    misses += 1;
    cursor = shiftDay(cursor, -1);
    if (misses > 365) break;
  }
  return misses;
}

export const MILESTONE_DAYS = [5, 10, 20, 50, 100];

export function milestonesReached(totalUniqueDays) {
  const unlocked = [];
  for (const m of MILESTONE_DAYS) {
    if (totalUniqueDays >= m) unlocked.push(m);
  }
  // After 100, every 20 days
  if (totalUniqueDays > 100) {
    for (let d = 120; d <= totalUniqueDays; d += 20) {
      unlocked.push(d);
    }
  }
  return unlocked;
}

export const MILESTONE_REWARDS = {
  5: { type: 'accessory', id: 'soft_scarf', label: 'Soft scarf' },
  10: { type: 'background', id: 'sunny_meadow', label: 'Sunny meadow' },
  20: { type: 'accessory', id: 'flower_crown', label: 'Flower crown' },
  50: { type: 'background', id: 'cozy_nook', label: 'Cozy nook' },
  100: { type: 'accessory', id: 'star_pendant', label: 'Star pendant' },
  120: { type: 'toy', id: 'ribbon_ball', label: 'Ribbon ball' },
  140: { type: 'background', id: 'quiet_garden', label: 'Quiet garden' },
};

export function rewardForMilestone(day) {
  if (MILESTONE_REWARDS[day]) return MILESTONE_REWARDS[day];
  return { type: 'accessory', id: `keepsake_${day}`, label: `Day ${day} keepsake` };
}

/** Walks unlock when the patient has any streak of at least 2 (bonding, not content-gated). */
export function walksUnlocked(checkIns) {
  return currentStreak(checkIns) >= 2 || uniqueSortedDays(checkIns).length >= 3;
}
