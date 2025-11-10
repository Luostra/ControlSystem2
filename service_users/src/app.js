const express = require('express');
const cors = require('cors');
const pinoHttp = require('pino-http');

const app = express();

app.use(pinoHttp({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['req.headers.authorization', 'body.password']
}));
app.use(cors());
app.use(express.json());

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

module.exports = app;