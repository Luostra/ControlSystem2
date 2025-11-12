const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createCircuitBreaker } = require('../utils/circuitBreaker');
const { forwardRequest } = require('../utils/request');
const logger = require('pino')();
const { getStatusCodeFromError } = require('../utils/errorMapper');

const router = express.Router();

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://service_users:8001';
const usersCircuit = createCircuitBreaker('users');

// Public routes
router.post('/register', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      usersCircuit,
      `${USERS_SERVICE_URL}/v1/users/register`,
      'POST',
      req,
      res
    );

    // Если сервис вернул ошибку, передаем соответствующий статус
    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      usersCircuit,
      `${USERS_SERVICE_URL}/v1/users/login`,
      'POST',
      req,
      res
    );

    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Protected routes
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const response = await forwardRequest(
      usersCircuit,
      `${USERS_SERVICE_URL}/v1/users/profile`,
      'GET',
      req,
      res
    );

    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const response = await forwardRequest(
      usersCircuit,
      `${USERS_SERVICE_URL}/v1/users/profile`,
      'PUT',
      req,
      res
    );

    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Admin routes
router.get('/', authenticate, async (req, res, next) => {
  try {
    const response = await forwardRequest(
      usersCircuit,
      `${USERS_SERVICE_URL}/v1/users`,
      'GET',
      req,
      res
    );

    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:userId', authenticate, async (req, res, next) => {
  try {
    const response = await forwardRequest(
      usersCircuit,
      `${USERS_SERVICE_URL}/v1/users/${req.params.userId}`,
      'GET',
      req,
      res
    );
    
    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    if (response.success === false && response.error?.code === 'USER_NOT_FOUND') {
      return res.status(404).json(response);
    }
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;