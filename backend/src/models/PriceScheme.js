const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: [true, 'Название цены обязательно'],
    trim: true,
    maxlength: [100, 'Название не может быть длиннее 100 символов']
  },
  value: {
    type: Number,
    required: [true, 'Значение цены обязательно'],
    min: [0, 'Цена не может быть отрицательной']
  },
  currency: {
    type: String,
    required: [true, 'Валюта обязательна'],
    default: 'RUB'
  },
  color: {
    type: String,
    required: [true, 'Цвет обязателен'],
    match: [/^#[0-9A-F]{6}$/i, 'Некорректный формат цвета (должен быть HEX)']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Описание не может быть длиннее 200 символов']
  }
}, { _id: false });

const seatPriceSchema = new mongoose.Schema({
  seatId: {
    type: String,
    required: true
  },
  priceId: {
    type: String,
    required: false, // Может быть null до назначения цены
    default: null
  },
  row: {
    type: Number,
    required: false
  },
  seatNumber: {
    type: Number,
    required: false
  },
  section: {
    type: String,
    required: false
  }
}, { _id: false });

const priceSchemeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название распоясовки обязательно'],
    trim: true,
    maxlength: [200, 'Название не может быть длиннее 200 символов']
  },
  hallId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hall',
    required: [true, 'ID зала обязателен']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  prices: [priceSchema],
  seatPrices: [seatPriceSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    totalPrices: {
      type: Number,
      default: 0
    },
    assignedSeats: {
      type: Number,
      default: 0
    },
    minPrice: {
      type: Number,
      default: 0
    },
    maxPrice: {
      type: Number,
      default: 0
    },
    averagePrice: {
      type: Number,
      default: 0
    },
    lastUpdate: {
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
priceSchemeSchema.index({ name: 1 });
priceSchemeSchema.index({ hallId: 1 });
priceSchemeSchema.index({ isActive: 1 });
priceSchemeSchema.index({ 'prices.id': 1 });
priceSchemeSchema.index({ 'seatPrices.seatId': 1 });

// Виртуальные поля
priceSchemeSchema.virtual('hall', {
  ref: 'Hall',
  localField: 'hallId',
  foreignField: '_id',
  justOne: true
});

// Методы
priceSchemeSchema.methods.addPrice = function(priceData) {
  // Генерируем уникальный ID для цены
  const priceId = new mongoose.Types.ObjectId().toString();
  
  const newPrice = {
    id: priceId,
    name: priceData.name,
    value: priceData.value,
    currency: priceData.currency || 'RUB',
    color: priceData.color,
    description: priceData.description || ''
  };
  
  this.prices.push(newPrice);
  this.updateMetadata();
  
  return newPrice;
};

priceSchemeSchema.methods.updatePrice = function(priceId, updateData) {
  const priceIndex = this.prices.findIndex(p => p.id === priceId);
  
  if (priceIndex === -1) {
    throw new Error('Цена не найдена');
  }
  
  Object.assign(this.prices[priceIndex], updateData);
  this.updateMetadata();
  
  return this.prices[priceIndex];
};

priceSchemeSchema.methods.removePrice = function(priceId) {
  const priceIndex = this.prices.findIndex(p => p.id === priceId);
  
  if (priceIndex === -1) {
    throw new Error('Цена не найдена');
  }
  
  // Удаляем цену
  this.prices.splice(priceIndex, 1);
  
  // Удаляем все привязки мест к этой цене
  this.seatPrices = this.seatPrices.filter(sp => sp.priceId !== priceId);
  
  this.updateMetadata();
  
  return true;
};

priceSchemeSchema.methods.assignPriceToSeats = function(seatIds, priceId) {
  // Проверяем, что цена существует
  const price = this.prices.find(p => p.id === priceId);
  if (!price) {
    throw new Error('Цена не найдена');
  }
  
  // Обновляем существующие записи или создаем новые
  seatIds.forEach(seatId => {
    const existingSeatPrice = this.seatPrices.find(sp => sp.seatId === seatId);
    
    if (existingSeatPrice) {
      // Обновляем существующую запись
      existingSeatPrice.priceId = priceId;
    } else {
      // Создаем новую запись (если место каким-то образом отсутствует)
      this.seatPrices.push({ seatId, priceId });
    }
  });
  
  this.updateMetadata();
  
  return true;
};

priceSchemeSchema.methods.removeSeatPrices = function(seatIds) {
  this.seatPrices = this.seatPrices.filter(sp => !seatIds.includes(sp.seatId));
  this.updateMetadata();
  
  return true;
};

priceSchemeSchema.methods.updateMetadata = function() {
  this.metadata.totalPrices = this.prices.length;
  this.metadata.assignedSeats = this.seatPrices.filter(sp => sp.priceId !== null).length;
  
  if (this.prices.length > 0) {
    const values = this.prices.map(p => p.value);
    this.metadata.minPrice = Math.min(...values);
    this.metadata.maxPrice = Math.max(...values);
    this.metadata.averagePrice = values.reduce((sum, val) => sum + val, 0) / values.length;
  } else {
    this.metadata.minPrice = 0;
    this.metadata.maxPrice = 0;
    this.metadata.averagePrice = 0;
  }
  
  this.metadata.lastUpdate = new Date();
};

priceSchemeSchema.methods.getSeatPrice = function(seatId) {
  const seatPrice = this.seatPrices.find(sp => sp.seatId === seatId);
  
  if (!seatPrice) {
    return null;
  }
  
  return this.prices.find(p => p.id === seatPrice.priceId);
};

priceSchemeSchema.methods.validateAllSeatsHavePrices = function(allSeatIds) {
  const assignedSeatIds = new Set(this.seatPrices.map(sp => sp.seatId));
  const unassignedSeats = allSeatIds.filter(seatId => !assignedSeatIds.has(seatId));
  
  return {
    isValid: unassignedSeats.length === 0,
    unassignedSeats,
    assignedSeats: Array.from(assignedSeatIds),
    totalSeats: allSeatIds.length,
    assignedCount: assignedSeatIds.size
  };
};

// Статические методы
priceSchemeSchema.statics.findByHall = function(hallId) {
  return this.find({ hallId, isActive: true })
    .populate('hall')
    .sort({ name: 1 });
};

priceSchemeSchema.statics.findActive = function() {
  return this.find({ isActive: true })
    .populate('hall')
    .sort({ name: 1 });
};

// Middleware для обновления метаданных
priceSchemeSchema.pre('save', function(next) {
  if (this.isModified('prices') || this.isModified('seatPrices')) {
    this.updateMetadata();
  }
  next();
});

const PriceScheme = mongoose.model('PriceScheme', priceSchemeSchema);

module.exports = PriceScheme;
