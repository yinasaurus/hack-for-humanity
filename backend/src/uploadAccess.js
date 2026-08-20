import path from 'path';

/**
 * Resolve which check-in owns an upload filename (basename only).
 */
export function findCheckInByUploadFile(db, fileParam) {
  const base = path.basename(String(fileParam || ''));
  if (!base) return null;
  return (
    (db.checkIns || []).find(
      (c) => c.photoUrl && path.basename(c.photoUrl) === base
    ) || null
  );
}

/**
 * Decide access to a meal photo.
 * Call only after JWT middleware has set `auth` (or auth is null if testing raw).
 *
 * - no auth → 401 (do not reveal existence)
 * - auth + no matching check-in → 404
 * - auth + check-in but not owner/clinician → 403
 * - auth + allowed → ok (caller still 404s if file missing on disk)
 */
export function decideUploadAccess(auth, checkIn) {
  if (!auth) {
    return { ok: false, status: 401, error: 'Please sign in again' };
  }
  if (!checkIn) {
    return { ok: false, status: 404, error: null };
  }
  if (auth.role === 'clinician') {
    return { ok: true };
  }
  if (auth.sub === checkIn.userId) {
    return { ok: true };
  }
  return { ok: false, status: 403, error: 'Not allowed' };
}
