const express = require('express');
const router = express.Router();
const Ticket = require('../models/Ticket');
const Order = require('../models/Order');
const PDFGenerator = require('../utils/pdfGenerator');
const QRCodeGenerator = require('../utils/qrCodeGenerator');
const path = require('path');
const fs = require('fs').promises;

const pdfGenerator = new PDFGenerator();
const qrGenerator = new QRCodeGenerator();

/**
 * POST /api/tickets/generate
 * Генерирует билеты для заказа
 */
router.post('/generate', async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'ID заказа обязателен'
      });
    }

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

    // Проверяем, не сгенерированы ли уже билеты
    const existingTickets = await Ticket.find({ orderId });
    if (existingTickets.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Билеты для этого заказа уже сгенерированы'
      });
    }

    const session = order.sessionId;
    const event = session.eventId;
    const hall = session.hallId;

    // Генерируем билеты для каждого места
    const tickets = [];
    
    for (const seat of order.seats) {
      try {
        // Создаем билет в базе данных
        const ticket = new Ticket({
          orderId: order._id,
          sessionId: session._id,
          eventId: event._id,
          hallId: hall._id,
          seatId: seat.seatId,
          seatRow: seat.row,
          seatNumber: seat.place,
          seatSection: seat.section,
          price: seat.price,
          currency: seat.currency || 'RUB',
          buyerName: order.customerName,
          buyerEmail: order.customerEmail,
          buyerPhone: order.customerPhone,
          eventName: event.title,
          eventDate: session.date,
          eventTime: session.time,
          hallName: hall.name,
          hallAddress: hall.address,
          purchaseDate: order.createdAt,
          orderNumber: order.orderNumber,
          qrCode: `ticket://${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          pdfPath: '', // Будет заполнено после генерации PDF
          pdfGenerated: false
        });

        await ticket.save();

        // Генерируем PDF
        const pdfPath = await pdfGenerator.generateTicket({
          ticketId: ticket.ticketId,
          eventName: event.title,
          eventDate: session.date,
          eventTime: session.time,
          hallName: hall.name,
          hallAddress: hall.address,
          seatSection: seat.section,
          seatRow: seat.row,
          seatNumber: seat.place,
          price: seat.price,
          currency: seat.currency || 'RUB',
          buyerName: order.customerName,
          buyerEmail: order.customerEmail,
          purchaseDate: order.createdAt,
          orderNumber: order.orderNumber
        });

        // Обновляем путь к PDF
        ticket.pdfPath = pdfPath;
        ticket.pdfGenerated = true;
        await ticket.save();

        tickets.push(ticket);

        console.log(`✅ Билет создан: ${ticket.ticketId}`);

      } catch (error) {
        console.error(`❌ Ошибка создания билета для места ${seat.seatId}:`, error);
        // Продолжаем создание других билетов
      }
    }

    // Обновляем статус заказа
    order.ticketsGenerated = true;
    await order.save();

    res.json({
      success: true,
      message: `Создано билетов: ${tickets.length}`,
      data: {
        tickets: tickets.map(ticket => ({
          id: ticket._id,
          ticketId: ticket.ticketId,
          seatSection: ticket.seatSection,
          seatRow: ticket.seatRow,
          seatNumber: ticket.seatNumber,
          price: ticket.price,
          pdfGenerated: ticket.pdfGenerated
        }))
      }
    });

  } catch (error) {
    console.error('❌ Ошибка генерации билетов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка генерации билетов',
      error: error.message
    });
  }
});

/**
 * GET /api/tickets/order/:orderId
 * Получает все билеты заказа
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const tickets = await Ticket.findByOrderId(orderId);

    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Билеты для этого заказа не найдены'
      });
    }

    res.json({
      success: true,
      data: {
        tickets: tickets.map(ticket => ({
          id: ticket._id,
          ticketId: ticket.ticketId,
          seatSection: ticket.seatSection,
          seatRow: ticket.seatRow,
          seatNumber: ticket.seatNumber,
          price: ticket.price,
          currency: ticket.currency,
          eventName: ticket.eventName,
          eventDate: ticket.eventDate,
          eventTime: ticket.eventTime,
          hallName: ticket.hallName,
          buyerName: ticket.buyerName,
          pdfGenerated: ticket.pdfGenerated,
          status: ticket.status,
          createdAt: ticket.createdAt
        }))
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения билетов заказа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения билетов',
      error: error.message
    });
  }
});

/**
 * GET /api/tickets/:ticketId/download
 * Скачивает PDF билета
 */
router.get('/:ticketId/download', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Билет не найден'
      });
    }

    if (!ticket.pdfGenerated) {
      return res.status(400).json({
        success: false,
        message: 'PDF билета еще не сгенерирован'
      });
    }

    // Проверяем существование файла
    try {
      await fs.access(ticket.pdfPath);
      console.log('✅ PDF файл найден:', ticket.pdfPath);
    } catch (error) {
      console.error('❌ PDF файл не найден:', ticket.pdfPath);
      return res.status(404).json({
        success: false,
        message: 'PDF файл не найден'
      });
    }

    // Отправляем файл
    res.download(ticket.pdfPath, `ticket_${ticket.ticketId}.pdf`, (error) => {
      if (error) {
        console.error('❌ Ошибка скачивания PDF:', error);
        // Не отправляем JSON ответ, если заголовки уже отправлены
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Ошибка скачивания файла'
          });
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка скачивания билета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка скачивания билета',
      error: error.message
    });
  }
});

/**
 * GET /api/tickets/:ticketId
 * Получает информацию о билете
 */
router.get('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate('sessionId eventId hallId');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Билет не найден'
      });
    }

    res.json({
      success: true,
      data: {
        ticket: {
          id: ticket._id,
          ticketId: ticket.ticketId,
          orderId: ticket.orderId,
          seatSection: ticket.seatSection,
          seatRow: ticket.seatRow,
          seatNumber: ticket.seatNumber,
          price: ticket.price,
          currency: ticket.currency,
          eventName: ticket.eventName,
          eventDate: ticket.eventDate,
          eventTime: ticket.eventTime,
          hallName: ticket.hallName,
          hallAddress: ticket.hallAddress,
          buyerName: ticket.buyerName,
          buyerEmail: ticket.buyerEmail,
          purchaseDate: ticket.purchaseDate,
          orderNumber: ticket.orderNumber,
          pdfGenerated: ticket.pdfGenerated,
          status: ticket.status,
          qrCode: ticket.qrCode,
          createdAt: ticket.createdAt
        }
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения билета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения билета',
      error: error.message
    });
  }
});

/**
 * POST /api/tickets/:ticketId/regenerate
 * Перегенерирует PDF билета
 */
router.post('/:ticketId/regenerate', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId })
      .populate('sessionId eventId hallId');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Билет не найден'
      });
    }

    // Удаляем старый PDF если существует
    if (ticket.pdfPath) {
      try {
        await fs.unlink(ticket.pdfPath);
      } catch (error) {
        console.log('Старый PDF файл не найден или уже удален');
      }
    }

    // Генерируем новый PDF
    const pdfPath = await pdfGenerator.generateTicket({
      ticketId: ticket.ticketId,
      eventName: ticket.eventName,
      eventDate: ticket.eventDate,
      eventTime: ticket.eventTime,
      hallName: ticket.hallName,
      hallAddress: ticket.hallAddress,
      seatSection: ticket.seatSection,
      seatRow: ticket.seatRow,
      seatNumber: ticket.seatNumber,
      price: ticket.price,
      currency: ticket.currency,
      buyerName: ticket.buyerName,
      buyerEmail: ticket.buyerEmail,
      purchaseDate: ticket.purchaseDate,
      orderNumber: ticket.orderNumber
    });

    // Обновляем путь к PDF
    ticket.pdfPath = pdfPath;
    ticket.pdfGenerated = true;
    await ticket.save();

    res.json({
      success: true,
      message: 'PDF билета перегенерирован',
      data: {
        pdfPath: pdfPath
      }
    });

  } catch (error) {
    console.error('❌ Ошибка перегенерации билета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка перегенерации билета',
      error: error.message
    });
  }
});

/**
 * DELETE /api/tickets/:ticketId
 * Удаляет билет
 */
router.delete('/:ticketId', async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await Ticket.findOne({ ticketId });

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Билет не найден'
      });
    }

    // Удаляем PDF файл
    if (ticket.pdfPath) {
      try {
        await fs.unlink(ticket.pdfPath);
      } catch (error) {
        console.log('PDF файл не найден или уже удален');
      }
    }

    // Удаляем QR-код
    await qrGenerator.deleteQRCode(ticket.ticketId);

    // Удаляем билет из базы данных
    await Ticket.findByIdAndDelete(ticket._id);

    res.json({
      success: true,
      message: 'Билет удален'
    });

  } catch (error) {
    console.error('❌ Ошибка удаления билета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка удаления билета',
      error: error.message
    });
  }
});

/**
 * GET /api/tickets/stats
 * Получает статистику билетов
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const stats = await Ticket.getTicketStats();
    
    const totalTickets = await Ticket.countDocuments();
    const totalRevenue = await Ticket.aggregate([
      { $group: { _id: null, total: { $sum: '$price' } } }
    ]);

    res.json({
      success: true,
      data: {
        totalTickets,
        totalRevenue: totalRevenue[0]?.total || 0,
        byStatus: stats
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики билетов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка получения статистики',
      error: error.message
    });
  }
});

module.exports = router;
