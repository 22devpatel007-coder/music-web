function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  res.status(status).json({ message });
}

module.exports = errorHandler;
