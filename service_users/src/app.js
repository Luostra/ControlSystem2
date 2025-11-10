const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
const usersRoutes = require('./controllers/usersController');
const { errorHandler } = require('./middleware/errorHandler');
const { requestId } = require('./middleware/logging');

const app = express();

// Middleware
app.use(requestId);
app.use(pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'body.password']
}));
app.use(cors());
app.use(express.json());

// Routes
app.use('/v1/users', usersRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'OK',
      service: 'Users Service',
      timestamp: new Date().toISOString()
    }
  });
});

// Error handling
app.use(errorHandler);

module.exports = app;