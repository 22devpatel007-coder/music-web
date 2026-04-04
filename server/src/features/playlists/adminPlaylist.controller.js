const { db } = require('../../config/firebase');
const cloudinary = require('../../config/cloudinary');
const streamifier = require('streamifier');
const { checkDuplicateSong } = require('../../utils/duplicateCheck');

const uploadToCloudinary = (buffer, options) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
    streamifier.createReadStream(buffer).pipe(stream);
  });

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

// ─── POST /api/admin/playlists/upload-song ────────────────────────────────────
// Called once per song during playlist ZIP upload.
// Returns { status: 'uploaded'|'duplicate', songId, ... }
exports.uploadPlaylistSong = async (req, res) => {
  try {
    const { title, artist, genre, duration } = req.body;

    if (!title || !artist || !genre) {
      return res.status(400).json({ error: 'title, artist and genre are required' });
    }

    // Duplicate check — returns 200 (not error) so client can continue
    const existing = await checkDuplicateSong(title, artist);
    if (existing) {
      return res.json({
        status:   'duplicate',
        songId:   existing.id,
        existing: {
          id:        existing.id,
          title:     existing.title,
          artist:    existing.artist,
          createdAt: existing.createdAt,
        },
      });
    }

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
      featured:         false,
      uploadedBy:       req.user.uid,
      createdAt:        new Date(),
      updatedAt:        new Date(),
    };

    const docRef = await db.collection('songs').add(songData);
    res.status(201).json({
      status: 'uploaded',
      songId: docRef.id,
      song:   serializeSong(docRef.id, songData),
    });
  } catch (err) {
    console.error('uploadPlaylistSong error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/admin/playlists ─────────────────────────────────────────────────
// JSON body — no cover file
exports.createAdminPlaylist = async (req, res) => {
  try {
    const { name, description, songIds, coverUrl, coverStoragePath } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    let parsedSongIds = songIds;
    if (typeof songIds === 'string') {
      try { parsedSongIds = JSON.parse(songIds); } catch { parsedSongIds = []; }
    }
    if (!Array.isArray(parsedSongIds) || parsedSongIds.length === 0) {
      return res.status(400).json({ error: 'At least one song is required' });
    }

    const playlistData = {
      name:             name.trim(),
      description:      (description || '').trim(),
      ownerId:          req.user.uid,
      ownerEmail:       req.user.email,
      songIds:          parsedSongIds,
      coverUrl:         coverUrl         || '',
      coverStoragePath: coverStoragePath || '',
      coverType:        'uploaded',
      isPublic:         true,
      isAdmin:          true,
      isFeatured:       false,
      createdAt:        new Date(),
      updatedAt:        new Date(),
    };

    const docRef = await db.collection('playlists').add(playlistData);
    res.status(201).json({
      id: docRef.id,
      ...playlistData,
      createdAt: playlistData.createdAt.toISOString(),
      updatedAt: playlistData.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('createAdminPlaylist error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── POST /api/admin/playlists/with-cover ─────────────────────────────────────
// Multipart — uploads playlist cover image alongside metadata
exports.createAdminPlaylistWithCover = async (req, res) => {
  try {
    const { name, description, songIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    let parsedSongIds = songIds;
    if (typeof songIds === 'string') {
      try { parsedSongIds = JSON.parse(songIds); } catch { parsedSongIds = []; }
    }
    if (!Array.isArray(parsedSongIds) || parsedSongIds.length === 0) {
      return res.status(400).json({ error: 'At least one song is required' });
    }

    let coverUrl         = '';
    let coverStoragePath = '';
    const coverFile = req.files?.['cover']?.[0];
    if (coverFile) {
      const coverResult = await uploadToCloudinary(coverFile.buffer, {
        resource_type: 'image',
        folder: 'melostream/playlist-covers',
        public_id: `${Date.now()}-${name.trim()}-playlist-cover`,
      });
      coverUrl         = coverResult.secure_url;
      coverStoragePath = coverResult.public_id;
    }

    const playlistData = {
      name:             name.trim(),
      description:      (description || '').trim(),
      ownerId:          req.user.uid,
      ownerEmail:       req.user.email,
      songIds:          parsedSongIds,
      coverUrl,
      coverStoragePath,
      coverType:        'uploaded',
      isPublic:         true,
      isAdmin:          true,
      isFeatured:       false,
      createdAt:        new Date(),
      updatedAt:        new Date(),
    };

    const docRef = await db.collection('playlists').add(playlistData);
    res.status(201).json({
      id: docRef.id,
      ...playlistData,
      createdAt: playlistData.createdAt.toISOString(),
      updatedAt: playlistData.updatedAt.toISOString(),
    });
  } catch (err) {
    console.error('createAdminPlaylistWithCover error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── GET /api/admin/playlists ─────────────────────────────────────────────────
exports.getAdminPlaylists = async (req, res) => {
  try {
    const snap = await db.collection('playlists')
      .where('isAdmin', '==', true)
      .orderBy('createdAt', 'desc')
      .get();

    const playlists = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt ?? null,
        updatedAt: data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt ?? null,
      };
    });

    res.json(playlists);
  } catch (err) {
    console.error('getAdminPlaylists error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─── DELETE /api/admin/playlists/:id ─────────────────────────────────────────
exports.deleteAdminPlaylist = async (req, res) => {
  try {
    const docSnap = await db.collection('playlists').doc(req.params.id).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'Playlist not found' });
    if (!docSnap.data().isAdmin) {
      return res.status(403).json({ error: 'Not an admin playlist' });
    }

    const { coverStoragePath } = docSnap.data();
    if (coverStoragePath) {
      cloudinary.uploader
        .destroy(coverStoragePath, { resource_type: 'image' })
        .catch((err) => console.warn('[deleteAdminPlaylist] Cover deletion failed:', err.message));
    }

    await db.collection('playlists').doc(req.params.id).delete();
    res.json({ message: 'Playlist deleted successfully' });
  } catch (err) {
    console.error('deleteAdminPlaylist error:', err.message);
    res.status(500).json({ error: err.message });
  }
};