const { db } = require('../config/firebase');
const config = require('../config/index');
const { sendError } = require('../utils/apiResponse');


// ─── isAdmin middleware ────────────────────────────────────────────────────────
// Checks admin status in priority order:
//   1. Firebase custom claim (role: 'admin') — set via scripts/setAdminClaim.js
//   2. ADMIN_EMAILS env var email match — useful during initial setup
//   3. Firestore role field — final fallback
//
// NOTE: The client-side AuthContext now ONLY uses token claims for isAdmin,
// keeping the source of truth consistent between client and server.
// ─────────────────────────────────────────────────────────────────────────────

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return sendError(res, 'Not authenticated', 401, 'NOT_AUTHENTICATED');
    }

    // 1. Token claim (production — set once via setAdminClaim.js)
    if (req.user.role === 'admin') {
      return next();
    }

    // 2. Env var email match (useful for initial setup before claims are set)
    const adminEmails = config.adminEmails;

    if (adminEmails.includes(req.user.email?.toLowerCase())) {
      return next();
    }

    // 3. Firestore fallback
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
      return next();
    }

    console.warn('[isAdmin] Access denied for:', req.user.email);
    return sendError(res, 'Admin access required', 403, 'FORBIDDEN');

  } catch (err) {
    console.error('[isAdmin] Error:', err.message);
    return sendError(res, 'Server error in admin check', 500, 'INTERNAL_ERROR');
  }
};

module.exports = isAdmin;