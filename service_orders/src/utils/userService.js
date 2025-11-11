const axios = require('axios');
const logger = require('pino')();

const USERS_SERVICE_URL = process.env.USERS_SERVICE_URL || 'http://service_users:8001';

const verifyUserExists = async (userId, authToken) => {
  try {
    const response = await axios.get(`${USERS_SERVICE_URL}/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    return response.data.success === true;
  } catch (error) {
    logger.error({ userId, error: error.message }, 'Failed to verify user existence');
    
    if (error.response && error.response.status === 404) {
      return false;
    }
    
    // В случае ошибки сети считаем, что пользователь существует
    // чтобы не блокировать создание заказов при временных проблемах
    return true;
  }
};

module.exports = { verifyUserExists };