/**
 * Species choreography is deliberately independent of Three.js.  The viewer
 * serialises the bounded profile into its WebView and applies the returned
 * channel deltas to whichever rig parts the model actually exposes.
 */
export const CHOREOGRAPHY_ACTIONS = ['wave', 'play'] as const;
export type ChoreographyAction = (typeof CHOREOGRAPHY_ACTIONS)[number];

export const CHOREOGRAPHY_PHASES = [
  'anticipation',
  'primary',
  'secondary',
  'settle',
] as const;
export type ChoreographyPhaseName = (typeof CHOREOGRAPHY_PHASES)[number];

export type ChoreographyPhase = {
  name: ChoreographyPhaseName;
  start: number;
  end: number;
  intensity: number;
};

export type ChoreographyTarget =
  | 'head'
  | 'ear'
  | 'forelimb'
  | 'wing'
  | 'flipper'
  | 'tail';

export type ChoreographyChannelIntent = {
  target: ChoreographyTarget;
  axis: 'x' | 'y' | 'z';
  /** Maximum local rotation in radians. */
  amplitude: number;
  /** Visible beats per action. */
  cycles: number;
  /** Phase in radians, used to avoid every appendage moving in lockstep. */
  phase: number;
  phaseName: ChoreographyPhaseName;
  motion: 'greeting' | 'flap' | 'wag' | 'perk' | 'alternate' | 'lift';
  /** Apply a mirrored sign to alternating discovered bones. */
  mirrored?: boolean;
  /** A segmented tail should receive the intent on every matching segment. */
  allMatches?: boolean;
};

export type ChoreographyRootIntent = {
  /** Root X/Z and yaw/roll are intentionally immutable during gestures. */
  allowX: false;
  allowZ: false;
  allowYaw: false;
  allowRoll: false;
  maxLift: number;
  maxScaleY: number;
};

export type ChoreographyRigPolicy = {
  wings: 'both' | 'available';
  tail: 'segmented' | 'available' | 'none';
  fallback: 'head-and-root' | 'root-only';
};

export type ChoreographyVector = { x: number; y: number; z: number };

export type ChoreographySample = {
  root: ChoreographyVector & { lift: number; yaw: number; roll: number; scaleY: number };
  channels: Partial<Record<ChoreographyTarget, ChoreographyVector>>;
};

