const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Код промокода обязателен'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Код должен содержать минимум 3 символа'],
    maxlength: [20, 'Код не может быть длиннее 20 символов'],
    match: [/^[A-Z0-9_-]+$/, 'Код может содержать только буквы, цифры, дефис и подчеркивание']
  },
  name: {
    type: String,
    required: [true, 'Название промокода обязательно'],
    trim: true,
    maxlength: [100, 'Название не может быть длиннее 100 символов']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  type: {
    type: String,
    required: [true, 'Тип промокода обязателен'],
    enum: ['permanent', 'temporary'],
    default: 'permanent'
  },
  startDate: {
    type: Date,
    validate: {
      validator: function(value) {
        // Для временных промокодов дата начала обязательна
        if (this.type === 'temporary') {
          return value != null;
        }
        return true;
      },
      message: 'Дата начала обязательна для временного промокода'
    }
  },
  endDate: {
    type: Date,
    validate: [
      {
        validator: function(value) {
          // Для временных промокодов дата окончания обязательна
          if (this.type === 'temporary') {
            return value != null;
          }
          return true;
        },
        message: 'Дата окончания обязательна для временного промокода'
      },
      {
        validator: function(value) {
          // Дата окончания должна быть позже даты начала
          if (this.type === 'temporary' && this.startDate && value) {
            return value > this.startDate;
          }
          return true;
        },
        message: 'Дата окончания должна быть позже даты начала'
      }
    ]
  },
  discountType: {
    type: String,
    required: [true, 'Тип скидки обязателен'],
    enum: ['percentage', 'fixed'],
    default: 'percentage'
  },
  discountValue: {
    type: Number,
    required: [true, 'Значение скидки обязательно'],
    min: [0.01, 'Значение скидки должно быть больше 0'],
    validate: {
      validator: function(value) {
        // Для процентной скидки максимум 100%
        if (this.discountType === 'percentage') {
          return value <= 100;
        }
        return true;
      },
      message: 'Процентная скидка не может быть больше 100%'
    }
  },
  currency: {
    type: String,
    enum: ['RUB', 'USD', 'EUR', 'KZT'],
    validate: {
      validator: function(value) {
        // Для фиксированной скидки валюта обязательна
        if (this.discountType === 'fixed') {
          return value != null;
        }
        return true;
      },
      message: 'Валюта обязательна для фиксированной скидки'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usageLimit: {
    type: Number,
    min: [1, 'Лимит использования должен быть больше 0'],
    default: null // null = без ограничений
  },
  usageCount: {
    type: Number,
    default: 0,
    min: [0, 'Счетчик использования не может быть отрицательным']
  },
  applicableEvents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event'
  }],
  applicableCategories: [{
    type: String,
    enum: ['концерт', 'театр', 'спорт', 'выставка', 'конференция', 'другое']
  }],
  minOrderAmount: {
    type: Number,
    min: [0, 'Минимальная сумма заказа не может быть отрицательной'],
    default: 0
  },
  metadata: {
    totalUses: {
      type: Number,
      default: 0
    },
    totalDiscount: {
      type: Number,
      default: 0
    },
    lastUsed: {
      type: Date
    },
    averageOrderAmount: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      // Добавляем вычисляемое поле isActive (виртуальное поле, не метод)
      ret.isActive = doc.isCurrentlyActive;
      return ret;
    }
  }
});

// Индексы
// code уже уникальный в схеме
promoCodeSchema.index({ type: 1 });
promoCodeSchema.index({ isActive: 1 });
promoCodeSchema.index({ startDate: 1, endDate: 1 });
promoCodeSchema.index({ discountType: 1 });
promoCodeSchema.index({ applicableEvents: 1 });
promoCodeSchema.index({ applicableCategories: 1 });

// Виртуальные поля
promoCodeSchema.virtual('isCurrentlyActive').get(function() {
  if (!this.isActive) return false;
  
  // Проверяем лимит использования
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return false;
  }
  
  // Для временных промокодов проверяем даты
  if (this.type === 'temporary') {
    const now = new Date();
    if (this.startDate && now < this.startDate) return false;
    if (this.endDate && now > this.endDate) return false;
  }
  
  return true;
});

promoCodeSchema.virtual('remainingUses').get(function() {
  if (!this.usageLimit) return null;
  return Math.max(0, this.usageLimit - this.usageCount);
});

promoCodeSchema.virtual('usagePercentage').get(function() {
  if (!this.usageLimit) return 0;
  return (this.usageCount / this.usageLimit) * 100;
});

