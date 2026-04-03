const express    = require('express');
const rateLimit  = require('express-rate-limit');
const router     = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin     = require('../middleware/isAdmin');
const upload      = require('../middleware/upload');
const songsController = require('../controllers/songs.controller');

// ─── Rate limiter for duplicate-check ─────────────────────────────────────────
const duplicateCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many duplicate-check requests, please try again later.' },
});

// ─── Public routes ────────────────────────────────────────────────────────────
// GET /api/songs              → first page  (no cursor)
// GET /api/songs?cursor=<id>  → next page
// GET /api/songs/:id          → single song
//
// NOTE: /:id must come AFTER /check-duplicate or Express matches "check-duplicate"
// as the :id param. Order matters.
router.get('/', songsController.getAllSongs);
router.get('/:id', songsController.getSongById);

// ─── Admin-only routes ────────────────────────────────────────────────────────
router.post(
  '/check-duplicate',
  duplicateCheckLimiter,
  verifyToken,
  isAdmin,
  songsController.checkDuplicate
);

router.post(
  '/',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'song' }, { name: 'cover' }]),
  songsController.uploadSong
);

router.patch(
  '/:id',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  songsController.updateSong
);

router.delete('/:id', verifyToken, isAdmin, songsController.deleteSong);

module.exports = router;