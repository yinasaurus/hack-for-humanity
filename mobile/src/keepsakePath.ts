/**
 * Soft keepsake path — mirrors backend/src/streaks.js milestones.
 * Cumulative unique hello days only (not a streak, not a deadline calendar).
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
};

export type KeepsakeStep = {
  milestoneDay: number;
  label: string;
  /** Unique hello days still needed (0 = already reached). */
  hellosAway: number;
  unlocked: boolean;
};

function rewardLabel(day: number): string {
  return MILESTONE_REWARDS[day]?.label || `Day ${day} keepsake`;
}

/** Next few soft milestones — “about N more hellos,” never a due date. */
export function upcomingKeepsakeSteps(
  helloDayCount: number,
  limit = 4
): KeepsakeStep[] {
  const n = Math.max(0, Math.floor(helloDayCount) || 0);
  const steps: KeepsakeStep[] = [];

  for (const day of MILESTONE_DAYS) {
    steps.push({
      milestoneDay: day,
      label: rewardLabel(day),
      hellosAway: Math.max(0, day - n),
      unlocked: n >= day,
    });
  }

  // After 100, every 20 days (same as backend)
  if (n >= 100) {
    const next = Math.ceil((n + 1) / 20) * 20;
    const candidates = [next, next + 20, next + 40].filter((d) => d > 100);
    for (const day of candidates) {
      if (steps.some((s) => s.milestoneDay === day)) continue;
      steps.push({
        milestoneDay: day,
        label: rewardLabel(day),
        hellosAway: Math.max(0, day - n),
        unlocked: n >= day,
      });
    }
  }

  const locked = steps.filter((s) => !s.unlocked);
  const unlockedRecent = steps.filter((s) => s.unlocked).slice(-2);
  const upcoming = locked.slice(0, Math.max(1, limit - unlockedRecent.length));
  return [...unlockedRecent, ...upcoming].slice(0, limit);
}