// Методы
promoCodeSchema.methods.calculateDiscount = function(orderAmount) {
  if (!this.isCurrentlyActive) {
    throw new Error('Промокод неактивен');
  }
  
  if (orderAmount < this.minOrderAmount) {
    throw new Error(`Минимальная сумма заказа: ${this.minOrderAmount}`);
  }
  
  let discountAmount = 0;
  
  if (this.discountType === 'percentage') {
    discountAmount = (orderAmount * this.discountValue) / 100;
  } else {
    discountAmount = this.discountValue;
  }
  
  // Скидка не может быть больше суммы заказа
  return Math.min(discountAmount, orderAmount);
};

promoCodeSchema.methods.canBeUsedForEvent = function(eventId) {
  // Если список применимых мероприятий пуст, промокод применим ко всем
  if (this.applicableEvents.length === 0) return true;
  
  return this.applicableEvents.some(id => id.toString() === eventId.toString());
};

promoCodeSchema.methods.canBeUsedForCategory = function(category) {
  // Если список применимых категорий пуст, промокод применим ко всем
  if (this.applicableCategories.length === 0) return true;
  
  return this.applicableCategories.includes(category);
};

promoCodeSchema.methods.use = function(orderAmount, eventId = null, category = null) {
  if (!this.isCurrentlyActive) {
    throw new Error('Промокод неактивен');
  }
  
  if (eventId && !this.canBeUsedForEvent(eventId)) {
    throw new Error('Промокод не применим к данному мероприятию');
  }
  
  if (category && !this.canBeUsedForCategory(category)) {
    throw new Error('Промокод не применим к данной категории');
  }
  
  const discountAmount = this.calculateDiscount(orderAmount);
  
  // Увеличиваем счетчик использования
  this.usageCount += 1;
  this.metadata.totalUses += 1;
  this.metadata.totalDiscount += discountAmount;
  this.metadata.lastUsed = new Date();
  
  // Обновляем среднюю сумму заказа
  const totalOrders = this.metadata.totalUses;
  this.metadata.averageOrderAmount = 
    ((this.metadata.averageOrderAmount * (totalOrders - 1)) + orderAmount) / totalOrders;
  
  return {
    discountAmount,
    finalAmount: orderAmount - discountAmount,
    promoCode: this.code
  };
};

promoCodeSchema.methods.deactivate = function() {
  this.isActive = false;
  return this.save();
};

promoCodeSchema.methods.activate = function() {
  this.isActive = true;
  return this.save();
};

// Статические методы
promoCodeSchema.statics.findByCode = function(code) {
  return this.findOne({ code: code.toUpperCase() });
};

promoCodeSchema.statics.findActive = function() {
  const now = new Date();
  return this.find({
    isActive: true,
    $or: [
      { type: 'permanent' },
      {
        type: 'temporary',
        startDate: { $lte: now },
        endDate: { $gte: now }
      }
    ]
  }).sort({ createdAt: -1 });
};

promoCodeSchema.statics.findExpired = function() {
  const now = new Date();
  return this.find({
    $or: [
      {
        type: 'temporary',
        endDate: { $lt: now }
      },
      {
        usageLimit: { $exists: true },
        $expr: { $gte: ['$usageCount', '$usageLimit'] }
      }
    ]
  }).sort({ createdAt: -1 });
};

promoCodeSchema.statics.findByCategory = function(category) {
  return this.find({
    $or: [
      { applicableCategories: { $size: 0 } },
      { applicableCategories: category }
    ]
  }).sort({ createdAt: -1 });
};

promoCodeSchema.statics.validateCode = async function(code, orderAmount, eventId = null, category = null) {
  const promoCode = await this.findByCode(code);
  
  if (!promoCode) {
    throw new Error('Промокод не найден');
  }
  
  if (!promoCode.isCurrentlyActive) {
    throw new Error('Промокод неактивен или истек');
  }
  
  if (eventId && !promoCode.canBeUsedForEvent(eventId)) {
    throw new Error('Промокод не применим к данному мероприятию');
  }
  
  if (category && !promoCode.canBeUsedForCategory(category)) {
    throw new Error('Промокод не применим к данной категории');
  }
  
  const discountAmount = promoCode.calculateDiscount(orderAmount);
  
  return {
    isValid: true,
    promoCode,
    discountAmount,
    finalAmount: orderAmount - discountAmount
  };
};

const PromoCode = mongoose.model('PromoCode', promoCodeSchema);

module.exports = PromoCode;