export type AnimalChoreography = {
  species: string;
  action: ChoreographyAction;
  durationMs: number;
  reducedMotionDurationMs: number;
  phases: readonly ChoreographyPhase[];
  channels: readonly ChoreographyChannelIntent[];
  root: ChoreographyRootIntent;
  rig: ChoreographyRigPolicy;
  /** Coarse samples keep the WebView runtime small and deterministic. */
  samples: readonly ChoreographySample[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const finite = (value: number, fallback = 0) =>
  Number.isFinite(value) ? value : fallback;

const phase = (
  name: ChoreographyPhaseName,
  start: number,
  end: number,
  intensity: number
): ChoreographyPhase => ({
  name,
  start: clamp(start, 0, 1),
  end: clamp(Math.max(start, end), 0, 1),
  intensity: clamp(intensity, 0, 1),
});

const channel = (
  target: ChoreographyTarget,
  axis: 'x' | 'y' | 'z',
  amplitude: number,
  cycles: number,
  phaseValue: number,
  phaseName: ChoreographyPhaseName,
  motion: ChoreographyChannelIntent['motion'],
  options: Pick<ChoreographyChannelIntent, 'mirrored' | 'allMatches'> = {}
): ChoreographyChannelIntent => ({
  target,
  axis,
  amplitude: clamp(Math.abs(amplitude), 0, 1.1),
  cycles: clamp(Math.abs(cycles), 0.25, 8),
  phase: finite(phaseValue),
  phaseName,
  motion,
  ...options,
});

const ROOT: ChoreographyRootIntent = {
  allowX: false,
  allowZ: false,
  allowYaw: false,
  allowRoll: false,
  maxLift: 0.11,
  maxScaleY: 0.08,
};

const WAVE_PHASES: readonly ChoreographyPhase[] = [
  // Anticipation raises the paw; primary holds it up while rocking; settle returns.
  phase('anticipation', 0, 0.14, 0.85),
  phase('primary', 0.14, 0.78, 1),
  phase('secondary', 0.78, 0.9, 0.35),
  phase('settle', 0.9, 1, 0.28),
];

const PLAY_PHASES: readonly ChoreographyPhase[] = [
  phase('anticipation', 0, 0.2, 0.72),
  phase('primary', 0.2, 0.52, 1),
  phase('secondary', 0.52, 0.8, 0.82),
  phase('settle', 0.8, 1, 0.48),
];

type ChoreographyDefinition = Omit<AnimalChoreography, 'samples'>;
type ChoreographyRuntimeProfile = Pick<
  AnimalChoreography,
  'action' | 'phases' | 'channels' | 'root'
>;

/** Greeting wave: one front paw lifts, rocks side-to-side, then returns. Body stays planted. */
const waveForelimbChannels = (): ChoreographyChannelIntent[] => [
  // Raise + hold through anticipation→primary (lift motion follows phase envelope).
  channel('forelimb', 'x', -0.82, 1, 0, 'primary', 'lift'),
  // Slight outward open while raised.
  channel('forelimb', 'y', 0.22, 1, 0, 'primary', 'lift'),
  // Side-to-side rock ≈ 2.5–3 waves while the paw is up.
  channel('forelimb', 'z', 0.72, 2.7, 0, 'primary', 'greeting'),
];

/** Keep in sync with WAVE_BOUNCE_SPECIES in companionWaveSupport.ts */
const BODY_GREETING_SPECIES = new Set([
  'cat',
  'hamster',
  'capybara',
  'rabbit',
  'koala',
  'bear',
  'raccoon',
  'duck',
  'sheep',
  'seal',
  'sloth',
]);

const quadrupedDefinition = (
  species: string,
  action: ChoreographyAction
): ChoreographyDefinition => {
  const play = action === 'play';
  const phases = play ? PLAY_PHASES : WAVE_PHASES;
  const tailAmplitude = play ? 0.68 : 0.39;
  const tailCycles = play ? 4.8 : 2.7;
  const limbAmplitude = play ? 0.38 : 0.46;
  const bodyGreeting = !play && BODY_GREETING_SPECIES.has(species);
  return {
    species,
    action,
    durationMs: play ? 1540 : 1780,
    reducedMotionDurationMs: 520,
    phases,
    // Static GLBs have no limb joints, so Wave is a short centered bounce.
    // Rigged quadrupeds keep planted paw-wave (maxLift/scaleY stay 0).
    root: {
      ...ROOT,
      maxLift: play ? 0.11 : bodyGreeting ? 0.078 : 0,
      maxScaleY: play ? 0.08 : bodyGreeting ? 0.042 : 0,
    },
    rig: {
      wings: 'available',
      tail: 'segmented',
      fallback: play ? 'head-and-root' : 'root-only',
    },
    channels: play
      ? [
          channel('head', 'x', 0.1, 2.1, 0.2, 'secondary', 'greeting'),
          channel('forelimb', 'z', limbAmplitude, 3.2, 0, 'primary', 'alternate', {
            mirrored: true,
          }),
          channel('ear', 'z', 0.19, 2.8, 1.1, 'secondary', 'perk', {
            mirrored: true,
          }),
          channel('tail', 'y', tailAmplitude, tailCycles, 0.42, 'secondary', 'wag', {
            allMatches: true,
          }),
        ]
      : waveForelimbChannels(),
  };
};

const birdDefinition = (
  species: string,
  action: ChoreographyAction
): ChoreographyDefinition => {
  const play = action === 'play';
  const phases = play ? PLAY_PHASES : WAVE_PHASES;
  const isLongLegged = species === 'flamingo' || species === 'stork';
  return {
    species,
    action,
    durationMs: play ? (isLongLegged ? 1640 : 1380) : isLongLegged ? 1810 : 1510,
    reducedMotionDurationMs: 520,
    phases,
    root: { ...ROOT, maxLift: play ? 0.1 : 0.02, maxScaleY: play ? 0.06 : 0.018 },
    rig: { wings: 'both', tail: 'available', fallback: 'head-and-root' },
    channels: [
      channel('head', 'x', isLongLegged ? 0.09 : 0.12, play ? 1.8 : 1.25, 0.25, 'secondary', 'greeting'),
      channel('wing', 'z', play ? (isLongLegged ? 0.92 : 0.86) : isLongLegged ? 0.72 : 0.64, play ? 4.2 : 2.8, 0, 'primary', 'flap', {
        mirrored: true,
        allMatches: true,
      }),
      channel('tail', 'y', play ? 0.24 : 0.12, play ? 3.5 : 2, 0.7, 'secondary', 'wag', {
        allMatches: true,
      }),
    ],
  };
};

const pandaDefinition = (action: ChoreographyAction): ChoreographyDefinition => {
  const play = action === 'play';
  const base = quadrupedDefinition('panda', action);
  if (!play) {
    return {
      ...base,
      durationMs: 1950,
      channels: [
        channel('forelimb', 'x', -0.7, 1, 0, 'primary', 'lift'),
        channel('forelimb', 'y', 0.28, 1, 0, 'primary', 'lift'),
        channel('forelimb', 'z', 0.62, 2.5, 0.15, 'primary', 'greeting'),
      ],
    };
  }
  return {
    ...base,
    durationMs: 1680,
    channels: [
      channel('head', 'x', 0.08, 1.8, 0.15, 'secondary', 'greeting'),
      channel('forelimb', 'z', 0.48, 2.5, 0.2, 'primary', 'alternate', {
        mirrored: true,
      }),
      channel('tail', 'y', 0.53, 4.2, 0.1, 'secondary', 'wag', {
        allMatches: true,
      }),
    ],
  };
};

const penguinDefinition = (action: ChoreographyAction): ChoreographyDefinition => {
  const play = action === 'play';
  return {
    species: 'penguin',
    action,
    durationMs: play ? 1410 : 1590,
    reducedMotionDurationMs: 500,
    phases: play ? PLAY_PHASES : WAVE_PHASES,
    root: { ...ROOT, maxLift: play ? 0.075 : 0.018, maxScaleY: play ? 0.045 : 0.016 },
    rig: { wings: 'both', tail: 'available', fallback: 'head-and-root' },
    channels: [
      channel('head', 'x', 0.075, play ? 1.7 : 1.1, 0.1, 'secondary', 'greeting'),
      channel('flipper', 'y', play ? 0.48 : 0.78, play ? 3.2 : 2.6, 0, 'primary', 'flap', {
        mirrored: true,
        allMatches: true,
      }),
    ],
  };
};

const rabbitDefinition = (action: ChoreographyAction): ChoreographyDefinition => {
  const base = quadrupedDefinition('rabbit', action);
  const play = action === 'play';
  if (!play) {
    return {
      ...base,
      durationMs: 1660,
      // Keep wave paw-only — ears stay still so the gesture reads as a wave.
      channels: waveForelimbChannels(),
    };
  }
  return {
    ...base,
    durationMs: 1480,
    channels: [
      ...base.channels.filter((intent) => intent.target !== 'ear'),
      channel('ear', 'z', 0.32, 3.3, 0.5, 'secondary', 'perk', {
        mirrored: true,
      }),
    ],
  };
};

function canonicalSpecies(species: string | null | undefined): string {
  const id = String(species || '').toLowerCase();
  return id || 'animal';
}

function definitionFor(species: string, action: ChoreographyAction): ChoreographyDefinition {
  if (species === 'parrot' || species === 'flamingo' || species === 'stork') {
    return birdDefinition(species, action);
  }
  if (species === 'panda') return pandaDefinition(action);
  if (species === 'penguin') return penguinDefinition(action);
  if (species === 'rabbit') return rabbitDefinition(action);
  return quadrupedDefinition(species, action);
}

function phaseFor(profile: ChoreographyRuntimeProfile, name: ChoreographyPhaseName): ChoreographyPhase {
  return profile.phases.find((candidate) => candidate.name === name) || profile.phases[0] || phase(name, 0, 1, 0);
}

function smoothStep(value: number): number {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function phaseEnvelope(profile: ChoreographyRuntimeProfile, name: ChoreographyPhaseName, t: number): number {
  const current = phaseFor(profile, name);
  if (t < current.start || t > current.end) return 0;
  const u = clamp((t - current.start) / Math.max(current.end - current.start, 1e-5), 0, 1);
  const fade = name === 'settle' ? 1 - smoothStep(u) : smoothStep(u < 0.5 ? u * 2 : (1 - u) * 2);
  return clamp(fade * current.intensity, 0, 1);
}

function signalFor(
  profile: ChoreographyRuntimeProfile,
  intent: ChoreographyChannelIntent,
  t: number
): number {
  const envelope = phaseEnvelope(profile, intent.phaseName, t);
  if (!envelope) return 0;
  const current = phaseFor(profile, intent.phaseName);
  const u = clamp((t - current.start) / Math.max(current.end - current.start, 1e-5), 0, 1);
  const angle = u * Math.PI * 2 * intent.cycles + intent.phase;
  if (intent.motion === 'perk') return envelope * Math.sin(Math.min(Math.PI, u * Math.PI));
  // Hold a raised pose for the duration of the phase (used for paw lift).
  if (intent.motion === 'lift') return envelope;
  if (intent.motion === 'wag') return envelope * Math.sin(angle);
  if (intent.motion === 'alternate') return envelope * Math.sin(angle);
  if (intent.motion === 'flap') return envelope * Math.sin(angle);
  return envelope * Math.sin(angle);
}

function channelVector(
  axis: ChoreographyChannelIntent['axis'],
  value: number
): ChoreographyVector {
  return {
    x: axis === 'x' ? value : 0,
    y: axis === 'y' ? value : 0,
    z: axis === 'z' ? value : 0,
  };
}

/**
 * Sample a profile at a normalized time. The root is always centered; only a
 * bounded vertical lift and crouch scale are allowed for a playful hop.
 */
export function sampleAnimalChoreography(
  profile: Pick<AnimalChoreography, 'action' | 'phases' | 'channels' | 'root'>,
  time: number,
  reducedMotion = false
): ChoreographySample {
  const t = clamp(finite(time), 0, 1);
  const root: ChoreographySample['root'] = {
    x: 0,
    y: 0,
    z: 0,
    lift: reducedMotion ? Math.sin(Math.PI * t) * 0.008 : 0,
    yaw: 0,
    roll: 0,
    scaleY: 1,
  };
  const channels: Partial<Record<ChoreographyTarget, ChoreographyVector>> = {};
  if (reducedMotion) return { root, channels };

  const anticipation = phaseEnvelope(profile, 'anticipation', t);
  const primary = phaseEnvelope(profile, 'primary', t);
  const secondary = phaseEnvelope(profile, 'secondary', t);
  if (profile.action === 'play') {
    // Play: one crouch → hop arc (distinct from Wave's multi-hop bounce).
    root.lift = clamp(primary * 0.11 + secondary * 0.04, 0, profile.root.maxLift);
    root.scaleY = clamp(1 - anticipation * profile.root.maxScaleY, 1 - profile.root.maxScaleY, 1);
  } else if (profile.root.maxLift > 0 || profile.root.maxScaleY > 0) {
    // Static-mesh Wave: ~2.5 vertical hops using the same phase envelopes as
    // the paw wave (smoothStep), no yaw/roll — enthusiastic but not a spin.
    const hop = Math.abs(Math.sin(t * Math.PI * 2 * 2.5));
    const envelope = clamp(anticipation * 0.4 + primary + secondary * 0.55, 0, 1);
    root.lift = clamp(hop * envelope * profile.root.maxLift, 0, profile.root.maxLift);
    root.scaleY = clamp(
      1 - hop * envelope * profile.root.maxScaleY,
      1 - profile.root.maxScaleY,
      1
    );
  }

  for (const intent of profile.channels) {
    const value = clamp(signalFor(profile, intent, t) * intent.amplitude, -1.1, 1.1);
    const existing = channels[intent.target] || { x: 0, y: 0, z: 0 };
    const next = channelVector(intent.axis, value);
    channels[intent.target] = {
      x: clamp(existing.x + next.x, -1.1, 1.1),
      y: clamp(existing.y + next.y, -1.1, 1.1),
      z: clamp(existing.z + next.z, -1.1, 1.1),
    };
  }

  // Wave settle is already handled by the forelimb channel envelopes fading out.
  // Do not add head follow-through — the body must stay still during a paw wave.
  return { root, channels };
}

/** Resolve a safe profile for any current or legacy animal id. */
export function getAnimalChoreography(
  species: string | null | undefined,
  action: ChoreographyAction
): AnimalChoreography {
  const canonical = canonicalSpecies(species);
  const definition = definitionFor(canonical, action);
  const samples = Array.from({ length: 49 }, (_, index) =>
    sampleAnimalChoreography(definition, index / 48)
  );
  return { ...definition, samples };
}

export function choreographyForSpecies(
  species: string | null | undefined
): Record<ChoreographyAction, AnimalChoreography> {
  return {
    wave: getAnimalChoreography(species, 'wave'),
    play: getAnimalChoreography(species, 'play'),
  };
}
