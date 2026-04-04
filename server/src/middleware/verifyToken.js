const { admin } = require('../config/firebase');
const { sendError } = require('../utils/apiResponse');


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
    return sendError(res, 'No token provided', 401, 'NO_TOKEN');
  }

  const token = authHeader.split('Bearer ')[1]?.trim();

  if (!token || token === 'undefined' || token === 'null') {
    return sendError(res, 'Invalid token format', 401, 'TOKEN_INVALID_FORMAT');
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
    return sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED');
  }
  if (code === 'auth/id-token-revoked') {
    return sendError(res, 'Token revoked — please sign in again', 401, 'TOKEN_REVOKED');
  }
  if (code === 'auth/user-disabled') {
    return sendError(res, 'Account disabled', 403, 'USER_DISABLED');
  }
  if (code === 'auth/argument-error' || code === 'auth/invalid-id-token') {
    return sendError(res, 'Malformed token', 401, 'TOKEN_MALFORMED');
  }
  if (code === 'auth/invalid-credential') {
    return sendError(res, 'Token credential invalid', 401, 'TOKEN_CREDENTIAL_INVALID');
  }

  console.error('[verifyToken] Unexpected error:', code, err.message);
  return sendError(res, 'Token verification failed', 401, code || 'TOKEN_UNKNOWN_ERROR');
}

module.exports = verifyToken;