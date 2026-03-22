/**
 * lib/auth.js — JWT authentication helpers
 *
 * Tokens are signed with JWT_SECRET (required env var).
 * getSecret() throws at call time — NOT at module load — so a missing env var
 * produces a clean 500 JSON response rather than crashing the entire serverless
 * function before any HTTP handler runs.
 *
 * Required env vars:
 *   JWT_SECRET  — a strong random string (openssl rand -hex 32)
 */

import jwt from 'jsonwebtoken';

const JWT_EXPIRES = '7d';

/**
 * Returns the JWT secret from the environment.
 * Throws a descriptive error at runtime if the variable is absent,
 * preventing silent use of a weak fallback in production.
 */
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is not set. ' +
      'Add it in Vercel → Project → Settings → Environment Variables.'
    );
  }
  return secret;
}

/**
 * Signs a JWT with the given payload.
 * @param {object} payload — data to encode (id, role, etc.)
 * @returns {string} signed JWT
 */
export function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES });
}

/**
 * Verifies a JWT and returns the decoded payload, or null if invalid/expired.
 * @param {string} token
 * @returns {object|null}
 */
export function verifyToken(token) {
  // getSecret() is called outside the catch block intentionally.
  // A missing JWT_SECRET is a configuration error and should surface as a
  // thrown exception (→ 500), not be silently swallowed as a null (→ 401).
  const secret = getSecret();
  try {
    return jwt.verify(token, secret);
  } catch {
    // jwt.verify throws for expired/invalid tokens — those are expected and return null
    return null;
  }
}

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * @param {import('http').IncomingMessage} req
 * @returns {object|null} decoded payload, or null if missing/invalid
 */
export function getAuthPayload(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

/**
 * Auth guard — requires a valid supplier JWT.
 * Sends 401 and returns null when the check fails; returns the payload on success.
 * Usage: const payload = requireSupplier(req, res); if (!payload) return;
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {object|null}
 */
export function requireSupplier(req, res) {
  const payload = getAuthPayload(req);
  if (!payload || payload.role !== 'supplier') {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
    return null;
  }
  return payload;
}

/**
 * Auth guard — requires a valid admin JWT.
 * Sends 401 and returns null when the check fails; returns the payload on success.
 * Usage: const payload = requireAdmin(req, res); if (!payload) return;
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {object|null}
 */
export function requireAdmin(req, res) {
  const payload = getAuthPayload(req);
  if (!payload || payload.role !== 'admin') {
    res.status(401).json({ error: 'Unauthorized. Admin access required.' });
    return null;
  }
  return payload;
}

/**
 * Auth guard — requires a valid agent JWT.
 * Sends 401 and returns null when the check fails; returns the payload on success.
 * Usage: const payload = requireAgent(req, res); if (!payload) return;
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {object|null}
 */
export function requireAgent(req, res) {
  const payload = getAuthPayload(req);
  if (!payload || payload.role !== 'agent') {
    res.status(401).json({ error: 'Unauthorized. Agent access required.' });
    return null;
  }
  return payload;
}
