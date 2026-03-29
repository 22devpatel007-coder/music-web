const { admin } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    console.log('Verifying token...');
    const decoded = await admin.auth().verifyIdToken(token);
    console.log('Token valid for UID:', decoded.uid);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err.code, err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = verifyToken;