const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const PriceScheme = require('../models/PriceScheme');
const Hall = require('../models/Hall');
const { mongoose } = require('../config/mongodb');

// Функция для определения, использовать ли MongoDB или файлы
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Функция для проверки валидности ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && id.length === 24;
};

// Путь к файлу с распаесовками
const PRICE_SCHEMES_FILE = path.join(__dirname, '../../data/priceSchemes.json');

// Хранилище распаесовок в памяти (fallback)
let priceSchemesStorage = new Map();
let nextPriceSchemeId = 1;

// Путь к файлу с залами для получения названий
const HALLS_FILE = path.join(__dirname, '../../data/halls.json');

// Функция получения названия зала по ID через MongoDB
async function getHallNameById(hallId) {
  try {
    if (isMongoConnected()) {
      const hall = await Hall.findById(hallId);
      return hall ? hall.name : `Зал ${hallId}`;
    }
  } catch (error) {
    console.error('Ошибка получения названия зала:', error);
  }
  return `Зал ${hallId}`;
}

// Функции для работы с распоясовками через MongoDB
async function getAllPriceSchemes() {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с распоясовками.');
  }
  return await PriceScheme.find().sort({ name: 1 });
}

async function getPriceSchemeById(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с распоясовками.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await PriceScheme.findById(id);
}

async function createPriceSchemeData(priceSchemeData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с распоясовками.');
  }
  const priceScheme = new PriceScheme(priceSchemeData);
  return await priceScheme.save();
}

async function updatePriceSchemeData(id, updateData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с распоясовками.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await PriceScheme.findByIdAndUpdate(id, updateData, { new: true });
}

async function deletePriceSchemeData(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с распоясовками.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await PriceScheme.findByIdAndDelete(id);
}

async function getPriceSchemesByHallId(hallId) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с распоясовками.');
  }
  
  let priceSchemes = [];
  
  try {
    // Если hallId выглядит как ObjectId (24 символа hex), ищем как ObjectId
    if (isValidObjectId(hallId)) {
      priceSchemes = await PriceScheme.find({ hallId: hallId });
    } else {
      // Для старых данных используем raw MongoDB запрос, чтобы избежать CastError
      const rawPriceSchemes = await mongoose.connection.db.collection('priceschemes').find({
        $or: [
          { hallId: hallId },
          { hallId: parseInt(hallId) },
          { hallId: hallId.toString() }
        ]
      }).toArray();
      
      // Конвертируем в Mongoose документы
      priceSchemes = rawPriceSchemes.map(raw => new PriceScheme(raw));
    }
  } catch (castError) {
    // Fallback к raw запросу если Mongoose не может кастить
    const rawPriceSchemes = await mongoose.connection.db.collection('priceschemes').find({
      $or: [
        { hallId: hallId },
        { hallId: parseInt(hallId) },
        { hallId: hallId.toString() }
      ]
    }).toArray();
    
    priceSchemes = rawPriceSchemes.map(raw => new PriceScheme(raw));
  }
  
  return priceSchemes;
}

// Функция загрузки распаесовок из файла
async function loadPriceSchemes() {
  try {
    if (!fsSync.existsSync(PRICE_SCHEMES_FILE)) {
      await savePriceSchemes(new Map());
      return;
    }

    const data = await fs.readFile(PRICE_SCHEMES_FILE, 'utf8');

    if (data.trim()) {
      const parsed = JSON.parse(data);

      // Конвертируем массив в Map
      priceSchemesStorage.clear();
      let maxId = 0;

      parsed.forEach(scheme => {
        priceSchemesStorage.set(scheme.id, scheme);
        const numId = parseInt(scheme.id);
        if (!isNaN(numId) && numId > maxId) {
          maxId = numId;
        }
      });

      nextPriceSchemeId = maxId + 1;
    } else {
      priceSchemesStorage.clear();
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки распаесовок:', error);
    priceSchemesStorage.clear();
  }
}

// Функция сохранения распаесовок в файл
async function savePriceSchemes(schemes = priceSchemesStorage) {
  try {
    // Создаем директорию если не существует
    const dir = path.dirname(PRICE_SCHEMES_FILE);
    if (!fsSync.existsSync(dir)) {
      await fs.mkdir(dir, { recursive: true });
    }

    const data = JSON.stringify(Array.from(schemes.values()), null, 2);
    await fs.writeFile(PRICE_SCHEMES_FILE, data, 'utf8');
  } catch (error) {
    console.error('❌ Ошибка сохранения распаесовок:', error);
    throw error;
  }
}

// GET /api/price-schemes - Получить все распаесовки
router.get('/', async (req, res) => {
  try {
    const priceSchemes = await getAllPriceSchemes();
    
    res.json({
      success: true,
      priceSchemes,
      total: priceSchemes.length
    });
  } catch (error) {
    console.error('❌ Ошибка получения распоясовок:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при получении списка распоясовок'
    });
  }
});

