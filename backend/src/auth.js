import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const SECRET = process.env.JWT_SECRET || 'kindplate-hackathon-dev-secret-change-me';
const EXPIRES = process.env.JWT_EXPIRES || '7d';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    SECRET,
    { expiresIn: EXPIRES }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, SECRET);
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
  const { passwordHash, ...safe } = user;
  return safe;
}
