const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Название мероприятия обязательно'],
    trim: true,
    maxlength: [200, 'Название не может быть длиннее 200 символов']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, 'Описание не может быть длиннее 2000 символов']
  },
  image: {
    type: String,
    required: [true, 'Изображение мероприятия обязательно']
  },
  category: {
    type: String,
    enum: ['концерт', 'театр', 'спорт', 'выставка', 'конференция', 'другое'],
    default: 'другое'
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    totalSessions: {
      type: Number,
      default: 0
    },
    totalTicketsSold: {
      type: Number,
      default: 0
    },
    totalRevenue: {
      type: Number,
      default: 0
    },
    lastSessionDate: {
      type: Date
    }
  },
  tags: [{
    type: String,
    trim: true
  }],
  organizer: {
    name: {
      type: String,
      trim: true
    },
    contact: {
      type: String,
      trim: true
    },
    email: {
      type: String,
      trim: true,
      lowercase: true
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
eventSchema.index({ name: 1 });
eventSchema.index({ status: 1 });
eventSchema.index({ isActive: 1 });
eventSchema.index({ category: 1 });
eventSchema.index({ tags: 1 });
eventSchema.index({ createdAt: -1 });

// Виртуальные поля
eventSchema.virtual('sessions', {
  ref: 'Session',
  localField: '_id',
  foreignField: 'eventId'
});

// Методы
eventSchema.methods.updateMetadata = async function() {
  const Session = mongoose.model('Session');
  
  const sessions = await Session.find({ eventId: this._id });
  
  this.metadata.totalSessions = sessions.length;
  
  if (sessions.length > 0) {
    // Находим последнюю дату сеанса
    const lastSession = sessions.reduce((latest, session) => {
      const sessionDate = new Date(session.date);
      return sessionDate > latest ? sessionDate : latest;
    }, new Date(0));
    
    this.metadata.lastSessionDate = lastSession;
  }
  
  return this.save();
};

eventSchema.methods.publish = function() {
  this.status = 'published';
  return this.save();
};

eventSchema.methods.cancel = function() {
  this.status = 'cancelled';
  return this.save();
};

eventSchema.methods.complete = function() {
  this.status = 'completed';
  return this.save();
};

// Статические методы
eventSchema.statics.findPublished = function() {
  return this.find({ 
    status: 'published',
    isActive: true 
  }).sort({ createdAt: -1 });
};

eventSchema.statics.findByCategory = function(category) {
  return this.find({ 
    category,
    status: 'published',
    isActive: true 
  }).sort({ createdAt: -1 });
};

eventSchema.statics.searchByName = function(query) {
  return this.find({
    name: { $regex: query, $options: 'i' },
    isActive: true
  }).sort({ createdAt: -1 });
};

// Middleware для обновления метаданных при удалении
eventSchema.pre('remove', async function(next) {
  try {
    // Удаляем все связанные сеансы
    const Session = mongoose.model('Session');
    await Session.deleteMany({ eventId: this._id });
    next();
  } catch (error) {
    next(error);
  }
});

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;
