const { db } = require('../config/firebase');

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
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // 1. Token claim (production — set once via setAdminClaim.js)
    if (req.user.role === 'admin') {
      return next();
    }

    // 2. Env var email match (useful for initial setup before claims are set)
    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.includes(req.user.email?.toLowerCase())) {
      return next();
    }

    // 3. Firestore fallback
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
      return next();
    }

    console.warn('[isAdmin] Access denied for:', req.user.email);
    return res.status(403).json({ error: 'Admin access required' });

  } catch (err) {
    console.error('[isAdmin] Error:', err.message);
    return res.status(500).json({ error: 'Server error in admin check' });
  }
};

module.exports = isAdmin;