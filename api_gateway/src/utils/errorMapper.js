// Вспомогательная функция для определения статус кода по коду ошибки
const getStatusCodeFromError = (errorCode) => {
  const statusMap = {
    // Users service errors
    'USER_NOT_FOUND': 404,
    'FORBIDDEN': 403,
    'UNAUTHORIZED': 401,
    'INVALID_CREDENTIALS': 401,
    'VALIDATION_ERROR': 400,
    'USER_EXISTS': 409,
    'INVALID_TOKEN': 401,
    
    // Orders service errors  
    'ORDER_NOT_FOUND': 404,
    'ACCESS_DENIED': 403,
    'ALREADY_CANCELLED': 400,
    'CANNOT_CANCEL': 400,
    'INVALID_STATUS': 400,
    
    // Gateway errors
    'SERVICE_UNAVAILABLE': 503,
    'RATE_LIMIT_EXCEEDED': 429,
    'NOT_FOUND': 404
  };
  
  return statusMap[errorCode] || 500;
};

module.exports = { getStatusCodeFromError };