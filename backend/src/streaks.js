/**
 * Streak & check-in helpers.
 * Rewards are based only on presence of an accepted log — never on photo content.
 *
 * Most historical callers use UTC date keys. Patient progression passes the
 * patient's validated IANA timezone explicitly so two photos around midnight
 * cannot accidentally count as two progression days.
 */

export const DEFAULT_TIMEZONE = 'Asia/Singapore';
const UTC_TIMEZONE = 'UTC';

/** Return true only for a timezone understood by the runtime's IANA database. */
export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== 'string' || !timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timeZone.trim() }).format();
    return true;
  } catch {
    return false;
  }
}

/** Patient-safe timezone normalization with the product's Singapore fallback. */
export function normalizeTimeZone(timeZone) {
  const candidate = typeof timeZone === 'string' ? timeZone.trim() : '';
  return isValidTimeZone(candidate) ? candidate : DEFAULT_TIMEZONE;
}

// Common spelling used by API consumers; retain one implementation.
export const normalizeTimezone = normalizeTimeZone;

export function toDateKey(isoOrDate, timeZone = UTC_TIMEZONE) {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: normalizeTimeZone(timeZone),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function uniqueSortedDays(checkIns, timeZone = UTC_TIMEZONE) {
  const set = new Set(checkIns.map((c) => toDateKey(c.createdAt, timeZone)));
  return [...set].sort();
}

/** Consecutive days ending on the most recent check-in day (or today if checked in today). */
export function currentStreak(
  checkIns,
  todayKey = toDateKey(new Date(), UTC_TIMEZONE),
  timeZone = UTC_TIMEZONE
) {
  const days = uniqueSortedDays(checkIns, timeZone);
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

/**
 * Longest consecutive run ever achieved in a patient's history.
 * Unlike currentStreak, this deliberately does not require the run to touch
 * today or yesterday; a break affects vitality, never earned growth.
 */
export function maxHistoricalStreak(checkIns, timeZone = UTC_TIMEZONE) {
  const days = uniqueSortedDays(checkIns, timeZone);
  if (days.length === 0) return 0;

  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (days[i] === shiftDay(days[i - 1], 1)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  return longest;
}

export function shiftDay(dayKey, delta) {
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function daysSinceLastCheckIn(
  checkIns,
  todayKey = toDateKey(new Date(), UTC_TIMEZONE),
  timeZone = UTC_TIMEZONE
) {
  const days = uniqueSortedDays(checkIns, timeZone);
  if (days.length === 0) return null;
  const last = days[days.length - 1];
  const a = new Date(`${last}T12:00:00.000Z`);
  const b = new Date(`${todayKey}T12:00:00.000Z`);
  return Math.round((b - a) / (24 * 60 * 60 * 1000));
}

/**
 * Pet presence band: happy | resting.
 * Driven by time of day only — resting is a cozy quiet-hours default,
 * never a reaction to missed check-ins or days-since-last-log.
 * (Client may overlay waving / excited / curious / sleepy.)
 *
 * @param {_checkIns} unused — kept for call-site compatibility
 * @param {_todayKey} unused — kept for call-site compatibility
 * @param {Date} [now]
 */
export function petMood(_checkIns = [], _todayKey = toDateKey(new Date()), now = new Date()) {
  const hour = now.getHours();
  // Quiet hours → resting; daytime → calm happy. No miss gating.
  if (hour >= 21 || hour < 8) return 'resting';
  return 'happy';
}

export function checkInRate(
  checkIns,
  windowDays,
  todayKey = toDateKey(new Date(), UTC_TIMEZONE),
  timeZone = UTC_TIMEZONE
) {
  if (windowDays <= 0) return 0;
  const days = new Set(uniqueSortedDays(checkIns, timeZone));
  let hit = 0;
  for (let i = 0; i < windowDays; i++) {
    const key = shiftDay(todayKey, -i);
    if (days.has(key)) hit += 1;
  }
  return hit / windowDays;
}

/**
 * Consecutive fully elapsed calendar days without a check-in.
 *
 * - Never counts today (still in progress until local midnight).
 * - Never counts days before trackingStartedAt (new accounts start at 0).
 * - With no history and no start date, returns 0 (not an infinite miss streak).
 */
export function consecutiveMisses(
  checkIns,
  todayKey = toDateKey(new Date(), UTC_TIMEZONE),
  timeZone = UTC_TIMEZONE,
  trackingStartedAt = null
) {
  const days = new Set(uniqueSortedDays(checkIns, timeZone));
  const startKey = trackingStartedAt
    ? toDateKey(trackingStartedAt, timeZone)
    : days.size > 0
      ? [...days].sort()[0]
      : null;
  if (!startKey) return 0;
  // Account created today (or in the future) → no completed day has elapsed.
  if (startKey >= todayKey) return 0;

  // Start from yesterday — daily cutoff, not real-time mid-day punishment.
  let cursor = shiftDay(todayKey, -1);
  let misses = 0;
  while (cursor >= startKey) {
    if (days.has(cursor)) break;
    misses += 1;
    cursor = shiftDay(cursor, -1);
    if (misses > 365) break;
  }
  return misses;
}

export const MILESTONE_DAYS = [1, 5, 10, 20, 50, 100];

export function milestonesReached(totalUniqueDays) {
  const unlocked = MILESTONE_DAYS.filter((day) => totalUniqueDays >= day);
  // After the final growth milestone, add one wardrobe reward every 20 days.
  for (let day = 120; day <= totalUniqueDays; day += 20) unlocked.push(day);
  return unlocked.sort((a, b) => a - b);
}

/** Patient-safe visual chapter; it contains no streak count or nutrition data. */
export function growthStageForDays(historicalStreak) {
  if (historicalStreak >= 100) return 'grown';
  if (historicalStreak >= 50) return 'adventurer';
  if (historicalStreak >= 20) return 'playful';
  if (historicalStreak >= 10) return 'growing';
  if (historicalStreak >= 5) return 'little';
  return 'baby';
}

export const MILESTONE_REWARDS = {
  1: { type: 'accessory', id: 'welcome_star', label: 'Welcome star' },
  5: { type: 'accessory', id: 'soft_scarf', label: 'Soft scarf' },
  10: { type: 'background', id: 'sunny_meadow', label: 'Sunny meadow' },
  20: { type: 'accessory', id: 'flower_crown', label: 'Flower crown' },
  50: { type: 'background', id: 'cozy_nook', label: 'Cozy nook' },
  100: { type: 'accessory', id: 'star_pendant', label: 'Star pendant' },
  120: { type: 'toy', id: 'ribbon_ball', label: 'Ribbon ball' },
  140: { type: 'background', id: 'quiet_garden', label: 'Quiet garden' },
  160: { type: 'accessory', id: 'cozy_beanie', label: 'Cozy beanie' },
  180: { type: 'accessory', id: 'round_glasses', label: 'Round glasses' },
  200: { type: 'accessory', id: 'soft_crown', label: 'Soft crown' },
  220: { type: 'accessory', id: 'pocket_heart', label: 'Pocket heart' },
};

export function rewardForMilestone(day) {
  if (MILESTONE_REWARDS[day]) return MILESTONE_REWARDS[day];
  return { type: 'accessory', id: `keepsake_${day}`, label: `Day ${day} keepsake` };
}

/** Categorical patient-facing state. Deficit percentages and targets stay clinician-only. */
export function vitalityState(
  checkIns,
  dailyDeficitPct = null,
  now = new Date(),
  trackingStartedAt = null,
  timeZone = UTC_TIMEZONE
) {
  const latest = [...checkIns].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const baseline = latest?.createdAt || trackingStartedAt;
  const hoursSince = baseline ? (now.getTime() - new Date(baseline).getTime()) / 36e5 : 0;
  const misses = consecutiveMisses(
    checkIns,
    toDateKey(now, timeZone),
    timeZone,
    trackingStartedAt
  );
  if (hoursSince >= 48 || (dailyDeficitPct != null && dailyDeficitPct > 0.5)) return 'dormant';
  if (misses >= 2 || (dailyDeficitPct != null && dailyDeficitPct >= 0.25)) return 'dim';
  if (misses >= 1 || (dailyDeficitPct != null && dailyDeficitPct > 0)) return 'fatigued';
  return 'bright';
}

/** Walks unlock when the patient has any streak of at least 2 (bonding, not content-gated). */
export function walksUnlocked(checkIns, timeZone = UTC_TIMEZONE) {
  const todayKey = toDateKey(new Date(), timeZone);
  return currentStreak(checkIns, todayKey, timeZone) >= 2 || uniqueSortedDays(checkIns, timeZone).length >= 3;
}
