const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const PDFGenerator = require('./pdfGenerator');

const pdfGenerator = new PDFGenerator();

/**
 * Генерирует билеты для заказа
 * @param {string} orderId - ID заказа
 * @returns {Promise<Object>} - Результат генерации
 */
async function generateTicketsForOrder(orderId) {
  try {

    // Находим заказ
    const order = await Order.findById(orderId)
      .populate('sessionId')
      .populate({
        path: 'sessionId',
        populate: {
          path: 'eventId hallId'
        }
      });

    if (!order) {
      throw new Error('Заказ не найден');
    }

    // Проверяем, не сгенерированы ли уже билеты
    const existingTickets = await Ticket.find({ orderId });
    if (existingTickets.length > 0) {
      return {
        success: true,
        message: 'Билеты уже сгенерированы',
        ticketsCount: existingTickets.length
      };
    }

    const session = order.sessionId;
    const event = session.eventId;
    const hall = session.hallId;


    // Генерируем билеты для каждого места
    const tickets = [];
    
    for (const orderSeat of order.ticketData) {
      try {
        // Находим соответствующее место в сессии
        const sessionSeat = session.tickets.find(ticket => ticket.seatId === orderSeat.seatId);
        
        if (!sessionSeat) {
          console.error(`Место ${orderSeat.seatId} не найдено в сессии`);
          continue;
        }

        // Определяем название секции из зон зала
        let sectionName = 'Общая зона';
        
        // Получаем зоны из seat_config напрямую
        let hallZones = [];
        try {
          if (hall.seat_config) {
            const seatConfig = JSON.parse(hall.seat_config);
            if (seatConfig.zones && Array.isArray(seatConfig.zones)) {
              hallZones = seatConfig.zones;
            }
          }
        } catch (e) {
        }
        
        if (sessionSeat.zoneId && hallZones.length > 0) {
          const zone = hallZones.find(z => z.id === sessionSeat.zoneId);
          if (zone && zone.name) {
            sectionName = zone.name;
          }
        } else if (sessionSeat.section) {
          sectionName = sessionSeat.section;
        } else if (sessionSeat.zone) {
          sectionName = sessionSeat.zone;
        } else if (sessionSeat.name) {
          sectionName = sessionSeat.name;
        }

        // Создаем билет в базе данных
        const ticket = new Ticket({
          orderId: order._id,
          sessionId: session._id,
          eventId: event._id,
          hallId: hall._id,
          seatId: sessionSeat.seatId,
          seatRow: sessionSeat.row,
          seatNumber: sessionSeat.place,
          seatSection: sectionName,
          price: sessionSeat.price,
          currency: sessionSeat.currency || 'RUB',
          buyerName: order.customerName,
          buyerEmail: order.customerEmail,
          buyerPhone: order.customerPhone,
          eventName: event?.title || event?.name || 'Мероприятие',
          eventDate: session?.date || new Date(),
          eventTime: session?.time || '19:00',
          hallName: hall?.name || 'Зал',
          hallAddress: hall?.address || '',
          purchaseDate: order.paidAt || order.createdAt,
          orderNumber: order.orderNumber || order._id.toString(),
          // qrCode будет сгенерирован автоматически в модели Ticket
          pdfPath: '', // Будет заполнено после генерации PDF
          pdfGenerated: false,
          isInvitation: order.isInvitation || false // Флаг приглашения
        });

        await ticket.save();

        // Генерируем PDF
        const pdfPath = await pdfGenerator.generateTicket({
          ticketId: ticket.ticketId,
          eventName: event?.title || event?.name || 'Мероприятие',
          eventDate: session?.date || new Date(),
          eventTime: session?.time || '19:00',
          hallName: hall?.name || 'Зал',
          hallAddress: hall?.address || '',
          seatSection: sectionName,
          seatRow: sessionSeat.row,
          seatNumber: sessionSeat.place,
          seatId: sessionSeat.seatId, // Добавляем seatId для определения типа места
          price: sessionSeat.price,
          currency: sessionSeat.currency || 'RUB',
          buyerName: order.customerName,
          buyerEmail: order.customerEmail,
          purchaseDate: order.paidAt || order.createdAt,
          orderNumber: order.orderNumber || order._id.toString(),
          isInvitation: order.isInvitation || false, // Флаг приглашения
          notes: order.notes || '' // Примечания для приглашений
        });

        // Обновляем путь к PDF
        ticket.pdfPath = pdfPath;
        ticket.pdfGenerated = true;
        await ticket.save();

        tickets.push(ticket);


      } catch (error) {
        console.error(`Ошибка создания билета для места ${sessionSeat.seatId}:`, error);
        // Продолжаем создание других билетов
      }
    }

    // Обновляем статус заказа
    order.ticketsGenerated = true;
    await order.save();


    return {
      success: true,
      message: `Создано билетов: ${tickets.length}`,
      ticketsCount: tickets.length,
      tickets: tickets.map(ticket => ({
        id: ticket._id,
        ticketId: ticket.ticketId,
        seatSection: ticket.seatSection,
        seatRow: ticket.seatRow,
        seatNumber: ticket.seatNumber,
        price: ticket.price,
        pdfGenerated: ticket.pdfGenerated
      }))
    };

  } catch (error) {
    console.error('Ошибка генерации билетов для заказа:', error);
    throw new Error(`Не удалось сгенерировать билеты: ${error.message}`);
  }
}

