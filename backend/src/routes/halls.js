const express = require('express');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const { authenticateToken } = require('../middleware/auth');
const { uploadFields } = require('../middleware/upload');
const { validateHall, validateId } = require('../middleware/validation');
const Hall = require('../models/Hall');
const { mongoose } = require('../config/mongodb');
const SVGParser = require('../utils/svgParser');

/**
 * Определяет тип объекта на основе размера, позиции и атрибутов
 * @param {Object} seat - объект места из парсера
 * @param {number} index - индекс элемента
 * @returns {string} тип объекта
 */
function determineObjectType(seat, index) {
  const { width, height, x, y, svgElementId, svgTagName } = seat;
  const elementId = (svgElementId || '').toLowerCase();
  
  // Проверяем по ID элемента
  if (elementId.includes('scene') || elementId.includes('stage')) {
    return 'scene';
  }
  
  if (elementId.includes('decoration') || elementId.includes('decor')) {
    return 'decoration';
  }
  
  if (elementId.includes('passage') || elementId.includes('aisle') || 
      elementId.includes('corridor')) {
    return 'passage';
  }
  
  if (elementId.includes('tech') || elementId.includes('technical') ||
      elementId.includes('service')) {
    return 'technical_zone';
  }
  
  // Проверяем по размеру
  const area = width * height;
  
  // Очень большие объекты (сцена, большие декорации)
  if (area > 15000 || width > 250 || height > 250) {
    // Если находится в верхней части - вероятно сцена
    if (y < 150) {
      return 'scene';
    }
    return 'decoration';
  }
  
  // Длинные узкие объекты (проходы)
  if ((width > 150 && height < 25) || (height > 150 && width < 25)) {
    return 'passage';
  }
  
  // Средние объекты могут быть техническими зонами
  if (area > 2000 && area < 10000) {
    return 'technical_zone';
  }
  
  // Маленькие объекты размером с место - скорее всего места
  if (area < 2000 && width < 80 && height < 80) {
    return 'seat';
  }
  
  // Неопознанные объекты среднего размера - вероятно технические
  if (area > 500) {
    return 'technical_zone';
  }
  
  // Очень маленькие объекты - пропускаем (не рендерим)
  return 'unknown';
}

const router = express.Router();

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Функция для определения, использовать ли MongoDB или файлы
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Функция проверки валидности ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
};





async function createHallData(hallData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с залами.');
  }
  const hall = new Hall(hallData);
  return await hall.save();
}

async function updateHallData(id, updateData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с залами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Hall.findByIdAndUpdate(id, updateData, { new: true });
}

async function deleteHallData(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с залами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Hall.findByIdAndDelete(id);
}

// GET /api/halls - получить список залов
router.get('/', async (req, res) => {
  try {
    const hallsData = await getAllHalls();
    
    
    // Форматируем данные для совместимости с фронтендом
    const halls = hallsData.map(hall => ({
      id: hall._id || hall.id,
      name: hall.name,
      city: hall.city,
      address: hall.address,
      description: hall.description,
      capacity: hall.capacity,
      photo_url: hall.photo_file || hall.photo_url,
      svg_file: hall.svg_file,
      svg_url: hall.svg_file, // Маппинг svg_file -> svg_url для фронтенда
      seat_count: hall.metadata?.totalSeats || hall.seat_count || 0,
      last_modified: hall.updatedAt || hall.updated_at,
      created_at: hall.createdAt || hall.created_at
    }));

    res.json({
      halls,
      total: halls.length
    });
  } catch (error) {
    console.error('❌ Error fetching halls:', error);
    res.status(500).json({ error: 'Failed to fetch halls' });
  }
});

