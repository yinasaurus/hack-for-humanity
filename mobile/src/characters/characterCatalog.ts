import type { CharacterDef } from './types';

/**
 * Free animated GLBs (CDN) — swap for local assets/characters/*.glb anytime.
 * Clip names are best-effort; AnimalWebView falls back to the first clip in the file.
 */
export const CHARACTER_CATALOG: CharacterDef[] = [
  {
    id: 'fox',
    label: 'Fox',
    modelPath:
      'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Fox/glTF-Binary/Fox.glb',
    clips: { idle: 'Walk', talk: 'Survey', react: 'Run' },
    // Scale is a fine-tune after auto-normalize-to-height in AnimalWebView
    scale: 1,
    position: [0, 0, 0],
  },
  {
    id: 'horse',
    label: 'Horse',
    modelPath: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Horse.glb',
    clips: { idle: 'horse_A_', talk: 'horse_A_', react: 'horse_A_' },
    scale: 1,
  },
  {
    id: 'parrot',
    label: 'Parrot',
    modelPath: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Parrot.glb',
    clips: { idle: 'parrot_A_idle', talk: 'parrot_A_idle', react: 'parrot_A_flap' },
    scale: 1,
  },
  {
    id: 'flamingo',
    label: 'Flamingo',
    modelPath: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Flamingo.glb',
    clips: { idle: 'flamingo_A_idle', talk: 'flamingo_A_idle', react: 'flamingo_A_flap' },
    scale: 1,
  },
  {
    id: 'stork',
    label: 'Stork',
    modelPath: 'https://cdn.jsdelivr.net/gh/mrdoob/three.js@r152/examples/models/gltf/Stork.glb',
    clips: { idle: 'stork_A_idle', talk: 'stork_A_idle', react: 'stork_A_flap' },
    scale: 1,
  },
];

export function getCharacter(id: string): CharacterDef | undefined {
  return CHARACTER_CATALOG.find((c) => c.id === id);
}

export function listReadyCharacters(): CharacterDef[] {
  return CHARACTER_CATALOG.filter((c) => Boolean(c.modelPath));
}