/**
 * Перегенерирует билеты для заказа
 * @param {string} orderId - ID заказа
 * @returns {Promise<Object>} - Результат перегенерации
 */
async function regenerateTicketsForOrder(orderId) {
  try {

    // Удаляем существующие билеты
    const existingTickets = await Ticket.find({ orderId });
    for (const ticket of existingTickets) {
      try {
        await pdfGenerator.deleteTicket(ticket.ticketId);
        await Ticket.findByIdAndDelete(ticket._id);
      } catch (error) {
        console.error(`Ошибка удаления билета ${ticket.ticketId}:`, error);
      }
    }

    // Генерируем новые билеты
    return await generateTicketsForOrder(orderId);

  } catch (error) {
    console.error('Ошибка перегенерации билетов:', error);
    throw new Error(`Не удалось перегенерировать билеты: ${error.message}`);
  }
}

/**
 * Получает билеты заказа
 * @param {string} orderId - ID заказа
 * @returns {Promise<Array>} - Массив билетов
 */
async function getTicketsForOrder(orderId) {
  try {
    const tickets = await Ticket.findByOrderId(orderId);
    return tickets;
  } catch (error) {
    console.error('Ошибка получения билетов заказа:', error);
    throw new Error(`Не удалось получить билеты: ${error.message}`);
  }
}

/**
 * Удаляет билеты заказа
 * @param {string} orderId - ID заказа
 * @returns {Promise<boolean>} - Успешность удаления
 */
async function deleteTicketsForOrder(orderId) {
  try {

    const tickets = await Ticket.find({ orderId });
    let deletedCount = 0;

    for (const ticket of tickets) {
      try {
        await pdfGenerator.deleteTicket(ticket.ticketId);
        await Ticket.findByIdAndDelete(ticket._id);
        deletedCount++;
      } catch (error) {
        console.error(`Ошибка удаления билета ${ticket.ticketId}:`, error);
      }
    }

    // Обновляем статус заказа
    await Order.findByIdAndUpdate(orderId, { ticketsGenerated: false });

    return true;

  } catch (error) {
    console.error('❌ Ошибка удаления билетов заказа:', error);
    return false;
  }
}

/**
 * Проверяет, сгенерированы ли билеты для заказа
 * @param {string} orderId - ID заказа
 * @returns {Promise<boolean>} - Статус генерации
 */
async function areTicketsGenerated(orderId) {
  try {
    const order = await Order.findById(orderId);
    return order ? order.ticketsGenerated : false;
  } catch (error) {
    console.error('❌ Ошибка проверки статуса билетов:', error);
    return false;
  }
}

/**
 * Добавляет билеты в сессию при её создании
 * @param {Object} session - Объект сессии
 * @param {Object} hall - Объект зала
 * @param {Object} priceScheme - Объект распаесовки
 * @returns {Promise<void>}
 */
async function addTicketsToSession(session, hall, priceScheme) {
  try {
    const tickets = [];
    
    // Получаем места из зала
    const hallSeats = hall.seats || [];
    
    // Создаем билеты для каждого места
    for (const seat of hallSeats) {
      if (seat.objectType === 'seat') {
        // Обычное место
        const ticket = createTicketForSeat(session, hall, seat, priceScheme);
        tickets.push(ticket);
      } else if (seat.objectType === 'special_zone') {
        // Спец зона - создаем виртуальные места
        const capacity = seat.capacity || 1;
        
        for (let i = 1; i < capacity; i++) {
          const virtualSeatId = `${seat.id}_seat_${i}`;
          const virtualTicket = createTicketForVirtualSeat(session, hall, seat, virtualSeatId, i, priceScheme);
          tickets.push(virtualTicket);
        }
        
        // Добавляем сам объект спец зоны как последнее место
        const mainTicket = createTicketForSeat(session, hall, seat, priceScheme);
        tickets.push(mainTicket);
      }
    }
    
    // Сохраняем билеты в сессию
    session.tickets = tickets;
    session.totalTickets = tickets.length;
    session.ticketsSold = 0;
    
    await session.save();
  } catch (error) {
    console.error('❌ Ошибка добавления билетов в сессию:', error);
    throw new Error(`Не удалось добавить билеты в сессию: ${error.message}`);
  }
}

