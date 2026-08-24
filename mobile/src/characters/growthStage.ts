/**
 * Patient-safe visual stages supplied by the clinic backend.
 *
 * The viewer keeps one GLB per animal and changes its presentation instead of
 * exposing calorie, streak, or milestone numbers to the patient.
 */
export type GrowthStage =
  | 'baby'
  | 'little'
  | 'growing'
  | 'playful'
  | 'adventurer'
  | 'grown';

/**
 * Small, named anatomy cues that a renderer can apply to discovered rig
 * channels. These are scale multipliers relative to the normalized source
 * model; they are not a second whole-body transform. Missing channels are
 * intentionally safe to ignore.
 */
export type GrowthChannelScales = {
  /** The normalized torso/body scale, retained as a tuple for axis safety. */
  body: readonly [number, number, number];
  /** Head and muzzle readability cues. */
  head: number;
  muzzle: number;
  /** Long-form anatomy cues for birds and foals. */
  neck: number;
  legs: number;
  wings: number;
  /** Species-specific juvenile cues. */
  ears: number;
  tail: number;
  eyes: number;
};

export type GrowthStagePresentation = {
  /** Broad visual age used to keep each milestone's silhouette intentional. */
  lifePhase: 'baby' | 'juvenile' | 'teen' | 'youngAdult';
  /** Relative size after the GLB is normalized to the shared viewer frame. */
  scale: number;
  /** A small framing offset keeps each chapter feeling subtly different. */
  position: readonly [number, number, number];
  /** Gentle juvenile-to-adult proportion morph applied on top of the GLB. */
  proportions: {
    bodyScale: readonly [number, number, number];
    headScale: number;
  };
  /**
   * Species-aware cues for a renderer adapter. `body` and `head` mirror the
   * legacy `proportions` values so older adapters can consume either shape.
   */
  channels: GrowthChannelScales;
};

/**
 * Deliberately noticeable size steps with conservative anatomy changes. The
 * source GLBs already encode species anatomy, so growth must not squash the
 * torso or turn a head into a second whole-body scale transform.
 */
export const GROWTH_STAGE_PRESENTATIONS: Record<GrowthStage, GrowthStagePresentation> = {
  baby: {
    lifePhase: 'baby',
    scale: 0.62,
    position: [0, 0.01, 0.02],
    proportions: { bodyScale: [0.98, 0.95, 1.02], headScale: 1.08 },
    channels: {
      body: [0.98, 0.95, 1.02],
      head: 1.08,
      muzzle: 1.06,
      neck: 0.92,
      legs: 0.86,
      wings: 0.84,
      ears: 0.9,
      tail: 0.86,
      eyes: 1.04,
    },
  },
  little: {
    lifePhase: 'baby',
    scale: 0.78,
    position: [0, 0.02, 0.01],
    proportions: { bodyScale: [0.99, 0.97, 1.01], headScale: 1.06 },
    channels: {
      body: [0.99, 0.97, 1.01],
      head: 1.06,
      muzzle: 1.05,
      neck: 0.94,
      legs: 0.89,
      wings: 0.88,
      ears: 0.92,
      tail: 0.89,
      eyes: 1.03,
    },
  },
  growing: {
    lifePhase: 'juvenile',
    scale: 0.94,
    position: [0, 0.03, 0],
    proportions: { bodyScale: [1, 0.99, 1], headScale: 1.035 },
    channels: {
      body: [1, 0.99, 1],
      head: 1.035,
      muzzle: 1.035,
      neck: 0.96,
      legs: 0.92,
      wings: 0.92,
      ears: 0.94,
      tail: 0.92,
      eyes: 1.02,
    },
  },
  playful: {
    lifePhase: 'teen',
    scale: 1.1,
    position: [0, 0.04, -0.01],
    proportions: { bodyScale: [1, 1, 1], headScale: 1.015 },
    channels: {
      body: [1, 1, 1],
      head: 1.015,
      muzzle: 1.02,
      neck: 0.98,
      legs: 0.95,
      wings: 0.95,
      ears: 0.97,
      tail: 0.95,
      eyes: 1.01,
    },
  },
  adventurer: {
    lifePhase: 'youngAdult',
    scale: 1.27,
    position: [0, 0.05, -0.02],
    proportions: { bodyScale: [1.01, 1.02, 0.995], headScale: 1.005 },
    channels: {
      body: [1.01, 1.02, 0.995],
      head: 1.005,
      muzzle: 1.01,
      neck: 0.995,
      legs: 0.98,
      wings: 0.98,
      ears: 0.99,
      tail: 0.98,
      eyes: 1.005,
    },
  },
  grown: {
    lifePhase: 'youngAdult',
    scale: 1.44,
    position: [0, 0.06, -0.03],
    proportions: { bodyScale: [1.02, 1.04, 0.99], headScale: 1 },
    channels: {
      body: [1.02, 1.04, 0.99],
      head: 1,
      muzzle: 1,
      neck: 1,
      legs: 1,
      wings: 1,
      ears: 1,
      tail: 1,
      eyes: 1,
    },
  },
};

