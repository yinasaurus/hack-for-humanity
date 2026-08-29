import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

/**
 * Local character GLBs with their licenses documented in ATTRIBUTION.md.
 * Catalog entries use `modelPath: 'bundled:<id>'`; the WebView resolves that
 * to a fetchable URI (data URI on native so https-based WebViews can load it).
 */
export const BUNDLED_MODEL_MODULES = {
  horse: require('../../assets/characters/horse.glb'),
  penguin: require('../../assets/characters/penguin.glb'),
  rabbit: require('../../assets/characters/rabbit.glb'),
  capybara: require('../../assets/characters/capybara.glb'),
  hamster: require('../../assets/characters/hamster.glb'),
  koala: require('../../assets/characters/koala.glb'),
  bear: require('../../assets/characters/bear.glb'),
  raccoon: require('../../assets/characters/raccoon.glb'),
  duck: require('../../assets/characters/duck.glb'),
  sheep: require('../../assets/characters/sheep.glb'),
  seal: require('../../assets/characters/seal.glb'),
  cat: require('../../assets/characters/cat.glb'),
  sloth: require('../../assets/characters/sloth.glb'),
} as const;

export type BundledModelId = keyof typeof BUNDLED_MODEL_MODULES;

export const BUNDLED_MODEL_PREFIX = 'bundled:';

export function bundledModelPath(id: BundledModelId): string {
  return `${BUNDLED_MODEL_PREFIX}${id}`;
}

export function isBundledModelPath(path: string | undefined | null): boolean {
  return Boolean(path && path.startsWith(BUNDLED_MODEL_PREFIX));
}

export function bundledModelIdFromPath(path: string): BundledModelId | null {
  if (!isBundledModelPath(path)) return null;
  const id = path.slice(BUNDLED_MODEL_PREFIX.length);
  return id in BUNDLED_MODEL_MODULES ? (id as BundledModelId) : null;
}

/**
 * Resolve a catalog modelPath to something GLTFLoader can fetch inside the
 * companion WebView. Remote https paths pass through unchanged.
 */
export async function resolveCharacterModelUri(modelPath: string): Promise<string> {
  if (!modelPath) return '';
  if (!isBundledModelPath(modelPath)) return modelPath;

  const id = bundledModelIdFromPath(modelPath);
  if (!id) return '';

  try {
    const asset = Asset.fromModule(BUNDLED_MODEL_MODULES[id]);
    await asset.downloadAsync();

    // Expo web serves the asset over http(s) from Metro — loader can fetch it.
    if (Platform.OS === 'web') {
      return asset.uri || asset.localUri || '';
    }

    const fileUri = asset.localUri || asset.uri;
    if (!fileUri) return '';

    // Prefer Metro/http(s) URIs — WebView can fetch them with mixedContentMode.
    // Avoid embedding multi-hundred-KB base64 into every HTML document.
    if (/^https?:\/\//i.test(fileUri)) {
      return fileUri;
    }

    // file:// fallback: embed so the https-based WebView can still load the GLB.
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return `data:model/gltf-binary;base64,${base64}`;
  } catch {
    return '';
  }
}
