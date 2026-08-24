/**
 * Soft keepsake path — mirrors backend/src/streaks.js milestones.
 * The backend is authoritative: this module only presents milestones already
 * unlocked by the patient's permanent highest consecutive streak.
 */

export const MILESTONE_DAYS = [5, 10, 20, 50, 100] as const;

export const MILESTONE_REWARDS: Record<
  number,
  { type: string; id: string; label: string }
> = {
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

export type KeepsakeStep = {
  milestoneDay: number;
  label: string;
  unlocked: boolean;
};

function rewardLabel(day: number): string {
  return MILESTONE_REWARDS[day]?.label || `Day ${day} keepsake`;
}

/** Recent earned keepsakes plus a few future chapters, without exposing counts. */
export function upcomingKeepsakeSteps(
  unlockedMilestoneDays: number[],
  limit = 4
): KeepsakeStep[] {
  const unlocked = new Set(
    unlockedMilestoneDays
      .map((day) => Math.floor(Number(day)))
      .filter((day) => Number.isFinite(day) && day > 0)
  );
  const days = new Set<number>(MILESTONE_DAYS);
  for (const day of unlocked) days.add(day);

  const highest = Math.max(0, ...unlocked);
  if (highest >= 100) {
    const next = Math.max(120, Math.ceil((highest + 1) / 20) * 20);
    days.add(next);
    days.add(next + 20);
    days.add(next + 40);
  }

  const steps = [...days]
    .sort((a, b) => a - b)
    .map((day) => ({
      milestoneDay: day,
      label: rewardLabel(day),
      unlocked: unlocked.has(day),
    }));

  const locked = steps.filter((s) => !s.unlocked);
  const unlockedRecent = steps.filter((s) => s.unlocked).slice(-2);
  const upcoming = locked.slice(0, Math.max(1, limit - unlockedRecent.length));
  return [...unlockedRecent, ...upcoming].slice(0, limit);
}
