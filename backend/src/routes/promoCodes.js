const express = require('express');
const PromoCode = require('../models/PromoCode');
const { authenticateToken } = require('../middleware/auth');
const { mongoose } = require('../config/mongodb');

const router = express.Router();

// Функция для определения, использовать ли MongoDB или файлы
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Функция проверки валидности ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
};

// Fallback для файлового хранилища
const fs = require('fs').promises;
const path = require('path');
const PROMO_CODES_FILE = path.join(__dirname, '../../data/promoCodes.json');

async function loadPromoCodesFromFile() {
  try {
    const data = await fs.readFile(PROMO_CODES_FILE, 'utf8');
    const parsed = JSON.parse(data);
    return parsed.promoCodes || [];
  } catch (error) {
    console.error('Ошибка загрузки промокодов из файла:', error);
    return [];
  }
}

async function savePromoCodeToFile(promoCodes) {
  try {
    const data = {
      promoCodes,
      lastUpdated: new Date().toISOString()
    };
    await fs.writeFile(PROMO_CODES_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Ошибка сохранения промокодов в файл:', error);
    return false;
  }
}

// Функции для работы с промокодами через MongoDB
async function getAllPromoCodes() {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с промокодами.');
  }
  return await PromoCode.find().sort({ createdAt: -1 });
}

async function getPromoCodeById(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с промокодами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await PromoCode.findById(id);
}

async function createPromoCodeData(promoCodeData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с промокодами.');
  }
  const promoCode = new PromoCode(promoCodeData);
  return await promoCode.save();
}

async function updatePromoCodeData(id, updateData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с промокодами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await PromoCode.findByIdAndUpdate(id, updateData, { new: true });
}

async function deletePromoCodeData(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с промокодами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await PromoCode.findByIdAndDelete(id);
}

async function findPromoCodeByCode(code) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с промокодами.');
  }
  return await PromoCode.findByCode(code);
}

// Проверка активности промокода для файлового хранилища
function isPromoCodeActiveFile(promoCode) {
  if (promoCode.type === 'permanent') {
    return true;
  }
  
  if (promoCode.type === 'temporary') {
    const now = new Date();
    const startDate = new Date(promoCode.startDate);
    const endDate = new Date(promoCode.endDate);
    return now >= startDate && now <= endDate;
  }
  
  return false;
}

