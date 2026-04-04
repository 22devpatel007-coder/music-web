const { db } = require('../../config/firebase');

// Converts Firestore Timestamp fields → ISO strings so the React client
// receives plain JSON (no { _seconds, _nanoseconds } objects).
function serializeUser(id, data) {
  return {
    id,
    ...data,
    createdAt: data.createdAt?.toDate
      ? data.createdAt.toDate().toISOString()
      : data.createdAt ?? null,
    // Never expose likedSongs array to the admin user list (privacy + payload size)
    likedSongs: undefined,
  };
}

// GET /api/users  (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = snapshot.docs.map(doc => serializeUser(doc.id, doc.data()));
    res.json(users);
  } catch (err) {
    console.error('getAllUsers error:', err.message);
    res.status(500).json({ error: err.message });
  }
};