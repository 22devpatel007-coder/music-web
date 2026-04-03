const express          = require('express');
const router           = express.Router();
const searchController = require('../controllers/search.controller');

// GET /api/search?q=term
router.get('/', searchController.searchSongs);

module.exports = router;