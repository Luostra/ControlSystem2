// Имитация базы данных в памяти
let ordersDB = {};

const initDatabase = () => {
  console.log('Orders database initialized');
};

module.exports = { ordersDB, initDatabase };