type SpeciesGrowthEndpoints = {
  baby: GrowthChannelScales;
  grown: GrowthChannelScales;
};

export type SpeciesGrowthProfile = SpeciesGrowthEndpoints & {
  /** Corrects anatomy already present in the source mesh at every chapter. */
  headBaseline: number;
  /** Controls how much of the shared age-head cue this species receives. */
  ageHeadEmphasis: number;
};

const DEFAULT_SPECIES_GROWTH_PROFILE: SpeciesGrowthProfile = {
  headBaseline: 1,
  ageHeadEmphasis: 1,
  baby: GROWTH_STAGE_PRESENTATIONS.baby.channels,
  grown: GROWTH_STAGE_PRESENTATIONS.grown.channels,
};

const body = (x: number, y: number, z: number): readonly [number, number, number] => [x, y, z];

const channels = (values: Partial<GrowthChannelScales> & Pick<GrowthChannelScales, 'body' | 'head'>): GrowthChannelScales => ({
  body: values.body,
  head: values.head,
  muzzle: values.muzzle ?? values.head,
  neck: values.neck ?? 1,
  legs: values.legs ?? 1,
  wings: values.wings ?? 1,
  ears: values.ears ?? 1,
  tail: values.tail ?? 1,
  eyes: values.eyes ?? 1,
});

/**
 * Source-model calibration. The explicit endpoints make baby silhouettes
 * legible even when a GLB has no morph targets. All interpolation stays
 * bounded and monotonic for length-like channels.
 */
