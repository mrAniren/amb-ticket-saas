const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // Основная информация
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Связи
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  
  hallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hall',
    required: true
  },
  
  // Информация о месте
  seatId: {
    type: String,
    required: true
  },
  
  seatRow: {
    type: Number,
    required: true
  },
  
  seatNumber: {
    type: Number,
    required: true
  },
  
  seatSection: {
    type: String,
    required: true
  },
  
  // Ценовая информация
  price: {
    type: Number,
    required: true
  },
  
  currency: {
    type: String,
    default: 'RUB'
  },
  
  // Информация о покупателе
  buyerName: {
    type: String,
    required: true
  },
  
  buyerEmail: {
    type: String,
    required: true
  },
  
  buyerPhone: {
    type: String
  },
  
  // Информация о мероприятии
  eventName: {
    type: String,
    required: true
  },
  
  eventDate: {
    type: Date,
    required: true
  },
  
  eventTime: {
    type: String,
    required: true
  },
  
  hallName: {
    type: String,
    required: true
  },
  
  hallAddress: {
    type: String
  },
  
  // Информация о покупке
  purchaseDate: {
    type: Date,
    default: Date.now
  },
  
  orderNumber: {
    type: String,
    required: true
  },
  
  // Техническая информация
  qrCode: {
    type: String,
    required: true
  },
  
  pdfPath: {
    type: String,
    required: false
  },
  
  pdfGenerated: {
    type: Boolean,
    default: false
  },
  
  // Статус билета
  status: {
    type: String,
    enum: ['active', 'used', 'cancelled', 'refunded'],
    default: 'active'
  },
  
  usedAt: {
    type: Date
  },
  
  // Дополнительные данные
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Флаг приглашения
  isInvitation: {
    type: Boolean,
    default: false
  } // Флаг: это билет-приглашение
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Индексы для оптимизации запросов
ticketSchema.index({ orderId: 1, seatId: 1 });
ticketSchema.index({ eventId: 1, eventDate: 1 });
ticketSchema.index({ buyerEmail: 1 });
ticketSchema.index({ status: 1 });
ticketSchema.index({ createdAt: -1 });

// Виртуальные поля
ticketSchema.virtual('isUsed').get(function() {
  return this.status === 'used';
});

ticketSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

ticketSchema.virtual('isCancelled').get(function() {
  return this.status === 'cancelled';
});

ticketSchema.virtual('isRefunded').get(function() {
  return this.status === 'refunded';
});

// Методы экземпляра
ticketSchema.methods.markAsUsed = function() {
  this.status = 'used';
  this.usedAt = new Date();
  return this.save();
};

ticketSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

ticketSchema.methods.refund = function() {
  this.status = 'refunded';
  return this.save();
};

ticketSchema.methods.getFormattedEventDate = function() {
  return this.eventDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

ticketSchema.methods.getFormattedPurchaseDate = function() {
  return this.purchaseDate.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// Статические методы
ticketSchema.statics.findByOrderId = function(orderId) {
  return this.find({ orderId }).populate('sessionId eventId hallId');
};

ticketSchema.statics.findByEventId = function(eventId) {
  return this.find({ eventId }).populate('sessionId eventId hallId');
};

ticketSchema.statics.findByBuyerEmail = function(email) {
  return this.find({ buyerEmail: email }).populate('sessionId eventId hallId');
};

ticketSchema.statics.getTicketStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalRevenue: { $sum: '$price' }
      }
    }
  ]);
};

// Middleware
ticketSchema.pre('validate', function(next) {
  // Генерируем красивый номер билета если его нет
  if (!this.ticketId) {
    // Создаем красивый номер: 8-значное число
    const timestamp = Date.now().toString().slice(-6); // Последние 6 цифр timestamp
    const random = Math.floor(Math.random() * 100).toString().padStart(2, '0'); // 2 случайные цифры
    this.ticketId = `${timestamp}${random}`;
  }
  
  // Генерируем QR код если его нет
  if (!this.qrCode) {
    // Создаем информативный QR-код с данными о билете
    const qrData = {
      ticketId: this.ticketId,
      eventName: this.eventName,
      eventDate: this.eventDate,
      eventTime: this.eventTime,
      hallName: this.hallName,
      seatRow: this.seatRow,
      seatNumber: this.seatNumber,
      seatSection: this.seatSection,
      price: this.price,
      currency: this.currency,
      buyerName: this.buyerName,
      purchaseDate: this.purchaseDate
    };
    this.qrCode = JSON.stringify(qrData);
  }
  
  // Проверяем, что дата мероприятия в будущем
  if (this.eventDate && this.eventDate < new Date()) {
    next(new Error('Дата мероприятия не может быть в прошлом'));
    return;
  }
  
  // Проверяем email
  if (this.buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.buyerEmail)) {
    next(new Error('Некорректный email адрес'));
    return;
  }
  
  next();
});

module.exports = mongoose.model('Ticket', ticketSchema);
