const express = require('express');
const Order = require('../models/Order');
const Session = require('../models/Session');
const PromoCode = require('../models/PromoCode');
const Hall = require('../models/Hall');
const { authenticateToken } = require('../middleware/auth');
const { mongoose } = require('../config/mongodb');

const router = express.Router();

// Функция для определения подключения к MongoDB
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Функция валидации промокода
const validatePromoCode = async (code, subtotal) => {
  try {
    const promoCode = await PromoCode.findOne({ 
      code: code.toUpperCase(),
      isActive: true 
    });
    
    if (!promoCode) {
      return { valid: false, message: 'Промокод не найден' };
    }
    
    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
      return { valid: false, message: 'Промокод истек' };
    }
    
    if (promoCode.usageLimit && promoCode.usageCount >= promoCode.usageLimit) {
      return { valid: false, message: 'Промокод исчерпан' };
    }
    
    if (promoCode.minOrderAmount && subtotal < promoCode.minOrderAmount) {
      return { 
        valid: false, 
        message: `Минимальная сумма заказа для промокода: ${promoCode.minOrderAmount} ₽` 
      };
    }
    
    let discount = 0;
    if (promoCode.discountType === 'percentage') {
      discount = Math.round((subtotal * promoCode.discountValue) / 100);
      if (promoCode.maxDiscountAmount) {
        discount = Math.min(discount, promoCode.maxDiscountAmount);
      }
    } else if (promoCode.discountType === 'fixed') {
      discount = Math.min(promoCode.discountValue, subtotal);
    }
    
    return { 
      valid: true, 
      discount, 
      promoCodeData: promoCode 
    };
  } catch (error) {
    console.error('Ошибка валидации промокода:', error);
    return { valid: false, message: 'Ошибка при проверке промокода' };
  }
};

