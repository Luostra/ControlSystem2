const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { requestId } = require('./middleware/logging');
const { errorHandler } = require('./middleware/errorHandler');
const { globalRateLimit } = require('./middleware/rateLimit');

const app = express();

// Middleware
app.use(requestId);
app.use(pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization'],
  customProps: (req) => ({
    requestId: req.id
  })
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true
}));

app.use(express.json());

// Global rate limiting
app.use(globalRateLimit);

// Health checks (public)
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      service: 'API Gateway',
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

// Error handling
app.use(errorHandler);

module.exports = app;