// GET /api/halls/:id - получить конкретный зал
router.get('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    
    const hall = await getHallById(id);
    
    if (!hall) {
      return res.status(404).json({ error: 'Hall not found' });
    }

    // Форматируем данные для совместимости
    const formattedHall = {
      id: hall._id || hall.id,
      name: hall.name,
      city: hall.city,
      address: hall.address,
      description: hall.description,
      capacity: hall.capacity,
      currency: hall.currency, // Добавляем валюту
      photo_file: hall.photo_file || hall.photo_url,
      photo_url: hall.photo_file || hall.photo_url, // Для совместимости
      svg_file: hall.svg_file,
      svg_url: hall.svg_file, // Маппинг svg_file -> svg_url для фронтенда
      seat_config: hall.seat_config,
      zone_config: hall.zone_config,
      seat_count: hall.metadata?.totalSeats || hall.seat_count || 0,
      seats: hall.seats || [], // Информация о местах из базы данных
      created_at: hall.createdAt || hall.created_at,
      updated_at: hall.updatedAt || hall.updated_at
    };

    console.log('🔍 Данные зала для фронтенда:', {
      id: formattedHall.id,
      svg_file: formattedHall.svg_file,
      svg_url: formattedHall.svg_url,
      hasFile: !!hall.svg_file,
      hasSeats: !!formattedHall.seats,
      seatsCount: formattedHall.seats?.length || 0,
      seatConfigLength: hall.seat_config?.length || 0,
      rawSeats: Array.isArray(hall.seats) ? hall.seats.slice(0, 2) : [], // Первые 2 места из виртуального поля
      sampleSeatConfig: hall.seat_config?.substring(0, 100) || 'empty'
    });

    res.json({ hall: formattedHall });
  } catch (error) {
    console.error('❌ Error fetching hall:', {
      id: req.params.id,
      error: error.message,
      stack: error.stack,
      mongoConnected: mongoose.connection.readyState === 1
    });
    res.status(500).json({ error: 'Failed to fetch hall' });
  }
});

// MongoDB CRUD функции
async function getAllHalls() {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена');
  }

  try {
    const halls = await Hall.find({ isActive: true }).sort({ name: 1 });
    console.log('✅ Залы загружены из MongoDB:', halls.length);
    return halls;
  } catch (error) {
    console.error('❌ Ошибка загрузки залов из MongoDB:', error);
    throw error;
  }
}

async function getHallById(id) {
  console.log('🔍 Поиск зала в MongoDB:', { id, type: typeof id });
  
  if (!isMongoConnected()) {
    console.log('❌ MongoDB не подключена');
    throw new Error('MongoDB не подключена');
  }

  if (!isValidObjectId(id)) {
    console.log('❌ Неверный ObjectId:', id);
    return null;
  }

  try {
    const hall = await Hall.findById(id);
    console.log('✅ Зал найден в MongoDB:', hall ? hall._id : 'не найден');
    return hall;
  } catch (error) {
    console.error('❌ Ошибка поиска зала в MongoDB:', error);
    throw error;
  }
}

async function createHallData(hallData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена');
  }

  try {
    const newHall = new Hall(hallData);
    const savedHall = await newHall.save();
    console.log('✅ Зал создан в MongoDB:', savedHall._id);
    return savedHall;
  } catch (error) {
    console.error('❌ Ошибка создания зала в MongoDB:', error);
    throw error;
  }
}

async function updateHallData(id, updateData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена');
  }

  if (!isValidObjectId(id)) {
    return null;
  }

  try {
    console.log('🔄 Обновление зала в MongoDB:', {
      id: id,
      updateData: updateData,
      updateDataKeys: Object.keys(updateData)
    });
    
    const updatedHall = await Hall.findByIdAndUpdate(id, updateData, { new: true });
    console.log('✅ Зал обновлен в MongoDB:', updatedHall ? updatedHall._id : 'не найден');
    
    if (updatedHall) {
      console.log('📊 Обновленные поля зала:', {
        capacity: updatedHall.capacity,
        seat_config_length: updatedHall.seat_config ? updatedHall.seat_config.length : 0,
        zone_config_length: updatedHall.zone_config ? updatedHall.zone_config.length : 0
      });
    }
    
    return updatedHall;
  } catch (error) {
    console.error('❌ Ошибка обновления зала в MongoDB:', error);
    throw error;
  }
}


