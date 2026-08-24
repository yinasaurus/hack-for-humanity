/**
 * Gentle companion Talk lines — short, age-neutral, and never about guilt,
 * scores, food, bodies, or clinical care. User-initiated only (never
 * auto-play).
 */

type CompanionTalkTone =
  | 'warm-welcome'
  | 'gentle-encouragement'
  | 'quiet-companionship'
  | 'playful-optimism'
  | 'self-kindness';

type CompanionTalkPhrase = {
  /** Stable across releases so a mounted screen can remember the last line. */
  id: string;
  tone: CompanionTalkTone;
  render: (petName: string) => string;
};

/**
 * The phrase catalog is deliberately data-shaped and pure. Keeping the
 * pet-name interpolation here means callers never need to know how many
 * phrases exist or how a phrase is made safe for display.
 */
const COMPANION_TALK_PHRASES: readonly CompanionTalkPhrase[] = [
  // Warm welcome
  {
    id: 'welcome_glad_you_are_here',
    tone: 'warm-welcome',
    render: (name) => `Hi, I’m ${name}. I’m glad you’re here.`,
  },
  {
    id: 'welcome_share_this_moment',
    tone: 'warm-welcome',
    render: (name) => `It’s ${name}. I’m glad to share this moment.`,
  },
  {
    id: 'welcome_happy_you_stopped_by',
    tone: 'warm-welcome',
    render: (name) => `Hey, it’s ${name}. I’m happy you stopped by.`,
  },
  {
    id: 'welcome_little_time_together',
    tone: 'warm-welcome',
    render: (name) => `It’s ${name} again. We have a little time together.`,
  },

  // Gentle encouragement
  {
    id: 'encouragement_small_steps',
    tone: 'gentle-encouragement',
    render: (name) => `I’m ${name}, and small steps are welcome here.`,
  },
  {
    id: 'encouragement_take_your_time',
    tone: 'gentle-encouragement',
    render: (name) => `I’m ${name}. You can take your time.`,
  },
  {
    id: 'encouragement_one_gentle_moment',
    tone: 'gentle-encouragement',
    render: (name) => `I’m ${name}; one gentle moment is plenty for now.`,
  },
  {
    id: 'encouragement_cheering_softly',
    tone: 'gentle-encouragement',
    render: (name) => `I’m ${name}, cheering softly for you.`,
  },

  // Quiet companionship
  {
    id: 'companionship_sit_quietly',
    tone: 'quiet-companionship',
    render: (name) => `I’m ${name}. We can sit quietly together.`,
  },
  {
    id: 'companionship_no_words_needed',
    tone: 'quiet-companionship',
    render: (name) => `I’m ${name}. No words are needed; I’m here with you.`,
  },
  {
    id: 'companionship_calm_pause',
    tone: 'quiet-companionship',
    render: (name) => `I’m ${name}; a calm pause together sounds nice.`,
  },
  {
    id: 'companionship_keep_you_company',
    tone: 'quiet-companionship',
    render: (name) => `I’m ${name}, happy to keep you company.`,
  },

  // Playful optimism
  {
    id: 'playful_make_it_brighter',
    tone: 'playful-optimism',
    render: (name) => `I’m ${name}. Let’s make this moment a little brighter.`,
  },
  {
    id: 'playful_tiny_bit_of_fun',
    tone: 'playful-optimism',
    render: (name) => `I’m ${name}, ready for a tiny bit of fun.`,
  },
  {
    id: 'playful_lovely_spark',
    tone: 'playful-optimism',
    render: (name) => `I’m ${name}; you bring a lovely spark.`,
  },
  {
    id: 'playful_smiling_together',
    tone: 'playful-optimism',
    render: (name) => `I’m ${name}, smiling because we’re together.`,
  },

  // Self-kindness
  {
    id: 'kindness_be_gentle_today',
    tone: 'self-kindness',
    render: (name) => `I’m ${name}. Be gentle with yourself today.`,
  },
  {
    id: 'kindness_patience_is_welcome',
    tone: 'self-kindness',
    render: (name) => `I’m ${name}. You deserve patience and kindness.`,
  },
  {
    id: 'kindness_your_pace_is_welcome',
    tone: 'self-kindness',
    render: (name) => `I’m ${name}; your pace is welcome.`,
  },
  {
    id: 'kindness_thank_yourself',
    tone: 'self-kindness',
    render: (name) => `I’m ${name}. Thank yourself for being here.`,
  },
] as const;

export type CompanionTalkSelection = {
  id: string;
  text: string;
};

export type SelectCompanionTalkOptions = {
  petName?: string | null;
  previousId?: string | null;
  random?: () => number;
};

const FALLBACK_PET_NAME = 'your companion';

function normalizedPetName(petName?: string | null): string {
  return typeof petName === 'string' && petName.trim()
    ? petName.trim()
    : FALLBACK_PET_NAME;
}

/** Clamp arbitrary injected RNG output to a safe closed unit interval. */
function normalizedRandom(random: (() => number) | undefined): number {
  let value: number;
  try {
    value = random ? Number(random()) : Math.random();
  } catch {
    value = 0;
  }

  if (Number.isNaN(value)) return 0;
  if (value === Infinity) return 1;
  if (value === -Infinity) return 0;
  return Math.min(1, Math.max(0, value));
}

function randomIndex(random: (() => number) | undefined, length: number): number {
  if (length <= 1) return 0;
  const unit = normalizedRandom(random);
  return unit >= 1 ? length - 1 : Math.floor(unit * length);
}

function selectionIndex(
  random: (() => number) | undefined,
  phrases: readonly CompanionTalkPhrase[],
  previousId?: string | null
): number {
  if (phrases.length <= 1) return 0;

  const previousIndex = phrases.findIndex((phrase) => phrase.id === previousId);
  if (previousIndex < 0) return randomIndex(random, phrases.length);

  // Select uniformly from the length - 1 remaining ranks, then skip the
  // previous phrase's slot. This keeps every permitted phrase equally likely.
  const candidateIndex = randomIndex(random, phrases.length - 1);
  return candidateIndex >= previousIndex ? candidateIndex + 1 : candidateIndex;
}

/**
 * Select one safe phrase. When there is a previous selection, the injected
 * RNG is mapped uniformly over every other phrase without retry loops.
 */
export function selectCompanionTalk({
  petName,
  previousId,
  random,
}: SelectCompanionTalkOptions = {}): CompanionTalkSelection {
  const phrases = COMPANION_TALK_PHRASES;
  const selectedIndex = selectionIndex(random, phrases, previousId);
  const phrase = phrases[selectedIndex];
  const name = normalizedPetName(petName);
  return { id: phrase.id, text: phrase.render(name) };
}

/**
 * Backwards-compatible timestamp rotator used by the existing screen until
 * it owns a previous phrase ID. The new selector remains the policy seam.
 */
export function nextCompanionTalk(petName: string, salt = Date.now()): string {
  const numericSalt = Number(salt);
  const safeSalt = Number.isFinite(numericSalt) ? Math.abs(Math.floor(numericSalt / 1000)) : 0;
  const index = safeSalt % COMPANION_TALK_PHRASES.length;
  const unit = index / COMPANION_TALK_PHRASES.length;
  return selectCompanionTalk({ petName, random: () => unit }).text;
}

/** Patient-facing type-on cadence: reveal complete words, never partial glyphs. */
export function companionTalkWords(line: string): string[] {
  return line.trim().split(/\s+/).filter(Boolean);
}

export function companionTalkFrame(line: string, visibleWords: number): string {
  return companionTalkWords(line).slice(0, Math.max(0, visibleWords)).join(' ');
}
