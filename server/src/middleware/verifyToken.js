const { admin } = require('../config/firebase');

// ─── verifyToken middleware ───────────────────────────────────────────────────
// Validates the Firebase ID token sent in the Authorization: Bearer <token> header.
//
// checkRevoked is set to FALSE for performance — verifying revocation requires
// an extra Firebase network round-trip (~50-100ms) on every request.
// Token expiry (60 min) naturally handles most revocation cases.
// If you need immediate revocation (e.g. admin banning a user), set to TRUE
// and accept the latency tradeoff.
// ─────────────────────────────────────────────────────────────────────────────

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token || token === 'undefined' || token === 'null') {
    return res.status(401).json({ error: 'Invalid token format', code: 'TOKEN_INVALID_FORMAT' });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token, /* checkRevoked= */ false);
    req.user = decoded;
    return next();
  } catch (err) {
    return handleTokenError(err, res);
  }
};

function handleTokenError(err, res) {
  const code = err.code || '';

  if (code === 'auth/id-token-expired') {
    return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
  }
  if (code === 'auth/id-token-revoked') {
    return res.status(401).json({ error: 'Token revoked — please sign in again', code: 'TOKEN_REVOKED' });
  }
  if (code === 'auth/user-disabled') {
    return res.status(403).json({ error: 'Account disabled', code: 'USER_DISABLED' });
  }
  if (code === 'auth/argument-error' || code === 'auth/invalid-id-token') {
    return res.status(401).json({ error: 'Malformed token', code: 'TOKEN_MALFORMED' });
  }
  if (code === 'auth/invalid-credential') {
    return res.status(401).json({ error: 'Token credential invalid', code: 'TOKEN_CREDENTIAL_INVALID' });
  }

  console.error('[verifyToken] Unexpected error:', code, err.message);
  return res.status(401).json({ error: 'Token verification failed', code: code || 'TOKEN_UNKNOWN_ERROR' });
}

module.exports = verifyToken;