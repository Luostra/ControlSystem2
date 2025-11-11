require('dotenv').config();
const app = require('./app');
const { initDatabase } = require('./utils/database');
const logger = require('pino')();

const PORT = process.env.PORT || 8002;

// Инициализация базы данных
initDatabase();

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Orders service running on port ${PORT}`);
});