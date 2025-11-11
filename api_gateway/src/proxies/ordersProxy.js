const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createCircuitBreaker } = require('../utils/circuitBreaker');
const { forwardRequest } = require('../utils/request');
const logger = require('pino')();

const router = express.Router();

const ORDERS_SERVICE_URL = process.env.ORDERS_SERVICE_URL || 'http://service_orders:8002';
const ordersCircuit = createCircuitBreaker('orders');

// All orders routes require authentication
router.use(authenticate);

// Order management
router.post('/', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      ordersCircuit,
      `${ORDERS_SERVICE_URL}/v1/orders`,
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

router.get('/', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      ordersCircuit,
      `${ORDERS_SERVICE_URL}/v1/orders`,
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

router.get('/:orderId', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      ordersCircuit,
      `${ORDERS_SERVICE_URL}/v1/orders/${req.params.orderId}`,
      'GET',
      req,
      res
    );
    
    // Если сервис вернул ошибку, передаем соответствующий статус
    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    //if (response.success === false && response.error?.code === 'ORDER_NOT_FOUND') {
    //  return res.status(404).json(response);
    //}
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.patch('/:orderId/status', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      ordersCircuit,
      `${ORDERS_SERVICE_URL}/v1/orders/${req.params.orderId}/status`,
      'PATCH',
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

router.post('/:orderId/cancel', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      ordersCircuit,
      `${ORDERS_SERVICE_URL}/v1/orders/${req.params.orderId}/cancel`,
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

// Admin routes
router.get('/admin/all', async (req, res, next) => {
  try {
    const response = await forwardRequest(
      ordersCircuit,
      `${ORDERS_SERVICE_URL}/v1/orders/admin/all`,
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