const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin     = require('../middleware/isAdmin');
const upload      = require('../middleware/upload');
const songsController = require('../controllers/songs.controller');

// ─── PERMANENT FIX: Dedicated rate limiter for the duplicate-check endpoint ───
// The global limiter (200 req / 15 min) is too loose — a bot could enumerate
// the entire library cheaply via this endpoint.
// isAdmin already blocks non-admins (403), but defence-in-depth: limit to
// 30 requests / 15 min per IP regardless of auth status.
const duplicateCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many duplicate-check requests, please try again later.' },
});

// ─── Public routes ────────────────────────────────────────────────────────────
router.get('/', songsController.getAllSongs);
router.get('/:id', songsController.getSongById);

// ─── Admin-only routes ────────────────────────────────────────────────────────

// Duplicate check — called before upload, no file involved.
// Rate-limited independently (30 / 15 min) + requires admin token.
router.post(
  '/check-duplicate',
  duplicateCheckLimiter,
  verifyToken,
  isAdmin,
  songsController.checkDuplicate
);

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