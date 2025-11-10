// Имитация базы данных в памяти
let usersDB = {};
let ordersDB = {};

const initDatabase = () => {
  console.log('Database initialized with test data');
};

module.exports = { usersDB, ordersDB, initDatabase };