const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createCircuitBreaker } = require('../utils/circuitBreaker');
const { forwardRequest } = require('../utils/request');
const logger = require('pino')();

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

    // Если сервис вернул ошибку, передаем соответствующий статус
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

    // Если сервис вернул ошибку, передаем соответствующий статус
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

    // Если сервис вернул ошибку, передаем соответствующий статус
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

    // Если сервис вернул ошибку, передаем соответствующий статус
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
    
    // Если сервис вернул ошибку, передаем соответствующий статус
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


// Вспомогательная функция для определения статус кода по коду ошибки
const getStatusCodeFromError = (errorCode) => {
  const statusMap = {
    'USER_NOT_FOUND': 404,
    'FORBIDDEN': 403,
    'UNAUTHORIZED': 401,
    'INVALID_CREDENTIALS': 401,
    'VALIDATION_ERROR': 400,
    'USER_EXISTS': 409,
    'ORDER_NOT_FOUND': 404,
    'ACCESS_DENIED': 403,
    'ALREADY_CANCELLED': 400,
    'CANNOT_CANCEL': 400,
    'INVALID_STATUS': 400
  };
  
  return statusMap[errorCode] || 500;
};

module.exports = router;