// GET /api/price-schemes/:id - Получить распоясовку по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const priceScheme = await getPriceSchemeById(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распоясовка не найдена'
      });
    }

    // Форматируем данные для совместимости с фронтендом
    const formattedPriceScheme = {
      id: priceScheme._id || priceScheme.id,
      name: priceScheme.name,
      hallId: priceScheme.hallId,
      prices: priceScheme.prices || [],
      seatPrices: priceScheme.seatPrices || [],
      created_at: priceScheme.createdAt || priceScheme.created_at,
      updated_at: priceScheme.updatedAt || priceScheme.updated_at
    };

    res.json({
      success: true,
      priceScheme: formattedPriceScheme
    });
  } catch (error) {
    console.error('❌ Ошибка получения распоясовки:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Ошибка при получении распоясовки'
    });
  }
});

// DELETE /api/price-schemes/:id - Удалить распоясовку
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем существование распоясовки
    const priceScheme = await getPriceSchemeById(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        message: 'Распоясовка не найдена'
      });
    }
    
    // Удаляем распоясовку
    const deletedPriceScheme = await deletePriceSchemeData(id);
    
    if (!deletedPriceScheme) {
      return res.status(404).json({
        success: false,
        message: 'Распоясовка не найдена'
      });
    }
    
    res.json({
      success: true,
      message: 'Распоясовка успешно удалена',
      priceScheme: {
        id: deletedPriceScheme._id,
        name: deletedPriceScheme.name
      }
    });
  } catch (error) {
    console.error('❌ DELETE ROUTE: Error deleting price scheme:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении распоясовки'
    });
  }
});

// POST /api/price-schemes - Создать новую распоясовку
router.post('/', async (req, res) => {
  try {
    const { name, hallId } = req.body;

    // Валидация
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Название распоясовки обязательно'
      });
    }

    if (!hallId) {
      return res.status(400).json({
        success: false,
        error: 'ID зала обязателен'
      });
    }

    // Получаем информацию о зале и его местах
    const hall = await Hall.findById(hallId);
    if (!hall) {
      return res.status(404).json({
        success: false,
        error: 'Зал не найден'
      });
    }

    const hallName = hall.name;
    const hallSeats = hall.seats || []; // Получаем места из базы данных

    // Создаем seatPrices только для мест (objectType: 'seat')
    // Обрабатываем существующий формат данных из базы seatmap
    const clickableSeats = hallSeats.filter(seat => 
      seat.objectType === 'seat' && 
      seat.row && 
      seat.place && 
      seat.zone
    );
    
    const seatPrices = clickableSeats.map(seat => ({
      seatId: seat.id, // В существующих данных поле называется 'id'
      priceId: null, // Цена будет назначена позже
      row: seat.row,
      seatNumber: seat.place, // В существующих данных поле называется 'place'
      section: seat.zone // В существующих данных поле называется 'zone'
    }));

    const newPriceScheme = await createPriceSchemeData({
      name: name.trim(),
      hallId: hallId.toString(),
      hallName: hallName,
      prices: [],
      seatPrices: seatPrices
    });

    // Форматируем ответ для фронтенда
    const formattedPriceScheme = {
      id: newPriceScheme._id,
      name: newPriceScheme.name,
      hallId: newPriceScheme.hallId,
      prices: newPriceScheme.prices || [],
      seatPrices: newPriceScheme.seatPrices || [],
      created_at: newPriceScheme.createdAt,
      updated_at: newPriceScheme.updatedAt
    };

    res.status(201).json({
      success: true,
      priceScheme: formattedPriceScheme
    });
  } catch (error) {
    console.error('❌ Ошибка создания распаесовки:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при создании распаесовки'
    });
  }
});

