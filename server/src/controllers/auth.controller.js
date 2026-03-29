const { db } = require('../config/firebase');

exports.verifyUser = async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) return res.status(404).json({ error: 'User not found' });
    res.json({ uid: req.user.uid, ...userDoc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};