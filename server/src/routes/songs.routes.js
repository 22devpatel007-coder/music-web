const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');
const upload = require('../middleware/upload');
const songsController = require('../controllers/songs.controller');

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', songsController.getAllSongs);
router.get('/:id', songsController.getSongById);

// ─── Admin-only routes ────────────────────────────────────────────────────────

// Duplicate check — called before upload, no file involved
router.post('/check-duplicate', verifyToken, isAdmin, songsController.checkDuplicate);

// Full song upload (song + cover required)
router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'song' }, { name: 'cover' }]),
  songsController.uploadSong
);

// Partial update (metadata and/or cover)
router.patch(
  '/:id',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  songsController.updateSong
);

// Delete
router.delete('/:id', verifyToken, isAdmin, songsController.deleteSong);

module.exports = router;