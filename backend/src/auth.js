import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const EXPIRES = process.env.JWT_EXPIRES || '7d';

/**
 * JWT_SECRET must be set in the environment — no silent default.
 * Call at process startup (index.js) so misconfigured demos fail loudly.
 */
export function assertJwtSecretConfigured() {
  const secret = process.env.JWT_SECRET;
  if (!secret || !String(secret).trim()) {
    throw new Error(
      'JWT_SECRET is required. Copy backend/.env.example to backend/.env and set JWT_SECRET to a long random string.'
    );
  }
  return secret;
}

function secret() {
  return assertJwtSecretConfigured();
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    secret(),
    { expiresIn: EXPIRES }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret());
}

/** Express middleware — requires Bearer token */
export function requireAuth(roles = null) {
  return (req, res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: 'Please sign in again' });
    }
    try {
      const payload = verifyToken(token);
      if (roles && !roles.includes(payload.role)) {
        return res.status(403).json({ error: 'Not allowed for this role' });
      }
      req.auth = payload;
      next();
    } catch {
      return res.status(401).json({ error: 'Session expired — please sign in again' });
    }
  };
}

export function publicUser(user) {
  if (!user) return null;
  // Explicit allowlist: clinical fields added to persistence can never drift into patient auth APIs.
  const safe = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    clinicId: user.clinicId,
    onboarded: Boolean(user.onboarded),
    createdAt: user.createdAt,
  };
  for (const key of ['petName', 'petType', 'petColor', 'pattern', 'eyes', 'hat', 'face', 'neck', 'held', 'scene', 'accent']) {
    if (user[key] !== undefined) safe[key] = user[key];
  }
  return safe;
}
