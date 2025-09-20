const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Имя пользователя обязательно'],
    unique: true,
    trim: true,
    minlength: [3, 'Имя пользователя должно содержать минимум 3 символа'],
    maxlength: [30, 'Имя пользователя не может быть длиннее 30 символов']
  },
  email: {
    type: String,
    required: [true, 'Email обязателен'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Некорректный email']
  },
  password: {
    type: String,
    required: [true, 'Пароль обязателен'],
    minlength: [6, 'Пароль должен содержать минимум 6 символов'],
    select: false // По умолчанию не включаем пароль в выборки
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'user'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Индексы уже созданы через unique: true в схеме

// Виртуальное поле для проверки блокировки
userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Хэширование пароля перед сохранением
userSchema.pre('save', async function(next) {
  // Только если пароль был изменен
  if (!this.isModified('password')) return next();
  
  try {
    // Хэшируем пароль с cost factor 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Метод для сравнения пароля
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Метод для увеличения счетчика неудачных попыток входа
userSchema.methods.incLoginAttempts = function() {
  // Если у нас есть предыдущая блокировка и она истекла
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        loginAttempts: 1,
        lockUntil: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Если достигли максимального количества попыток и аккаунт не заблокирован
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 // Блокируем на 2 часа
    };
  }
  
  return this.updateOne(updates);
};

// Метод для сброса счетчика попыток входа
userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    },
    $set: {
      lastLogin: new Date()
    }
  });
};

// Статический метод для поиска пользователя по имени или email
userSchema.statics.findByCredentials = async function(identifier) {
  return this.findOne({
    $or: [
      { username: identifier },
      { email: identifier }
    ]
  }).select('+password');
};

const User = mongoose.model('User', userSchema);

module.exports = User;