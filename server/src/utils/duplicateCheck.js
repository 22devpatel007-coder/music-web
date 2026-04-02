const { db } = require('../config/firebase');

/**
 * checkDuplicateSong — checks if a song with the same title+artist already exists.
 *
 * Uses titleLower + artistLower index fields (same ones used by search).
 * Returns the existing song document if found, null otherwise.
 *
 * @param {string} title
 * @param {string} artist
 * @param {string|null} excludeId — optional song ID to exclude (for edit flow)
 */
async function checkDuplicateSong(title, artist, excludeId = null) {
  if (!title || !artist) return null;

  const titleLower  = title.trim().toLowerCase();
  const artistLower = artist.trim().toLowerCase();

  const snap = await db.collection('songs')
    .where('titleLower',  '==', titleLower)
    .where('artistLower', '==', artistLower)
    .limit(2)
    .get();

  if (snap.empty) return null;

  for (const doc of snap.docs) {
    if (excludeId && doc.id === excludeId) continue;
    const data = doc.data();
    return {
      id:        doc.id,
      title:     data.title,
      artist:    data.artist,
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : data.createdAt ?? null,
    };
  }

  return null;
}

module.exports = { checkDuplicateSong };