export type PlayTarget = {
  left: `${number}%`;
  top: `${number}%`;
};

/** Calm, thumb-reachable positions; there is deliberately no timer or failure state. */
export const PLAY_TARGETS: readonly PlayTarget[] = [
  { left: '18%', top: '24%' },
  { left: '66%', top: '18%' },
  { left: '62%', top: '62%' },
  { left: '24%', top: '66%' },
];

export function animalTalkBubble(callCaption: string, greeting: string): string {
  return `${callCaption.trim()} ${greeting.trim()}`.trim();
}

export function advancePlayStep(step: number): { nextStep: number; complete: boolean } {
  const safeStep = Number.isFinite(step) ? Math.max(0, Math.floor(step)) : 0;
  if (safeStep >= PLAY_TARGETS.length - 1) return { nextStep: 0, complete: true };
  return { nextStep: safeStep + 1, complete: false };
}
