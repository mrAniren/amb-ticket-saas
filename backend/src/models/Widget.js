const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const widgetSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  widgetId: {
    type: String,
    unique: true,
    required: true,
    default: () => uuidv4().replace(/-/g, '') // Генерируем уникальный ID без дефисов
  },
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    theme: {
      type: String,
      enum: ['default', 'light', 'dark', 'custom'],
      default: 'default'
    },
    showEventInfo: {
      type: Boolean,
      default: true
    },
    showHallInfo: {
      type: Boolean,
      default: true
    },
    showPrices: {
      type: Boolean,
      default: true
    },
    showAvailableSeats: {
      type: Boolean,
      default: true
    },
    customCSS: {
      type: String,
      default: ''
    },
    buttonText: {
      type: String,
      default: 'Купить билеты',
      maxlength: 50
    },
    displayMode: {
      type: String,
      enum: ['embedded', 'modal'],
      default: 'embedded',
      required: true
    },
    width: {
      type: String,
      default: '100%'
    },
    height: {
      type: String,
      default: 'auto'
    },
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    textColor: {
      type: String,
      default: '#333333'
    },
    buttonColor: {
      type: String,
      default: '#007bff'
    },
    borderRadius: {
      type: String,
      default: '8px'
    }
  },
  statistics: {
    views: {
      type: Number,
      default: 0
    },
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastViewed: {
      type: Date
    },
    lastClicked: {
      type: Date
    },
    createdOrders: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }],
    dailyStats: [{
      date: {
        type: Date,
        required: true
      },
      views: {
        type: Number,
        default: 0
      },
      clicks: {
        type: Number,
        default: 0
      },
      conversions: {
        type: Number,
        default: 0
      },
      revenue: {
        type: Number,
        default: 0
      }
    }]
  },
  domains: [{
    type: String,
    trim: true
  }], // Белый список доменов, где разрешено использование виджета
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Индексы для оптимизации запросов
widgetSchema.index({ sessionId: 1 });
widgetSchema.index({ widgetId: 1 });
widgetSchema.index({ isActive: 1 });
widgetSchema.index({ createdAt: -1 });

// Виртуальные поля
widgetSchema.virtual('ctr').get(function() {
  if (this.statistics.views === 0) return 0;
  return ((this.statistics.clicks / this.statistics.views) * 100).toFixed(2);
});

widgetSchema.virtual('conversionRate').get(function() {
  if (this.statistics.clicks === 0) return 0;
  return ((this.statistics.conversions / this.statistics.clicks) * 100).toFixed(2);
});

widgetSchema.virtual('averageOrderValue').get(function() {
  if (this.statistics.conversions === 0) return 0;
  return (this.statistics.totalRevenue / this.statistics.conversions).toFixed(2);
});

// Методы экземпляра
widgetSchema.methods.incrementViews = async function() {
  this.statistics.views += 1;
  this.statistics.lastViewed = new Date();
  
  // Обновляем дневную статистику
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyStat = this.statistics.dailyStats.find(stat => 
    stat.date.getTime() === today.getTime()
  );
  
  if (dailyStat) {
    dailyStat.views += 1;
  } else {
    this.statistics.dailyStats.push({
      date: today,
      views: 1,
      clicks: 0,
      conversions: 0,
      revenue: 0
    });
  }
  
  return this.save();
};

widgetSchema.methods.incrementClicks = async function() {
  this.statistics.clicks += 1;
  this.statistics.lastClicked = new Date();
  
  // Обновляем дневную статистику
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyStat = this.statistics.dailyStats.find(stat => 
    stat.date.getTime() === today.getTime()
  );
  
  if (dailyStat) {
    dailyStat.clicks += 1;
  } else {
    this.statistics.dailyStats.push({
      date: today,
      views: 0,
      clicks: 1,
      conversions: 0,
      revenue: 0
    });
  }
  
  return this.save();
};

widgetSchema.methods.recordConversion = async function(orderId, amount) {
  this.statistics.conversions += 1;
  this.statistics.totalRevenue += amount;
  this.statistics.createdOrders.push(orderId);
  
  // Обновляем дневную статистику
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dailyStat = this.statistics.dailyStats.find(stat => 
    stat.date.getTime() === today.getTime()
  );
  
  if (dailyStat) {
    dailyStat.conversions += 1;
    dailyStat.revenue += amount;
  } else {
    this.statistics.dailyStats.push({
      date: today,
      views: 0,
      clicks: 0,
      conversions: 1,
      revenue: amount
    });
  }
  
  return this.save();
};

// Статические методы
widgetSchema.statics.findByWidgetId = function(widgetId) {
  return this.findOne({ widgetId, isActive: true });
};

widgetSchema.statics.findBySession = function(sessionId) {
  return this.find({ sessionId, isActive: true });
};

// Middleware для обновления updatedAt
widgetSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Настройки для JSON вывода
widgetSchema.set('toJSON', { virtuals: true });
widgetSchema.set('toObject', { virtuals: true });

// Удаляем чувствительные поля при сериализации для публичного API
widgetSchema.methods.toPublicJSON = function() {
  const obj = this.toObject();
  delete obj.statistics.createdOrders;
  delete obj.domains;
  return obj;
};

module.exports = mongoose.model('Widget', widgetSchema);
