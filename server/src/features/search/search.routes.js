// routes/search.routes.js
const express = require('express');
const router = express.Router();
const { searchSongs } = require('./search.controller');

// GET /api/search?q=<term>&limit=<number>
// Public — no auth required for search
router.get('/', searchSongs);

module.exports = router;