// PUT /api/price-schemes/:id - Обновить распаесовку
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, prices, seatPrices } = req.body;

    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена. Подключите базу данных для работы с распоясовками.');
    }

    // Находим распоясовку
    const priceScheme = await getPriceSchemeById(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распаесовка не найдена'
      });
    }

    // Подготавливаем данные для обновления
    const updateData = {};
    
    if (name !== undefined && name.trim()) {
      updateData.name = name.trim();
    }
    
    if (prices !== undefined) {
      updateData.prices = prices;
    }
    
    if (seatPrices !== undefined) {
      updateData.seatPrices = seatPrices;
    }

    updateData.updatedAt = new Date();
    
    // Обновляем в MongoDB
    const updatedPriceScheme = await PriceScheme.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedPriceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распаесовка не найдена'
      });
    }

    // Форматируем ответ
    const formattedPriceScheme = {
      id: updatedPriceScheme._id,
      name: updatedPriceScheme.name,
      hallId: updatedPriceScheme.hallId,
      prices: updatedPriceScheme.prices || [],
      seatPrices: updatedPriceScheme.seatPrices || [],
      created_at: updatedPriceScheme.createdAt,
      updated_at: updatedPriceScheme.updatedAt
    };

    res.json({
      success: true,
      priceScheme: formattedPriceScheme
    });
  } catch (error) {
    console.error('❌ PUT ROUTE: Ошибка обновления распаесовки:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении распаесовки'
    });
  }
});

// DELETE /api/price-schemes/:id - Удалить распаесовку (fallback для файлов)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const priceScheme = priceSchemesStorage.get(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распаесовка не найдена'
      });
    }

    priceSchemesStorage.delete(id);
    await savePriceSchemes();

    res.json({
      success: true,
      message: 'Распаесовка успешно удалена'
    });
  } catch (error) {
    console.error('❌ Ошибка удаления распаесовки:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении распаесовки'
    });
  }
});

// POST /api/price-schemes/:id/prices - Добавить цену к распаесовке
router.post('/:id/prices', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, currency, color } = req.body;

    // Получаем распаесовку из MongoDB
    const priceScheme = await getPriceSchemeById(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распаесовка не найдена'
      });
    }

    // Валидация
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Название цены обязательно'
      });
    }

    if (typeof value !== 'number' || value < 0) {
      return res.status(400).json({
        success: false,
        error: 'Цена должна быть положительным числом'
      });
    }

    if (!currency || !currency.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Валюта обязательна'
      });
    }

    if (!color || !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return res.status(400).json({
        success: false,
        error: 'Цвет должен быть в формате HEX (#RRGGBB)'
      });
    }

    const newPrice = {
      id: uuidv4(),
      name: name.trim(),
      value,
      currency,
      color
    };

    // Добавляем цену к массиву prices
    const updatedPrices = [...(priceScheme.prices || []), newPrice];
    
    // Обновляем распаесовку в MongoDB
    const updatedPriceScheme = await updatePriceSchemeData(id, {
      prices: updatedPrices,
      updatedAt: new Date()
    });

    if (!updatedPriceScheme) {
      return res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении распаесовки'
      });
    }

    // Форматируем данные для фронтенда
    const formattedPriceScheme = {
      id: updatedPriceScheme._id,
      name: updatedPriceScheme.name,
      hallId: updatedPriceScheme.hallId,
      prices: updatedPriceScheme.prices || [],
      seatPrices: updatedPriceScheme.seatPrices || [],
      created_at: updatedPriceScheme.createdAt,
      updated_at: updatedPriceScheme.updatedAt
    };

    res.status(201).json({
      success: true,
      price: newPrice,
      priceScheme: formattedPriceScheme
    });
  } catch (error) {
    console.error('❌ Ошибка добавления цены:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при добавлении цены'
    });
  }
});

// PUT /api/price-schemes/:id/prices/:priceId - Обновить цену
router.put('/:id/prices/:priceId', async (req, res) => {
  try {
    const { id, priceId } = req.params;
    const { name, value, currency, color } = req.body;

    const priceScheme = priceSchemesStorage.get(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распаесовка не найдена'
      });
    }

    const priceIndex = priceScheme.prices.findIndex(p => p.id === priceId);
    
    if (priceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Цена не найдена'
      });
    }

    const price = priceScheme.prices[priceIndex];

    // Обновляем поля
    if (name !== undefined) price.name = name.trim();
    if (value !== undefined) price.value = value;
    if (currency !== undefined) price.currency = currency;
    if (color !== undefined) price.color = color;

    priceScheme.updatedAt = new Date().toISOString();

    priceSchemesStorage.set(id, priceScheme);
    await savePriceSchemes();

    res.json({
      success: true,
      price,
      priceScheme
    });
  } catch (error) {
    console.error('❌ Ошибка обновления цены:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при обновлении цены'
    });
  }
});

