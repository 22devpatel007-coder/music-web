const { db } = require('../config/firebase');

// ─── NOTE ON SEARCH STRATEGY ─────────────────────────────────────────────────
// Firestore range queries are case-sensitive and prefix-only.
// FIX: We store a `titleLower` and `artistLower` field on each song document
//      (populated at upload time in songs.controller.js) and query those fields
//      so that searching "blinding" matches "Blinding Lights".
//
// If you have existing documents without these fields, run the migration script:
//   scripts/migrateSearchFields.js
// ─────────────────────────────────────────────────────────────────────────────

exports.searchSongs = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length === 0) return res.json([]);

    const searchTerm = q.toLowerCase().trim();
    const endTerm    = searchTerm + '\uf8ff';

    // Query both lowercase index fields in parallel
    const [titleSnap, artistSnap] = await Promise.all([
      db.collection('songs')
        .where('titleLower', '>=', searchTerm)
        .where('titleLower', '<=', endTerm)
        .limit(20)
        .get(),
      db.collection('songs')
        .where('artistLower', '>=', searchTerm)
        .where('artistLower', '<=', endTerm)
        .limit(20)
        .get(),
    ]);

    // Merge and deduplicate by doc id
    const map = new Map();
    for (const snap of [titleSnap, artistSnap]) {
      snap.docs.forEach(doc => {
        const data = doc.data();
        map.set(doc.id, {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate
            ? data.createdAt.toDate().toISOString()
            : data.createdAt ?? null,
        });
      });
    }

    res.json(Array.from(map.values()));
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: err.message });
  }
};