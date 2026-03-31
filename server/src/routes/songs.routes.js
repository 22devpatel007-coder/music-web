const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');
const upload = require('../middleware/upload');
const songsController = require('../controllers/songs.controller');

// Public routes
router.get('/', songsController.getAllSongs);
router.get('/:id', songsController.getSongById); // FIX: was missing — broke Player page

// Admin-only routes
router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'song' }, { name: 'cover' }]),
  songsController.uploadSong
);
router.delete('/:id', verifyToken, isAdmin, songsController.deleteSong);

module.exports = router;