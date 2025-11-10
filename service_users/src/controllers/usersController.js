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

// Получение профиля
router.get('/profile', authenticate, (req, res) => {
  const user = usersDB[req.user.userId];
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roles: user.roles,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  });
});

// Обновление профиля
router.put('/profile', authenticate, validateRequest(updateProfileValidator), async (req, res, next) => {
  try {
    const { name, password } = req.body;
    const user = usersDB[req.user.userId];

    const updates = {
      ...user,
      name: name || user.name,
      updatedAt: new Date().toISOString()
    };

    if (password) {
      updates.password = await hashPassword(password);
    }

    usersDB[req.user.userId] = updates;

    logger.info({ userId: req.user.userId }, 'User profile updated');

    res.json({
      success: true,
      data: {
        user: {
          id: updates.id,
          email: updates.email,
          name: updates.name,
          roles: updates.roles,
          createdAt: updates.createdAt,
          updatedAt: updates.updatedAt
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Список пользователей (только для админов)
router.get('/', authenticate, (req, res, next) => {
  try {
    if (!req.user.roles.includes('admin')) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Insufficient permissions'
        }
      });
    }

    const { page = 1, limit = 10, email } = req.query;
    const usersArray = Object.values(usersDB);
    
    // Фильтрация по email
    let filteredUsers = usersArray;
    if (email) {
      filteredUsers = usersArray.filter(user => 
        user.email.toLowerCase().includes(email.toLowerCase())
      );
    }

    // Пагинация
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

    // Удаление паролей из ответа
    const usersWithoutPasswords = paginatedUsers.map(({ password, ...user }) => user);

    res.json({
      success: true,
      data: {
        users: usersWithoutPasswords,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: filteredUsers.length,
          totalPages: Math.ceil(filteredUsers.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Получение пользователя по ID (только для админов)
router.get('/:userId', authenticate, (req, res) => {
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient permissions'
      }
    });
  }

  const user = usersDB[req.params.userId];
  if (!user) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'USER_NOT_FOUND',
        message: 'User not found'
      }
    });
  }

  const { password, ...userWithoutPassword } = user;

  res.json({
    success: true,
    data: {
      user: userWithoutPassword
    }
  });
});

module.exports = router;