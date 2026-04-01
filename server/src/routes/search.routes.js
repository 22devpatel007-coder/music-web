const express    = require('express');
const router     = express.Router();
const verifyToken    = require('../middleware/verifyToken');
const isAdmin        = require('../middleware/isAdmin');
const upload         = require('../middleware/upload');
const songsController = require('../controllers/songs.controller');

// ─── Public ───────────────────────────────────────────────────────────────────
router.get('/',    songsController.getAllSongs);
router.get('/:id', songsController.getSongById);

// ─── Admin only ───────────────────────────────────────────────────────────────

// POST /api/songs — full upload (song + cover required)
router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'song' }, { name: 'cover' }]),
  songsController.uploadSong
);

/**
 * PATCH /api/songs/:id — partial update (metadata and/or cover).
 *
 * PERMANENT SOLUTION:
 * - Uses upload.fields with cover optional (no song file allowed on edit).
 * - If only JSON is sent (no cover), multer passes through cleanly because
 *   memoryStorage + optional fields don't error on missing files.
 * - The controller handles both cases (see songs.controller.js).
 *
 * Why not PUT? PATCH is semantically correct for partial updates and avoids
 * clients needing to re-send the audio file (which can be 50 MB).
 */
router.patch(
  '/:id',
  verifyToken,
  isAdmin,
  // Accept optional cover only — no song re-upload on edit
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  songsController.updateSong
);

// DELETE /api/songs/:id
router.delete('/:id', verifyToken, isAdmin, songsController.deleteSong);

module.exports = router;