// POST /api/halls - создать новый зал
router.post('/', uploadFields, validateHall, async (req, res) => {
  try {
    const { name, country, city, address, timezone } = req.body;
    const photoFile = req.files?.photo?.[0];
    const svgFile = req.files?.svg?.[0];

    console.log('📝 Создание зала:', { 
      name, 
      country,
      city, 
      address,
      timezone,
      hasPhoto: !!photoFile, 
      hasSvg: !!svgFile,
      photoFilename: photoFile?.filename,
      svgFilename: svgFile?.filename,
      photoPath: photoFile ? `/uploads/photos/${photoFile.filename}` : null,
      svgPath: `/uploads/svg/${svgFile?.filename}`,
      files: req.files
    });

    // Проверяем, что файлы действительно сохранились на диске
    if (svgFile) {
      const svgFullPath = path.join(__dirname, '../../uploads/svg', svgFile.filename);
      const svgExists = fsSync.existsSync(svgFullPath);
      console.log('🔍 Проверка SVG файла:', {
        filename: svgFile.filename,
        fullPath: svgFullPath,
        exists: svgExists,
        size: svgFile.size,
        mimetype: svgFile.mimetype
      });
    }

    if (photoFile) {
      const photoFullPath = path.join(__dirname, '../../uploads/photos', photoFile.filename);
      const photoExists = fsSync.existsSync(photoFullPath);
      console.log('🔍 Проверка фото файла:', {
        filename: photoFile.filename,
        fullPath: photoFullPath,
        exists: photoExists,
        size: photoFile.size,
        mimetype: photoFile.mimetype
      });
    }

    // Проверяем обязательные поля
    if (!svgFile) {
      return res.status(400).json({ error: 'SVG файл обязателен для создания зала' });
    }

    // Данные для создания зала (будут обновлены после парсинга SVG)
    const hallData = {
      name,
      country,
      city,
      address: address || null,
      timezone,
      description: address || null, // Используем address как description
      capacity: 100, // Значение по умолчанию, будет обновлено
      photo_file: photoFile ? `/uploads/photos/${photoFile.filename}` : null,
      svg_file: `/uploads/svg/${svgFile.filename}`, // SVG файл теперь обязательный
      seat_config: '[]', // Будет заполнено после парсинга
      zone_config: '[]' // Будет заполнено после парсинга
    };

    // SVG парсинг перенесен на фронтенд - создаем только метаданные зала
    console.log('📄 Создание зала без серверного парсинга SVG');
    
    const seats = []; // Пустой массив - парсинг будет на фронтенде
    const zones = [{   // Базовая зона по умолчанию
      id: 1,
      name: 'Партер',
      color: '#F8D013',
      is_default: true,
      description: 'Зона по умолчанию',
      section: 'parterre'
    }];
    
    console.log('🏛️ Создана базовая зона для нового зала');
      
    // Обновляем данные зала с базовой конфигурацией
    hallData.seat_config = JSON.stringify(seats);
    hallData.zone_config = JSON.stringify(zones);
    hallData.capacity = 0; // Будет обновлено при сохранении конфигурации

    // Создаем зал в MongoDB
    const newHall = await createHallData(hallData);

    // Форматируем ответ для совместимости с фронтендом
    const formattedHall = {
      id: newHall._id,
      name: newHall.name,
      country: newHall.country,
      city: newHall.city,
      address: newHall.address,
      timezone: newHall.timezone,
      description: newHall.description,
      capacity: newHall.capacity,
      photo_url: newHall.photo_file,
      svg_url: newHall.svg_file,
      seat_config: newHall.seat_config,
      zone_config: newHall.zone_config,
      seat_count: 0, // Будет обновлено при сохранении конфигурации
      seats: [], // Парсинг будет на фронтенде
      zones: newHall.zones, // Виртуальное поле из модели
      created_at: newHall.createdAt,
      updated_at: newHall.updatedAt
    };

    console.log('✅ Зал успешно создан (без парсинга SVG):', {
      id: formattedHall.id,
      name: formattedHall.name,
      capacity: formattedHall.capacity,
      zonesCount: zones.length,
      zones: zones.map(z => ({ id: z.id, name: z.name, section: z.section })),
      svg_url: formattedHall.svg_url,
      photo_url: formattedHall.photo_url,
      note: 'SVG парсинг будет выполнен на фронтенде'
    });
    
    res.status(201).json({ hall: formattedHall });
  } catch (error) {
    console.error('❌ Ошибка создания зала:', error);
    res.status(500).json({ error: 'Failed to create hall' });
  }
});

