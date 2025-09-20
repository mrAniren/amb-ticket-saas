const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Session = require('../models/Session');
const Ticket = require('../models/Ticket');

// GET /api/customers - получить список всех клиентов
router.get('/', async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 50, sortBy = 'paidAt', sortOrder = 'desc', orderNumber, ticketNumber } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) {
        // Начинаем с начала дня
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.paidAt.$gte = start;
      }
      if (endDate) {
        // Заканчиваем в конце дня
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.paidAt.$lte = end;
      }
    }

    // Построение фильтра по номеру заказа
    const orderNumberFilter = {};
    if (orderNumber) {
      orderNumberFilter.orderNumber = { $regex: orderNumber, $options: 'i' };
    }

    // Построение фильтра по номеру билета
    let ticketNumberFilter = {};
    if (ticketNumber) {
      // Если ищем по номеру билета, нужно найти заказы, которые содержат билеты с таким номером
      const ticketsWithNumber = await Ticket.find({
        ticketId: { $regex: ticketNumber, $options: 'i' }
      }).select('orderId');
      
      const orderIds = ticketsWithNumber.map(ticket => ticket.orderId);
      if (orderIds.length > 0) {
        ticketNumberFilter._id = { $in: orderIds };
      } else {
        // Если билеты не найдены, возвращаем пустой результат
        ticketNumberFilter._id = { $in: [] };
      }
    }

    // Агрегация для получения данных о клиентах
    const aggregationPipeline = [
      // Фильтруем только оплаченные заказы
      {
        $match: {
          status: 'paid',
          ...dateFilter,
          ...orderNumberFilter,
          ...ticketNumberFilter
        }
      },
      // Получаем данные о сессии
      {
        $lookup: {
          from: 'sessions',
          localField: 'sessionId',
          foreignField: '_id',
          as: 'session'
        }
      },
      {
        $unwind: '$session'
      },
      // Получаем данные о событии
      {
        $lookup: {
          from: 'events',
          localField: 'session.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: { path: '$event', preserveNullAndEmptyArrays: true }
      },
      // Получаем данные о зале
      {
        $lookup: {
          from: 'halls',
          localField: 'session.hallId',
          foreignField: '_id',
          as: 'hall'
        }
      },
      {
        $unwind: { path: '$hall', preserveNullAndEmptyArrays: true }
      },
      // Формируем итоговый документ
      {
        $project: {
          _id: 1,
          orderNumber: 1,
          customerName: 1,
          customerEmail: 1,
          customerPhone: 1,
          total: { $sum: '$ticketData.price' },
          currency: '$hall.currency',
          paidAt: 1,
          paymentMethod: 1,
          supplier: 1,
          ticketCount: { $size: '$ticketData' },
          sessionInfo: {
            id: '$session._id',
            date: '$session.date',
            time: '$session.time',
            eventTitle: '$event.name',
            hallName: '$hall.name'
          }
        }
      },
      // Сортировка
      {
        $sort: {
          [sortBy]: sortOrder === 'desc' ? -1 : 1
        }
      }
    ];

    // Подсчет общего количества
    const totalCountPipeline = [
      ...aggregationPipeline.slice(0, -1), // Все кроме сортировки
      { $count: 'total' }
    ];

    const [customers, totalCountResult] = await Promise.all([
      Order.aggregate([
        ...aggregationPipeline,
        { $skip: (page - 1) * limit },
        { $limit: parseInt(limit) }
      ]),
      Order.aggregate(totalCountPipeline)
    ]);

    const totalCount = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCount / limit);

    console.log(`📋 Получено клиентов: ${customers.length} из ${totalCount}`);

    res.json({
      success: true,
      data: {
        customers,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCount,
          limit: parseInt(limit),
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения списка клиентов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении списка клиентов',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/customers/stats - получить общую статистику клиентов
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) {
        dateFilter.paidAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.paidAt.$lte = new Date(endDate);
      }
    }

    const stats = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalCustomers: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          avgOrderValue: { $avg: '$total' },
          uniqueCustomers: { $addToSet: '$customerEmail' }
        }
      },
      {
        $project: {
          _id: 0,
          totalCustomers: 1,
          totalRevenue: 1,
          totalTickets: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          uniqueCustomersCount: { $size: '$uniqueCustomers' }
        }
      }
    ]);

    const result = stats[0] || {
      totalCustomers: 0,
      totalRevenue: 0,
      totalTickets: 0,
      avgOrderValue: 0,
      uniqueCustomersCount: 0
    };

    console.log('📊 Статистика клиентов:', result);

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики клиентов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики клиентов',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/customers/:orderId/tickets - получить билеты заказа
router.get('/:orderId/tickets', async (req, res) => {
  try {
    const { orderId } = req.params;

    console.log(`🎫 Получаем билеты для заказа: ${orderId}`);

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
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден'
      });
    }

    // Получаем билеты заказа
    const tickets = await Ticket.find({ orderId })
      .sort({ createdAt: 1 });

    console.log(`✅ Найдено билетов: ${tickets.length}`);

    res.json({
      success: true,
      data: {
        order: {
          _id: order._id,
          orderNumber: order.orderNumber,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          customerPhone: order.customerPhone,
          total: order.total,
          paidAt: order.paidAt,
          sessionInfo: {
            id: order.sessionId._id,
            date: order.sessionId.date,
            time: order.sessionId.time,
            eventTitle: order.sessionId.eventId?.title || order.sessionId.eventId?.name,
            hallName: order.sessionId.hallId?.name
          }
        },
        tickets: tickets.map(ticket => ({
          _id: ticket._id,
          ticketId: ticket.ticketId,
          seatRow: ticket.seatRow,
          seatNumber: ticket.seatNumber,
          seatSection: ticket.seatSection,
          price: ticket.price,
          currency: ticket.currency,
          pdfGenerated: ticket.pdfGenerated
        }))
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения билетов заказа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении билетов заказа',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
