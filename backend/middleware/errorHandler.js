function errorHandler(err, req, res, next) {
  console.error(err);
  const isDev = process.env.NODE_ENV !== 'production';
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal server error';
  res.status(status).json({
    error: message,
    ...(isDev && { stack: err.stack }),
  });
}

module.exports = { errorHandler };
