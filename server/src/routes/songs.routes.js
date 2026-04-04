const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');
const upload = require('../middleware/upload');
const songsController = require('../controllers/songs.controller');
const { validateCreateSong, validateUpdateSong } = require('../validators/song.validator');

const duplicateCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many duplicate-check requests, please try again later.', code: 'RATE_LIMIT' } }
});

router.get('/', songsController.getAllSongs);
router.get('/:id', songsController.getSongById);

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
  upload.fields([{ name: 'song', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  validateCreateSong,
  songsController.uploadSong
);

router.patch(
  '/:id',
  verifyToken,
  isAdmin,
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  validateUpdateSong,
  songsController.updateSong
);

router.delete('/:id', verifyToken, isAdmin, songsController.deleteSong);

module.exports = router;
