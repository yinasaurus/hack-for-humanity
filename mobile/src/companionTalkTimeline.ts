/**
 * Word updates are content sequencing, so they remain enabled when the user
 * asks the rest of the interface to reduce motion. These bounds keep a short
 * call from flashing a whole sentence and keep a long call from feeling stuck.
 */
export const TALK_MIN_WORD_INTERVAL_MS = 140;
export const TALK_MAX_WORD_INTERVAL_MS = 600;
export const TALK_DEFAULT_AUDIO_DURATION_MS = 1_800;

export type CompanionTalkSchedule = {
  words: string[];
  intervalMs: number;
  revealAtMs: number[];
  audioDurationMs: number;
};

export type TalkRevealTimers = {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(handle: unknown): void;
};

export type TalkRevealRun = {
  cancel(): void;
};

const defaultTimers: TalkRevealTimers = {
  setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

// Keep this seam dependency-free so it can be exercised directly by Node's
// strip-types runner as well as imported by the Expo bundle.
function talkWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

function talkFrame(line: string, visibleWords: number): string {
  return talkWords(line).slice(0, Math.max(0, visibleWords)).join(' ');
}

function normalizeAudioDuration(durationMs: number | null | undefined): number {
  return Number.isFinite(durationMs) && (durationMs || 0) > 0
    ? Math.round(durationMs as number)
    : TALK_DEFAULT_AUDIO_DURATION_MS;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Build a deterministic word schedule from the real bundled call duration.
 * The first complete word is available immediately; each later word is
 * scheduled at an observable cadence derived from the call length.
 */
export function buildCompanionTalkSchedule(
  line: string,
  audioDurationMs?: number | null
): CompanionTalkSchedule {
  const words = talkWords(line);
  const audioDuration = normalizeAudioDuration(audioDurationMs);
  const intervalMs = words.length <= 1
    ? 0
    : clamp(
      Math.round(audioDuration / (words.length - 1)),
      TALK_MIN_WORD_INTERVAL_MS,
      TALK_MAX_WORD_INTERVAL_MS
    );

  return {
    words,
    intervalMs,
    revealAtMs: words.map((_word, index) => index * intervalMs),
    audioDurationMs: audioDuration,
  };
}

/**
 * Start a replay-safe Talk run. Cancelling clears every pending callback and
 * makes already-queued callbacks harmless, which protects against stale
 * frames after a second Talk tap, another action, or screen unmount.
 */
export function startCompanionTalkReveal(
  line: string,
  audioDurationMs: number | null | undefined,
  onFrame: (frame: string, visibleWords: number) => void,
  timers: TalkRevealTimers = defaultTimers
): TalkRevealRun {
  const schedule = buildCompanionTalkSchedule(line, audioDurationMs);
  let cancelled = false;
  const handles: unknown[] = [];

  if (!schedule.words.length) {
    onFrame('', 0);
    return { cancel: () => undefined };
  }

  const emit = (visibleWords: number) => {
    if (cancelled) return;
    onFrame(talkFrame(line, visibleWords), visibleWords);
  };

  emit(1);
  schedule.revealAtMs.slice(1).forEach((delayMs, index) => {
    handles.push(
      timers.setTimeout(() => emit(index + 2), delayMs)
    );
  });

  return {
    cancel: () => {
      if (cancelled) return;
      cancelled = true;
      handles.splice(0).forEach((handle) => timers.clearTimeout(handle));
    },
  };
}
