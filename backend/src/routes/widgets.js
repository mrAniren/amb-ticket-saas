const express = require('express');
const router = express.Router();
const Widget = require('../models/Widget');
const Session = require('../models/Session');
const Order = require('../models/Order');

// GET /api/widgets - получить список всех виджетов
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, sessionId, isActive } = req.query;

    // Построение фильтра
    const filter = {};
    if (sessionId) filter.sessionId = sessionId;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const widgets = await Widget.find(filter)
      .populate('sessionId', 'date time eventId hallId')
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'eventId', select: 'name description' },
          { path: 'hallId', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCount = await Widget.countDocuments(filter);
    const totalPages = Math.ceil(totalCount / limit);


    res.json({
      success: true,
      data: {
        widgets,
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
    console.error('❌ Ошибка получения виджетов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении виджетов',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/widgets - создать новый виджет
router.post('/', async (req, res) => {
  try {
    const { name, sessionId, displayMode = 'embedded', settings = {}, domains = [] } = req.body;

    // Валидация
    if (!name || !sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Название и сеанс обязательны'
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

    // Создаем виджет
    const widget = new Widget({
      name: name.trim(),
      sessionId,
      settings: {
        ...settings,
        displayMode
      },
      domains: domains.filter(domain => domain && domain.trim())
    });

    await widget.save();

    // Загружаем виджет с populate для ответа
    const populatedWidget = await Widget.findById(widget._id)
      .populate('sessionId', 'date time eventId hallId')
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'eventId', select: 'name description' },
          { path: 'hallId', select: 'name' }
        ]
      });


    res.status(201).json({
      success: true,
      data: {
        widget: populatedWidget
      }
    });

  } catch (error) {
    console.error('❌ Ошибка создания виджета:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Виджет с таким ID уже существует'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Ошибка при создании виджета',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/widgets/:widgetId - получить виджет по ID
router.get('/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;

    const widget = await Widget.findOne({ widgetId })
      .populate('sessionId', 'date time eventId hallId tickets')
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'eventId', select: 'name description' },
          { path: 'hallId', select: 'name capacity' }
        ]
      });

    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }


    res.json({
      success: true,
      data: {
        widget
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения виджета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении виджета',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/widgets/:widgetId - обновить виджет
router.put('/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { name, settings, domains, isActive } = req.body;

    const widget = await Widget.findOne({ widgetId });
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }

    // Обновляем поля
    if (name !== undefined) widget.name = name.trim();
    if (settings !== undefined) {
      widget.settings = {
        ...widget.settings.toObject(),
        ...settings
      };
    }
    if (domains !== undefined) {
      widget.domains = domains.filter(domain => domain && domain.trim());
    }
    if (isActive !== undefined) widget.isActive = isActive;

    await widget.save();

    // Загружаем обновленный виджет с populate
    const updatedWidget = await Widget.findById(widget._id)
      .populate('sessionId', 'date time eventId hallId')
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'eventId', select: 'name description' },
          { path: 'hallId', select: 'name' }
        ]
      });


    res.json({
      success: true,
      data: {
        widget: updatedWidget
      }
    });

  } catch (error) {
    console.error('❌ Ошибка обновления виджета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении виджета',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// DELETE /api/widgets/:widgetId - удалить виджет
router.delete('/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;

    const widget = await Widget.findOneAndDelete({ widgetId });
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }


    res.json({
      success: true,
      message: 'Виджет успешно удален'
    });

  } catch (error) {
    console.error('❌ Ошибка удаления виджета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении виджета',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/widgets/:widgetId/stats/view - зафиксировать просмотр
router.post('/:widgetId/stats/view', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { referrer, userAgent } = req.body;

    const widget = await Widget.findByWidgetId(widgetId);
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }

    // Проверка домена (если настроен whitelist)
    if (widget.domains.length > 0 && referrer) {
      const referrerDomain = new URL(referrer).hostname;
      const isAllowed = widget.domains.some(domain => 
        referrerDomain === domain || referrerDomain.endsWith('.' + domain)
      );
      
      if (!isAllowed) {
        return res.status(403).json({
          success: false,
          message: 'Домен не разрешен для использования виджета'
        });
      }
    }

    await widget.incrementViews();


    res.json({
      success: true,
      message: 'Просмотр зафиксирован'
    });

  } catch (error) {
    console.error('❌ Ошибка фиксации просмотра:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при фиксации просмотра',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/widgets/:widgetId/stats/click - зафиксировать клик
router.post('/:widgetId/stats/click', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { referrer } = req.body;

    const widget = await Widget.findByWidgetId(widgetId);
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }

    await widget.incrementClicks();


    res.json({
      success: true,
      message: 'Клик зафиксирован'
    });

  } catch (error) {
    console.error('❌ Ошибка фиксации клика:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при фиксации клика',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/widgets/:widgetId/stats/conversion - зафиксировать конверсию
router.post('/:widgetId/stats/conversion', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'ID заказа и сумма обязательны'
      });
    }

    const widget = await Widget.findByWidgetId(widgetId);
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }

    // Проверяем существование заказа
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Заказ не найден'
      });
    }

    await widget.recordConversion(orderId, amount);


    res.json({
      success: true,
      message: 'Конверсия зафиксирована'
    });

  } catch (error) {
    console.error('❌ Ошибка фиксации конверсии:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при фиксации конверсии',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/widgets/:widgetId/stats - получить статистику виджета
router.get('/:widgetId/stats', async (req, res) => {
  try {
    const { widgetId } = req.params;
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const widget = await Widget.findByWidgetId(widgetId);
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }

    // Фильтрация дневной статистики по датам
    let dailyStats = widget.statistics.dailyStats;
    if (startDate || endDate) {
      dailyStats = dailyStats.filter(stat => {
        const statDate = stat.date;
        if (startDate && statDate < new Date(startDate)) return false;
        if (endDate && statDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Группировка статистики
    let groupedStats = dailyStats;
    if (groupBy === 'month') {
      const monthlyStats = {};
      dailyStats.forEach(stat => {
        const key = `${stat.date.getFullYear()}-${stat.date.getMonth() + 1}`;
        if (!monthlyStats[key]) {
          monthlyStats[key] = {
            period: key,
            views: 0,
            clicks: 0,
            conversions: 0,
            revenue: 0
          };
        }
        monthlyStats[key].views += stat.views;
        monthlyStats[key].clicks += stat.clicks;
        monthlyStats[key].conversions += stat.conversions;
        monthlyStats[key].revenue += stat.revenue;
      });
      groupedStats = Object.values(monthlyStats);
    }

    const stats = {
      overview: {
        totalViews: widget.statistics.views,
        totalClicks: widget.statistics.clicks,
        totalConversions: widget.statistics.conversions,
        totalRevenue: widget.statistics.totalRevenue,
        ctr: widget.ctr,
        conversionRate: widget.conversionRate,
        averageOrderValue: widget.averageOrderValue,
        lastViewed: widget.statistics.lastViewed,
        lastClicked: widget.statistics.lastClicked
      },
      timeline: groupedStats,
      period: { startDate, endDate, groupBy }
    };


    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('❌ Ошибка получения статистики виджета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении статистики виджета',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
