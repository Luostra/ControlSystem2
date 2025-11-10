const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { registerValidator, loginValidator, updateProfileValidator } = require('../validators/userValidators');
const { validateRequest } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { usersDB, ordersDB } = require('../utils/database');
const logger = require('pino')();

const router = express.Router();

// Регистрация пользователя
router.post('/register', validateRequest(registerValidator), async (req, res, next) => {
  try {
    const { email, password, name, roles = ['user'] } = req.body;

    // Проверка существования пользователя
    const existingUser = Object.values(usersDB).find(user => user.email === email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    }

    // Создание пользователя
    const userId = uuidv4();
    const hashedPassword = await hashPassword(password);
    
    const newUser = {
      id: userId,
      email,
      password: hashedPassword,
      name,
      roles: Array.isArray(roles) ? roles : [roles],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    usersDB[userId] = newUser;

    // Генерация токена
    const token = generateToken({ userId, email, roles: newUser.roles });

    logger.info({ userId, email }, 'User registered successfully');

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name,
          roles: newUser.roles,
          createdAt: newUser.createdAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});

// Вход пользователя
router.post('/login', validateRequest(loginValidator), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Поиск пользователя
    const user = Object.values(usersDB).find(u => u.email === email);
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        }
      });
    }

    // Генерация токена
    const token = generateToken({ userId: user.id, email: user.email, roles: user.roles });

    logger.info({ userId: user.id, email }, 'User logged in successfully');

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
          createdAt: user.createdAt
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
});