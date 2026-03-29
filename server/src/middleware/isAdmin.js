const { db } = require('../config/firebase');

const isAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Method 1: Check custom claim (production approach — set via setAdminClaim.js)
    if (req.user.role === 'admin') {
      console.log('Admin access granted via custom claim');
      return next();
    }

    // Method 2: Check env variable email match (works immediately without any setup)
    const adminEmail = process.env.ADMIN_EMAILS;
    if (adminEmail && req.user.email === adminEmail) {
      console.log('Admin access granted via email match');
      return next();
    }

    // Method 3: Check Firestore role as final fallback
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (userDoc.exists && userDoc.data().role === 'admin') {
      console.log('Admin access granted via Firestore role');
      return next();
    }

    console.log('Admin access DENIED for:', req.user.email);
    console.log('Claims:', JSON.stringify(req.user));
    return res.status(403).json({ error: 'Admin access required' });

  } catch (err) {
    console.error('isAdmin error:', err.message);
    return res.status(500).json({ error: 'Server error in admin check' });
  }
};

module.exports = isAdmin;