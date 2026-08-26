export type {
  AnimalCharacterHandle,
  AnimalClipMap,
  AnimalIntent,
  CharacterDef,
  ProceduralCharacterId,
} from './types';
export {
  ANIMAL_SEMANTIC_ACTIONS,
  createAnimalIntent,
  legacyActionCandidates,
  mergeActionCandidates,
  resolveActionClip,
  resolveAnimalActions,
} from './animalCapabilities';
export {
  GROUNDED_WAVE_ROOT_POLICY,
  WAVE_ROOT_MAX_LIFT,
  groundedWaveRootPose,
} from './animalMotion';
export type { RootMotionPolicy, RootPose } from './animalMotion';
export type {
  AnimalActionCandidateMap,
  AnimalActionIntent,
  AnimalActionResolution,
  AnimalActionResolutionMap,
  AnimalRigHints,
  AnimalSemanticAction,
} from './animalCapabilities';
export type { AnimalWebHandle } from './AnimalWebView';
export {
  GROWTH_MILESTONE_DAYS,
  GROWTH_STAGE_PRESENTATIONS,
  getGrowthStagePresentation,
  getSpeciesGrowthStagePresentation,
  isGrowthMilestoneDay,
} from './growthStage';
export type {
  GrowthChannelScales,
  GrowthStage,
  GrowthStagePresentation,
  SpeciesGrowthProfile,
} from './growthStage';
export {
  ANIMAL_PRESENTATIONS,
  animalPresentationFor,
  companionVitalityOpacity,
} from './animalPresentation';
export {
  PAW_WAVE_BLOCKED_STATIC_MESH,
  companionSupportsPawWave,
} from './companionWaveSupport';
export type {
  AnimalActionMotion,
  AnimalPresentation,
  AnimalVisualProfile,
  AnimalVoiceNote,
  CompanionVitality,
} from './animalPresentation';
export {
  CHARACTER_CATALOG,
  getCharacter,
  listReadyCharacters,
} from './characterCatalog';
export {
  RABBIT_MODEL_SPEC,
  RABBIT_PROCEDURAL_MODEL,
} from './rabbitProceduralModel';
export {
  CAT_MODEL_SPEC,
  CAT_PROCEDURAL_MODEL,
} from './catProceduralModel';
export type {
  ProceduralMaterialSpec,
  ProceduralModelSpec,
  ProceduralPartSpec,
  ProceduralPrimitive,
  ProceduralVector3,
  RabbitGrowthChannel,
  RabbitMaterialId,
  RabbitMaterialSpec,
  RabbitMotionAnchor,
  RabbitPartName,
  RabbitPartSpec,
  RabbitPrimitive,
  RabbitProceduralModelSpec,
  RabbitVector3,
} from './rabbitProceduralModel';
export type {
  CatGrowthChannel,
  CatMaterialSpec,
  CatMaterialId,
  CatMotionAnchor,
  CatPartSpec,
  CatPartName,
  CatPrimitive,
  CatProceduralModelSpec,
  CatVector3,
} from './catProceduralModel';
export { AnimalWebView } from './AnimalWebView';
export {
  characterForPetType,
  characterForLiveCompanion,
  liveCompanionSupportsBoneOutfits,
} from './petToCharacter';
