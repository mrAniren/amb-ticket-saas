const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  sessionId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Session', 
    required: true 
  },
  customerName: { 
    type: String, 
    required: true,
    trim: true
  },
  customerPhone: { 
    type: String, 
    required: true,
    trim: true
  },
  customerEmail: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  ticketData: [{
    seatId: { type: String, required: true },
    row: { type: Number, required: true },
    place: { type: Number, required: true },
    zone: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'RUB' },
    priceColor: { type: String },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  }],
  subtotal: { 
    type: Number, 
    required: true,
    min: 0
  }, // Сумма до скидки
  discount: { 
    type: Number, 
    default: 0,
    min: 0
  }, // Размер скидки
  total: { 
    type: Number, 
    required: true,
    min: 0
  }, // Итоговая сумма
  promoCode: { 
    type: String,
    trim: true
  }, // Использованный промокод
  promoCodeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PromoCode'
  }, // ID промокода для статистики
  status: { 
    type: String, 
    enum: ['temporary', 'pending', 'paid', 'cancelled', 'expired'], 
    default: 'temporary' 
  },
  paymentMethod: { 
    type: String, 
    default: 'cash' 
  }, // Пока только наличные
  supplier: {
    type: String,
    default: 'Система',
    trim: true,
    maxlength: [100, 'Название поставщика не может быть длиннее 100 символов']
  },
  paidAt: {
    type: Date
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Заметки не могут быть длиннее 500 символов']
  },
  isInvitation: {
    type: Boolean,
    default: false
  }, // Флаг: это заказ-приглашение
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 15 * 60 * 1000); // 15 минут на оплату
    }
  },
  ticketsGenerated: {
    type: Boolean,
    default: false
  }, // Флаг генерации билетов
  orderNumber: {
    type: String,
    unique: true,
    sparse: true
  }, // Номер заказа для отображения
  attribution: {
    utm_source: { type: String },
    utm_medium: { type: String },
    utm_campaign: { type: String },
    utm_term: { type: String },
    utm_content: { type: String }
  },
  widgetId: {
    type: String,
    trim: true
  }, // ID виджета, через который был сделан заказ
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Индекс для поиска истекших заказов (без автоматического удаления)
OrderSchema.index({ expiresAt: 1 });

// Индекс для поиска заказов по сеансу
OrderSchema.index({ sessionId: 1 });

// Индекс для поиска заказов по статусу
OrderSchema.index({ status: 1 });

// Middleware для автоматического обновления updatedAt и генерации orderNumber
OrderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Генерируем orderNumber если его нет
  if (!this.orderNumber) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 4);
    this.orderNumber = `${timestamp}${random}`.toUpperCase();
  }
  
  next();
});

OrderSchema.pre(['updateOne', 'updateMany', 'findOneAndUpdate'], function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Виртуальное поле для расчета количества билетов
OrderSchema.virtual('ticketCount').get(function() {
  return this.ticketData ? this.ticketData.length : 0;
});

// Метод для проверки истечения заказа
OrderSchema.methods.isExpired = function() {
  return this.status === 'pending' && new Date() > this.expiresAt;
};

// Метод для расчета итоговой суммы
OrderSchema.methods.calculateTotal = function() {
  this.total = Math.max(0, this.subtotal - this.discount);
  return this.total;
};

module.exports = mongoose.model('Order', OrderSchema);