// POST /api/orders - Создать заказ
router.post('/', async (req, res) => {
  try {
    const { 
      sessionId, 
      customerName, 
      customerPhone, 
      customerEmail, 
      selectedSeatIds, // Изменено: теперь массив ID мест
      specialZoneData, // Дополнительные данные для специальных зон
      promoCode,
      attribution, // UTM-метки для атрибуции
      widgetId, // ID виджета
      isInvitation, // Флаг приглашения
      notes // Примечания для приглашений
    } = req.body;
    
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    console.log(`📋 Создание заказа для сеанса ${sessionId}:`, {
      customerName,
      customerPhone,
      customerEmail,
      selectedSeatIds,
      specialZoneData,
      promoCode,
      attribution,
      widgetId
    });
    
    console.log('📋 Полные данные запроса:', req.body);
    
    // Валидация обязательных полей
    if (!sessionId || !customerName || !customerPhone || !customerEmail || !selectedSeatIds || selectedSeatIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Не указаны обязательные поля'
      });
    }
    
    // Проверяем существование сеанса
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    // Находим выбранные билеты в Session.tickets
    const selectedTickets = [];
    
    for (const seatId of selectedSeatIds) {
      const ticket = session.tickets.find(t => t.seatId === seatId);
      
      console.log(`🔍 Поиск билета для ${seatId}:`, {
        found: !!ticket,
        ticket: ticket ? {
          seatId: ticket.seatId,
          status: ticket.status,
          capacity: ticket.capacity,
          objectType: ticket.objectType
        } : null,
        totalTickets: session.tickets.length,
        firstFewTickets: session.tickets.slice(0, 3).map(t => ({
          seatId: t.seatId,
          status: t.status,
          capacity: t.capacity,
          objectType: t.objectType
        }))
      });
      
      if (!ticket) {
        return res.status(400).json({
          success: false,
          message: `Место ${seatId} не найдено`
        });
      }
      
      if (ticket.status !== 'available') {
        return res.status(400).json({
          success: false,
          message: `Место ${seatId} недоступно для заказа (статус: ${ticket.status})`
        });
      }
      
      // Проверяем, является ли это специальной зоной
      if (specialZoneData && specialZoneData[seatId]) {
        const requestedSeats = specialZoneData[seatId];
        
        console.log(`🎪 Обрабатываем специальную зону ${seatId}: запрошено ${requestedSeats} мест`);
        
        // Ищем доступные виртуальные билеты для этой специальной зоны
        const virtualTickets = session.tickets.filter(t => 
          t.seatId.startsWith(`${seatId}_seat_`) && t.status === 'available'
        );
        
        console.log(`🔍 Найдено виртуальных билетов: ${virtualTickets.length}`, 
          virtualTickets.map(t => ({ seatId: t.seatId, status: t.status }))
        );
        
        // Проверяем, достаточно ли виртуальных билетов
        if (virtualTickets.length < requestedSeats) {
          return res.status(400).json({
            success: false,
            message: `В специальной зоне ${seatId} доступно только ${virtualTickets.length} виртуальных мест, запрошено ${requestedSeats}`
          });
        }
        
        // Бронируем виртуальные билеты
        const selectedVirtualTickets = virtualTickets.slice(0, requestedSeats);
        selectedVirtualTickets.forEach(virtualTicket => {
          selectedTickets.push(virtualTicket);
        });
        
        console.log(`✅ Забронировано ${selectedVirtualTickets.length} виртуальных билетов:`, 
          selectedVirtualTickets.map(t => t.seatId)
        );
      } else {
        selectedTickets.push(ticket);
      }
    }
    
    // Рассчитываем сумму заказа
    let subtotal = 0;
    
    console.log('💰 Расчет subtotal:', {
      selectedTickets: selectedTickets.map(t => ({ seatId: t.seatId, price: t.price }))
    });
    
    // Все билеты (включая виртуальные)
    subtotal = selectedTickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0);
    
    console.log('💰 Итоговый subtotal:', { subtotal });
    let discount = 0;
    let promoCodeData = null;
    
    // Применяем промокод если указан
    if (promoCode && promoCode.trim()) {
      const promoValidation = await validatePromoCode(promoCode.trim(), subtotal);
      
      if (!promoValidation.valid) {
        return res.status(400).json({
          success: false,
          message: promoValidation.message
        });
      }
      
      discount = promoValidation.discount;
      promoCodeData = promoValidation.promoCodeData;
    }
    
    const total = subtotal - discount;
    
    // Создаем заказ без транзакций (для локальной MongoDB)
    let newOrder;
    
    try {
        // Создаем заказ с данными билетов
        console.log('🔍 Создаем ticketData для заказа:', {
          selectedTickets: selectedTickets.map(t => ({
            seatId: t.seatId,
            row: t.row,
            place: t.place,
            section: t.section,
            zone: t.zone,
            price: t.price
          }))
        });
        
        const orderData = {
          sessionId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim().toLowerCase(),
          ticketData: selectedTickets.map(ticket => ({
            seatId: ticket.seatId,
            row: ticket.row || 0,
            place: ticket.place || 0,
            zone: ticket.section || ticket.zone || 'Общая зона',
            price: ticket.price || 0,
            currency: ticket.currency || 'RUB',
            priceColor: ticket.priceColor || '#cccccc',
            x: ticket.x || 0,
            y: ticket.y || 0,
            width: ticket.width || 20,
            height: ticket.height || 20
          })),
          subtotal,
          discount,
          total,
          promoCode: promoCode ? promoCode.trim() : undefined,
          promoCodeId: promoCodeData ? promoCodeData._id : undefined,
          status: req.body.status || 'pending', // Используем переданный статус или pending по умолчанию
          attribution: attribution || {}, // UTM-метки для атрибуции
          widgetId: widgetId, // ID виджета
          isInvitation: isInvitation || false, // Флаг приглашения
          notes: notes ? notes.trim() : undefined // Примечания для приглашений
        };
        
        newOrder = await Order.create(orderData);
        console.log(`📋 Заказ создан со статусом: ${newOrder.status}`);
        
        // Если это приглашение или оплаченный офлайн заказ, генерируем билеты
        if (isInvitation || newOrder.status === 'paid') {
          try {
            const { generateTicketsForOrder } = require('../utils/ticketGenerator');
            await generateTicketsForOrder(newOrder._id);
            console.log(`✅ Билеты сгенерированы для заказа: ${newOrder._id}`);
            
            // Если это приглашение, обновляем статус на 'paid'
            if (isInvitation) {
              newOrder.status = 'paid';
              newOrder.paidAt = new Date();
              await newOrder.save();
              console.log(`✅ Статус заказа-приглашения обновлен на 'paid': ${newOrder._id}`);
            }
            // Для офлайн заказов статус уже установлен в 'paid'
          } catch (ticketError) {
            console.error('❌ Ошибка генерации билетов:', ticketError);
            // Не прерываем процесс создания заказа из-за ошибки генерации билетов
          }
        }
        
        // Резервируем билеты в сессии
        selectedTickets.forEach(ticket => {
          // Все билеты (включая виртуальные) резервируем одинаково
          ticket.status = 'reserved';
          // Для временных заказов используем время из заказа, иначе 15 минут
          ticket.reservedUntil = newOrder.expiresAt || new Date(Date.now() + 15 * 60 * 1000);
          ticket.orderId = newOrder._id;
          ticket.customerInfo = {
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim().toLowerCase()
          };
          
          console.log(`🔒 Забронирован билет: ${ticket.seatId}`);
        });
        
        await session.save();
        console.log(`💾 Сессия сохранена с обновленными capacity для специальных зон`);
        
        // Увеличиваем счетчик использования промокода
        if (promoCodeData) {
          await PromoCode.findByIdAndUpdate(
            promoCodeData._id,
            { $inc: { usageCount: 1 } }
          );
        }
    } catch (error) {
      console.error('❌ Ошибка при создании заказа:', error);
      throw error;
    }
    
    console.log(`✅ Заказ создан: ${newOrder._id}`);
    
    // Обновляем заказ из базы данных, чтобы получить актуальный статус
    const updatedOrder = await Order.findById(newOrder._id);
    
    // Форматируем ответ
    const formattedOrder = {
      id: updatedOrder._id,
      sessionId: updatedOrder.sessionId,
      customerName: updatedOrder.customerName,
      customerPhone: updatedOrder.customerPhone,
      customerEmail: updatedOrder.customerEmail,
      tickets: updatedOrder.ticketData,
      subtotal: updatedOrder.subtotal,
      discount: updatedOrder.discount,
      total: updatedOrder.total,
      promoCode: updatedOrder.promoCode,
      status: updatedOrder.status,
      orderNumber: updatedOrder.orderNumber,
      createdAt: updatedOrder.createdAt,
      expiresAt: updatedOrder.expiresAt,
      paidAt: updatedOrder.paidAt,
      isInvitation: updatedOrder.isInvitation
    };
    
    res.status(201).json({
      success: true,
      message: 'Заказ успешно создан',
      order: formattedOrder
    });
    
  } catch (error) {
    console.error('❌ Ошибка создания заказа:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании заказа',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/orders - Получить заказы (с аутентификацией)
router.get('/', authenticateToken, async (req, res) => {
  try {
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    const { page = 1, limit = 20, status, sessionId } = req.query;
    const skip = (page - 1) * limit;
    
    // Строим фильтр
    const filter = {};
    if (status) filter.status = status;
    if (sessionId) filter.sessionId = sessionId;
    
    console.log(`📋 Получение заказов:`, { filter, page, limit });
    
    const orders = await Order.find(filter)
      .populate('sessionId', 'date time eventId hallId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Order.countDocuments(filter);
    
    const formattedOrders = orders.map(order => ({
      id: order._id,
      sessionId: order.sessionId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      ticketsCount: order.ticketData ? order.ticketData.length : 0,
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      promoCode: order.promoCode,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt
    }));
    
    res.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения заказов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении заказов'
    });
  }
});

// GET /api/orders/:id - Получить заказ по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    console.log(`📋 Получение заказа: ${id}`);
    
    const order = await Order.findById(id)
      .populate('sessionId', 'date time eventId hallId');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден'
      });
    }
    
    const formattedOrder = {
      id: order._id,
      sessionId: order.sessionId,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      tickets: order.ticketData || [],
      subtotal: order.subtotal,
      discount: order.discount,
      total: order.total,
      promoCode: order.promoCode,
      status: order.status,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt
    };
    
    res.json({
      success: true,
      order: formattedOrder
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения заказа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении заказа'
    });
  }
});

