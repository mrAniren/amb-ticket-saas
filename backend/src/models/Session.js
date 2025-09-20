const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: [true, 'ID мероприятия обязателен']
  },
  hallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hall',
    required: [true, 'ID зала обязателен']
  },
  priceSchemeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PriceScheme',
    required: [true, 'ID распоясовки обязателен']
  },
  date: {
    type: Date,
    required: [true, 'Дата сеанса обязательна']
  },
  time: {
    type: String,
    required: [true, 'Время сеанса обязательно'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Некорректный формат времени (HH:MM)']
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  // Новая архитектура - все билеты сразу в сеансе
  tickets: [{
    id: {
      type: String,
      required: true
    },
    seatId: {
      type: String,
      required: true
    },
    row: {
      type: Number,
      required: true
    },
    place: {
      type: Number,
      required: true
    },
    section: {
      type: String
    },
    x: {
      type: Number,
      required: true
    },
    y: {
      type: Number,
      required: true
    },
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'RUB'
    },
    priceColor: {
      type: String,
      default: '#cccccc'
    },
    status: {
      type: String,
      enum: ['available', 'reserved', 'sold', 'locked'],
      default: 'available'
    },
    reservedUntil: {
      type: Date
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    soldAt: {
      type: Date
    },
    customerInfo: {
      name: String,
      email: String,
      phone: String
    }
  }],
  metadata: {
    totalSeats: {
      type: Number,
      default: 0
    },
    availableSeats: {
      type: Number,
      default: 0
    },
    reservedSeats: {
      type: Number,
      default: 0
    },
    soldSeats: {
      type: Number,
      default: 0
    },
    lockedSeats: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastBookingUpdate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Индексы
sessionSchema.index({ eventId: 1 });
sessionSchema.index({ hallId: 1 });
sessionSchema.index({ priceSchemeId: 1 });
sessionSchema.index({ date: 1, time: 1 });
sessionSchema.index({ status: 1 });
sessionSchema.index({ isActive: 1 });
sessionSchema.index({ isArchived: 1 });
sessionSchema.index({ 'tickets.seatId': 1 });
sessionSchema.index({ 'tickets.status': 1 });
sessionSchema.index({ 'tickets.id': 1 });

// Виртуальные поля
sessionSchema.virtual('event', {
  ref: 'Event',
  localField: 'eventId',
  foreignField: '_id',
  justOne: true
});

sessionSchema.virtual('hall', {
  ref: 'Hall',
  localField: 'hallId',
  foreignField: '_id',
  justOne: true
});

sessionSchema.virtual('priceScheme', {
  ref: 'PriceScheme',
  localField: 'priceSchemeId',
  foreignField: '_id',
  justOne: true
});

sessionSchema.virtual('dateTime').get(function() {
  const dateStr = this.date.toISOString().split('T')[0];
  return `${dateStr}T${this.time}:00`;
});

// Методы для работы с билетами (новая архитектура)
sessionSchema.methods.reserveTickets = function(ticketIds, customerInfo, expirationMinutes = 15) {
  const now = new Date();
  const reservedUntil = new Date(now.getTime() + expirationMinutes * 60 * 1000);
  
  for (const ticketId of ticketIds) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    
    if (!ticket) {
      throw new Error(`Билет ${ticketId} не найден`);
    }
    
    if (ticket.status !== 'available') {
      throw new Error(`Билет ${ticketId} недоступен для резервирования`);
    }
    
    ticket.status = 'reserved';
    ticket.reservedUntil = reservedUntil;
    ticket.customerInfo = customerInfo;
  }
  
  this.updateMetadata();
  return this.save();
};

sessionSchema.methods.sellTickets = function(ticketIds, orderId) {
  for (const ticketId of ticketIds) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    
    if (!ticket) {
      throw new Error(`Билет ${ticketId} не найден`);
    }
    
    if (ticket.status !== 'reserved') {
      throw new Error(`Билет ${ticketId} не зарезервирован`);
    }
    
    // Проверяем, не истек ли резерв
    if (ticket.reservedUntil && ticket.reservedUntil < new Date()) {
      throw new Error(`Резерв билета ${ticketId} истек`);
    }
    
    ticket.status = 'sold';
    ticket.orderId = orderId;
    ticket.reservedUntil = null;
  }
  
  this.updateMetadata();
  return this.save();
};

sessionSchema.methods.cancelReservation = function(ticketIds) {
  for (const ticketId of ticketIds) {
    const ticket = this.tickets.find(t => t.id === ticketId);
    
    if (ticket && ticket.status === 'reserved') {
      ticket.status = 'available';
      ticket.reservedUntil = null;
      ticket.customerInfo = {};
    }
  }
  
  this.updateMetadata();
  return this.save();
};

sessionSchema.methods.updateMetadata = function() {
  const now = new Date();
  
  // Очищаем истекшие резервы
  this.tickets.forEach(ticket => {
    if (ticket.status === 'reserved' && ticket.reservedUntil && ticket.reservedUntil < now) {
      ticket.status = 'available';
      ticket.reservedUntil = null;
      ticket.customerInfo = {};
    }
  });
  
  // Подсчитываем статистику
  const available = this.tickets.filter(t => t.status === 'available').length;
  const reserved = this.tickets.filter(t => t.status === 'reserved').length;
  const sold = this.tickets.filter(t => t.status === 'sold').length;
  const locked = this.tickets.filter(t => t.status === 'locked').length;
  
  this.metadata.totalSeats = this.tickets.length;
  this.metadata.availableSeats = available;
  this.metadata.reservedSeats = reserved;
  this.metadata.soldSeats = sold;
  this.metadata.lockedSeats = locked;
  
  // Подсчитываем выручку
  this.metadata.totalRevenue = this.tickets
    .filter(t => t.status === 'sold')
    .reduce((sum, t) => sum + t.price, 0);
  
  this.metadata.lastBookingUpdate = new Date();
};

sessionSchema.methods.archive = function() {
  this.isArchived = true;
  return this.save();
};

sessionSchema.methods.unarchive = function() {
  this.isArchived = false;
  return this.save();
};

// Метод для блокировки билетов за 10 минут до начала сеанса
sessionSchema.methods.lockTicketsBeforeSession = function() {
  try {
    // Получаем зал с часовым поясом
    const Hall = mongoose.model('Hall');
    return Hall.findById(this.hallId).then(hall => {
      if (!hall) {
        throw new Error('Зал не найден');
      }

      // Создаем дату и время сессии
      const dateStr = this.date instanceof Date ? this.date.toISOString().split('T')[0] : this.date;
      const sessionDateTime = new Date(dateStr + 'T' + this.time + ':00');
      
      // Учитываем часовой пояс зала
      let sessionDateTimeWithTimezone;
      if (hall.timezone) {
        // Конвертируем в часовой пояс зала
        const timezoneOffset = this.getTimezoneOffset(hall.timezone);
        sessionDateTimeWithTimezone = new Date(sessionDateTime.getTime() + timezoneOffset * 60 * 1000);
      } else {
        sessionDateTimeWithTimezone = sessionDateTime;
      }
      
      // Вычисляем время блокировки (за 10 минут до начала)
      const lockTime = new Date(sessionDateTimeWithTimezone.getTime() - 10 * 60 * 1000);
      const now = new Date();
      
      // Если время блокировки наступило, блокируем билеты
      if (now >= lockTime) {
        let lockedCount = 0;
        
        this.tickets.forEach(ticket => {
          // Блокируем только доступные и забронированные билеты
          if (ticket.status === 'available' || ticket.status === 'reserved') {
            ticket.status = 'locked';
            lockedCount++;
          }
        });
        
        this.updateMetadata();
        
        return this.save().then(() => {
          return {
            success: true,
            lockedCount: lockedCount,
            lockTime: lockTime,
            sessionDateTime: sessionDateTimeWithTimezone
          };
        });
      } else {
        return {
          success: false,
          message: 'Время блокировки еще не наступило',
          lockTime: lockTime,
          sessionDateTime: sessionDateTimeWithTimezone
        };
      }
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

// Вспомогательный метод для получения смещения часового пояса
sessionSchema.methods.getTimezoneOffset = function(timezone) {
  // Простая реализация для основных часовых поясов
  const timezoneOffsets = {
    'Europe/Moscow': 3,
    'Europe/Kiev': 2,
    'Europe/Minsk': 3,
    'Asia/Almaty': 6,
    'Asia/Tashkent': 5,
    'Asia/Baku': 4,
    'Asia/Yerevan': 4,
    'Asia/Tbilisi': 4,
    'Europe/Kaliningrad': 2,
    'Europe/Samara': 4,
    'Asia/Yekaterinburg': 5,
    'Asia/Omsk': 6,
    'Asia/Novosibirsk': 7,
    'Asia/Krasnoyarsk': 7,
    'Asia/Irkutsk': 8,
    'Asia/Yakutsk': 9,
    'Asia/Vladivostok': 10,
    'Asia/Magadan': 11,
    'Asia/Kamchatka': 12
  };
  
  return timezoneOffsets[timezone] || 0;
};

// Статические методы
sessionSchema.statics.findByEvent = function(eventId, includeArchived = false) {
  const query = { eventId, isActive: true };
  if (!includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .populate('event')
    .populate('hall')
    .populate('priceScheme')
    .sort({ date: 1, time: 1 });
};

sessionSchema.statics.findByHall = function(hallId) {
  return this.find({ hallId, isActive: true })
    .populate('event')
    .populate('hall')
    .populate('priceScheme')
    .sort({ date: 1, time: 1 });
};

sessionSchema.statics.findUpcoming = function() {
  return this.find({ 
    date: { $gte: new Date() },
    isActive: true,
    isArchived: false
  })
    .populate('event')
    .populate('hall')
    .populate('priceScheme')
    .sort({ date: 1, time: 1 });
};

sessionSchema.statics.findArchived = function(eventId) {
  return this.find({ 
    eventId,
    isActive: true,
    isArchived: true
  })
    .sort({ date: -1, time: -1 });
};

sessionSchema.statics.findActive = function(eventId) {
  return this.find({ 
    eventId,
    isActive: true,
    isArchived: false
  })
    .sort({ date: 1, time: 1 });
};

sessionSchema.statics.findPast = function(eventId) {
  return this.find({ 
    eventId,
    isActive: true,
    isArchived: false
  })
    .sort({ date: -1, time: -1 });
};

// Статический метод для блокировки билетов во всех подходящих сессиях
sessionSchema.statics.lockTicketsForUpcomingSessions = function() {
  return this.find({
    isActive: true,
    isArchived: false,
    status: { $in: ['scheduled', 'active'] }
  }).populate('hallId').then(sessions => {
    const results = [];
    
    return Promise.all(sessions.map(session => {
      return session.lockTicketsBeforeSession().then(result => {
        results.push({
          sessionId: session._id,
          eventId: session.eventId,
          date: session.date,
          time: session.time,
          ...result
        });
      }).catch(error => {
        results.push({
          sessionId: session._id,
          eventId: session.eventId,
          date: session.date,
          time: session.time,
          success: false,
          error: error.message
        });
      });
    })).then(() => {
      return {
        processed: sessions.length,
        results: results
      };
    });
  });
};

// Метод для определения, является ли сессия прошедшей с учетом часового пояса
sessionSchema.methods.isPast = function() {
  console.log('🔍 Проверяем isPast для сессии:', {
    sessionId: this._id,
    date: this.date,
    time: this.time,
    hasHall: !!this.hall,
    hallTimezone: this.hall?.timezone
  });
  
  try {
    // Создаем дату и время сессии
    const dateStr = this.date instanceof Date ? this.date.toISOString().split('T')[0] : this.date;
    const sessionDateTime = new Date(dateStr + 'T' + this.time + ':00');
    const now = new Date();
    
    console.log('🕐 Времена:', {
      sessionDateTime: sessionDateTime.toISOString(),
      now: now.toISOString(),
      sessionLocal: sessionDateTime.toLocaleString('ru-RU'),
      nowLocal: now.toLocaleString('ru-RU')
    });
    
    // Добавляем 1 минуту к времени начала сессии
    const sessionEndTime = new Date(sessionDateTime.getTime() + 60000); // +1 минута
    
    const isPast = sessionEndTime < now;
    
    console.log('✅ Результат isPast:', {
      sessionEndTime: sessionEndTime.toISOString(),
      isPast: isPast
    });
    
    return isPast;
  } catch (error) {
    console.error('❌ Ошибка при определении isPast:', error);
    // Fallback: используем простую проверку
    const sessionDateTime = new Date(this.date + 'T' + this.time + ':00');
    const now = new Date();
    return sessionDateTime < now;
  }
};

// Middleware для автоматической очистки истекших резервов
sessionSchema.pre('save', function(next) {
  if (this.isModified('tickets')) {
    this.updateMetadata();
  }
  next();
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
