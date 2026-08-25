import type { CharacterDef } from './types';

/**
 * Free animated GLBs (CDN) — swap for local assets/characters/*.glb anytime.
 * Clip names are explicit candidates; unsupported semantic actions use a
 * procedural rig overlay or remain unavailable rather than guessing a clip.
 *
 * Bundled Poly Pizza animals use `bundled:<id>` paths resolved at runtime
 * (see characterBundledModels.ts + ATTRIBUTION.md). Keep those path strings
 * here so Node catalog tests never evaluate Metro `require()` of `.glb` files.
 */
const STATIC_POLY_PIZZA_CLIPS = {
  idle: 'Idle',
  talk: 'Idle',
  react: 'Idle',
} as const;

const STATIC_POLY_PIZZA_ACTIONS = {
  idle: [] as string[],
  talk: [] as string[],
  wave: [] as string[],
  play: [] as string[],
  curious: [] as string[],
  gentle: [] as string[],
};

const STATIC_POLY_PIZZA_RIG = {
  head: ['Head', 'head', 'Neck', 'neck'],
  jaw: ['Jaw', 'jaw', 'Mouth', 'mouth'],
  // Static meshes have no real limb joints — hints kept for accessory probes only.
  forelimb: [
    'Front_Leg_Shoulder_L',
    'Front_Leg_Upper_L',
    'Forelimb_L',
    'Front_Leg_Foot_L',
    'Front_Leg_Tip_L',
    'ForePaw_L',
  ],
  hand: [
    'Front_Leg_Foot_L',
    'Front_Leg_Tip_L',
    'ForePaw_L',
    'Front_Leg_Foot_R',
    'Front_Leg_Tip_R',
    'ForePaw_R',
  ],
  tail: ['Tail', 'tail'],
  talkMorphs: ['mouthOpen', 'Mouth', 'jaw'],
};

/** Mesh2Motion fox-family shoulder → foot chain (dog/fox/panda/horse). */
const MESH2MOTION_FORELIMB = [
  'Front_Leg_Shoulder_L',
  'Front_Leg_Upper_L',
  'Front_Leg_Shoulder_R',
  'Front_Leg_Upper_R',
  'Forelimb_L',
  'Forelimb_R',
  'Front_Leg_Lower_L',
  'Front_Leg_Lower_R',
  'Front_Leg_Foot_L',
  'Front_Leg_Foot_R',
  'Front_Leg_Tip_L',
  'Front_Leg_Tip_R',
  'ForePaw_L',
  'ForePaw_R',
] as const;

const MESH2MOTION_HAND = [
  'Front_Leg_Foot_L',
  'Front_Leg_Tip_L',
  'ForePaw_L',
  'Front_Leg_Foot_R',
  'Front_Leg_Tip_R',
  'ForePaw_R',
  'Front_Leg_Lower_L',
  'Front_Leg_Lower_R',
] as const;

function polyPizzaCompanion(id: string, label: string): CharacterDef {
  return {
    id,
    label,
    // Animals by molochdadev [CC-BY] via Poly Pizza — static mesh; motion overlay.
    modelPath: `bundled:${id}`,
    clips: { ...STATIC_POLY_PIZZA_CLIPS },
    actions: { ...STATIC_POLY_PIZZA_ACTIONS },
    rig: { ...STATIC_POLY_PIZZA_RIG },
    scale: 1,
  };
}

