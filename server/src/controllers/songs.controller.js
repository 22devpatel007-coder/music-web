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

// ─── Serialize a Firestore doc to a plain JSON-safe object ───────────────────
// Converts Firestore Timestamps → ISO strings so the client always gets
// consistent data (no { _seconds, _nanoseconds } objects leaking through).
function serializeSong(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate
      ? data.createdAt.toDate().toISOString()
      : data.createdAt ?? null,
  };
}

// GET /api/songs
exports.getAllSongs = async (req, res) => {
  try {
    const snapshot = await db.collection('songs').orderBy('createdAt', 'desc').get();
    const songs = snapshot.docs.map(doc => serializeSong(doc.id, doc.data()));
    res.json(songs);
  } catch (err) {
    console.error('getAllSongs error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET /api/songs/:id
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

// POST /api/songs  (admin only)
exports.uploadSong = async (req, res) => {
  try {
    console.log('=== UPLOAD STARTED ===');

    const { title, artist, genre, duration } = req.body;

    if (!req.files?.['song']?.[0]) return res.status(400).json({ error: 'No song file received' });
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
      // FIX: lowercase index fields for case-insensitive Firestore search
      titleLower:  title.toLowerCase(),
      artistLower: artist.toLowerCase(),
      duration: Number(duration),
      fileUrl: songResult.secure_url,
      coverUrl: coverResult.secure_url,
      storagePath: songResult.public_id,
      coverStoragePath: coverResult.public_id, // FIX: store cover path for deletion
      playCount: 0,
      uploadedBy: req.user.uid,
      createdAt: new Date(),
    };

    const docRef = await db.collection('songs').add(songData);
    console.log('=== UPLOAD SUCCESS ===', docRef.id);
    res.status(201).json(serializeSong(docRef.id, songData));
  } catch (err) {
    console.error('=== UPLOAD ERROR ===', err.message);
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/songs/:id  (admin only)
exports.deleteSong = async (req, res) => {
  try {
    const docSnap = await db.collection('songs').doc(req.params.id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Song not found' });

    const { storagePath, coverStoragePath } = docSnap.data();

    // Delete from Cloudinary in parallel (fire-and-forget errors — don't block deletion)
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