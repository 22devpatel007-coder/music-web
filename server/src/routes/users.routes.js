// PERMANENT FIX: Added liked-songs routes.
// Root cause of 404: these two routes simply didn't exist.
// The CORS preflight (204) was passing because OPTIONS is handled globally,
// but the actual GET/POST hit no route handler → Express returned 404.
//
// Middleware order per CLAUDE.md:
//   verifyToken → controller  (user-scoped routes, no isAdmin needed)
//   verifyToken → isAdmin → controller  (admin-only routes)

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const isAdmin = require('../middleware/isAdmin');
const usersController = require('../controllers/users.controller');

// ── Admin: list all users ─────────────────────────────────────────────────────
router.get('/', verifyToken, isAdmin, usersController.getAllUsers);

// ── User: liked songs ─────────────────────────────────────────────────────────
// GET  /users/:uid/liked-songs          → returns array of liked song IDs
// POST /users/:uid/liked-songs/:songId  → toggles like (add or remove)
//
// verifyToken only — controller enforces uid === req.user.uid internally.
// No isAdmin needed: users manage their own likes.
router.get(
  '/:uid/liked-songs',
  verifyToken,
  usersController.getLikedSongs
);

router.post(
  '/:uid/liked-songs/:songId',
  verifyToken,
  usersController.toggleLikedSong
);

module.exports = router;