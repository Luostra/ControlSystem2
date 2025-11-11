const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createOrderValidator, updateOrderValidator } = require('../validators/orderValidators');
const { validateRequest } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { checkOrderOwnership, checkOrderAccess } = require('../middleware/ownership');
const { ordersDB } = require('../utils/database');
const { calculateOrderTotal } = require('../utils/calculations');
const { publishOrderCreated, publishOrderStatusUpdated } = require('../utils/events');
const { verifyUserExists } = require('../utils/userService');
const logger = require('pino')();

const router = express.Router();

// Статусы заказов согласно ТЗ
const ORDER_STATUS = {
  CREATED: 'created',
  IN_PROGRESS: 'in work',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Создание заказа - ОБНОВЛЕННАЯ ЛОГИКА
router.post('/', authenticate, validateRequest(createOrderValidator), async (req, res, next) => {
  try {
    const { items, notes } = req.body;
    const userId = req.user.userId;
    const authToken = req.headers.authorization?.replace('Bearer ', '');

    // Проверка существования пользователя через Users Service
    const userExists = await verifyUserExists(userId, authToken);
    
    if (!userExists) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Расчет общей суммы
    const totalAmount = calculateOrderTotal(items);

    // Создание заказа
    const orderId = uuidv4();
    const newOrder = {
      id: orderId,
      userId,
      items: items.map(item => ({
        id: uuidv4(),
        product: item.product,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price
      })),
      status: ORDER_STATUS.CREATED,
      totalAmount,
      notes: notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    ordersDB[orderId] = newOrder;

    // Публикация события
    await publishOrderCreated(newOrder);

    logger.info({ orderId, userId, totalAmount }, 'Order created successfully');

    res.status(201).json({
      success: true,
      data: {
        order: newOrder
      }
    });
  } catch (error) {
    next(error);
  }
});

// ... остальной код без изменений

// Получение заказа по ID
router.get('/:orderId', authenticate, checkOrderAccess, (req, res) => {
  const order = ordersDB[req.params.orderId];
  
  res.json({
    success: true,
    data: {
      order
    }
  });
});

// Список заказов текущего пользователя с пагинацией и сортировкой
router.get('/', authenticate, (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query;

    let userOrders = Object.values(ordersDB).filter(order => order.userId === userId);

    // Фильтрация по статусу
    if (status) {
      userOrders = userOrders.filter(order => order.status === status);
    }

    // Сортировка
    userOrders.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    // Пагинация
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedOrders = userOrders.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: userOrders.length,
          totalPages: Math.ceil(userOrders.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Обновление статуса заказа
router.patch('/:orderId/status', authenticate, checkOrderOwnership, validateRequest(updateOrderValidator), async (req, res, next) => {
  try {
    const { status } = req.body;
    const orderId = req.params.orderId;
    const order = ordersDB[orderId];

    // Валидация статуса
    if (!Object.values(ORDER_STATUS).includes(status)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS',
          message: `Invalid status. Must be one of: ${Object.values(ORDER_STATUS).join(', ')}`
        }
      });
    }

    const previousStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();

    ordersDB[orderId] = order;

    // Публикация события
    await publishOrderStatusUpdated(orderId, previousStatus, status);

    logger.info({ orderId, previousStatus, newStatus: status }, 'Order status updated');

    res.json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    next(error);
  }
});

// Отмена заказа
router.post('/:orderId/cancel', authenticate, checkOrderOwnership, async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = ordersDB[orderId];

    if (order.status === ORDER_STATUS.CANCELLED) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CANCELLED',
          message: 'Order is already cancelled'
        }
      });
    }

    if (order.status === ORDER_STATUS.COMPLETED) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: 'Cannot cancel completed order'
        }
      });
    }

    const previousStatus = order.status;
    order.status = ORDER_STATUS.CANCELLED;
    order.updatedAt = new Date().toISOString();

    ordersDB[orderId] = order;

    // Публикация события
    await publishOrderStatusUpdated(orderId, previousStatus, ORDER_STATUS.CANCELLED);

    logger.info({ orderId }, 'Order cancelled');

    res.json({
      success: true,
      data: {
        order
      }
    });
  } catch (error) {
    next(error);
  }
});

// Получение всех заказов (для админов)
router.get('/admin/all', authenticate, (req, res, next) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    const { page = 1, limit = 10, userId, status } = req.query;
    let allOrders = Object.values(ordersDB);

    // Фильтрация
    if (userId) {
      allOrders = allOrders.filter(order => order.userId === userId);
    }
    if (status) {
      allOrders = allOrders.filter(order => order.status === status);
    }

    // Пагинация
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedOrders = allOrders.slice(startIndex, endIndex);

    res.json({
      success: true,
      data: {
        orders: paginatedOrders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: allOrders.length,
          totalPages: Math.ceil(allOrders.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;