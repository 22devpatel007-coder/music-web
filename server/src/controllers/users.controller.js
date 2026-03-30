const { db } = require('../config/firebase');

exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users')
      .orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};