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

/** Mesh2Motion fox-family shoulder → foot chain (dog/fox/panda). */
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

function staticBundledCompanion(id: string, label: string): CharacterDef {
  return {
    id,
    label,
    // See assets/characters/ATTRIBUTION.md; static mesh with a motion overlay.
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
    // Mesh2Motion CC0 model bundled locally so the WebView does not depend on
    // a mutable third-party URL at runtime.
    modelPath: 'bundled:fox',
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
    // Bundled CC-BY cartoon horse with Buddi-authored companion animation clips.
    modelPath: 'bundled:horse',
    clips: { idle: 'Idle', talk: 'Talk', react: 'Play' },
    actions: {
      idle: ['Idle'],
      talk: ['Talk'],
      wave: ['Wave'],
      play: ['Play'],
      curious: ['Curious'],
      gentle: ['Gentle'],
    },
    rig: {
      head: ['head0_040', 'neck1_039', 'neck0_038'],
      forelimb: [
        'leg_front_left_top0_03',
        'leg_front_left_top1_04',
        'leg_front_left_top2_05',
        'leg_front_left_bot0_06',
        'leg_front_right_top0_09',
        'leg_front_right_top1_010',
        'leg_front_right_top2_011',
        'leg_front_right_bot0_012',
      ],
      hand: ['leg_front_left_hoof_07', 'leg_front_right_hoof_014'],
      hindlimb: [
        'leg_hind_left_top0_024',
        'leg_hind_left_top1_025',
        'leg_hind_left_top2_026',
        'leg_hind_left_bot0_027',
        'leg_hind_right_top0_030',
        'leg_hind_right_top1_031',
        'leg_hind_right_top2_032',
        'leg_hind_right_bot0_033',
      ],
      tail: ['tail0_017', 'tail1_018', 'tail2_019', 'tail3_020', 'tail4_021'],
    },
    scale: 1,
    // The source faces away from the default +Z camera. Turn it toward the
    // viewer once; OrbitControls still lets the user inspect its back.
    rotation: [0, Math.PI, 0],
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
    // Mesh2Motion CC0 model bundled locally so the WebView does not depend on
    // a mutable third-party URL at runtime.
    modelPath: 'bundled:dog',
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
    proportions: { head: 0.84 },
  },
  staticBundledCompanion('cat', 'Cat'),
  {
    id: 'panda',
    label: 'Panda',
    // Mesh2Motion CC0 model bundled locally so the WebView does not depend on
    // a mutable third-party URL at runtime.
    modelPath: 'bundled:panda',
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
    // Quaternius CC0 source, bundled with Buddi-authored flipper joints/Wave.
    modelPath: 'bundled:penguin',
    clips: { idle: 'Idle', talk: 'Idle', react: 'Jump' },
    actions: {
      idle: ['Idle', 'Standing'],
      talk: ['Talk', 'Honk', 'Idle'],
      wave: ['Wave'],
      play: ['Play', 'Jump', 'Run'],
      curious: ['Curious', 'Idle'],
      gentle: ['Gentle', 'Idle'],
    },
    rig: {
      head: ['Head', 'head', 'Neck', 'neck'],
      beak: ['Beak', 'beak', 'Mouth', 'mouth'],
      wing: ['Wing', 'wing', 'LeftWing', 'RightWing', 'Arm', 'arm'],
      flipper: ['Flipper_L', 'Flipper_R'],
      tail: ['Tail', 'tail'],
      talkMorphs: ['mouthOpen', 'Mouth', 'beakOpen'],
    },
    scale: 1,
  },
  // majkel's supplied CC-BY rabbit, optimized locally for mobile.
  staticBundledCompanion('rabbit', 'Rabbit'),
  staticBundledCompanion('capybara', 'Capybara'),
  staticBundledCompanion('hamster', 'Hamster'),
  staticBundledCompanion('koala', 'Koala'),
  staticBundledCompanion('bear', 'Bear'),
  staticBundledCompanion('raccoon', 'Raccoon'),
  staticBundledCompanion('duck', 'Duck'),
  staticBundledCompanion('sheep', 'Sheep'),
  staticBundledCompanion('seal', 'Seal'),
  staticBundledCompanion('sloth', 'Sloth'),
];

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTER_CATALOG.find((c) => c.id === id);
}

export function listReadyCharacters(): CharacterDef[] {
  return CHARACTER_CATALOG.filter((c) => Boolean(c.modelPath || c.proceduralModel));
}
