const { admin } = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // DEBUG: log what we receive
  console.log('=== verifyToken ===');
  console.log('Auth header present:', !!authHeader);
  console.log('Auth header value:', authHeader ? authHeader.substring(0, 30) + '...' : 'MISSING');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('REJECTED: No bearer token');
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split('Bearer ')[1];

  if (!token || token === 'undefined' || token === 'null' || token.trim() === '') {
    console.log('REJECTED: Token is empty/undefined/null');
    return res.status(401).json({ error: 'Invalid token format' });
  }

  console.log('Token length:', token.length);
  console.log('Token preview:', token.substring(0, 20) + '...');

  try {
    const decoded = await admin.auth().verifyIdToken(token, false);
    console.log('Token VALID for uid:', decoded.uid);
    console.log('Token expires at:', new Date(decoded.exp * 1000).toISOString());
    console.log('Token issued at:', new Date(decoded.iat * 1000).toISOString());
    console.log('Token claims:', JSON.stringify(decoded));
    req.user = decoded;
    next();
  } catch (err) {
    console.log('Token INVALID:', err.code, err.message);

    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    if (err.code === 'auth/argument-error') {
      return res.status(401).json({ error: 'Malformed token', code: 'TOKEN_MALFORMED' });
    }

    return res.status(401).json({ error: 'Invalid token', code: err.code });
  }
};

module.exports = verifyToken;