export const CHARACTER_CATALOG: CharacterDef[] = [
  {
    id: 'fox',
    label: 'Fox',
    // Use the smoother textured Mesh2Motion variation shared by the current
    // dog/cat/panda family instead of the faceted Khronos sample fox.
    modelPath:
      'https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/main/static/models-variation/fox-fox.glb',
    clips: { idle: 'Idle', talk: 'Idle', react: 'Run' },
    actions: {
      idle: ['Idle', 'Walk'],
      talk: ['Talk', 'Eat', 'Bark', 'Survey'],
      wave: ['Wave', 'Gesture'],
      play: ['Play', 'Jump', 'Run'],
      curious: ['Curious', 'Survey'],
      gentle: ['Gentle', 'Idle', 'Walk'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      jaw: ['Jaw', 'jaw', 'Mouth', 'mouth'],
      forelimb: [...MESH2MOTION_FORELIMB],
      hand: [...MESH2MOTION_HAND],
      tail: ['Tail', 'Tail_Base', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'jaw', 'viseme_aa'],
    },
    // Scale is a fine-tune after auto-normalize-to-height in AnimalWebView
    scale: 1,
    position: [0, 0, 0],
  },
  {
    id: 'horse',
    label: 'Horse',
    // Smoother textured Mesh2Motion variation, visually consistent with the
    // dog/cat/panda companion family.
    modelPath:
      'https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/main/static/models-variation/fox-horse.glb',
    clips: { idle: 'Idle', talk: 'Idle', react: 'Run' },
    actions: {
      idle: ['Idle', 'Standing'],
      talk: ['Talk', 'Eat', 'Idle_2', 'Idle'],
      wave: ['Wave', 'Gesture'],
      play: ['Play', 'Jump', 'Gallop', 'Run'],
      curious: ['Curious', 'Idle_2', 'Idle'],
      gentle: ['Gentle', 'Idle'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      jaw: ['Jaw', 'jaw', 'Mouth', 'mouth'],
      forelimb: [...MESH2MOTION_FORELIMB],
      hand: [...MESH2MOTION_HAND],
      tail: ['Tail', 'Tail_Base', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'jaw'],
    },
    scale: 1,
  },
  {
    id: 'parrot',
    label: 'Parrot',
    modelPath: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Parrot.glb',
    clips: { idle: 'parrot_A_idle', talk: 'parrot_A_idle', react: 'parrot_A_flap' },
    actions: {
      idle: ['parrot_A_idle', 'parrot_A_'],
      talk: ['parrot_A_talk', 'parrot_A_peck', 'parrot_A_idle'],
      wave: ['parrot_A_flap', 'parrot_A_wave'],
      play: ['parrot_A_flap', 'parrot_A_fly'],
      curious: ['parrot_A_idle'],
      gentle: ['parrot_A_idle'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      beak: ['Beak', 'beak', 'Mouth', 'mouth'],
      wing: ['Wing', 'wing', 'LeftWing', 'RightWing'],
      tail: ['Tail', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'beakOpen'],
    },
    scale: 1,
  },
  {
    id: 'flamingo',
    label: 'Flamingo',
    modelPath: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Flamingo.glb',
    clips: { idle: 'flamingo_flyA_', talk: 'flamingo_flyA_', react: 'flamingo_flyA_' },
    actions: {
      idle: ['flamingo_flyA_', 'flamingo_A_idle', 'flamingo_A_'],
      talk: ['flamingo_flyA_', 'flamingo_A_talk', 'flamingo_A_idle', 'flamingo_A_'],
      wave: ['flamingo_flyA_', 'flamingo_A_flap', 'flamingo_A_wave', 'flamingo_A_'],
      play: ['flamingo_flyA_', 'flamingo_A_flap', 'flamingo_A_fly', 'flamingo_A_'],
      curious: ['flamingo_flyA_', 'flamingo_A_idle', 'flamingo_A_'],
      gentle: ['flamingo_flyA_', 'flamingo_A_idle', 'flamingo_A_'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      beak: ['Beak', 'beak', 'Bill', 'bill', 'Mouth', 'mouth'],
      wing: ['Wing', 'wing', 'LeftWing', 'RightWing'],
      tail: ['Tail', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'beakOpen'],
    },
    scale: 1,
  },
  {
    id: 'stork',
    label: 'Stork',
    modelPath: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Stork.glb',
    clips: { idle: 'storkFly_B_', talk: 'storkFly_B_', react: 'storkFly_B_' },
    actions: {
      idle: ['storkFly_B_', 'stork_A_idle', 'stork_A_'],
      talk: ['storkFly_B_', 'stork_A_talk', 'stork_A_idle', 'stork_A_'],
      wave: ['storkFly_B_', 'stork_A_flap', 'stork_A_wave', 'stork_A_'],
      play: ['storkFly_B_', 'stork_A_flap', 'stork_A_fly', 'stork_A_'],
      curious: ['storkFly_B_', 'stork_A_idle', 'stork_A_'],
      gentle: ['storkFly_B_', 'stork_A_idle', 'stork_A_'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      beak: ['Beak', 'beak', 'Bill', 'bill', 'Mouth', 'mouth'],
      wing: ['Wing', 'wing', 'LeftWing', 'RightWing'],
      tail: ['Tail', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'beakOpen'],
    },
    scale: 1,
  },
  {
    id: 'dog',
    label: 'Dog',
    // Mesh2Motion model variations are CC0.
    modelPath:
      'https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/main/static/models-variation/fox-dog.glb',
    clips: { idle: 'Idle', talk: 'Idle', react: 'Run' },
    actions: {
      idle: ['Idle', 'Standing'],
      talk: ['Talk', 'Bark', 'Eat', 'Idle'],
      wave: ['Wave', 'Gesture'],
      play: ['Play', 'Jump', 'Run'],
      curious: ['Curious', 'Idle'],
      gentle: ['Gentle', 'Idle'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      jaw: ['Jaw', 'jaw', 'Mouth', 'mouth'],
      forelimb: [...MESH2MOTION_FORELIMB],
      hand: [...MESH2MOTION_HAND],
      tail: ['Tail', 'Tail_Base', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'jaw', 'viseme_aa'],
    },
    scale: 1,
  },
  polyPizzaCompanion('cat', 'Cat'),
  {
    id: 'panda',
    label: 'Panda',
    modelPath:
      'https://raw.githubusercontent.com/Mesh2Motion/mesh2motion-app/main/static/models-variation/fox-panda.glb',
    clips: { idle: 'Idle', talk: 'Idle', react: 'Run' },
    actions: {
      idle: ['Idle', 'Standing'],
      talk: ['Talk', 'Eat', 'Idle'],
      wave: ['Wave', 'Gesture'],
      play: ['Play', 'Jump', 'Run'],
      curious: ['Curious', 'Idle'],
      gentle: ['Gentle', 'Idle'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      jaw: ['Jaw', 'jaw', 'Mouth', 'mouth'],
      forelimb: [...MESH2MOTION_FORELIMB],
      hand: [...MESH2MOTION_HAND],
      tail: ['Tail', 'Tail_Base', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'jaw', 'viseme_aa'],
    },
    scale: 1,
  },
  {
    id: 'penguin',
    label: 'Penguin',
    // Quaternius Cute Animated Monsters — CC0.
    modelPath:
      'https://raw.githubusercontent.com/agentkaerf/FreeModels/main/Cute%20Animated%20Monsters%20-%20Aug%202020/glTF/Penguin.gltf',
    clips: { idle: 'Idle', talk: 'Idle', react: 'Jump' },
    actions: {
      idle: ['Idle', 'Standing'],
      talk: ['Talk', 'Honk', 'Idle'],
      wave: ['Wave', 'Flap'],
      play: ['Play', 'Jump', 'Run'],
      curious: ['Curious', 'Idle'],
      gentle: ['Gentle', 'Idle'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      beak: ['Beak', 'beak', 'Mouth', 'mouth'],
      wing: ['Wing', 'wing', 'LeftWing', 'RightWing', 'Arm', 'arm'],
      tail: ['Tail', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'beakOpen'],
    },
    scale: 1,
  },
  {
    id: 'rabbit',
    label: 'Rabbit',
    // Retired from onboarding; kept for legacy Bun/Rabbit profiles.
    modelPath: '',
    proceduralModel: 'rabbit-v2',
    clips: { idle: 'procedural_idle', talk: 'procedural_talk', react: 'procedural_play' },
    actions: {
      idle: [],
      talk: [],
      wave: [],
      play: [],
      curious: [],
      gentle: [],
    },
    rig: {
      head: ['Head'],
      jaw: ['Jaw'],
      forelimb: ['Forelimb_L', 'Forelimb_R'],
      hindlimb: ['Hindlimb_L', 'Hindlimb_R', 'HindFoot_L', 'HindFoot_R'],
      ear: ['Ear_L', 'Ear_R'],
      tail: ['Tail'],
      hand: ['ForePaw_L', 'ForePaw_R'],
      talkMorphs: ['Jaw', 'Muzzle_L', 'Muzzle_R'],
    },
    scale: 1,
  },
  polyPizzaCompanion('capybara', 'Capybara'),
  polyPizzaCompanion('hamster', 'Hamster'),
  polyPizzaCompanion('koala', 'Koala'),
  polyPizzaCompanion('bear', 'Bear'),
  polyPizzaCompanion('raccoon', 'Raccoon'),
  polyPizzaCompanion('duck', 'Duck'),
  polyPizzaCompanion('sheep', 'Sheep'),
  polyPizzaCompanion('seal', 'Seal'),
  polyPizzaCompanion('sloth', 'Sloth'),
];

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTER_CATALOG.find((c) => c.id === id);
}

export function listReadyCharacters(): CharacterDef[] {
  return CHARACTER_CATALOG.filter((c) => Boolean(c.modelPath || c.proceduralModel));
}
