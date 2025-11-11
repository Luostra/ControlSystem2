require('dotenv').config();
const app = require('./app');
const logger = require('pino')();

const PORT = process.env.PORT || 8000;

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`API Gateway running on port ${PORT}`);
});