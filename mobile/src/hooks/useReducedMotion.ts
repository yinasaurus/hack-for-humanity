import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Respects OS “Reduce motion” — prefer static / minimal motion when true. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduced(Boolean(v));
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => {
      setReduced(Boolean(v));
    });
    return () => {
      mounted = false;
      if (sub && typeof (sub as { remove?: () => void }).remove === 'function') {
        (sub as { remove: () => void }).remove();
      }
    };
  }, []);

  return reduced;
}
