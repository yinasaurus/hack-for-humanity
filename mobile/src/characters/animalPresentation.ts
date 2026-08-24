export type AnimalActionMotion = {
  durationMs: number;
  amp: number;
  yaw: number;
  roll: number;
  scalePulse: number;
  clipSpeed: number;
};

export type AnimalVisualProfile = {
  surface: {
    smoothNormals: boolean;
    roughness: number;
    metalness: number;
    clearcoat: number;
  };
  eyes: {
    scale: number;
    roughness: number;
    highlight: number;
    /** Optional dark/readable eye material cue for rigs with eye meshes. */
    color?: string;
  };
  /** Restrained face polish for species whose GLB exposes named face meshes. */
  face?: {
    muzzleScale: number;
    noseScale: number;
    earScale: number;
    cheekRoundness: number;
    eyeSpacing: number;
  };
  lighting: {
    key: number;
    fill: number;
    rim: number;
  };
};

export type AnimalVoiceNote = {
  frequency: number;
  endFrequency: number;
  durationMs: number;
  offsetMs: number;
  waveform: 'sine' | 'triangle' | 'square';
};

export type AnimalPresentation = {
  framing?: {
    /** Stable camera fit for models whose skeleton bounds exceed their visible mesh. */
    fit: number;
    groundRadius: number;
  };
  material: {
    tint: string;
    strength: number;
    roughness: number;
    replaceVertexColors?: boolean;
  };
  visual: AnimalVisualProfile;
  actions: {
    wave: AnimalActionMotion;
    play: AnimalActionMotion;
    curious: AnimalActionMotion;
    gentle: AnimalActionMotion;
  };
  voice: {
    /** Expo Speech controls used for patient-initiated companion lines. */
    pitch: number;
    rate: number;
    volume: number;
    /** Short on-screen rendering of the species call shown with its greeting. */
    caption: string;
    /** Short synthesized species cue used only after a direct action tap. */
    call: readonly AnimalVoiceNote[];
  };
};

const motion = (
  durationMs: number,
  amp: number,
  yaw: number,
  roll: number,
  scalePulse: number,
  clipSpeed: number
): AnimalActionMotion => ({ durationMs, amp, yaw, roll, scalePulse, clipSpeed });

const smoothToyVisual = (): AnimalVisualProfile => ({
  surface: {
    smoothNormals: true,
    // Soft fur/feather response: matte enough to feel organic, with only a
    // restrained highlight so the animals do not read as plastic toys.
    roughness: 0.74,
    metalness: 0,
    clearcoat: 0.08,
  },
  eyes: {
    // Broad direction from the supplied references: expressive, readable
    // eyes without copying any character's face or changing anatomy.
    scale: 1.16,
    roughness: 0.12,
    highlight: 0.86,
  },
  lighting: {
    key: 1.28,
    fill: 0.82,
    rim: 0.56,
  },
});

type AnimalVisualPatch = {
  eyes?: Partial<AnimalVisualProfile['eyes']>;
  face?: NonNullable<AnimalVisualProfile['face']>;
};

const visualWith = (patch: AnimalVisualPatch): AnimalVisualProfile => {
  const base = smoothToyVisual();
  return {
    ...base,
    eyes: { ...base.eyes, ...(patch.eyes || {}) },
    ...(patch.face ? { face: patch.face } : {}),
  };
};

