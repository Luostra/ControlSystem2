const express = require('express');
const { authenticate } = require('../middleware/auth');
const { createCircuitBreaker } = require('../utils/circuitBreaker');
const { forwardRequest } = require('../utils/request');
const logger = require('pino')();
const { getStatusCodeFromError } = require('../utils/errorMapper');

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

    if (response.success === false) {
      const statusCode = getStatusCodeFromError(response.error.code);
      return res.status(statusCode).json(response);
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

module.exports = router;