// PATCH /api/orders/:id/status - Изменить статус заказа
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    console.log(`📝 Изменение статуса заказа ${id} на ${status}`);
    
    const allowedStatuses = ['pending', 'paid', 'cancelled', 'expired'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Недопустимый статус'
      });
    }
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден'
      });
    }
    
    // Обновляем заказ в транзакции
    const session_db = await mongoose.startSession();
    
    try {
      await session_db.withTransaction(async () => {
        // Обновляем статус заказа
        await Order.findByIdAndUpdate(
          id,
          { status },
          { session: session_db }
        );
        
        // Если заказ подтверждается, обновляем билеты в сессии
        if (status === 'paid') {
          const session = await Session.findById(order.sessionId);
          if (session) {
            // Помечаем билеты как проданные
            session.tickets.forEach(ticket => {
              if (ticket.orderId && ticket.orderId.toString() === id) {
                ticket.status = 'sold';
                delete ticket.reservedUntil;
              }
            });
            await session.save({ session: session_db });
          }
        }
        
        // Если заказ отменяется, освобождаем билеты
        if (status === 'cancelled' || status === 'expired') {
          const session = await Session.findById(order.sessionId);
          if (session) {
            // Освобождаем билеты
            session.tickets.forEach(ticket => {
              if (ticket.orderId && ticket.orderId.toString() === id) {
                ticket.status = 'available';
                delete ticket.orderId;
                delete ticket.reservedUntil;
                delete ticket.customerInfo;
              }
            });
            await session.save({ session: session_db });
          }
        }
      });
    } finally {
      await session_db.endSession();
    }
    
    console.log(`✅ Статус заказа обновлен: ${id} -> ${status}`);
    
    res.json({
      success: true,
      message: `Статус заказа изменен на ${status}`
    });
  } catch (error) {
    console.error('❌ Ошибка изменения статуса заказа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при изменении статуса заказа'
    });
  }
});

