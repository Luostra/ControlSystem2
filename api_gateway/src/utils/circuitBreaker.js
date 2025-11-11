const CircuitBreaker = require('opossum');
const logger = require('pino')();

const circuitOptions = {
  timeout: 5000, // 5 секунд таймаут
  errorThresholdPercentage: 50,
  resetTimeout: 30000, 
  rollingCountTimeout: 60000, 
  rollingCountBuckets: 10 
};

const createCircuitBreaker = (serviceName) => {
  const circuit = new CircuitBreaker(async (url, options = {}) => {
    const axios = require('axios');
    
    try {
      const response = await axios({
        url,
        ...options,
        timeout: circuitOptions.timeout,
        validateStatus: function (status) {
          return status >= 200 && status < 500; 
        }
      });
      return response.data;
    } catch (error) {
      if (error.response) {
        throw error;
      } else if (error.request) {
        throw new Error(`Service ${serviceName} unavailable`);
      } else {
        throw error;
      }
    }
  }, circuitOptions);

  circuit.fallback(() => ({
    success: false,
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: `${serviceName} service is temporarily unavailable`
    }
  }));

  circuit.on('open', () => {
    logger.warn(`Circuit breaker for ${serviceName} opened`);
  });

  circuit.on('close', () => {
    logger.info(`Circuit breaker for ${serviceName} closed`);
  });

  circuit.on('halfOpen', () => {
    logger.info(`Circuit breaker for ${serviceName} half-open`);
  });

  circuit.on('failure', (error) => {
    logger.error({ error }, `Circuit breaker failure for ${serviceName}`);
  });

  return circuit;
};

module.exports = { createCircuitBreaker };