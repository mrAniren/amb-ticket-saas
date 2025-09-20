const express = require('express');
const PromoCode = require('../models/PromoCode');
const { authenticateToken } = require('../middleware/auth');
const { mongoose } = require('../config/mongodb');

const router = express.Router();

// Функция для определения, использовать ли MongoDB или файлы
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
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

// Универсальные функции для работы с промокодами
async function getAllPromoCodes() {
  if (isMongoConnected()) {
    return await PromoCode.find().sort({ createdAt: -1 });
  } else {
    const promoCodes = await loadPromoCodesFromFile();
    return promoCodes.map(pc => ({
      ...pc,
      isActive: isPromoCodeActiveFile(pc)
    }));
  }
}

async function getPromoCodeById(id) {
  if (isMongoConnected()) {
    return await PromoCode.findById(id);
  } else {
    const promoCodes = await loadPromoCodesFromFile();
    const promoCode = promoCodes.find(pc => pc.id === id);
    if (promoCode) {
      promoCode.isActive = isPromoCodeActiveFile(promoCode);
    }
    return promoCode;
  }
}

async function createPromoCodeData(promoCodeData) {
  if (isMongoConnected()) {
    const promoCode = new PromoCode(promoCodeData);
    return await promoCode.save();
  } else {
    const promoCodes = await loadPromoCodesFromFile();
    
    // Проверяем уникальность кода
    const existingCode = promoCodes.find(pc => pc.code.toLowerCase() === promoCodeData.code.toLowerCase());
    if (existingCode) {
      throw new Error('Промокод с таким кодом уже существует');
    }
    
    const newPromoCode = {
      id: require('uuid').v4(),
      code: promoCodeData.code.toUpperCase(),
      name: promoCodeData.name,
      type: promoCodeData.type,
      startDate: promoCodeData.startDate || null,
      endDate: promoCodeData.endDate || null,
      discountType: promoCodeData.discountType,
      discountValue: parseFloat(promoCodeData.discountValue),
      currency: promoCodeData.currency || null,
      description: promoCodeData.description || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    promoCodes.push(newPromoCode);
    await savePromoCodeToFile(promoCodes);
    newPromoCode.isActive = isPromoCodeActiveFile(newPromoCode);
    return newPromoCode;
  }
}

async function updatePromoCodeData(id, updateData) {
  if (isMongoConnected()) {
    return await PromoCode.findByIdAndUpdate(id, updateData, { new: true });
  } else {
    const promoCodes = await loadPromoCodesFromFile();
    const index = promoCodes.findIndex(pc => pc.id === id);
    if (index === -1) return null;
    
    // Проверяем уникальность кода (исключая текущий промокод)
    if (updateData.code) {
      const existingCode = promoCodes.find(pc => 
        pc.id !== id && pc.code.toLowerCase() === updateData.code.toLowerCase()
      );
      if (existingCode) {
        throw new Error('Промокод с таким кодом уже существует');
      }
    }
    
    promoCodes[index] = {
      ...promoCodes[index],
      ...updateData,
      code: updateData.code ? updateData.code.toUpperCase() : promoCodes[index].code,
      discountValue: updateData.discountValue ? parseFloat(updateData.discountValue) : promoCodes[index].discountValue,
      updatedAt: new Date().toISOString()
    };
    
    await savePromoCodeToFile(promoCodes);
    promoCodes[index].isActive = isPromoCodeActiveFile(promoCodes[index]);
    return promoCodes[index];
  }
}

async function deletePromoCodeData(id) {
  if (isMongoConnected()) {
    return await PromoCode.findByIdAndDelete(id);
  } else {
    const promoCodes = await loadPromoCodesFromFile();
    const index = promoCodes.findIndex(pc => pc.id === id);
    if (index === -1) return null;
    
    const deletedPromoCode = promoCodes[index];
    promoCodes.splice(index, 1);
    await savePromoCodeToFile(promoCodes);
    return deletedPromoCode;
  }
}

async function findPromoCodeByCode(code) {
  if (isMongoConnected()) {
    return await PromoCode.findByCode(code);
  } else {
    const promoCodes = await loadPromoCodesFromFile();
    const promoCode = promoCodes.find(pc => pc.code.toLowerCase() === code.toLowerCase());
    if (promoCode) {
      promoCode.isActive = isPromoCodeActiveFile(promoCode);
    }
    return promoCode;
  }
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
    
    
    res.json({
      success: true,
      promoCodes
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

    const isActive = isMongoConnected() ? promoCode.isCurrentlyActive() : promoCode.isActive;
    
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

module.exports = router;
