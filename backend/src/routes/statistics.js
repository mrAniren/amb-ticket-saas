const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Session = require('../models/Session');
const currencyService = require('../services/currencyService');

// GET /api/statistics/sales - общая статистика продаж
router.get('/sales', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) {
        dateFilter.paidAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        dateFilter.paidAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Определяем формат группировки по дате
    let dateGroupFormat;
    switch (groupBy) {
      case 'hour':
        dateGroupFormat = {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' },
          day: { $dayOfMonth: '$paidAt' },
          hour: { $hour: '$paidAt' }
        };
        break;
      case 'day':
        dateGroupFormat = {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' },
          day: { $dayOfMonth: '$paidAt' }
        };
        break;
      case 'month':
        dateGroupFormat = {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' }
        };
        break;
      case 'year':
        dateGroupFormat = {
          year: { $year: '$paidAt' }
        };
        break;
      default:
        dateGroupFormat = {
          year: { $year: '$paidAt' },
          month: { $month: '$paidAt' },
          day: { $dayOfMonth: '$paidAt' }
        };
    }

    const salesStats = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: dateGroupFormat,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          avgOrderValue: { $avg: '$total' },
          suppliers: { $addToSet: '$supplier' }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          totalOrders: 1,
          totalRevenue: 1,
          totalTickets: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          suppliersCount: { $size: '$suppliers' }
        }
      }
    ]);

    console.log(`📊 Статистика продаж по ${groupBy}:`, salesStats.length, 'записей');

    res.json({
      success: true,
      data: {
        sales: salesStats,
        groupBy,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики продаж:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики продаж',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/statistics/suppliers - статистика по поставщикам
router.get('/suppliers', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) {
        dateFilter.paidAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        dateFilter.paidAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const supplierStats = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          ...dateFilter
        }
      },
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
      {
        $lookup: {
          from: 'events',
          localField: 'session.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $group: {
          _id: '$supplier',
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          avgOrderValue: { $avg: '$total' },
          firstSale: { $min: '$paidAt' },
          lastSale: { $max: '$paidAt' },
          events: {
            $push: {
              eventId: '$event._id',
              eventTitle: '$event.name',
              eventRevenue: '$total',
              eventTickets: { $size: '$ticketData' }
            }
          }
        }
      },
      {
        $addFields: {
          events: {
            $reduce: {
              input: '$events',
              initialValue: [],
              in: {
                $cond: {
                  if: { $in: ['$$this.eventId', '$$value.eventId'] },
                  then: {
                    $map: {
                      input: '$$value',
                      as: 'item',
                      in: {
                        $cond: {
                          if: { $eq: ['$$item.eventId', '$$this.eventId'] },
                          then: {
                            eventId: '$$item.eventId',
                            eventTitle: '$$item.eventTitle',
                            eventRevenue: { $add: ['$$item.eventRevenue', '$$this.eventRevenue'] },
                            eventTickets: { $add: ['$$item.eventTickets', '$$this.eventTickets'] }
                          },
                          else: '$$item'
                        }
                      }
                    }
                  },
                  else: { $concatArrays: ['$$value', ['$$this']] }
                }
              }
            }
          }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $project: {
          _id: 0,
          supplier: '$_id',
          totalOrders: 1,
          totalRevenue: 1,
          totalTickets: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          firstSale: 1,
          lastSale: 1,
          events: 1
        }
      }
    ]);

    console.log(`📊 Статистика по поставщикам:`, supplierStats.length, 'поставщиков');

    res.json({
      success: true,
      data: {
        suppliers: supplierStats,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики поставщиков:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики поставщиков',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/statistics/events - статистика по событиям
router.get('/events', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) {
        dateFilter.paidAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        dateFilter.paidAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const eventStats = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          ...dateFilter
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
      // Группируем по событиям
      {
        $group: {
          _id: '$event._id',
          eventTitle: { $first: '$event.name' },
          eventDescription: { $first: '$event.description' },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          avgOrderValue: { $avg: '$total' },
          sessions: {
            $push: {
              sessionId: '$session._id',
              sessionDate: '$session.date',
              sessionTime: '$session.time',
              hallName: '$hall.name',
              sessionRevenue: '$total',
              sessionTickets: { $size: '$ticketData' }
            }
          }
        }
      },
      {
        $addFields: {
          sessions: {
            $reduce: {
              input: '$sessions',
              initialValue: [],
              in: {
                $cond: {
                  if: { $in: ['$$this.sessionId', '$$value.sessionId'] },
                  then: {
                    $map: {
                      input: '$$value',
                      as: 'item',
                      in: {
                        $cond: {
                          if: { $eq: ['$$item.sessionId', '$$this.sessionId'] },
                          then: {
                            sessionId: '$$item.sessionId',
                            sessionDate: '$$item.sessionDate',
                            sessionTime: '$$item.sessionTime',
                            hallName: '$$item.hallName',
                            sessionRevenue: { $add: ['$$item.sessionRevenue', '$$this.sessionRevenue'] },
                            sessionTickets: { $add: ['$$item.sessionTickets', '$$this.sessionTickets'] }
                          },
                          else: '$$item'
                        }
                      }
                    }
                  },
                  else: { $concatArrays: ['$$value', ['$$this']] }
                }
              }
            }
          }
        }
      },
      {
        $sort: { totalRevenue: -1 }
      },
      {
        $project: {
          _id: 0,
          eventId: '$_id',
          eventTitle: 1,
          eventDescription: 1,
          totalOrders: 1,
          totalRevenue: 1,
          totalTickets: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          sessionsCount: { $size: '$sessions' },
          sessions: 1
        }
      }
    ]);

    console.log(`📊 Статистика по событиям:`, eventStats.length, 'событий');

    res.json({
      success: true,
      data: {
        events: eventStats,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики событий:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики событий',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/statistics/overview - общий обзор
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) {
        dateFilter.paidAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        dateFilter.paidAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    const overview = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          ...dateFilter
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          avgOrderValue: { $avg: '$total' },
          uniqueCustomers: { $addToSet: '$customerEmail' },
          suppliers: { $addToSet: '$supplier' },
          paymentMethods: { $addToSet: '$paymentMethod' }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: 1,
          totalTickets: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          uniqueCustomersCount: { $size: '$uniqueCustomers' },
          suppliersCount: { $size: '$suppliers' },
          paymentMethodsCount: { $size: '$paymentMethods' }
        }
      }
    ]);

    const result = overview[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalTickets: 0,
      avgOrderValue: 0,
      uniqueCustomersCount: 0,
      suppliersCount: 0,
      paymentMethodsCount: 0
    };

    console.log('📊 Общий обзор статистики:', result);

    res.json({
      success: true,
      data: {
        overview: result,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения общего обзора:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении общего обзора',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/statistics/attribution - статистика атрибуции
router.get('/attribution', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        // Начинаем с начала дня
        dateFilter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        // Заканчиваем в конце дня
        dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Получаем статистику атрибуции для всех типов заказов
    const attributionStats = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          ...dateFilter
        }
      },
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
      {
        $lookup: {
          from: 'events',
          localField: 'session.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $lookup: {
          from: 'halls',
          localField: 'session.hallId',
          foreignField: '_id',
          as: 'hall'
        }
      },
      {
        $unwind: '$hall'
      },
      {
        $addFields: {
          processedWidgetId: { $ifNull: ['$widgetId', 'offline'] },
          processedIsInvitation: { $ifNull: ['$isInvitation', false] },
          processedOrderType: {
            $cond: {
              if: { $eq: [{ $ifNull: ['$isInvitation', false] }, true] },
              then: 'invitation',
              else: {
                $cond: {
                  if: { $eq: [{ $ifNull: ['$widgetId', 'offline'] }, 'offline'] },
                  then: 'offline',
                  else: 'widget'
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            eventId: '$event._id',
            eventName: '$event.name',
            sessionId: '$session._id',
            sessionDate: '$session.date',
            sessionTime: '$session.time',
            hallName: '$hall.name',
            isInvitation: '$processedIsInvitation',
            orderType: '$processedOrderType',
            widgetId: '$processedWidgetId',
            utm_source: { $ifNull: ['$attribution.utm_source', 'без атрибуции'] },
            utm_medium: { $ifNull: ['$attribution.utm_medium', 'без атрибуции'] },
            utm_campaign: { $ifNull: ['$attribution.utm_campaign', 'без атрибуции'] },
            utm_content: { $ifNull: ['$attribution.utm_content', 'без атрибуции'] },
            utm_term: { $ifNull: ['$attribution.utm_term', 'без атрибуции'] }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          currency: { $first: '$hall.currency' }
        }
      },
      {
        $project: {
          _id: 0,
          eventId: '$_id.eventId',
          eventName: '$_id.eventName',
          sessionId: '$_id.sessionId',
          sessionDate: '$_id.sessionDate',
          sessionTime: '$_id.sessionTime',
          hallName: '$_id.hallName',
          widgetId: '$_id.widgetId',
          isInvitation: '$_id.isInvitation',
          orderType: '$_id.orderType',
          utm_source: '$_id.utm_source',
          utm_medium: '$_id.utm_medium',
          utm_campaign: '$_id.utm_campaign',
          utm_content: '$_id.utm_content',
          utm_term: '$_id.utm_term',
          totalOrders: 1,
          totalRevenue: 1,
          totalTickets: 1,
          currency: 1
        }
      },
      {
        $sort: {
          eventName: 1,
          sessionDate: 1,
          sessionTime: 1,
          utm_source: 1,
          utm_medium: 1,
          utm_campaign: 1,
          utm_content: 1,
          utm_term: 1
        }
      }
    ]);

    console.log(`📊 Получено записей атрибуции: ${attributionStats.length}`);

    res.json({
      success: true,
      data: {
        attribution: attributionStats
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики атрибуции:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики атрибуции',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/statistics/widgets - статистика виджетов
router.get('/widgets', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.paidAt = {};
      if (startDate) {
        dateFilter.paidAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        dateFilter.paidAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Получаем все сеансы с их виджетами
    const sessionsWithWidgets = await Session.aggregate([
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $lookup: {
          from: 'halls',
          localField: 'hallId',
          foreignField: '_id',
          as: 'hall'
        }
      },
      {
        $unwind: '$hall'
      },
      {
        $lookup: {
          from: 'widgets',
          localField: '_id',
          foreignField: 'sessionId',
          as: 'widgets'
        }
      },
      {
        $project: {
          _id: 1,
          eventTitle: '$event.name',
          sessionDate: '$date',
          sessionTime: '$time',
          hallName: '$hall.name',
          widgets: {
            _id: 1,
            name: 1,
            widgetId: 1
          }
        }
      }
    ]);

    // Для каждого сеанса получаем статистику по виджетам
    const widgetStats = await Promise.all(
      sessionsWithWidgets.map(async (session) => {
        const widgets = await Promise.all(
          session.widgets.map(async (widget) => {
            // Используем widgetId из виджета, а не _id
            const widgetId = widget.widgetId || (widget._id ? widget._id.toString() : widget.toString());
            
            // Получаем статистику заказов для этого виджета
            const ordersStats = await Order.aggregate([
              {
                $match: {
                  sessionId: session._id,
                  widgetId: widgetId,
                  status: 'paid',
                  ...dateFilter
                }
              },
              {
                $group: {
                  _id: null,
                  totalOrders: { $sum: 1 },
                  totalRevenue: { $sum: '$total' },
                  totalTickets: { $sum: { $size: '$ticketData' } }
                }
              }
            ]);

            const stats = ordersStats[0] || {
              totalOrders: 0,
              totalRevenue: 0,
              totalTickets: 0
            };

            return {
              widgetId: widget.widgetId || widgetId, // Используем widgetId из виджета
              widgetName: widget.name || undefined,
              totalOrders: stats.totalOrders,
              totalRevenue: stats.totalRevenue,
              totalTickets: stats.totalTickets
            };
          })
        );

        return {
          sessionId: session._id.toString(),
          eventTitle: session.eventTitle,
          sessionDate: session.sessionDate,
          sessionTime: session.sessionTime,
          hallName: session.hallName,
          widgets: widgets
        };
      })
    );

    console.log('📊 Статистика виджетов загружена:', widgetStats.length);

    res.json({
      success: true,
      data: {
        widgetStats: widgetStats,
        period: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики виджетов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики виджетов',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/statistics/session/:sessionId - статистика по конкретному сеансу
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    console.log(`📊 Получаем статистику для сеанса: ${sessionId}`);

    // Получаем статистику заказов для сеанса
    const sessionStats = await Order.aggregate([
      {
        $match: {
          sessionId: new mongoose.Types.ObjectId(sessionId),
          status: 'paid'
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          avgOrderValue: { $avg: '$total' }
        }
      },
      {
        $project: {
          _id: 0,
          totalOrders: 1,
          totalRevenue: 1,
          totalTickets: 1,
          avgOrderValue: { $round: ['$avgOrderValue', 2] },
          avgTicketsPerOrder: {
            $round: [
              { $divide: ['$totalTickets', '$totalOrders'] },
              1
            ]
          }
        }
      }
    ]);

    const result = sessionStats[0] || {
      totalOrders: 0,
      totalRevenue: 0,
      totalTickets: 0,
      avgOrderValue: 0,
      avgTicketsPerOrder: 1.5
    };

    console.log(`📊 Статистика сеанса ${sessionId}:`, result);

    res.json({
      success: true,
      data: {
        sessionId,
        stats: result
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики сеанса:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики сеанса',
      error: error.message
    });
  }
});

// GET /api/statistics/attribution-with-conversion - статистика атрибуции с конвертацией валют
router.get('/attribution-with-conversion', async (req, res) => {
  try {
    const { startDate, endDate, baseCurrency = 'KGS' } = req.query;

    // Построение фильтра по дате
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        // Начинаем с начала дня
        dateFilter.createdAt.$gte = new Date(startDate + 'T00:00:00.000Z');
      }
      if (endDate) {
        // Заканчиваем в конце дня
        dateFilter.createdAt.$lte = new Date(endDate + 'T23:59:59.999Z');
      }
    }

    // Инициализируем сервис валют
    await currencyService.initialize();

    // Получаем статистику атрибуции для всех типов заказов
    const attributionStats = await Order.aggregate([
      {
        $match: {
          status: 'paid',
          ...dateFilter
        }
      },
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
      {
        $lookup: {
          from: 'events',
          localField: 'session.eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      {
        $unwind: '$event'
      },
      {
        $lookup: {
          from: 'halls',
          localField: 'session.hallId',
          foreignField: '_id',
          as: 'hall'
        }
      },
      {
        $unwind: '$hall'
      },
      {
        $addFields: {
          processedWidgetId: { $ifNull: ['$widgetId', 'offline'] },
          processedIsInvitation: { $ifNull: ['$isInvitation', false] },
          processedOrderType: {
            $cond: {
              if: { $eq: [{ $ifNull: ['$isInvitation', false] }, true] },
              then: 'invitation',
              else: {
                $cond: {
                  if: { $eq: [{ $ifNull: ['$widgetId', 'offline'] }, 'offline'] },
                  then: 'offline',
                  else: 'widget'
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            eventId: '$event._id',
            eventName: '$event.name',
            sessionId: '$session._id',
            sessionDate: '$session.date',
            sessionTime: '$session.time',
            hallName: '$hall.name',
            isInvitation: '$processedIsInvitation',
            orderType: '$processedOrderType',
            widgetId: '$processedWidgetId',
            utm_source: { $ifNull: ['$attribution.utm_source', 'без атрибуции'] },
            utm_medium: { $ifNull: ['$attribution.utm_medium', 'без атрибуции'] },
            utm_campaign: { $ifNull: ['$attribution.utm_campaign', 'без атрибуции'] },
            utm_content: { $ifNull: ['$attribution.utm_content', 'без атрибуции'] },
            utm_term: { $ifNull: ['$attribution.utm_term', 'без атрибуции'] }
          },
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          totalTickets: { $sum: { $size: '$ticketData' } },
          currency: { $first: '$hall.currency' }
        }
      },
      {
        $project: {
          _id: 0,
          eventId: '$_id.eventId',
          eventName: '$_id.eventName',
          sessionId: '$_id.sessionId',
          sessionDate: '$_id.sessionDate',
          sessionTime: '$_id.sessionTime',
          hallName: '$_id.hallName',
          isInvitation: '$_id.isInvitation',
          orderType: '$_id.orderType',
          widgetId: '$_id.widgetId',
          utm_source: '$_id.utm_source',
          utm_medium: '$_id.utm_medium',
          utm_campaign: '$_id.utm_campaign',
          utm_content: '$_id.utm_content',
          utm_term: '$_id.utm_term',
          totalOrders: 1,
          totalRevenue: 1,
          totalTickets: 1,
          currency: 1
        }
      }
    ]);

    console.log(`📊 Получено записей атрибуции: ${attributionStats.length}`);

    // Конвертируем валюты
    const convertedStats = attributionStats.map(stat => {
      const convertedRevenue = currencyService.convertCurrency(
        stat.totalRevenue,
        stat.currency,
        baseCurrency
      );

      return {
        ...stat,
        originalRevenue: stat.totalRevenue,
        originalCurrency: stat.currency,
        totalRevenue: convertedRevenue,
        currency: baseCurrency
      };
    });

    res.json({
      success: true,
      data: {
        stats: convertedStats,
        baseCurrency,
        exchangeRates: currencyService.getRatesInfo()
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики атрибуции с конвертацией:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения статистики атрибуции'
    });
  }
});

module.exports = router;
