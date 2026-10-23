import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export const signToken = (user) =>
  jwt.sign({ sub: user.id, role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

function readToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

// Attaches req.user if a valid token is present. Never blocks (used for guest checkout).
export function optionalAuth(req, _res, next) {
  const token = readToken(req);
  if (token) {
    try {
      const p = jwt.verify(token, config.jwtSecret);
      req.user = { id: p.sub, role: p.role };
    } catch { /* ignore invalid token */ }
  }
  next();
}

export function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return res.status(401).json({ error: 'Please sign in' });
  try {
    const p = jwt.verify(token, config.jwtSecret);
    req.user = { id: p.sub, role: p.role };
    next();
  } catch {
    res.status(401).json({ error: 'Your session expired. Please sign in again' });
  }
}

export function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admins only' });
    next();
  });
}
