const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { generateToken, authenticateToken } = require('../middleware/auth');
const { validateLogin } = require('../middleware/validation');
const User = require('../models/User');

const router = express.Router();

// Создание администратора по умолчанию при первом запуске
const createDefaultAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      const defaultAdmin = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@seatmap.local',
        password: process.env.ADMIN_PASSWORD || 'admin123',
        role: 'admin'
      });
      
      await defaultAdmin.save();
      console.log('✅ Администратор по умолчанию создан:', defaultAdmin.username);
    }
  } catch (error) {
    console.error('❌ Ошибка создания администратора по умолчанию:', error.message);
  }
};

// Инициализируем администратора при загрузке модуля
createDefaultAdmin();

// POST /api/auth/login
router.post('/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    // Ищем пользователя по имени или email
    const user = await User.findByCredentials(username);
    
    if (!user) {
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    // Проверяем, не заблокирован ли аккаунт
    if (user.isLocked) {
      return res.status(423).json({ 
        error: 'Аккаунт заблокирован из-за многочисленных неудачных попыток входа' 
      });
    }

    // Проверяем активность аккаунта
    if (!user.isActive) {
      return res.status(403).json({ error: 'Аккаунт деактивирован' });
    }

    // Проверяем пароль
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      // Увеличиваем счетчик неудачных попыток
      await user.incLoginAttempts();
      return res.status(401).json({ error: 'Неверные учетные данные' });
    }

    // Сбрасываем счетчик неудачных попыток при успешном входе
    await user.resetLoginAttempts();

    // Генерируем токен
    const token = generateToken({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role
    });

    console.log('✅ Успешный вход пользователя:', user.username);

    // Возвращаем успешный ответ
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка входа в систему' });
  }
});

// POST /api/auth/verify
router.post('/verify', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Токен не предоставлен' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-super-secret-jwt-key');
    
    // Проверяем, существует ли пользователь в базе данных
    const user = await User.findById(decoded.id);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Пользователь не найден или деактивирован' });
    }
    
    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('❌ Ошибка верификации токена:', error.message);
    res.status(401).json({ error: 'Недействительный токен' });
  }
});

// POST /api/auth/register - Регистрация нового пользователя (только для админов)
router.post('/register', authenticateToken, async (req, res) => {
  try {
    // Проверяем права администратора
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const { username, email, password, role = 'user' } = req.body;

    // Валидация
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }

    // Проверяем уникальность имени пользователя и email
    const existingUser = await User.findOne({
      $or: [{ username }, { email }]
    });

    if (existingUser) {
      return res.status(409).json({ 
        error: 'Пользователь с таким именем или email уже существует' 
      });
    }

    // Создаем нового пользователя
    const newUser = new User({
      username,
      email,
      password,
      role
    });

    await newUser.save();

    console.log('✅ Новый пользователь зарегистрирован:', newUser.username);

    res.status(201).json({
      message: 'Пользователь успешно создан',
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ error: errors.join(', ') });
    }
    
    res.status(500).json({ error: 'Ошибка регистрации пользователя' });
  }
});

// GET /api/auth/users - Список пользователей (только для админов)
router.get('/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Недостаточно прав' });
    }

    const users = await User.find().sort({ createdAt: -1 });
    
    res.json({
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }))
    });
  } catch (error) {
    console.error('❌ Ошибка получения пользователей:', error);
    res.status(500).json({ error: 'Ошибка получения списка пользователей' });
  }
});

module.exports = router;