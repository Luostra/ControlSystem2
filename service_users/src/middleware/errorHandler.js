const logger = require('pino')();

const errorHandler = (err, req, res, next) => {
  logger.error({
    err,
    requestId: req.id,
    url: req.url,
    method: req.method
  }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
};

module.exports = { errorHandler };