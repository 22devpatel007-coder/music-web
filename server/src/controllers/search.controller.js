const { db } = require('../config/firebase');

exports.searchSongs = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);

    const searchTerm = q.toLowerCase();

    const snapshot = await db.collection('songs')
      .where('title', '>=', searchTerm)
      .where('title', '<=', searchTerm + '\uf8ff')
      .limit(20)
      .get();

    const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};