export const SPECIES_GROWTH_PROFILES: Record<string, SpeciesGrowthProfile> = {
  fox: {
    headBaseline: 1,
    ageHeadEmphasis: 0.8,
    baby: channels({ body: body(0.99, 0.95, 1.03), head: 1.08, muzzle: 1.06, legs: 0.84, ears: 0.9, tail: 0.84, eyes: 1.04 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, legs: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  horse: {
    headBaseline: 1,
    ageHeadEmphasis: 0.55,
    // Foal: compact torso, short legs/neck/muzzle, and a rounded head cue.
    baby: channels({ body: body(1.02, 0.95, 1.04), head: 1.09, muzzle: 0.84, neck: 0.84, legs: 0.72, ears: 0.9, tail: 0.82, eyes: 1.05 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, neck: 1, legs: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  parrot: {
    headBaseline: 1,
    ageHeadEmphasis: 0.65,
    // Chick: round body, short wing/tail reach, large head/eye cue.
    baby: channels({ body: body(1.03, 0.95, 1.04), head: 1.09, muzzle: 1.04, neck: 0.9, legs: 0.82, wings: 0.7, ears: 1, tail: 0.68, eyes: 1.06 }),
    grown: channels({ body: body(1.01, 1.03, 1), head: 1, muzzle: 1, neck: 1, legs: 1, wings: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  flamingo: {
    headBaseline: 1,
    ageHeadEmphasis: 0.35,
    // Chick: short neck/legs/wing reach and round body; no tall adult sweep.
    baby: channels({ body: body(1.04, 0.95, 1.04), head: 1.08, muzzle: 1.02, neck: 0.52, legs: 0.56, wings: 0.72, ears: 1, tail: 0.82, eyes: 1.05 }),
    grown: channels({ body: body(1.01, 1.03, 1), head: 1, muzzle: 1, neck: 1, legs: 1, wings: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  stork: {
    headBaseline: 1,
    ageHeadEmphasis: 0.35,
    baby: channels({ body: body(1.04, 0.95, 1.04), head: 1.08, muzzle: 1.02, neck: 0.5, legs: 0.54, wings: 0.7, ears: 1, tail: 0.8, eyes: 1.05 }),
    grown: channels({ body: body(1.01, 1.03, 1), head: 1, muzzle: 1, neck: 1, legs: 1, wings: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  dog: {
    headBaseline: 0.99,
    ageHeadEmphasis: 0.55,
    baby: channels({ body: body(1, 0.95, 1.03), head: 1, muzzle: 1.02, legs: 0.84, ears: 0.9, tail: 0.86, eyes: 1.04 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, legs: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  cat: {
    headBaseline: 0.99,
    ageHeadEmphasis: 0.7,
    baby: channels({ body: body(1.01, 0.95, 1.03), head: 1.06, muzzle: 1.04, legs: 0.84, ears: 0.88, tail: 0.86, eyes: 1.04 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, legs: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  panda: {
    headBaseline: 1,
    ageHeadEmphasis: 0.5,
    // Cub: compact, round and short-limbed, with a visibly softer face.
    baby: channels({ body: body(1.04, 0.95, 1.04), head: 1.1, muzzle: 1.05, legs: 0.78, ears: 0.86, tail: 0.9, eyes: 1.06 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, legs: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  penguin: {
    headBaseline: 0.99,
    ageHeadEmphasis: 0.6,
    baby: channels({ body: body(1.03, 0.95, 1.03), head: 1.06, muzzle: 1.03, legs: 0.84, wings: 0.86, ears: 1, tail: 0.9, eyes: 1.02 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, legs: 1, wings: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  rabbit: {
    headBaseline: 1,
    ageHeadEmphasis: 0.65,
    // Kit: smaller silhouette, shorter ears/legs, round torso and large eyes.
    baby: channels({ body: body(1.04, 0.95, 1.04), head: 1.1, muzzle: 1.04, neck: 0.9, legs: 0.7, wings: 1, ears: 0.72, tail: 0.8, eyes: 1.06 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, neck: 1, legs: 1, wings: 1, ears: 1, tail: 1, eyes: 1 }),
  },
  // Hamster remains a readable legacy id and receives the compact rabbit-like
  // safety profile until an old record is rendered through Rabbit.
  hamster: {
    headBaseline: 0.99,
    ageHeadEmphasis: 0.55,
    baby: channels({ body: body(1.04, 0.95, 1.04), head: 1.08, muzzle: 1.04, legs: 0.74, ears: 0.8, tail: 0.86, eyes: 1.05 }),
    grown: channels({ body: body(1.02, 1.04, 0.99), head: 1, muzzle: 1, legs: 1, ears: 1, tail: 1, eyes: 1 }),
  },
};

const STAGE_PROGRESS: Record<GrowthStage, number> = {
  baby: 0,
  little: 0.2,
  growing: 0.4,
  playful: 0.6,
  adventurer: 0.8,
  grown: 1,
};

function bounded(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function interpolateChannels(profile: SpeciesGrowthProfile, progress: number): GrowthChannelScales {
  const t = bounded(progress, 0, 1);
  const b = profile.baby;
  const g = profile.grown;
  const bodyScale = body(
    lerp(b.body[0], g.body[0], t),
    lerp(b.body[1], g.body[1], t),
    lerp(b.body[2], g.body[2], t)
  );
  return {
    body: bodyScale,
    head: lerp(b.head, g.head, t),
    muzzle: lerp(b.muzzle, g.muzzle, t),
    neck: lerp(b.neck, g.neck, t),
    legs: lerp(b.legs, g.legs, t),
    wings: lerp(b.wings, g.wings, t),
    ears: lerp(b.ears, g.ears, t),
    tail: lerp(b.tail, g.tail, t),
    eyes: lerp(b.eyes, g.eyes, t),
  };
}

function stageFor(stage: GrowthStage | string | null | undefined): GrowthStage {
  return stage && stage in GROWTH_STAGE_PRESENTATIONS ? stage as GrowthStage : 'baby';
}

/**
 * Preserve source anatomy while retaining visible, species-specific age cues.
 * Overall scale remains the primary monotonic signal; channels only modify
 * discovered anatomy bones/meshes and are individually bounded by the caller.
 */
export function getSpeciesGrowthStagePresentation(
  stage: GrowthStage | string | null | undefined,
  species?: string | null
): GrowthStagePresentation {
  const safeStage = stageFor(stage);
  const base = GROWTH_STAGE_PRESENTATIONS[safeStage];
  const profile = (species && SPECIES_GROWTH_PROFILES[species]) || DEFAULT_SPECIES_GROWTH_PROFILE;
  const interpolated = interpolateChannels(profile, STAGE_PROGRESS[safeStage]);
  const calibratedHead = bounded(interpolated.head * profile.headBaseline, 0.88, 1.12);
  const safeChannels: GrowthChannelScales = {
    ...interpolated,
    head: calibratedHead,
    body: body(
      bounded(interpolated.body[0], 0.94, 1.06),
      bounded(interpolated.body[1], 0.94, 1.06),
      bounded(interpolated.body[2], 0.94, 1.06)
    ),
    muzzle: bounded(interpolated.muzzle, 0.55, 1.1),
    neck: bounded(interpolated.neck, 0.45, 1.05),
    legs: bounded(interpolated.legs, 0.5, 1.05),
    wings: bounded(interpolated.wings, 0.55, 1.05),
    ears: bounded(interpolated.ears, 0.55, 1.08),
    tail: bounded(interpolated.tail, 0.55, 1.08),
    eyes: bounded(interpolated.eyes, 0.92, 1.1),
  };

  return {
    ...base,
    proportions: {
      bodyScale: safeChannels.body,
      headScale: safeChannels.head,
    },
    channels: safeChannels,
  };
}

/**
 * Treat malformed or future backend values as the smallest safe presentation
 * so an out-of-date client never crashes while rendering a companion.
 */
export function getGrowthStagePresentation(
  stage?: GrowthStage | string | null
): GrowthStagePresentation {
  const safeStage = stageFor(stage);
  return GROWTH_STAGE_PRESENTATIONS[safeStage];
}

/**
 * Only transitions after the initial baby chapter need a "Buddi grew!"
 * moment. Day 1 welcomes a companion but does not change its visual stage.
 */
export const GROWTH_MILESTONE_DAYS = [5, 10, 20, 50, 100] as const;

export function isGrowthMilestoneDay(day: number | undefined | null): boolean {
  return typeof day === 'number' && GROWTH_MILESTONE_DAYS.includes(day as (typeof GROWTH_MILESTONE_DAYS)[number]);
}
