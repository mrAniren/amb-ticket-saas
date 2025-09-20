const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Event = require('../models/Event');
const { mongoose } = require('../config/mongodb');

const EVENTS_FILE = path.join(__dirname, '../../data/events.json');

// Функция для определения, использовать ли MongoDB или файлы
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Функция проверки валидности ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
};

// Функции для работы с мероприятиями через MongoDB
async function getAllEvents(activeOnly = true) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с мероприятиями.');
  }
  
  // Если activeOnly = true, показываем только активные (isActive: true)
  // Если activeOnly = false, показываем только архивные (isActive: false)
  const filter = activeOnly ? { isActive: true } : { isActive: false };
  return await Event.find(filter).sort({ createdAt: -1 });
}

async function getEventById(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с мероприятиями.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Event.findById(id);
}

async function createEventData(eventData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с мероприятиями.');
  }
  const event = new Event(eventData);
  return await event.save();
}

async function updateEventData(id, updateData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с мероприятиями.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Event.findByIdAndUpdate(id, updateData, { new: true });
}

async function archiveEventData(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с мероприятиями.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Event.findByIdAndUpdate(id, { isActive: false }, { new: true });
}

async function restoreEventData(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с мероприятиями.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Event.findByIdAndUpdate(id, { isActive: true }, { new: true });
}

async function deleteEventData(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с мероприятиями.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Event.findByIdAndDelete(id);
}

// Fallback функции для файлового хранилища
async function loadEventsFromFile() {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function saveEventsToFile(events) {
  const dataDir = path.dirname(EVENTS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2));
}

// GET /api/events - Получить все мероприятия
router.get('/', async (req, res) => {
  try {
    const { active } = req.query;
    // Исправляем логику: если active=false, то показываем архивные, иначе активные
    const activeOnly = active !== 'false';
    
    const events = await getAllEvents(activeOnly);
    
    console.log(`📅 Загружено мероприятий: ${events.length} (${activeOnly ? 'активные' : 'архивные'}) (${isMongoConnected() ? 'MongoDB' : 'файлы'})`);
    
    res.json({
      success: true,
      events: events
    });
  } catch (error) {
    console.error('❌ Error getting events:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке мероприятий'
    });
  }
});

// GET /api/events/:id - Получить мероприятие по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📅 Getting event ${id}`);
    
    const events = await getAllEvents();
    const event = events.find(e => e.id === id);
    
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Мероприятие не найдено'
      });
    }
    
    res.json({
      success: true,
      event: event
    });
  } catch (error) {
    console.error('❌ Error getting event:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке мероприятия'
    });
  }
});

// POST /api/events - Создать новое мероприятие
router.post('/', async (req, res) => {
  try {
    const { name, description, image } = req.body;
    console.log('📅 Creating new event:', name);
    
    // Валидация
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Название мероприятия обязательно'
      });
    }
    
    if (!description || !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Описание мероприятия обязательно'
      });
    }
    
    if (!image || !image.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Изображение мероприятия обязательно'
      });
    }
    
    const eventData = {
      name: name.trim(),
      description: description.trim(),
      image: image.trim()
    };
    
    const newEvent = await createEventData(eventData);
    
    console.log('✅ Event created successfully:', newEvent._id || newEvent.id);
    res.status(201).json({
      success: true,
      event: newEvent
    });
  } catch (error) {
    console.error('❌ Error creating event:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании мероприятия'
    });
  }
});

// PUT /api/events/:id - Обновить мероприятие
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, image } = req.body;
    console.log(`📅 Updating event ${id}`);
    
    // Валидация
    if (name && !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Название мероприятия не может быть пустым'
      });
    }
    
    if (description && !description.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Описание мероприятия не может быть пустым'
      });
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (image !== undefined) updateData.image = image.trim();
    
    const updatedEvent = await updateEventData(id, updateData);
    
    if (!updatedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Мероприятие не найдено'
      });
    }
    
    console.log('✅ Event updated successfully:', id);
    res.json({
      success: true,
      event: updatedEvent
    });
  } catch (error) {
    console.error('❌ Error updating event:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении мероприятия'
    });
  }
});

// PATCH /api/events/:id/archive - Архивировать мероприятие
router.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📅 Archiving event ${id}`);
    
    const archivedEvent = await archiveEventData(id);
    
    if (!archivedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Мероприятие не найдено'
      });
    }
    
    console.log('✅ Event archived successfully:', id);
    res.json({
      success: true,
      message: 'Мероприятие заархивировано',
      event: archivedEvent
    });
  } catch (error) {
    console.error('❌ Error archiving event:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при архивировании мероприятия'
    });
  }
});

// PATCH /api/events/:id/restore - Восстановить мероприятие из архива
router.patch('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📅 Restoring event ${id}`);
    
    const restoredEvent = await restoreEventData(id);
    
    if (!restoredEvent) {
      return res.status(404).json({
        success: false,
        message: 'Мероприятие не найдено'
      });
    }
    
    console.log('✅ Event restored successfully:', id);
    res.json({
      success: true,
      message: 'Мероприятие восстановлено',
      event: restoredEvent
    });
  } catch (error) {
    console.error('❌ Error restoring event:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при восстановлении мероприятия'
    });
  }
});

// DELETE /api/events/:id - Удалить мероприятие
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📅 Deleting event ${id}`);
    
    const deletedEvent = await deleteEventData(id);
    
    if (!deletedEvent) {
      return res.status(404).json({
        success: false,
        message: 'Мероприятие не найдено'
      });
    }
    
    console.log('✅ Event deleted successfully:', id);
    res.json({
      success: true,
      message: 'Мероприятие удалено',
      event: deletedEvent
    });
  } catch (error) {
    console.error('❌ Error deleting event:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении мероприятия'
    });
  }
});

module.exports = router;
