import type {
  AnimalActionIntent,
  AnimalActionCandidateMap,
  AnimalRigHints,
  AnimalSemanticAction,
} from './animalCapabilities';

/** Renderer-owned declarative models that do not require a GLB asset. */
export type ProceduralCharacterId = 'rabbit-v2' | 'cat-v2';

/**
 * Per-character config so new animals are catalog-only (no animation logic edits).
 */
export type AnimalClipMap = {
  /** Loop while idle */
  idle: string;
  /** Plays (or loops) while speak() audio is active */
  talk: string;
  /** One-shot on tap */
  react: string;
};

export type CharacterDef = {
  id: string;
  label: string;
  /**
   * Path for useGLTF:
   * - Web URL, or
   * - Metro asset module via require() cast to number then resolved, or
   * - Relative path string under assets for remote hosting later
   */
  modelPath: string;
  /** When present, this procedural spec is authoritative over modelPath. */
  proceduralModel?: ProceduralCharacterId;
  clips: AnimalClipMap;
  /** Explicit semantic candidates, ordered by preference. */
  actions?: AnimalActionCandidateMap;
  /** Bone/morph aliases used by procedural species overlays. */
  rig?: AnimalRigHints;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Optional default sample line for the playground Speak button */
  sampleAudioUrl?: string;
};

export type AnimalCharacterHandle = {
  /** Dispatch a semantic renderer intent; legacy helpers below adapt to it. */
  dispatch: (intent: AnimalIntent) => void;
  /** Play audio and blend into the Talk clip until audio ends. */
  speak: (audioUrl: string) => void;
  /** Stop audio and return to Idle. */
  stopSpeaking: () => void;
  /** Fire the React clip once. */
  react: () => void;
};

export type AnimalIntent = AnimalActionIntent;
