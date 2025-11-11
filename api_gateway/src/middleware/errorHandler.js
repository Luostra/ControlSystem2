const logger = require('pino')();

const errorHandler = (err, req, res, next) => {
  logger.error({
    err,
    requestId: req.id,
    url: req.url,
    method: req.method,
    user: req.user ? req.user.userId : 'anonymous'
  }, 'Unhandled error in API Gateway');

  // Circuit breaker errors
  if (err.message && err.message.includes('Circuit breaker is open')) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable'
      }
    });
  }

  // Axios errors
  if (err.response) {
    return res.status(err.response.status).json(err.response.data);
  }

  // Default error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
};

module.exports = { errorHandler };