// POST /api/orders/:id/pay - Оплатить заказ
router.post('/:id/pay', async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'cash' } = req.body;
    
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    console.log(`💳 Оплата заказа: ${id}, метод: ${paymentMethod}`);
    
    const order = await Order.findById(id);
    if (!order) {
      console.log(`❌ Заказ не найден: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден'
      });
    }
    
    console.log(`📋 Статус заказа: ${order.status}, время истечения: ${order.expiresAt}`);
    
    if (order.status !== 'pending') {
      console.log(`❌ Заказ не может быть оплачен. Статус: ${order.status}`);
      return res.status(400).json({
        success: false,
        message: 'Заказ не может быть оплачен'
      });
    }
    
    // Проверяем, не истек ли заказ
    if (order.expiresAt < new Date()) {
      await Order.findByIdAndUpdate(id, { status: 'expired' });
      return res.status(400).json({
        success: false,
        message: 'Время оплаты заказа истекло'
      });
    }
    
    // Обновляем статус на "оплачен"
    const now = new Date();
    await Order.findByIdAndUpdate(id, { 
      status: 'paid', 
      paymentMethod,
      paidAt: now,
      updatedAt: now
    });
    
    // Обновляем билеты в сессии
    const session = await Session.findById(order.sessionId);
    if (session) {
      session.tickets.forEach(ticket => {
        if (ticket.orderId && ticket.orderId.toString() === id) {
          ticket.status = 'sold';
          ticket.soldAt = now;
          delete ticket.reservedUntil;
        }
      });
      await session.save();
    }
    
    // Генерируем PDF билеты
    try {
      const { generateTicketsForOrder } = require('../utils/ticketGenerator');
      await generateTicketsForOrder(id);
      console.log(`✅ Билеты сгенерированы для заказа: ${id}`);
    } catch (ticketError) {
      console.error('❌ Ошибка генерации билетов:', ticketError);
      // Не прерываем процесс оплаты из-за ошибки генерации билетов
    }
    
    console.log(`✅ Заказ оплачен: ${id}`);
    
    res.json({
      success: true,
      message: 'Заказ успешно оплачен'
    });
    
  } catch (error) {
    console.error('❌ Ошибка оплаты заказа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при оплате заказа'
    });
  }
});

// PATCH /api/orders/:id - Обновить заказ
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    console.log(`📝 Обновление заказа ${id}:`, updateData);
    
    // Находим заказ
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден'
      });
    }
    
    // Обновляем заказ
    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };
    
    // Если меняем статус с temporary на pending, обновляем время истечения
    if (updateData.status === 'pending' && order.status === 'temporary') {
      updateFields.expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 минут
    }
    
    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );
    
    console.log('✅ Заказ обновлен:', updatedOrder._id);
    
    res.json({
      success: true,
      order: updatedOrder,
      message: 'Заказ успешно обновлен'
    });
    
  } catch (error) {
    console.error('❌ Ошибка обновления заказа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении заказа',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/orders/cleanup-expired - Очистить истекшие заказы
router.post('/cleanup-expired', async (req, res) => {
  try {
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    console.log('🧹 Начинаем очистку истекших заказов...');
    
    const now = new Date();
    
    // Находим истекшие заказы
    const expiredOrders = await Order.find({
      status: { $in: ['temporary', 'pending'] },
      expiresAt: { $lt: now }
    });
    
    console.log(`📋 Найдено истекших заказов: ${expiredOrders.length}`);
    
    if (expiredOrders.length === 0) {
      return res.json({
        success: true,
        message: 'Истекших заказов не найдено',
        cleanedOrders: 0
      });
    }
    
    // Начинаем транзакцию
    const session_db = await mongoose.startSession();
    let cleanedCount = 0;
    
    try {
      await session_db.withTransaction(async () => {
        for (const order of expiredOrders) {
          // Меняем статус заказа на expired
          await Order.findByIdAndUpdate(
            order._id,
            { status: 'expired' },
            { session: session_db }
          );
          
          // Освобождаем места в сессии
          const session = await Session.findById(order.sessionId);
          if (session) {
            session.tickets.forEach(ticket => {
              if (ticket.orderId && ticket.orderId.toString() === order._id.toString()) {
                ticket.status = 'available';
                delete ticket.orderId;
                delete ticket.reservedUntil;
                delete ticket.customerInfo;
              }
            });
            await session.save({ session: session_db });
          }
          
          cleanedCount++;
          console.log(`✅ Заказ ${order._id} помечен как expired, места освобождены`);
        }
      });
    } finally {
      await session_db.endSession();
    }
    
    console.log(`🎉 Очистка завершена. Обработано заказов: ${cleanedCount}`);
    
    res.json({
      success: true,
      message: `Очищено истекших заказов: ${cleanedCount}`,
      cleanedOrders: cleanedCount
    });
    
  } catch (error) {
    console.error('❌ Ошибка очистки истекших заказов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при очистке истекших заказов',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;