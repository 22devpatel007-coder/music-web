const { getSongs, getSongById, createSong, updateSong, deleteSong } = require('../services/firebase.service');
const { uploadAudio, uploadCover, deleteAsset } = require('../services/cloudinary.service');
const { checkDuplicateSong } = require('../utils/duplicateCheck');
const logger = require('../utils/logger');

exports.getAllSongs = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const cursor = req.query.cursor || null;

    const result = await getSongs(limit, cursor);
    return res.json(result);
  } catch (err) {
    logger.error('getAllSongs error:', { error: err.message });
    return res.status(500).json({ error: err.message, code: 'INTERNAL_ERROR' });
  }
};

exports.getSongById = async (req, res) => {
  try {
    const song = await getSongById(req.params.id);
    if (!song) return res.status(404).json({ error: 'Song not found' });
    res.json(song);
  } catch (err) {
    logger.error('getSongById error:', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.checkDuplicate = async (req, res) => {
  try {
    const { title, artist, excludeId } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: 'title and artist are required' });
    }
    const existing = await checkDuplicateSong(title, artist, excludeId || null);
    if (existing) {
      return res.json({ duplicate: true, existing });
    }
    res.json({ duplicate: false });
  } catch (err) {
    logger.error('checkDuplicate error:', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.uploadSong = async (req, res) => {
  try {
    const { title, artist, genre, duration } = req.body;

    if (!title || !artist || !genre) {
      return res.status(400).json({ error: 'title, artist and genre are required' });
    }

    const existing = await checkDuplicateSong(title, artist);
    if (existing) {
      return res.status(409).json({
        error: `Song already exists: "${existing.title}" by ${existing.artist}`,
        code: 'DUPLICATE_SONG',
        existing,
      });
    }

    if (!req.files?.['song']?.[0]) return res.status(400).json({ error: 'No song file received' });
    if (!req.files?.['cover']?.[0]) return res.status(400).json({ error: 'No cover file received' });

    const songFile = req.files['song'][0];
    const coverFile = req.files['cover'][0];

    const [songResult, coverResult] = await Promise.all([
      uploadAudio(songFile.buffer, {
        folder: 'melostream/songs',
        public_id: `${Date.now()}-${title}`,
      }),
      uploadCover(coverFile.buffer, {
        folder: 'melostream/covers',
        public_id: `${Date.now()}-${title}-cover`,
      }),
    ]);

    const songData = {
      title,
      artist,
      genre,
      titleLower: title.toLowerCase(),
      artistLower: artist.toLowerCase(),
      duration: Number(duration) || 0,
      fileUrl: songResult.secure_url,
      coverUrl: coverResult.secure_url,
      storagePath: songResult.public_id,
      coverStoragePath: coverResult.public_id,
      playCount: 0,
      featured: false,
      uploadedBy: req.user.uid,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newSong = await createSong(songData);
    
    // Convert dates for response to match old format
    newSong.createdAt = songData.createdAt.toISOString();
    newSong.updatedAt = songData.updatedAt.toISOString();

    res.status(201).json(newSong);
  } catch (err) {
    logger.error('uploadSong error:', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.updateSong = async (req, res) => {
  try {
    const songId = req.params.id;
    const existingSong = await getSongById(songId);
    if (!existingSong) return res.status(404).json({ error: 'Song not found' });

    const updates = {};
    const { title, artist, genre, duration, featured } = req.body;

    if (title !== undefined || artist !== undefined) {
      const newTitle = title !== undefined ? String(title).trim() : existingSong.title;
      const newArtist = artist !== undefined ? String(artist).trim() : existingSong.artist;
      const dup = await checkDuplicateSong(newTitle, newArtist, songId);
      if (dup) {
        return res.status(409).json({
          error: `Song already exists: "${dup.title}" by ${dup.artist}`,
          code: 'DUPLICATE_SONG',
          existing: dup,
        });
      }
    }

    if (title !== undefined) {
      updates.title = String(title).trim();
      updates.titleLower = String(title).trim().toLowerCase();
    }
    if (artist !== undefined) {
      updates.artist = String(artist).trim();
      updates.artistLower = String(artist).trim().toLowerCase();
    }
    if (genre !== undefined) updates.genre = String(genre).trim();
    if (duration !== undefined) updates.duration = Number(duration) || 0;
    if (featured !== undefined) updates.featured = Boolean(featured);

    const coverFile = req.files?.['cover']?.[0];
    if (coverFile) {
      const coverResult = await uploadCover(coverFile.buffer, {
        folder: 'melostream/covers',
        public_id: `${Date.now()}-${updates.title || existingSong.title}-cover`,
      });

      updates.coverUrl = coverResult.secure_url;
      updates.coverStoragePath = coverResult.public_id;

      if (existingSong.coverStoragePath) {
        await deleteAsset(existingSong.coverStoragePath, { resource_type: 'image' });
      }
    }

    updates.updatedAt = new Date();

    await updateSong(songId, updates);

    // Prepare response
    const merged = { ...existingSong, ...updates };
    merged.updatedAt = updates.updatedAt.toISOString();
    // keep old createdAt
    merged.createdAt = existingSong.createdAt; 
    
    res.json(merged);
  } catch (err) {
    logger.error('updateSong error:', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSong = async (req, res) => {
  try {
    const songId = req.params.id;
    const song = await getSongById(songId);
    if (!song) return res.status(404).json({ error: 'Song not found' });

    const { storagePath, coverStoragePath } = song;

    await Promise.allSettled([
      storagePath ? deleteAsset(storagePath, { resource_type: 'video' }) : Promise.resolve(),
      coverStoragePath ? deleteAsset(coverStoragePath, { resource_type: 'image' }) : Promise.resolve(),
    ]);

    await deleteSong(songId);
    res.json({ message: 'Song deleted successfully' });
  } catch (err) {
    logger.error('deleteSong error:', { error: err.message });
    res.status(500).json({ error: err.message });
  }
};
