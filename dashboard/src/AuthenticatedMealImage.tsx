import { useEffect, useState } from 'react';
import { API_BASE, getClinicToken } from './api';

type Props = {
  photoUrl: string;
  alt: string;
  className?: string;
};

/**
 * <img> cannot send Authorization headers. Fetch the meal photo with the
 * clinic JWT, then display via a blob: object URL.
 */
export function AuthenticatedMealImage({ photoUrl, alt, className }: Props) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    (async () => {
      setFailed(false);
      setSrc(null);
      const token = getClinicToken();
      if (!token) {
        setFailed(true);
        return;
      }
      try {
        const res = await fetch(`${API_BASE}${photoUrl}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`photo ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [photoUrl]);

  if (failed) {
    return <div className={`${className || ''} placeholder`.trim()}>Photo unavailable</div>;
  }
  if (!src) {
    return <div className={`${className || ''} placeholder`.trim()}>Loading…</div>;
  }
  return <img className={className} src={src} alt={alt} />;
}