// PUT /api/halls/:id - обновить зал
router.put('/:id', validateId, uploadFields, validateHall, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, country, city, address, timezone } = req.body;
    const photoFile = req.files?.photo?.[0];
    const svgFile = req.files?.svg?.[0];

    console.log('📝 Обновление зала:', { id, name, country, city, address, timezone, hasPhoto: !!photoFile, hasSvg: !!svgFile });

    // Подготавливаем данные для обновления
    const updateData = {};
    if (name) updateData.name = name;
    if (country !== undefined) updateData.country = country;
    if (city !== undefined) updateData.city = city;
    if (address !== undefined) updateData.address = address;
    if (timezone !== undefined) updateData.timezone = timezone;
    if (photoFile) updateData.photo_file = `/uploads/photos/${photoFile.filename}`;
    if (svgFile) updateData.svg_file = `/uploads/svg/${svgFile.filename}`;

    // Обновляем зал в MongoDB
    const updatedHall = await updateHallData(id, updateData);
    
    if (!updatedHall) {
      return res.status(404).json({ error: 'Hall not found' });
    }

    // Форматируем ответ для совместимости с фронтендом
    const formattedHall = {
      id: updatedHall._id,
      name: updatedHall.name,
      country: updatedHall.country,
      city: updatedHall.city,
      address: updatedHall.address,
      timezone: updatedHall.timezone,
      description: updatedHall.description,
      capacity: updatedHall.capacity,
      photo_url: updatedHall.photo_file,
      svg_url: updatedHall.svg_file,
      seat_config: updatedHall.seat_config,
      zone_config: updatedHall.zone_config,
      seat_count: updatedHall.metadata?.totalSeats || 0,
      zones: updatedHall.zones,
      created_at: updatedHall.createdAt,
      updated_at: updatedHall.updatedAt
    };

    console.log('✅ Зал успешно обновлен:', formattedHall.id);
    res.json({ hall: formattedHall });
  } catch (error) {
    console.error('❌ Ошибка обновления зала:', error);
    res.status(500).json({ error: 'Failed to update hall' });
  }
});

// PUT /api/halls/:id/config - обновить конфигурацию зала (места и зоны)
router.put('/:id/config', validateId, async (req, res) => {
  try {
    const { id } = req.params;
    const { seat_config, zone_config, capacity, currency } = req.body;

    console.log('📝 Обновление конфигурации зала:', { 
      id, 
      hasSeatConfig: !!seat_config, 
      hasZoneConfig: !!zone_config,
      capacity: capacity,
      capacityType: typeof capacity
    });
    
    // Подробные логи входящих данных
    console.log('🔍 Полные данные запроса:', {
      body: req.body,
      seat_config_length: seat_config ? seat_config.length : 0,
      zone_config_length: zone_config ? zone_config.length : 0,
      capacity_value: capacity
    });

    // Валидация данных
    if (!seat_config && !zone_config) {
      return res.status(400).json({ error: 'seat_config or zone_config is required' });
    }

    // Валидация JSON
    if (seat_config) {
      try {
        JSON.parse(seat_config);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid seat_config JSON' });
      }
    }

    if (zone_config) {
      try {
        JSON.parse(zone_config);
      } catch (error) {
        return res.status(400).json({ error: 'Invalid zone_config JSON' });
      }
    }

    // Подготавливаем данные для обновления
    const updateData = {};
    if (seat_config) updateData.seat_config = seat_config;
    if (zone_config) updateData.zone_config = zone_config;
    if (capacity !== undefined) updateData.capacity = capacity;
    // Обновляем валюту только если она явно передана и не пустая
    if (currency !== undefined && currency !== null && currency !== '') {
      updateData.currency = currency;
    }
    
    console.log('💾 Данные для обновления в MongoDB:', updateData);

    // Вычисляем количество мест (места + спец. зоны)
    if (seat_config) {
      try {
        const config = JSON.parse(seat_config);
        if (config.seats && Array.isArray(config.seats)) {
          const regularSeats = config.seats.filter(seat => 
            seat.objectType === 'seat' || seat.objectType === undefined
          ).length;
          
          const specialZones = config.seats.filter(seat => 
            seat.objectType === 'special_zone'
          );
          
          const specialZoneCapacity = specialZones.reduce((sum, zone) => 
            sum + (zone.capacity || 0), 0
          );
          
          const totalCapacity = regularSeats + specialZoneCapacity;
          updateData['metadata.totalSeats'] = totalCapacity;
        }
      } catch (error) {
        console.error('Error parsing seat_config for counting:', error);
      }
    }

    // Обновляем зал в MongoDB
    const updatedHall = await updateHallData(id, updateData);
    
    if (!updatedHall) {
      return res.status(404).json({ error: 'Hall not found' });
    }

    // Форматируем ответ для совместимости с фронтендом
    const formattedHall = {
      id: updatedHall._id,
      name: updatedHall.name,
      country: updatedHall.country,
      city: updatedHall.city,
      address: updatedHall.address,
      timezone: updatedHall.timezone,
      description: updatedHall.description,
      capacity: updatedHall.capacity,
      photo_url: updatedHall.photo_file,
      svg_url: updatedHall.svg_file,
      seat_config: updatedHall.seat_config,
      zone_config: updatedHall.zone_config,
      seat_count: updatedHall.metadata?.totalSeats || 0,
      zones: updatedHall.zones,
      created_at: updatedHall.createdAt,
      updated_at: updatedHall.updatedAt
    };

    console.log('✅ Конфигурация зала успешно обновлена:', formattedHall.id);
    res.json({ hall: formattedHall });
  } catch (error) {
    console.error('❌ Ошибка обновления конфигурации зала:', error);
    res.status(500).json({ error: 'Failed to update hall config' });
  }
});

