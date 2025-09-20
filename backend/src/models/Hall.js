const mongoose = require('mongoose');

const hallSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название зала обязательно'],
    trim: true,
    maxlength: [100, 'Название зала не может быть длиннее 100 символов']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Описание не может быть длиннее 500 символов']
  },
  capacity: {
    type: Number,
    required: [true, 'Вместимость зала обязательна'],
    min: [0, 'Вместимость не может быть отрицательной'], // Разрешаем 0 для новых залов
    max: [10000, 'Вместимость не может превышать 10000 мест']
  },
  country: {
    type: String,
    required: [true, 'Страна обязательна'],
    trim: true,
    maxlength: [2, 'Код страны должен быть 2 символа']
  },
  city: {
    type: String,
    required: [true, 'Город обязателен'],
    trim: true,
    maxlength: [100, 'Название города не может быть длиннее 100 символов']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [500, 'Адрес не может быть длиннее 500 символов']
  },
  timezone: {
    type: String,
    required: [true, 'Временная зона обязательна'],
    trim: true,
    maxlength: [50, 'Временная зона не может быть длиннее 50 символов']
  },
  currency: {
    type: String,
    default: 'RUB',
    enum: [
      // Основные мировые валюты
      'USD', 'EUR', 'GBP', 'JPY', 'CHF',
      // СНГ и Восточная Европа
      'RUB', 'UAH', 'BYN', 'KZT', 'KGS', 'AMD', 'GEL', 'AZN', 'TJS', 'TMT', 'UZS', 'MDL',
      // Европа
      'SEK', 'NOK', 'DKK', 'PLN', 'CZK', 'HUF', 'BGN', 'RON', 'HRK', 'RSD', 'BAM', 'MKD', 'ALL', 'ISK',
      // Азия
      'CNY', 'KRW', 'THB', 'VND', 'IDR', 'MYR', 'SGD', 'PHP', 'INR', 'PKR', 'BDT', 'LKR', 'NPR', 'BTN', 'MVR', 'AFN', 'MMK', 'LAK', 'KHR', 'BND', 'MOP', 'HKD', 'TWD', 'MNT',
      // Ближний Восток и Центральная Азия
      'TRY', 'ILS', 'AED', 'SAR', 'QAR', 'KWD', 'BHD', 'OMR', 'JOD', 'LBP', 'IQD', 'IRR', 'YER', 'SYP',
      // Африка
      'ZAR', 'NGN', 'KES', 'UGX', 'TZS', 'ETB', 'MAD', 'TND', 'DZD', 'EGP', 'GHS', 'XOF', 'XAF', 'MWK', 'ZMW', 'BWP', 'SZL', 'LSL', 'NAD', 'AOA', 'MZN', 'RWF', 'BIF', 'DJF', 'SOS', 'ERN', 'SDG', 'SSP', 'CDF', 'CVE', 'STN', 'GMD', 'GNF', 'LRD', 'SLE', 'MGA', 'MUR', 'SCR', 'KMF',
      // Америка
      'CAD', 'AUD', 'NZD', 'BRL', 'MXN', 'ARS', 'CLP', 'COP', 'PEN', 'UYU', 'PYG', 'BOB', 'VES', 'GYD', 'SRD', 'TTD', 'BBD', 'JMD', 'BZD', 'GTQ', 'HNL', 'NIO', 'CRC', 'PAB', 'DOP', 'HTG', 'CUP', 'AWG', 'ANG', 'XCD',
      // Океания
      'FJD', 'PGK', 'SBD', 'VUV', 'WST', 'TOP', 'KID'
    ],
    trim: true
  },
  svg_file: {
    type: String,
    required: [true, 'SVG файл зала обязателен']
  },
  photo_file: {
    type: String
  },
  seat_config: {
    type: String, // JSON string с конфигурацией мест
    default: '[]'
  },
  zone_config: {
    type: String, // JSON string с конфигурацией зон
    default: '[]'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    totalSeats: {
      type: Number,
      default: 0
    },
    totalZones: {
      type: Number,
      default: 0
    },
    lastConfigUpdate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true,
  toJSON: {
    virtuals: true, // Включаем виртуальные поля в JSON
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Индексы
hallSchema.index({ name: 1 });
hallSchema.index({ isActive: 1 });
hallSchema.index({ capacity: 1 });

// Виртуальные поля
hallSchema.virtual('seats').get(function() {
  try {
    const config = JSON.parse(this.seat_config);
    // Если seat_config содержит объект с полем seats, возвращаем только массив seats
    if (config && typeof config === 'object' && Array.isArray(config.seats)) {
      return config.seats;
    }
    // Если seat_config уже является массивом, возвращаем его
    if (Array.isArray(config)) {
      return config;
    }
    return [];
  } catch (error) {
    return [];
  }
});

hallSchema.virtual('zones').get(function() {
  try {
    // Сначала пытаемся получить зоны из zone_config
    if (this.zone_config) {
      const zoneConfig = JSON.parse(this.zone_config);
      if (Array.isArray(zoneConfig)) {
        return zoneConfig;
      }
    }
    
    // Если zone_config пустой, пытаемся извлечь зоны из seat_config
    const seatConfig = JSON.parse(this.seat_config);
    if (seatConfig && typeof seatConfig === 'object' && Array.isArray(seatConfig.zones)) {
      return seatConfig.zones;
    }
    
    return [];
  } catch (error) {
    return [];
  }
});

// Методы для работы с конфигурацией
hallSchema.methods.updateSeatConfig = function(seats) {
  this.seat_config = JSON.stringify(seats);
  this.metadata.totalSeats = seats.length;
  this.metadata.lastConfigUpdate = new Date();
  return this.save();
};

hallSchema.methods.updateZoneConfig = function(zones) {
  this.zone_config = JSON.stringify(zones);
  this.metadata.totalZones = zones.length;
  this.metadata.lastConfigUpdate = new Date();
  return this.save();
};

// Статические методы
hallSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

hallSchema.statics.findByCapacityRange = function(min, max) {
  return this.find({
    capacity: { $gte: min, $lte: max },
    isActive: true
  }).sort({ capacity: 1 });
};

// Настройки для включения виртуальных полей в JSON
hallSchema.set('toJSON', { virtuals: true });
hallSchema.set('toObject', { virtuals: true });

const Hall = mongoose.model('Hall', hallSchema);

module.exports = Hall;