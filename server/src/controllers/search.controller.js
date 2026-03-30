const { db } = require('../config/firebase');

exports.searchSongs = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) return res.json([]);

    const searchTerm = q.toLowerCase().trim();
    const endTerm    = searchTerm + '\uf8ff';

    // Run title and artist queries in parallel
    const [titleSnap, artistSnap] = await Promise.all([
      db.collection('songs')
        .where('title', '>=', searchTerm)
        .where('title', '<=', endTerm)
        .limit(20)
        .get(),
      db.collection('songs')
        .where('artist', '>=', searchTerm)
        .where('artist', '<=', endTerm)
        .limit(20)
        .get(),
    ]);

    // Merge and deduplicate by doc id
    const map = new Map();
    for (const snap of [titleSnap, artistSnap]) {
      snap.docs.forEach(doc => map.set(doc.id, { id: doc.id, ...doc.data() }));
    }

    res.json(Array.from(map.values()));
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
};