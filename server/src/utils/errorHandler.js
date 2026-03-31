const multer = require('multer');

// ─── Global error handler ─────────────────────────────────────────────────────
// Must be registered AFTER all routes in server/src/index.js.
// Handles Multer errors specially so they return a useful 400 instead of 500.
// ─────────────────────────────────────────────────────────────────────────────

function errorHandler(err, _req, res, _next) {
  // Multer file size / type errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum allowed size is 50 MB.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Upload one song and one cover.' });
    }
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  // Custom errors thrown with a .status property (e.g. from upload.js fileFilter)
  const status  = err.status  || 500;
  const message = err.message || 'Internal Server Error';

  if (status >= 500) {
    console.error('[errorHandler]', status, message, err.stack);
  }

  res.status(status).json({ error: message });
}

module.exports = errorHandler;