// GET /api/promo-codes - Получить все промокоды
router.get('/', async (req, res) => {
  try {
    const promoCodes = await getAllPromoCodes();
    
    
    // Форматируем промокоды для фронтенда (добавляем id поле)
    const formattedPromoCodes = promoCodes.map(promoCode => ({
      id: promoCode._id,
      code: promoCode.code,
      name: promoCode.name,
      type: promoCode.type,
      startDate: promoCode.startDate,
      endDate: promoCode.endDate,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      currency: promoCode.currency,
      description: promoCode.description,
      isActive: promoCode.isActive,
      usageCount: promoCode.usageCount || 0,
      createdAt: promoCode.createdAt,
      updatedAt: promoCode.updatedAt
    }));
    
    
    res.json({
      success: true,
      promoCodes: formattedPromoCodes
    });
  } catch (error) {
    console.error('❌ Ошибка получения промокодов:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// GET /api/promo-codes/:id - Получить промокод по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const promoCode = await getPromoCodeById(id);
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Промокод не найден'
      });
    }
    
    res.json({
      success: true,
      promoCode
    });
  } catch (error) {
    console.error('❌ Ошибка получения промокода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// POST /api/promo-codes - Создать новый промокод
router.post('/', async (req, res) => {
  try {
    const {
      code,
      name,
      type,
      startDate,
      endDate,
      discountType,
      discountValue,
      currency,
      description
    } = req.body;

    // Валидация
    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Код промокода обязателен'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Название промокода обязательно'
      });
    }

    if (!type || !['permanent', 'temporary'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Тип промокода должен быть permanent или temporary'
      });
    }

    if (type === 'temporary') {
      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Для временного промокода обязательны даты начала и окончания'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start >= end) {
        return res.status(400).json({
          success: false,
          message: 'Дата начала должна быть раньше даты окончания'
        });
      }
    }

    if (!discountType || !['percentage', 'fixed'].includes(discountType)) {
      return res.status(400).json({
        success: false,
        message: 'Тип скидки должен быть percentage или fixed'
      });
    }

    if (!discountValue || discountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Значение скидки должно быть больше 0'
      });
    }

    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: 'Процентная скидка не может быть больше 100%'
      });
    }

    if (discountType === 'fixed' && (!currency || !currency.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Для фиксированной скидки обязательна валюта'
      });
    }

    const promoCodeData = {
      code: code.trim(),
      name: name.trim(),
      type,
      startDate: type === 'temporary' ? startDate : undefined,
      endDate: type === 'temporary' ? endDate : undefined,
      discountType,
      discountValue: parseFloat(discountValue),
      currency: discountType === 'fixed' ? currency.trim() : undefined,
      description: description ? description.trim() : ''
    };

    const newPromoCode = await createPromoCodeData(promoCodeData);

    res.status(201).json({
      success: true,
      promoCode: newPromoCode
    });
  } catch (error) {
    console.error('❌ Ошибка создания промокода:', error);
    
    // Обработка дублирования кода (MongoDB E11000 error)
    if (error.code === 11000 && error.keyPattern && error.keyPattern.code) {
      return res.status(400).json({
        success: false,
        message: `Промокод с кодом "${error.keyValue.code}" уже существует`
      });
    }
    
    // Обработка других ошибок валидации
    if (error.message.includes('уже существует')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// PUT /api/promo-codes/:id - Обновить промокод
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Базовая валидация
    if (updateData.code && !updateData.code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Код промокода не может быть пустым'
      });
    }

    if (updateData.discountValue && updateData.discountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Значение скидки должно быть больше 0'
      });
    }

    const updatedPromoCode = await updatePromoCodeData(id, updateData);

    if (!updatedPromoCode) {
      return res.status(404).json({
        success: false,
        message: 'Промокод не найден'
      });
    }

    res.json({
      success: true,
      promoCode: updatedPromoCode
    });
  } catch (error) {
    console.error('❌ Ошибка обновления промокода:', error);
    
    if (error.message.includes('уже существует')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// DELETE /api/promo-codes/:id - Удалить промокод
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedPromoCode = await deletePromoCodeData(id);
    
    if (!deletedPromoCode) {
      return res.status(404).json({
        success: false,
        message: 'Промокод не найден'
      });
    }

    res.json({
      success: true,
      message: 'Промокод успешно удален'
    });
  } catch (error) {
    console.error('❌ Ошибка удаления промокода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});



// DELETE /api/promo-codes/:id - Удалить промокод
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id || id === 'undefined') {
      return res.status(400).json({
        success: false,
        message: 'ID промокода обязателен'
      });
    }

    const deletedPromoCode = await deletePromoCodeData(id);

    if (!deletedPromoCode) {
      return res.status(404).json({
        success: false,
        message: 'Промокод не найден'
      });
    }

    res.json({
      success: true,
      message: 'Промокод успешно удален'
    });
  } catch (error) {
    console.error('❌ Ошибка удаления промокода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// POST /api/promo-codes/validate/:code - Проверить промокод
router.post('/validate/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const promoCode = await findPromoCodeByCode(code);
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        message: 'Промокод не найден'
      });
    }

    const isActive = promoCode.isCurrentlyActive;
    
    res.json({
      success: true,
      promoCode,
      valid: isActive
    });
  } catch (error) {
    console.error('❌ Ошибка валидации промокода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// POST /api/promo-codes/validate - Проверить промокод и рассчитать скидку
router.post('/validate', async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    
    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена');
    }
    
    
    if (!code || !code.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Промокод не указан'
      });
    }
    
    if (!orderAmount || orderAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Сумма заказа должна быть больше нуля'
      });
    }
    
    const promoCode = await PromoCode.findOne({ 
      code: code.trim(),
      isActive: true 
    });
    
    if (!promoCode) {
      return res.status(404).json({
        success: false,
        valid: false,
        message: 'Промокод не найден или неактивен'
      });
    }
    
    // Проверяем тип промокода и даты
    if (promoCode.type === 'temporary') {
      const now = new Date();
      
      if (promoCode.startDate && now < promoCode.startDate) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: 'Промокод еще не активен'
        });
      }
      
      if (promoCode.endDate && now > promoCode.endDate) {
        return res.status(400).json({
          success: false,
          valid: false,
          message: 'Срок действия промокода истек'
        });
      }
    }
    
    // Рассчитываем скидку
    let discount = 0;
    let discountFormatted = '';
    
    if (promoCode.discountType === 'percentage') {
      discount = Math.round(orderAmount * (promoCode.discountValue / 100));
      discountFormatted = `${promoCode.discountValue}%`;
    } else if (promoCode.discountType === 'fixed') {
      discount = promoCode.discountValue;
      discountFormatted = `${promoCode.discountValue} ${promoCode.currency || 'RUB'}`;
    }
    
    // Скидка не может быть больше суммы заказа
    discount = Math.min(discount, orderAmount);
    const finalAmount = Math.max(0, orderAmount - discount);
    
    
    res.json({
      success: true,
      valid: true,
      promoCode: {
        id: promoCode._id,
        code: promoCode.code,
        name: promoCode.name,
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue,
        discountFormatted
      },
      orderAmount,
      discount,
      finalAmount,
      message: `Промокод применен! Скидка: ${discountFormatted}`
    });
  } catch (error) {
    console.error('❌ Ошибка валидации промокода:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при проверке промокода'
    });
  }
});

module.exports = router;
