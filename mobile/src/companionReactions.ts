/**
 * Shared companion reaction timings and helpers.
 *
 * Talk / play / wave are species-agnostic intents that every live animal model
 * can receive through AnimalWebView. Sound is optional: muted calls still run
 * the full visual reaction so bonding never depends on audio.
 *
 * Auto greetings (focus / resume) do not trigger wave or sound — those stay
 * on the explicit Talk / Wave buttons so companion switching stays silent.
 */

export type CompanionReactionKind = 'talk' | 'play' | 'wave';

/** Warm, affectionate reaction windows (ms). Keep short for performance. */
export const REACTION_MS = {
  wave: 2600,
  play: 1700,
  /** Used when Talk audio is muted or unavailable. */
  talkVisualFallback: 1200,
  talkVisualFallbackReduced: 500,
  /** Soft hello chirp after check-in celebration settles into talk. */
  celebrateTalkDelay: 380,
} as const;

/** Visual Talk length: prefer verified audio duration; never zero when muted. */
export function talkVisualDurationMs(
  audioDurationMs: number,
  reducedMotion: boolean
): number {
  if (Number.isFinite(audioDurationMs) && audioDurationMs > 0) {
    return Math.floor(audioDurationMs);
  }
  return reducedMotion
    ? REACTION_MS.talkVisualFallbackReduced
    : REACTION_MS.talkVisualFallback;
}

/** Settle buffer after a reaction so the pose eases back calmly. */
export function reactionSettleMs(kind: CompanionReactionKind, visualMs: number): number {
  if (kind === 'wave') return REACTION_MS.wave;
  if (kind === 'play') return Math.max(REACTION_MS.play, visualMs);
  return visualMs + 180;
}

/**
 * Whether muted companions should stay quiet for optional auto chirps.
 * Kept for call sites that still gate non-button audio (e.g. legacy helpers).
 * Home no longer auto-waves or auto-chirps on focus / companion switch.
 */
export function shouldAutoPlayCompanionVoice(options: {
  companionMuted: boolean;
  companionMuteIntentional: boolean;
}): boolean {
  return !options.companionMuted;
}
