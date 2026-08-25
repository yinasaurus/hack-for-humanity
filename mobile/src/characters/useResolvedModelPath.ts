import { useEffect, useState } from 'react';
import { isBundledModelPath, resolveCharacterModelUri } from './characterBundledModels';

/**
 * Resolves `bundled:` catalog paths to a URI the WebView GLTFLoader can fetch.
 * Remote http(s) paths resolve immediately; bundled assets resolve async.
 * `null` means still loading a bundled asset.
 */
export function useResolvedModelPath(modelPath: string | undefined): string | null {
  const path = modelPath || '';
  const [resolved, setResolved] = useState<string | null>(() =>
    isBundledModelPath(path) ? null : path
  );

  useEffect(() => {
    let cancelled = false;
    if (!isBundledModelPath(path)) {
      setResolved(path);
      return;
    }
    setResolved(null);
    resolveCharacterModelUri(path)
      .then((uri) => {
        if (!cancelled) setResolved(uri || '');
      })
      .catch(() => {
        if (!cancelled) setResolved('');
      });
    return () => {
      cancelled = true;
    };
  }, [path]);

  return resolved;
}
