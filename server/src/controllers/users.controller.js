// PERMANENT FIX: Uses `db` imported directly from config/firebase.js
// (firebase.service.js also imports db the same way — no getDb() exists).

const { db } = require('../config/firebase');
const { getAllUsers } = require('../services/firebase.service');
const logger = require('../utils/logger');

// ── GET /users ────────────────────────────────────────────────────────────────
exports.getAllUsers = async (req, res) => {
  try {
    let users = await getAllUsers();
    users = users.map((u) => ({ ...u, likedSongs: undefined }));
    res.json({ success: true, data: users });
  } catch (err) {
    logger.error('getAllUsers error:', { error: err.message });
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── GET /users/:uid/liked-songs ───────────────────────────────────────────────
exports.getLikedSongs = async (req, res) => {
  const { uid } = req.params;

  if (req.user.uid !== uid) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  try {
    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) {
      // New account — return empty list, not 404
      return res.json({ success: true, data: [] });
    }

    const likedSongs = doc.data().likedSongs ?? [];
    res.json({ success: true, data: likedSongs });
  } catch (err) {
    logger.error('getLikedSongs error:', { uid, error: err.message });
    res.status(500).json({ success: false, message: 'Failed to fetch liked songs' });
  }
};

// ── POST /users/:uid/liked-songs/:songId ──────────────────────────────────────
exports.toggleLikedSong = async (req, res) => {
  const { uid, songId } = req.params;

  if (req.user.uid !== uid) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  if (!songId) {
    return res.status(400).json({ success: false, message: 'songId is required' });
  }

  try {
    const userRef = db.collection('users').doc(uid);

    const updatedList = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const likedSongs = snap.exists ? (snap.data().likedSongs ?? []) : [];

      const nextList = likedSongs.includes(songId)
        ? likedSongs.filter((id) => id !== songId)
        : [...likedSongs, songId];

      tx.set(userRef, { likedSongs: nextList }, { merge: true });
      return nextList;
    });

    res.json({ success: true, data: updatedList });
  } catch (err) {
    logger.error('toggleLikedSong error:', { uid, songId, error: err.message });
    res.status(500).json({ success: false, message: 'Failed to toggle liked song' });
  }
};