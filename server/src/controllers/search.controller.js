// controllers/search.controller.js
const { db } = require('../config/firebase');

/**
 * Search songs by title or artist using Firestore prefix queries.
 * Runs two parallel prefix queries (titleLower, artistLower),
 * deduplicates by doc ID, and returns sorted results.
 *
 * GET /api/search?q=<term>&limit=<number>
 *
 * Response: { songs: [...], total: number, query: string }
 */
const searchSongs = async (req, res) => {
  try {
    const raw = (req.query.q || '').trim();
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50); // cap at 50

    if (!raw || raw.length < 1) {
      return res.status(200).json({ songs: [], total: 0, query: raw });
    }

    // Sanitise: lowercase, collapse whitespace
    const query = raw.toLowerCase().replace(/\s+/g, ' ');
    const end = query + '\uf8ff'; // Unicode sentinel for prefix range

    const songsRef = db.collection('songs');

    // Run title and artist prefix queries in parallel
    const [titleSnap, artistSnap] = await Promise.all([
      songsRef
        .where('titleLower', '>=', query)
        .where('titleLower', '<=', end)
        .limit(limit)
        .get(),
      songsRef
        .where('artistLower', '>=', query)
        .where('artistLower', '<=', end)
        .limit(limit)
        .get(),
    ]);

    // Merge and deduplicate by document ID
    const seen = new Set();
    const songs = [];

    const addDocs = (snap) => {
      snap.forEach((doc) => {
        if (!seen.has(doc.id)) {
          seen.add(doc.id);
          songs.push({ id: doc.id, ...doc.data() });
        }
      });
    };

    addDocs(titleSnap);
    addDocs(artistSnap);

    // Sort: title matches first, then artist-only matches
    songs.sort((a, b) => {
      const aTitle = (a.titleLower || '').startsWith(query);
      const bTitle = (b.titleLower || '').startsWith(query);
      if (aTitle && !bTitle) return -1;
      if (!aTitle && bTitle) return 1;
      return (a.titleLower || '').localeCompare(b.titleLower || '');
    });

    const trimmed = songs.slice(0, limit);

    return res.status(200).json({
      songs: trimmed,
      total: trimmed.length,
      query: raw,
    });
  } catch (err) {
    console.error('[search] Error:', err.message);
    return res.status(500).json({
      error: 'Search failed. Please try again.',
      code: 'SEARCH_ERROR',
    });
  }
};

module.exports = { searchSongs };