// DELETE /api/price-schemes/:id/prices/:priceId - Удалить цену
router.delete('/:id/prices/:priceId', async (req, res) => {
  try {
    const { id, priceId } = req.params;

    // Получаем распаесовку из MongoDB
    const priceScheme = await getPriceSchemeById(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распаесовка не найдена'
      });
    }

    const prices = priceScheme.prices || [];
    const priceIndex = prices.findIndex(p => p.id === priceId);
    
    if (priceIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'Цена не найдена'
      });
    }

    // Удаляем все привязки мест к этой цене
    const seatPrices = priceScheme.seatPrices || [];
    const filteredSeatPrices = seatPrices.filter(sp => sp.priceId !== priceId);
    
    // Удаляем саму цену
    const updatedPrices = prices.filter(p => p.id !== priceId);

    // Обновляем распаесовку в MongoDB
    const updatedPriceScheme = await updatePriceSchemeData(id, {
      prices: updatedPrices,
      seatPrices: filteredSeatPrices
    });

    if (!updatedPriceScheme) {
      return res.status(500).json({
        success: false,
        error: 'Ошибка при удалении цены'
      });
    }

    res.json({
      success: true,
      message: 'Цена успешно удалена',
      priceScheme: updatedPriceScheme
    });
  } catch (error) {
    console.error('❌ Ошибка удаления цены:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при удалении цены'
    });
  }
});

// POST /api/price-schemes/:id/apply-price - Применить цену к местам
router.post('/:id/apply-price', async (req, res) => {
  try {
    const { id } = req.params;
    const { seatIds, priceId } = req.body;

    // Получаем распаесовку из MongoDB
    const priceScheme = await getPriceSchemeById(id);
    
    if (!priceScheme) {
      return res.status(404).json({
        success: false,
        error: 'Распаесовка не найдена'
      });
    }

    // Проверяем что цена существует
    const prices = priceScheme.prices || [];
    const price = prices.find(p => p.id === priceId);
    if (!price) {
      return res.status(400).json({
        success: false,
        error: 'Указанная цена не найдена'
      });
    }

    if (!Array.isArray(seatIds) || seatIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Список мест не может быть пустым'
      });
    }

    // Удаляем старые привязки для выбранных мест
    const existingSeatPrices = priceScheme.seatPrices || [];
    const filteredSeatPrices = existingSeatPrices.filter(sp => !seatIds.includes(sp.seatId));
    
    // Добавляем новые привязки
    const newSeatPrices = seatIds.map(seatId => ({
      seatId,
      priceId
    }));

    const updatedSeatPrices = [...filteredSeatPrices, ...newSeatPrices];

    // Обновляем распаесовку в MongoDB
    const updatedPriceScheme = await updatePriceSchemeData(id, {
      seatPrices: updatedSeatPrices,
      updatedAt: new Date()
    });

    if (!updatedPriceScheme) {
      return res.status(500).json({
        success: false,
        error: 'Ошибка при обновлении распаесовки'
      });
    }

    // Форматируем данные для фронтенда
    const formattedPriceScheme = {
      id: updatedPriceScheme._id,
      name: updatedPriceScheme.name,
      hallId: updatedPriceScheme.hallId,
      prices: updatedPriceScheme.prices || [],
      seatPrices: updatedPriceScheme.seatPrices || [],
      created_at: updatedPriceScheme.createdAt,
      updated_at: updatedPriceScheme.updatedAt
    };

    res.json({
      success: true,
      message: `Цена применена к ${seatIds.length} местам`,
      priceScheme: formattedPriceScheme
    });
  } catch (error) {
    console.error('❌ Ошибка применения цены:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка при применении цены к местам'
    });
  }
});

// GET /api/price-schemes/hall/:hallId - Получить распоясовки для зала
router.get('/hall/:hallId', async (req, res) => {
  try {
    const { hallId } = req.params;
    
    // Получаем распаесовки для зала из MongoDB
    const priceSchemes = await getPriceSchemesByHallId(hallId);
    
    // Форматируем данные для фронтенда
    const formattedPriceSchemes = priceSchemes.map(ps => ({
      id: ps._id,
      name: ps.name,
      hallId: ps.hallId,
      prices: ps.prices || [],
      seatPrices: ps.seatPrices || [],
      created_at: ps.createdAt,
      updated_at: ps.updatedAt
    }));
    
    res.json({
      success: true,
      priceSchemes: formattedPriceSchemes
    });
  } catch (error) {
    console.error('❌ Error getting hall price schemes:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке распоясовок зала'
    });
  }
});

module.exports = router;
