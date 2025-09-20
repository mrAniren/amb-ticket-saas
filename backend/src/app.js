require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const { connectMongoDB } = require('./config/mongodb');
const ticketLockingService = require('./services/ticketLockingService');

// Функция для автоматической очистки истекших заказов
function startOrderCleanupScheduler() {
  console.log('⏰ Запуск планировщика очистки истекших заказов (каждую минуту)');
  
  // Очищаем сразу при запуске
  cleanupExpiredOrders();
  
  // Затем каждую минуту (для тестирования с 2-минутными заказами)
  setInterval(cleanupExpiredOrders, 1 * 60 * 1000);
}

async function cleanupExpiredOrders() {
  try {
    console.log('🕐 Запуск проверки истекших заказов...');
    const Order = require('./models/Order');
    const Session = require('./models/Session');
    const mongoose = require('mongoose');
    
    const now = new Date();
    console.log(`⏰ Текущее время: ${now.toISOString()}`);
    
    // Находим истекшие заказы
    const expiredOrders = await Order.find({
      status: { $in: ['temporary', 'pending'] },
      expiresAt: { $lt: now }
    });
    
    console.log(`🔍 Проверка истекших заказов: найдено ${expiredOrders.length} заказов`);
    if (expiredOrders.length > 0) {
      expiredOrders.forEach(order => {
        console.log(`   - Заказ ${order._id}: статус=${order.status}, истекает=${order.expiresAt}`);
      });
    }
    
    if (expiredOrders.length === 0) {
      return;
    }
    
    console.log(`🧹 Автоматическая очистка: найдено ${expiredOrders.length} истекших заказов`);
    
    // Обрабатываем заказы без транзакций (для локальной MongoDB)
    for (const order of expiredOrders) {
      try {
        console.log(`   🔄 Обрабатываем заказ ${order._id}...`);
        
        // Меняем статус заказа на expired
        await Order.findByIdAndUpdate(
          order._id,
          { status: 'expired' }
        );
        console.log(`   ✅ Статус заказа ${order._id} изменен на expired`);
        
        // Освобождаем места в сессии
        const session = await Session.findById(order.sessionId);
        if (session) {
          let freedSeats = 0;
          session.tickets.forEach(ticket => {
            if (ticket.orderId && ticket.orderId.toString() === order._id.toString()) {
              ticket.status = 'available';
              delete ticket.orderId;
              delete ticket.reservedUntil;
              delete ticket.customerInfo;
              freedSeats++;
            }
          });
          
          if (freedSeats > 0) {
            await session.save();
            console.log(`   ✅ Освобождено ${freedSeats} мест в сессии ${order.sessionId}`);
          }
        }
      } catch (error) {
        console.error(`   ❌ Ошибка обработки заказа ${order._id}:`, error.message);
      }
    }
    
    console.log(`✅ Автоматическая очистка завершена: обработано ${expiredOrders.length} заказов`);
    
  } catch (error) {
    console.error('❌ Ошибка автоматической очистки заказов:', error);
  }
}

// Import routes
const authRoutes = require('./routes/auth');
const hallRoutes = require('./routes/halls');
const fileRoutes = require('./routes/files');
const priceSchemeRoutes = require('./routes/priceSchemes');
const eventRoutes = require('./routes/events');
const sessionRoutes = require('./routes/sessions');
const promoCodeRoutes = require('./routes/promoCodes');
const ticketRoutes = require('./routes/tickets');
const orderRoutes = require('./routes/orders'); // Переработано для новой архитектуры

const app = express();

// Security middleware - relaxed for SPA
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Отключаем CSP для SPA
  crossOriginOpenerPolicy: false,
  hsts: false, // Отключаем принудительный HTTPS для HTTP развертывания
  frameguard: false // Отключаем X-Frame-Options для iframe виджетов
}));

// Rate limiting - более мягкий для разработки
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 1000 запросов для dev
  skip: (req) => {
    // Пропускаем rate limiting для некоторых эндпоинтов в development
    if (process.env.NODE_ENV !== 'production') {
      return req.path.startsWith('/api/halls');
    }
    return false;
  }
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: true, // Разрешаем все origins для разработки
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/halls', hallRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/price-schemes', priceSchemeRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/orders', orderRoutes); // Переработано для новой архитектуры с Session.tickets
app.use('/api/customers', require('./routes/customers')); // Управление клиентами
app.use('/api/statistics', require('./routes/statistics')); // Статистика продаж
app.use('/api/widgets', require('./routes/widgets')); // Управление виджетами
app.use('/api/widget', require('./routes/widget-embed')); // Встраиваемые виджеты
app.use('/api/facebook', require('./routes/facebook')); // Facebook интеграция
app.use('/api/currency', require('./routes/currency')); // Конвертация валют

// Serve static files from React build
app.use(express.static(path.join(__dirname, '../public')));

// Special route for iframe tickets pages
app.get('/tickets/:sessionId', (req, res) => {
  const indexPath = path.join(__dirname, '../public/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving iframe index.html:', err);
      res.status(404).json({ error: 'Frontend not found' });
    }
  });
});

// Handle React routing, return all non-API requests to React app
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  
  const indexPath = path.join(__dirname, '../public/index.html');
  
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(404).json({ error: 'Frontend not found' });
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'File too large' });
  }
  
  res.status(err.status || 500).json({ 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const PORT = process.env.PORT || 3001;

// Database connection and server start
async function startServer() {
  try {
    // Подключаемся к MongoDB
    const mongoConnection = await connectMongoDB();
    
    if (mongoConnection) {
      console.log('✅ MongoDB подключена, используем базу данных');
    } else {
      console.log('⚠️ MongoDB недоступна, используем файловое хранилище');
    }
    
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📱 Frontend: http://localhost:${PORT}`);
        console.log(`🔧 API: http://localhost:${PORT}/api`);
        
        // Запускаем автоматическую очистку истекших заказов каждые 5 минут
        startOrderCleanupScheduler();
        
        // Запускаем сервис блокировки билетов
        ticketLockingService.start();
    });
  } catch (error) {
    console.error('❌ Unable to start server:', error);
    process.exit(1);
  }
}

startServer();