// PUT /api/halls/:id/svg - обновить SVG файл зала
router.put('/:id/svg', validateId, uploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const svgFile = req.files?.svg?.[0];

    console.log('📝 Обновление SVG зала:', { id, hasFile: !!svgFile });

    if (!svgFile) {
      return res.status(400).json({ error: 'SVG file is required' });
    }

    // Проверяем, что файл действительно SVG
    if (svgFile.mimetype !== 'image/svg+xml') {
      return res.status(400).json({ error: 'File must be an SVG' });
    }

    // Обновляем SVG файл в MongoDB
    const updateData = {
      svg_file: `/uploads/svg/${svgFile.filename}`
    };

    const updatedHall = await updateHallData(id, updateData);
    
    if (!updatedHall) {
      return res.status(404).json({ error: 'Hall not found' });
    }

    // Информация о файле
    const svgFileInfo = {
      id: Math.floor(Math.random() * 1000),
      filename: svgFile.filename,
      path: `/uploads/svg/${svgFile.filename}`,
      mimetype: svgFile.mimetype,
      size: svgFile.size,
      type: 'svg',
      created_at: new Date().toISOString()
    };

    console.log('✅ SVG зала успешно обновлен:', updatedHall._id);
    res.json({ 
      message: 'SVG file updated successfully',
      svg_file: svgFileInfo,
      svg_url: `/uploads/svg/${svgFile.filename}`
    });
  } catch (error) {
    console.error('Error updating hall SVG:', error);
    res.status(500).json({ error: 'Failed to update SVG file' });
  }
});

// DELETE /api/halls/:id - удалить зал
router.delete('/:id', validateId, async (req, res) => {
  try {
    const { id } = req.params;

    console.log('🗑️ Удаление зала:', { id });

    // Удаляем зал из MongoDB
    const deletedHall = await deleteHallData(id);
    
    if (!deletedHall) {
      return res.status(404).json({ error: 'Hall not found' });
    }

    // Удаляем связанные файлы (опционально)
    if (deletedHall.photo_file) {
      const photoPath = path.join(__dirname, '../../uploads', path.basename(deletedHall.photo_file));
      try {
        if (fsSync.existsSync(photoPath)) {
          await fs.unlink(photoPath);
        }
      } catch (err) {
        console.warn('Не удалось удалить фото файл:', err.message);
      }
    }

    if (deletedHall.svg_file) {
      const svgPath = path.join(__dirname, '../../uploads', path.basename(deletedHall.svg_file));
      try {
        if (fsSync.existsSync(svgPath)) {
          await fs.unlink(svgPath);
        }
      } catch (err) {
        console.warn('Не удалось удалить SVG файл:', err.message);
      }
    }

    console.log('✅ Зал успешно удален:', deletedHall._id);
    res.json({ 
      message: 'Hall deleted successfully',
      id: deletedHall._id
    });
  } catch (error) {
    console.error('❌ Ошибка при удалении зала:', error);
    res.status(500).json({ error: 'Failed to delete hall' });
  }
});

module.exports = router;