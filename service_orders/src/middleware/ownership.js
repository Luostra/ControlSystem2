const { ordersDB } = require('../utils/database');

const checkOrderOwnership = (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = ordersDB[orderId];

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Админы имеют доступ ко всем заказам
    if (req.user.roles.includes('admin')) {
      return next();
    }

    // Проверка владения заказом
    if (order.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this order'
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

const checkOrderAccess = (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    const order = ordersDB[orderId];

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Админы имеют доступ ко всем заказам
    if (req.user.roles.includes('admin')) {
      return next();
    }

    // Проверка владения заказом
    if (order.userId !== req.user.userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have permission to access this order'
        }
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { checkOrderOwnership, checkOrderAccess };