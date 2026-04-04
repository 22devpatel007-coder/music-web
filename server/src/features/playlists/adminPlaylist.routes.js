const express    = require('express');
const router     = express.Router();
const verifyToken = require('../../middleware/verifyToken');
const isAdmin     = require('../../middleware/isAdmin');
const upload      = require('../../middleware/upload');
const ctrl        = require('./adminPlaylist.controller');

router.use(verifyToken, isAdmin);

router.post(
  '/upload-song',
  upload.fields([{ name: 'song', maxCount: 1 }, { name: 'cover', maxCount: 1 }]),
  ctrl.uploadPlaylistSong
);

router.post(
  '/with-cover',
  upload.fields([{ name: 'cover', maxCount: 1 }]),
  ctrl.createAdminPlaylistWithCover
);

router.post('/', ctrl.createAdminPlaylist);
router.get('/', ctrl.getAdminPlaylists);
router.delete('/:id', ctrl.deleteAdminPlaylist);

module.exports = router;