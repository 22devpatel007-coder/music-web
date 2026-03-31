const { admin } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // ── 1. Header presence check ────────────────────────────────────────────────
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Invalid token format', code: 'TOKEN_INVALID_FORMAT' });
  }

  // ── 2. Verify with Firebase Admin ───────────────────────────────────────────
  // checkRevoked: true  → rejects tokens for users who have been disabled or had
  //               their tokens revoked in the Firebase console.
  // If you don't need revocation checks, set to false for lower latency.
  try {
    const decoded = await admin.auth().verifyIdToken(token, /* checkRevoked= */ true);
    req.user = decoded;
    return next();

  } catch (err) {
    return handleTokenError(err, res);
  }
};

// ─── Structured error handler ─────────────────────────────────────────────────
function handleTokenError(err, res) {
  const code = err.code || '';

  // Token has expired — client should refresh and retry
  if (code === 'auth/id-token-expired') {
    return res.status(401).json({
      error: 'Token expired',
      code:  'TOKEN_EXPIRED',
    });
  }

  // Token was revoked (user signed out on another device, or admin revoked it)
  if (code === 'auth/id-token-revoked') {
    return res.status(401).json({
      error: 'Token revoked — please sign in again',
      code:  'TOKEN_REVOKED',
    });
  }

  // User account has been disabled in Firebase console
  if (code === 'auth/user-disabled') {
    return res.status(403).json({
      error: 'Account disabled',
      code:  'USER_DISABLED',
    });
  }

  // Malformed / tampered JWT
  if (code === 'auth/argument-error' || code === 'auth/invalid-id-token') {
    return res.status(401).json({
      error: 'Malformed token',
      code:  'TOKEN_MALFORMED',
    });
  }

  // Firebase project mismatch
  if (code === 'auth/invalid-credential') {
    return res.status(401).json({
      error: 'Token credential invalid',
      code:  'TOKEN_CREDENTIAL_INVALID',
    });
  }

  // Catch-all for unexpected errors
  console.error('[verifyToken] Unexpected error:', code, err.message);
  return res.status(401).json({
    error: 'Token verification failed',
    code:  code || 'TOKEN_UNKNOWN_ERROR',
  });
}

module.exports = verifyToken;