/**
 * Создает билет для обычного места
 */
function createTicketForSeat(session, hall, seat, priceScheme) {
  // Находим цену для этого места
  const seatPrice = priceScheme.seatPrices.find(sp => sp.seatId === seat.id);
  const price = seatPrice ? priceScheme.prices.find(p => p.id === seatPrice.priceId) : null;
  
  // Определяем название секции из зон зала
  let sectionName = 'Общая зона';
  
  // Получаем зоны из hall.zone_config
  let hallZones = [];
  try {
    if (hall.zone_config) {
      const zoneConfig = JSON.parse(hall.zone_config);
      if (zoneConfig.zones && Array.isArray(zoneConfig.zones)) {
        hallZones = zoneConfig.zones;
      }
    }
  } catch (e) {
    // Игнорируем ошибки парсинга
  }
  
  // Ищем зону по ID и берем название
  if (seat.zone && hallZones.length > 0) {
    const zone = hallZones.find(z => z.id === seat.zone);
    if (zone && zone.name) {
      sectionName = zone.name;
    }
  } else if (seat.zoneId && hallZones.length > 0) {
    const zone = hallZones.find(z => z.id === seat.zoneId);
    if (zone && zone.name) {
      sectionName = zone.name;
    }
  }
  
  return {
    id: `${session._id}_${seat.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    seatId: seat.id,
    row: seat.row || 0,
    place: seat.place || seat.seatNumber || 0,
    section: sectionName,
    x: seat.x || 0,
    y: seat.y || 0,
    width: seat.width || 20,
    height: seat.height || 20,
    price: price ? price.value : 0,
    currency: price ? price.currency : hall.currency || 'RUB',
    priceColor: price ? price.color : '#cccccc',
    status: 'available',
    reservedUntil: null,
    orderId: null,
    soldAt: null,
    customerInfo: {},
    // Добавляем поля для специальных зон
    objectType: seat.objectType || 'seat',
    capacity: seat.capacity || (seat.objectType === 'special_zone' ? 1 : undefined)
  };
}

/**
 * Создает билет для виртуального места спец зоны
 */
function createTicketForVirtualSeat(session, hall, seat, virtualSeatId, virtualIndex, priceScheme) {
  // Находим цену для основного места спец зоны
  const seatPrice = priceScheme.seatPrices.find(sp => sp.seatId === seat.id);
  const price = seatPrice ? priceScheme.prices.find(p => p.id === seatPrice.priceId) : null;
  
  // Определяем название секции для виртуального места из зон зала
  let sectionName = 'Спец зона';
  
  // Получаем зоны из hall.zone_config
  let hallZones = [];
  try {
    if (hall.zone_config) {
      const zoneConfig = JSON.parse(hall.zone_config);
      if (zoneConfig.zones && Array.isArray(zoneConfig.zones)) {
        hallZones = zoneConfig.zones;
      }
    }
  } catch (e) {
    // Игнорируем ошибки парсинга
  }
  
  // Ищем зону по ID и берем название
  if (seat.zone && hallZones.length > 0) {
    const zone = hallZones.find(z => z.id === seat.zone);
    if (zone && zone.name) {
      sectionName = zone.name;
    }
  } else if (seat.zoneId && hallZones.length > 0) {
    const zone = hallZones.find(z => z.id === seat.zoneId);
    if (zone && zone.name) {
      sectionName = zone.name;
    }
  }
  
  return {
    id: `${session._id}_${virtualSeatId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    seatId: virtualSeatId,
    row: seat.row || 0,
    place: virtualIndex,
    section: sectionName,
    x: seat.x || 0,
    y: seat.y || 0,
    width: seat.width || 20,
    height: seat.height || 20,
    price: price ? price.value : 0,
    currency: price ? price.currency : hall.currency || 'RUB',
    priceColor: price ? price.color : '#cccccc',
    status: 'available',
    reservedUntil: null,
    orderId: null,
    soldAt: null,
    customerInfo: {},
    // Добавляем поля для виртуальных мест
    objectType: 'virtual_seat',
    parentSeatId: seat.id,
    capacity: 1 // Виртуальные места всегда имеют capacity = 1
  };
}

module.exports = {
  generateTicketsForOrder,
  regenerateTicketsForOrder,
  getTicketsForOrder,
  deleteTicketsForOrder,
  areTicketsGenerated,
  addTicketsToSession
};