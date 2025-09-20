const mongoose = require('mongoose');

const connectMongoDB = async () => {
  try {
    // MongoDB connection string - можно использовать локальную или облачную базу
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/seatmap';
    
    console.log('🔄 Подключение к MongoDB...');
    console.log('📍 URI:', mongoURI.replace(/\/\/.*@/, '//***:***@')); // Скрываем пароль в логах
    
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000, // Таймаут подключения 5 секунд
      socketTimeoutMS: 45000, // Таймаут сокета 45 секунд
      family: 4 // Используем IPv4
    });

    console.log('✅ MongoDB подключена успешно');
    console.log('📊 База данных:', mongoose.connection.name);
    
    // Обработчики событий подключения
    mongoose.connection.on('error', (err) => {
      console.error('❌ Ошибка MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB отключена');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB переподключена');
    });

    return mongoose.connection;
  } catch (error) {
    console.error('❌ Ошибка подключения к MongoDB:', error.message);
    
    // В случае ошибки подключения к MongoDB, продолжаем работу с файловым хранилищем
    console.log('⚠️ Продолжаем работу с файловым хранилищем');
    return null;
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('🔒 MongoDB подключение закрыто');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка при закрытии MongoDB:', error);
    process.exit(1);
  }
});

module.exports = { connectMongoDB, mongoose };
