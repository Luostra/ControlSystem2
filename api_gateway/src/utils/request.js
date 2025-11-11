const logger = require('pino')();

const forwardRequest = async (circuit, url, method, req, res) => {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': req.id,
    },
    data: req.body
  };

  // Добавляем авторизацию если пользователь аутентифицирован
  if (req.user && req.headers.authorization) {
    options.headers.Authorization = req.headers.authorization;
  }

  // Добавляем query параметры для GET запросов
  if (method === 'GET' && Object.keys(req.query).length > 0) {
    const queryParams = new URLSearchParams(req.query).toString();
    url += `?${queryParams}`;
  }

  logger.debug({
    url,
    method,
    requestId: req.id,
    user: req.user ? req.user.userId : 'anonymous'
  }, 'Forwarding request to service');

  try {
    const response = await circuit.fire(url, options);
    
    // Логируем успешные запросы
    logger.info({
      url,
      method,
      requestId: req.id,
      status: 'success'
    }, 'Request completed successfully');

    return response;
  } catch (error) {
    logger.error({
      url,
      method,
      requestId: req.id,
      error: error.message
    }, 'Request failed');

    throw error;
  }
};

module.exports = { forwardRequest };