export const ANIMAL_PRESENTATIONS: Record<string, AnimalPresentation> = {
  fox: {
    framing: { fit: 1.12, groundRadius: 1.05 },
    material: { tint: '#d9783f', strength: 0.08, roughness: 0.72 },
    visual: smoothToyVisual(),
    actions: {
      wave: motion(1650, 0.045, 0.34, 0.08, 0.015, 0.62),
      play: motion(1500, 0.07, 0.44, 0.1, 0.05, 0.88),
      curious: motion(2100, 0.025, 0.36, 0.12, 0.01, 0.42),
      gentle: motion(1450, 0.035, 0.12, 0.04, 0.015, 0.42),
    },
    voice: {
      pitch: 1.16,
      rate: 0.94,
      volume: 0.2,
      caption: 'Yip-yip!',
      call: [
        { frequency: 520, endFrequency: 760, durationMs: 150, offsetMs: 0, waveform: 'triangle' },
        { frequency: 680, endFrequency: 840, durationMs: 120, offsetMs: 125, waveform: 'sine' },
      ],
    },
  },
  horse: {
    framing: { fit: 1.12, groundRadius: 1.05 },
    material: {
      tint: '#9b6742',
      strength: 0.78,
      roughness: 0.82,
      replaceVertexColors: false,
    },
    visual: smoothToyVisual(),
    actions: {
      wave: motion(1950, 0.035, 0.2, 0.04, 0.012, 0.38),
      play: motion(1850, 0.055, 0.24, 0.06, 0.035, 0.62),
      curious: motion(2400, 0.018, 0.18, 0.08, 0.008, 0.3),
      gentle: motion(1750, 0.025, 0.08, 0.025, 0.01, 0.3),
    },
    voice: {
      pitch: 0.86,
      rate: 0.82,
      volume: 0.18,
      caption: 'Neeeigh!',
      call: [
        { frequency: 240, endFrequency: 410, durationMs: 260, offsetMs: 0, waveform: 'triangle' },
        { frequency: 390, endFrequency: 300, durationMs: 220, offsetMs: 190, waveform: 'sine' },
      ],
    },
  },
  parrot: {
    framing: { fit: 1.35, groundRadius: 0.9 },
    material: { tint: '#67a95a', strength: 0.06, roughness: 0.68 },
    visual: smoothToyVisual(),
    actions: {
      wave: motion(1450, 0.06, 0.42, 0.14, 0.02, 0.82),
      play: motion(1350, 0.085, 0.58, 0.18, 0.055, 1.02),
      curious: motion(1850, 0.035, 0.48, 0.18, 0.012, 0.55),
      gentle: motion(1250, 0.045, 0.16, 0.08, 0.018, 0.55),
    },
    voice: {
      pitch: 1.3,
      rate: 1,
      volume: 0.16,
      caption: 'Chirp-chirp!',
      call: [
        { frequency: 980, endFrequency: 1380, durationMs: 100, offsetMs: 0, waveform: 'sine' },
        { frequency: 1180, endFrequency: 1580, durationMs: 90, offsetMs: 105, waveform: 'sine' },
        { frequency: 1080, endFrequency: 1360, durationMs: 80, offsetMs: 205, waveform: 'triangle' },
      ],
    },
  },
  flamingo: {
    // Long-neck source GLBs otherwise leave too much empty viewer space.
    framing: { fit: 1.2, groundRadius: 0.95 },
    material: { tint: '#e49a9d', strength: 0.08, roughness: 0.7 },
    visual: smoothToyVisual(),
    actions: {
      wave: motion(1800, 0.05, 0.28, 0.13, 0.018, 0.6),
      play: motion(1650, 0.07, 0.38, 0.2, 0.04, 0.78),
      curious: motion(2250, 0.025, 0.32, 0.2, 0.01, 0.4),
      gentle: motion(1550, 0.035, 0.12, 0.1, 0.012, 0.4),
    },
    voice: {
      pitch: 1.04,
      rate: 0.88,
      volume: 0.15,
      caption: 'Honk-honk!',
      call: [
        { frequency: 360, endFrequency: 300, durationMs: 220, offsetMs: 0, waveform: 'triangle' },
        { frequency: 330, endFrequency: 280, durationMs: 180, offsetMs: 180, waveform: 'triangle' },
      ],
    },
  },
  stork: {
    framing: { fit: 1.2, groundRadius: 0.95 },
    material: { tint: '#f0eee6', strength: 0.04, roughness: 0.76 },
    visual: smoothToyVisual(),
    actions: {
      wave: motion(1750, 0.045, 0.24, 0.1, 0.015, 0.58),
      play: motion(1550, 0.065, 0.34, 0.14, 0.035, 0.72),
      curious: motion(2200, 0.02, 0.28, 0.16, 0.008, 0.36),
      gentle: motion(1550, 0.03, 0.1, 0.07, 0.01, 0.36),
    },
    voice: {
      pitch: 0.94,
      rate: 0.8,
      volume: 0.13,
      caption: 'Clack-clack!',
      call: [
        { frequency: 720, endFrequency: 620, durationMs: 55, offsetMs: 0, waveform: 'square' },
        { frequency: 760, endFrequency: 640, durationMs: 55, offsetMs: 85, waveform: 'square' },
        { frequency: 700, endFrequency: 600, durationMs: 55, offsetMs: 170, waveform: 'square' },
      ],
    },
  },
  dog: {
    framing: { fit: 1.34, groundRadius: 1.02 },
    material: { tint: '#b8794f', strength: 0.08, roughness: 0.76 },
    visual: smoothToyVisual(),
    actions: {
      wave: motion(1500, 0.055, 0.38, 0.12, 0.025, 0.72),
      play: motion(1250, 0.095, 0.52, 0.14, 0.065, 1.02),
      curious: motion(1900, 0.03, 0.44, 0.16, 0.015, 0.52),
      gentle: motion(1350, 0.045, 0.18, 0.06, 0.025, 0.5),
    },
    voice: {
      pitch: 0.94,
      rate: 0.92,
      volume: 0.2,
      caption: 'Woof-woof!',
      call: [
        { frequency: 220, endFrequency: 150, durationMs: 145, offsetMs: 0, waveform: 'square' },
        { frequency: 250, endFrequency: 165, durationMs: 135, offsetMs: 185, waveform: 'square' },
      ],
    },
  },
  cat: {
    framing: { fit: 0.92, groundRadius: 0.96 },
    material: { tint: '#d6a47b', strength: 0.06, roughness: 0.7 },
    visual: visualWith({
      eyes: { scale: 1.1 },
      face: {
        // Keep the existing feline mesh intact; these are optional polish
        // cues for renderers that can identify muzzle/nose/ear meshes.
        muzzleScale: 1.04,
        noseScale: 0.88,
        earScale: 1.06,
        cheekRoundness: 0.84,
        eyeSpacing: 0.96,
      },
    }),
    actions: {
      wave: motion(1700, 0.04, 0.42, 0.16, 0.018, 0.58),
      play: motion(1400, 0.075, 0.6, 0.2, 0.055, 0.9),
      curious: motion(2200, 0.022, 0.5, 0.22, 0.012, 0.42),
      gentle: motion(1600, 0.035, 0.2, 0.1, 0.02, 0.42),
    },
    voice: {
      pitch: 1.18,
      rate: 0.9,
      volume: 0.16,
      caption: 'Mew-purr!',
      call: [
        { frequency: 620, endFrequency: 910, durationMs: 220, offsetMs: 0, waveform: 'triangle' },
        { frequency: 900, endFrequency: 520, durationMs: 260, offsetMs: 180, waveform: 'sine' },
      ],
    },
  },
  panda: {
    framing: { fit: 1.38, groundRadius: 1.05 },
    material: { tint: '#f1ece2', strength: 0.03, roughness: 0.84 },
    visual: smoothToyVisual(),
    actions: {
      wave: motion(2000, 0.035, 0.26, 0.08, 0.02, 0.42),
      play: motion(1700, 0.065, 0.36, 0.12, 0.05, 0.66),
      curious: motion(2450, 0.018, 0.28, 0.14, 0.012, 0.3),
      gentle: motion(1800, 0.028, 0.1, 0.04, 0.018, 0.3),
    },
    voice: {
      pitch: 0.82,
      rate: 0.8,
      volume: 0.17,
      caption: 'Hrrm-hmm!',
      call: [
        { frequency: 170, endFrequency: 130, durationMs: 260, offsetMs: 0, waveform: 'triangle' },
        { frequency: 145, endFrequency: 190, durationMs: 210, offsetMs: 220, waveform: 'sine' },
      ],
    },
  },
  penguin: {
    framing: { fit: 1.42, groundRadius: 0.92 },
    material: { tint: '#eaf0f1', strength: 0.03, roughness: 0.74 },
    visual: visualWith({
      // The source penguin's face reads better with a slightly smaller eye
      // cue; keep the rest of its approved silhouette unchanged.
      eyes: { scale: 0.96, color: '#161b24' },
    }),
    actions: {
      wave: motion(1550, 0.05, 0.3, 0.2, 0.025, 0.7),
      play: motion(1350, 0.09, 0.42, 0.24, 0.06, 0.92),
      curious: motion(2050, 0.028, 0.36, 0.22, 0.014, 0.48),
      gentle: motion(1400, 0.04, 0.14, 0.12, 0.022, 0.46),
    },
    voice: {
      pitch: 1.1,
      rate: 0.94,
      volume: 0.15,
      caption: 'Honk-chirp!',
      call: [
        { frequency: 430, endFrequency: 610, durationMs: 120, offsetMs: 0, waveform: 'triangle' },
        { frequency: 590, endFrequency: 470, durationMs: 110, offsetMs: 125, waveform: 'triangle' },
        { frequency: 520, endFrequency: 700, durationMs: 90, offsetMs: 245, waveform: 'sine' },
      ],
    },
  },
  rabbit: {
    framing: { fit: 0.6, groundRadius: 0.9 },
    material: { tint: '#CFC0A2', strength: 0.08, roughness: 0.78 },
    visual: visualWith({
      eyes: { scale: 1.08, color: '#101315' },
      face: {
        muzzleScale: 1.06,
        noseScale: 0.9,
        earScale: 0.96,
        cheekRoundness: 0.88,
        eyeSpacing: 0.94,
      },
    }),
    actions: {
      wave: motion(1250, 0.065, 0.48, 0.18, 0.03, 0.86),
      play: motion(1050, 0.11, 0.7, 0.22, 0.075, 1.15),
      curious: motion(1650, 0.04, 0.58, 0.24, 0.018, 0.62),
      gentle: motion(1150, 0.055, 0.24, 0.1, 0.03, 0.62),
    },
    voice: {
      pitch: 1.34,
      rate: 1.02,
      volume: 0.12,
      caption: 'Snuffle-squeak!',
      call: [
        { frequency: 1250, endFrequency: 1650, durationMs: 70, offsetMs: 0, waveform: 'sine' },
        { frequency: 1450, endFrequency: 1880, durationMs: 65, offsetMs: 90, waveform: 'sine' },
        { frequency: 1320, endFrequency: 1720, durationMs: 60, offsetMs: 175, waveform: 'triangle' },
      ],
    },
  },
};

export function animalPresentationFor(species?: string | null): AnimalPresentation {
  // Stored Hamster records remain readable after Rabbit replaces onboarding.
  const resolved = species === 'hamster' ? 'rabbit' : species || 'fox';
  return ANIMAL_PRESENTATIONS[resolved] || ANIMAL_PRESENTATIONS.fox;
}

export type CompanionVitality = 'bright' | 'fatigued' | 'dim' | 'dormant';

const VITALITY_OPACITY: Record<CompanionVitality, number> = {
  bright: 1,
  fatigued: 0.9,
  dim: 0.76,
  dormant: 0.62,
};

/** Keep vitality feedback visible without washing away the animal's identity. */
export function companionVitalityOpacity(vitality?: string | null): number {
  return VITALITY_OPACITY[(vitality || 'bright') as CompanionVitality] ?? 1;
}
