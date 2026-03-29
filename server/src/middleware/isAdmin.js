const { db } = require('../config/firebase');

const isAdmin = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists || userDoc.data().role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};

module.exports = isAdmin;