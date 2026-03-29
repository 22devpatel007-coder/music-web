const { db } = require('../config/firebase');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

// Helper
const uploadToCloudinary = (buffer, options) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

// GET all songs
exports.getAllSongs = async (req, res) => {
  try {
    const snapshot = await db.collection('songs')
      .orderBy('createdAt', 'desc').get();
    const songs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(songs);
  } catch (err) {
    console.error('Error fetching songs:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// GET single song
exports.getSongById = async (req, res) => {
  try {
    const doc = await db.collection('songs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Song not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST upload song
exports.uploadSong = async (req, res) => {
  try {
    console.log('=== UPLOAD STARTED ===');
    console.log('Body:', req.body);
    console.log('Files:', req.files);
    console.log('User:', req.user);

    const { title, artist, genre, duration } = req.body;

    if (!req.files) {
      return res.status(400).json({ error: 'No files received' });
    }
    if (!req.files['song']) {
      return res.status(400).json({ error: 'No song file received' });
    }
    if (!req.files['cover']) {
      return res.status(400).json({ error: 'No cover file received' });
    }

    const songFile = req.files['song'][0];
    const coverFile = req.files['cover'][0];

    console.log('Song file:', songFile.originalname, songFile.mimetype);
    console.log('Cover file:', coverFile.originalname, coverFile.mimetype);

    // Upload MP3
    console.log('Uploading MP3 to Cloudinary...');
    const songResult = await uploadToCloudinary(songFile.buffer, {
      resource_type: 'video',
      folder: 'melostream/songs',
      public_id: `${Date.now()}-${title}`,
      format: 'mp3',
    });
    console.log('MP3 uploaded:', songResult.secure_url);

    // Upload Cover
    console.log('Uploading cover to Cloudinary...');
    const coverResult = await uploadToCloudinary(coverFile.buffer, {
      resource_type: 'image',
      folder: 'melostream/covers',
      public_id: `${Date.now()}-${title}-cover`,
    });
    console.log('Cover uploaded:', coverResult.secure_url);

    // Save to Firestore
    console.log('Saving to Firestore...');
    const songData = {
      title,
      artist,
      genre,
      duration: Number(duration),
      fileUrl: songResult.secure_url,
      coverUrl: coverResult.secure_url,
      storagePath: songResult.public_id,
      playCount: 0,
      uploadedBy: req.user.uid,
      createdAt: new Date(),
    };

    const docRef = await db.collection('songs').add(songData);
    console.log('=== UPLOAD SUCCESS ===', docRef.id);
    res.status(201).json({ id: docRef.id, ...songData });

  } catch (err) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Message:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
};

// DELETE song
exports.deleteSong = async (req, res) => {
  try {
    const doc = await db.collection('songs').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Song not found' });

    const { storagePath } = doc.data();
    await cloudinary.uploader.destroy(storagePath, {
      resource_type: 'video'
    });

    await db.collection('songs').doc(req.params.id).delete();
    res.json({ message: 'Song deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};