/**
 * Semantic capabilities for the live animal renderer.
 *
 * This module deliberately knows nothing about Three.js or WebView. It
 * resolves only explicitly declared candidates from a loaded asset, so a
 * missing action becomes an honest capability gap instead of an arbitrary
 * first-clip fallback.
 */

export const ANIMAL_SEMANTIC_ACTIONS = [
  'idle',
  'talk',
  'wave',
  'play',
  'curious',
  'gentle',
] as const;

export type AnimalSemanticAction = (typeof ANIMAL_SEMANTIC_ACTIONS)[number];

export type AnimalActionIntent = {
  type: 'action';
  action: AnimalSemanticAction;
  durationMs?: number;
};

export type AnimalActionCandidateMap = Partial<
  Record<AnimalSemanticAction, readonly string[]>
>;

/**
 * Per-model aliases for the body parts that can receive procedural overlays.
 * Names are tried in order against the asset's actual bone/morph names.
 */
export type AnimalRigHints = {
  head?: readonly string[];
  jaw?: readonly string[];
  beak?: readonly string[];
  /** Conservative eye mesh aliases; renderers must only style exact matches. */
  eye?: readonly string[];
  ear?: readonly string[];
  forelimb?: readonly string[];
  hindlimb?: readonly string[];
  wing?: readonly string[];
  tail?: readonly string[];
  talkMorphs?: readonly string[];
};

export type AnimalActionResolution = {
  action: AnimalSemanticAction;
  clip: string | null;
  candidate: string | null;
  matched: 'exact' | 'caseInsensitive' | 'none';
};

export type AnimalActionResolutionMap = Record<
  AnimalSemanticAction,
  AnimalActionResolution
>;

/** Construct the renderer's small semantic command payload. */
export function createAnimalIntent(
  action: AnimalSemanticAction,
  durationMs?: number
): AnimalActionIntent {
  return durationMs == null
    ? { type: 'action', action }
    : { type: 'action', action, durationMs };
}

function candidateNames(
  action: AnimalSemanticAction,
  candidates: AnimalActionCandidateMap
): readonly string[] {
  return (candidates[action] || []).filter(
    (candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0
  );
}

/**
 * Resolve one semantic action without guessing from unrelated clips.
 * Exact names win; case-insensitive matching tolerates exporter casing only.
 */
export function resolveActionClip(
  availableClips: readonly string[],
  action: AnimalSemanticAction,
  candidates: AnimalActionCandidateMap
): AnimalActionResolution {
  const names = candidateNames(action, candidates);
  for (const candidate of names) {
    const exact = availableClips.find((clip) => clip === candidate);
    if (exact) {
      return { action, clip: exact, candidate, matched: 'exact' };
    }
  }

  for (const candidate of names) {
    const lower = candidate.toLowerCase();
    const match = availableClips.find((clip) => clip.toLowerCase() === lower);
    if (match) {
      return { action, clip: match, candidate, matched: 'caseInsensitive' };
    }
  }

  return { action, clip: null, candidate: names[0] || null, matched: 'none' };
}

export function resolveAnimalActions(
  availableClips: readonly string[],
  candidates: AnimalActionCandidateMap
): AnimalActionResolutionMap {
  return ANIMAL_SEMANTIC_ACTIONS.reduce((resolved, action) => {
    resolved[action] = resolveActionClip(availableClips, action, candidates);
    return resolved;
  }, {} as AnimalActionResolutionMap);
}

/**
 * Compatibility adapter for the original three-clip CharacterDef shape.
 * `react` is the closest legacy name for semantic `play`.
 */
export function legacyActionCandidates(legacy?: {
  idle?: string;
  talk?: string;
  react?: string;
}): AnimalActionCandidateMap {
  return {
    idle: legacy?.idle ? [legacy.idle] : [],
    talk: legacy?.talk ? [legacy.talk] : [],
    wave: legacy?.talk ? [legacy.talk] : [],
    play: legacy?.react ? [legacy.react] : [],
    curious: legacy?.talk ? [legacy.talk] : [],
    gentle: legacy?.idle ? [legacy.idle] : [],
  };
}

/** Merge explicit candidates ahead of the legacy fields, preserving order. */
export function mergeActionCandidates(
  explicit: AnimalActionCandidateMap | undefined,
  legacy?: { idle?: string; talk?: string; react?: string }
): AnimalActionCandidateMap {
  const fallback = legacyActionCandidates(legacy);
  return ANIMAL_SEMANTIC_ACTIONS.reduce((merged, action) => {
    const names = [
      ...(explicit?.[action] || []),
      ...(fallback[action] || []),
    ].filter((candidate): candidate is string => Boolean(candidate && candidate.trim()));
    merged[action] = [...new Set(names)];
    return merged;
  }, {} as AnimalActionCandidateMap);
}
