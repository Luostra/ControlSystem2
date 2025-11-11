const express = require('express');
const cors = require('cors');

const app = express();


// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true
}));

app.use(express.json());

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

module.exports = app;