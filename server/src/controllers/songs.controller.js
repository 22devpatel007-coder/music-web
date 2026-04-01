const { db } = require('../config/firebase');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// ─── Helper ───────────────────────────────────────────────────────────────────
const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

// ─── Serialise a Firestore doc ────────────────────────────────────────────────
function serializeSong(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate
      ? data.createdAt.toDate().toISOString()
      : data.createdAt ?? null,
    updatedAt: data.updatedAt?.toDate
      ? data.updatedAt.toDate().toISOString()
      : data.updatedAt ?? null,
  };
}

// ─── GET /api/songs ───────────────────────────────────────────────────────────
exports.getAllSongs = async (req, res) => {
  try {
    const snapshot = await db.collection('songs').orderBy('createdAt', 'desc').get();
    const songs = snapshot.docs.map((doc) => serializeSong(doc.id, doc.data()));
    res.json(songs);
  } catch (err) {
    console.error('getAllSongs error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/songs/:id ───────────────────────────────────────────────────────
exports.getSongById = async (req, res) => {
  try {
    const docSnap = await db.collection('songs').doc(req.params.id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Song not found' });
    res.json(serializeSong(docSnap.id, docSnap.data()));
  } catch (err) {
    console.error('getSongById error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/songs (admin only) ────────────────────────────────────────────
exports.uploadSong = async (req, res) => {
  try {
    const { title, artist, genre, duration } = req.body;

    if (!req.files?.['song']?.[0])  return res.status(400).json({ error: 'No song file received' });
    if (!req.files?.['cover']?.[0]) return res.status(400).json({ error: 'No cover file received' });

    const songFile  = req.files['song'][0];
    const coverFile = req.files['cover'][0];

    const [songResult, coverResult] = await Promise.all([
      uploadToCloudinary(songFile.buffer, {
        resource_type: 'video',
        folder: 'melostream/songs',
        public_id: `${Date.now()}-${title}`,
        format: 'mp3',
      }),
      uploadToCloudinary(coverFile.buffer, {
        resource_type: 'image',
        folder: 'melostream/covers',
        public_id: `${Date.now()}-${title}-cover`,
      }),
    ]);

    const songData = {
      title,
      artist,
      genre,
      titleLower:       title.toLowerCase(),
      artistLower:      artist.toLowerCase(),
      duration:         Number(duration) || 0,
      fileUrl:          songResult.secure_url,
      coverUrl:         coverResult.secure_url,
      storagePath:      songResult.public_id,
      coverStoragePath: coverResult.public_id,
      playCount:        0,
      featured:         false,          // NEW: featured flag
      uploadedBy:       req.user.uid,
      createdAt:        new Date(),
      updatedAt:        new Date(),
    };

    const docRef = await db.collection('songs').add(songData);
    res.status(201).json(serializeSong(docRef.id, songData));
  } catch (err) {
    console.error('uploadSong error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── PATCH /api/songs/:id (admin only) ───────────────────────────────────────
// Handles two cases:
//   1. Metadata-only update (JSON body): title, artist, genre, duration, featured
//   2. Metadata + new cover image (multipart): same fields + cover file
//
// PERMANENT SOLUTION NOTES:
// - Old Cloudinary cover is deleted only after the new one is uploaded
//   successfully, preventing orphaned assets AND avoiding a window where
//   the song has no cover.
// - titleLower / artistLower are always re-derived from title / artist
//   so the search index stays consistent.
// - updatedAt is always set so clients can cache-bust.
exports.updateSong = async (req, res) => {
  try {
    const docSnap = await db.collection('songs').doc(req.params.id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Song not found' });

    const existing = docSnap.data();
    const updates  = {};

    // ── Scalar fields ─────────────────────────────────────────────────────────
    const { title, artist, genre, duration, featured } = req.body;

    if (title  !== undefined) {
      updates.title       = String(title).trim();
      updates.titleLower  = String(title).trim().toLowerCase();
    }
    if (artist !== undefined) {
      updates.artist      = String(artist).trim();
      updates.artistLower = String(artist).trim().toLowerCase();
    }
    if (genre    !== undefined) updates.genre    = String(genre).trim();
    if (duration !== undefined) updates.duration = Number(duration) || 0;
    if (featured !== undefined) updates.featured = Boolean(featured);

    // ── Cover image replacement ───────────────────────────────────────────────
    const coverFile = req.files?.['cover']?.[0];
    if (coverFile) {
      // Upload new cover first
      const coverResult = await uploadToCloudinary(coverFile.buffer, {
        resource_type: 'image',
        folder: 'melostream/covers',
        public_id: `${Date.now()}-${updates.title || existing.title}-cover`,
      });

      updates.coverUrl          = coverResult.secure_url;
      updates.coverStoragePath  = coverResult.public_id;

      // Delete old cover from Cloudinary (fire-and-forget — don't block response)
      if (existing.coverStoragePath) {
        cloudinary.uploader
          .destroy(existing.coverStoragePath, { resource_type: 'image' })
          .catch((err) =>
            console.warn('[updateSong] Old cover deletion failed:', err.message)
          );
      }
    }

    updates.updatedAt = new Date();

    await db.collection('songs').doc(req.params.id).update(updates);

    // Return the full merged document
    const merged = { ...existing, ...updates };
    res.json(serializeSong(req.params.id, merged));
  } catch (err) {
    console.error('updateSong error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── DELETE /api/songs/:id (admin only) ──────────────────────────────────────
exports.deleteSong = async (req, res) => {
  try {
    const docSnap = await db.collection('songs').doc(req.params.id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Song not found' });

    const { storagePath, coverStoragePath } = docSnap.data();

    await Promise.allSettled([
      storagePath
        ? cloudinary.uploader.destroy(storagePath, { resource_type: 'video' })
        : Promise.resolve(),
      coverStoragePath
        ? cloudinary.uploader.destroy(coverStoragePath, { resource_type: 'image' })
        : Promise.resolve(),
    ]);

    await db.collection('songs').doc(req.params.id).delete();
    res.json({ message: 'Song deleted successfully' });
  } catch (err) {
    console.error('deleteSong error:', err.message);
    res.status(500).json({ error: err.message });
  }
};