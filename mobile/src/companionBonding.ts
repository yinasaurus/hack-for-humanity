export type BondingHeartIntensity = 'small' | 'celebration';

export type BondingHeartParticle = {
  xPercent: number;
  yPercent: number;
  size: number;
  driftX: number;
  driftY: number;
  rotate: number;
};

const SMALL_HEARTS: readonly BondingHeartParticle[] = [
  { xPercent: 28, yPercent: 43, size: 24, driftX: -10, driftY: -34, rotate: -12 },
  { xPercent: 43, yPercent: 27, size: 30, driftX: -4, driftY: -48, rotate: -5 },
  { xPercent: 57, yPercent: 23, size: 28, driftX: 5, driftY: -52, rotate: 6 },
  { xPercent: 70, yPercent: 41, size: 24, driftX: 10, driftY: -36, rotate: 13 },
];

const CELEBRATION_HEARTS: readonly BondingHeartParticle[] = [
  ...SMALL_HEARTS,
  { xPercent: 20, yPercent: 58, size: 20, driftX: -12, driftY: -30, rotate: -16 },
  { xPercent: 36, yPercent: 56, size: 22, driftX: -7, driftY: -42, rotate: -8 },
  { xPercent: 50, yPercent: 47, size: 34, driftX: 0, driftY: -58, rotate: 0 },
  { xPercent: 64, yPercent: 55, size: 22, driftX: 7, driftY: -42, rotate: 8 },
  { xPercent: 80, yPercent: 58, size: 20, driftX: 12, driftY: -30, rotate: 16 },
];

export const BONDING_HEART_MAX_PARTICLES = CELEBRATION_HEARTS.length;

export function bondingHeartParticles(
  intensity: BondingHeartIntensity
): readonly BondingHeartParticle[] {
  return intensity === 'celebration' ? CELEBRATION_HEARTS : SMALL_HEARTS;
}

export function bondingHeartDurationMs(reducedMotion: boolean) {
  return reducedMotion ? 520 : 1150;
}
