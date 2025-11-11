const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');
const { requestId } = require('./middleware/logging');
const { errorHandler } = require('./middleware/errorHandler');
const { globalRateLimit } = require('./middleware/rateLimit');
const usersProxy = require('./proxies/usersProxy');
const ordersProxy = require('./proxies/ordersProxy');

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

// CORS конфигурация
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true
}));

app.use(express.json());

// Глобальное ограничение запросов
app.use(globalRateLimit);

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

app.use('/v1/users', usersProxy);
app.use('/v1/orders', ordersProxy);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Обработка ошибок
app.use(errorHandler);

module.exports = app;