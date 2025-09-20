const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Session = require('../models/Session');
const Event = require('../models/Event');
const Hall = require('../models/Hall');
const PriceScheme = require('../models/PriceScheme');
const { mongoose } = require('../config/mongodb');
const { addTicketsToSession } = require('../utils/ticketGenerator');

// Функция для определения, использовать ли MongoDB или файлы
const isMongoConnected = () => {
  return mongoose.connection.readyState === 1;
};

// Функция проверки валидности ObjectId
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === id;
};

const SESSIONS_FILE = path.join(__dirname, '../../data/sessions.json');
const EVENTS_FILE = path.join(__dirname, '../../data/events.json');
const HALLS_FILE = path.join(__dirname, '../../data/halls.json');
const PRICE_SCHEMES_FILE = path.join(__dirname, '../../data/priceSchemes.json');

// Функции для работы с сеансами через MongoDB
async function getAllSessions() {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  return await Session.find()
    .populate('eventId')
    .populate('hallId')
    .populate('priceSchemeId')
    .sort({ date: 1, time: 1 });
}

async function getSessionById(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Session.findById(id)
    .populate('eventId')
    .populate('hallId')
    .populate('priceSchemeId');
}

async function getSessionsByEvent(eventId) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  return await Session.findByEvent(eventId);
}

async function createSessionData(sessionData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  const session = new Session(sessionData);
  return await session.save();
}

async function updateSessionData(id, updateData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Session.findByIdAndUpdate(id, updateData, { new: true });
}

async function deleteSessionData(id) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(id)) {
    return null;
  }
  
  return await Session.findByIdAndDelete(id);
}

async function createSessionData(sessionData) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  
  const newSession = new Session({
    eventId: sessionData.eventId,
    date: sessionData.date,
    time: sessionData.time,
    hallId: sessionData.hallId,
    priceSchemeId: sessionData.priceSchemeId,
    ticketsSold: 0,
    totalTickets: 0
  });
  
  return await newSession.save();
}

async function getSessionsByEventId(eventId) {
  if (!isMongoConnected()) {
    throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
  }
  
  // Проверяем валидность ObjectId
  if (!isValidObjectId(eventId)) {
    return [];
  }
  
  return await Session.find({ eventId })
    .populate('eventId')
    .populate('hallId')
    .populate('priceSchemeId')
    .sort({ date: 1, time: 1 });
}

// Fallback функции для файлового хранилища
async function loadSessionsFromFile() {
  try {
    const data = await fs.readFile(SESSIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function saveSessionsToFile(sessions) {
  const dataDir = path.dirname(SESSIONS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

async function saveSessions(sessions) {
  const dataDir = path.dirname(SESSIONS_FILE);
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(SESSIONS_FILE, JSON.stringify(sessions, null, 2));
}

async function loadEvents() {
  try {
    const data = await fs.readFile(EVENTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

async function loadHalls() {
  try {
    const data = await fs.readFile(HALLS_FILE, 'utf8');
    const parsed = JSON.parse(data);
    // Преобразуем объект halls в массив
    if (parsed.halls && typeof parsed.halls === 'object') {
      return Object.values(parsed.halls);
    }
    return parsed.halls || [];
  } catch (error) {
    console.error('Ошибка загрузки залов в sessions.js:', error);
    return [];
  }
}

async function loadPriceSchemes() {
  try {
    const data = await fs.readFile(PRICE_SCHEMES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return [];
  }
}

// GET /api/sessions - Получить все сеансы
router.get('/', async (req, res) => {
  try {
    const sessions = await getAllSessions();
    
    // Форматируем данные для фронтенда
    const formattedSessions = sessions.map(session => ({
      id: session._id,
      eventId: session.eventId?._id || session.eventId,
      hallId: session.hallId?._id || session.hallId,
      priceSchemeId: session.priceSchemeId?._id || session.priceSchemeId,
      date: session.date,
      time: session.time,
      ticketsSold: session.ticketsSold || 0,
      totalTickets: session.totalTickets || 0,
      event: session.eventId ? {
        id: session.eventId._id,
        name: session.eventId.name,
        description: session.eventId.description,
        image: session.eventId.image
      } : null,
      hall: session.hallId ? {
        id: session.hallId._id,
        name: session.hallId.name,
        city: session.hallId.city,
        capacity: session.hallId.capacity
      } : null,
      priceScheme: session.priceSchemeId ? {
        id: session.priceSchemeId._id,
        name: session.priceSchemeId.name,
        hallId: session.priceSchemeId.hallId,
        prices: session.priceSchemeId.prices || [],
        seatPrices: session.priceSchemeId.seatPrices || []
      } : null
    }));
    
    res.json({
      success: true,
      sessions: formattedSessions
    });
  } catch (error) {
    console.error('❌ Error getting sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке сеансов'
    });
  }
});

// GET /api/sessions/event/:eventId - Получить сеансы мероприятия
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    // Получаем сеансы для конкретного мероприятия из MongoDB (уже с populate)
    const eventSessions = await getSessionsByEventId(eventId);
    
    console.log(`✅ Found ${eventSessions.length} sessions for event ${eventId}`);
    
    // Форматируем данные для фронтенда
    const sessionsWithDetails = eventSessions.map(session => {
      return {
        id: session._id,
        eventId: session.eventId?._id || session.eventId,
        hallId: session.hallId?._id || session.hallId,
        priceSchemeId: session.priceSchemeId?._id || session.priceSchemeId,
        date: session.date,
        time: session.time,
        ticketsSold: session.ticketsSold || 0,
        totalTickets: session.totalTickets || 0,
        event: session.eventId ? {
          id: session.eventId._id,
          name: session.eventId.name,
          description: session.eventId.description,
          image: session.eventId.image
        } : null,
        hall: session.hallId ? {
          id: session.hallId._id,
          name: session.hallId.name,
          city: session.hallId.city,
          capacity: session.hallId.capacity
        } : null,
        priceScheme: session.priceSchemeId ? {
          id: session.priceSchemeId._id,
          name: session.priceSchemeId.name,
          hallId: session.priceSchemeId.hallId,
          prices: session.priceSchemeId.prices || [],
          seatPrices: session.priceSchemeId.seatPrices || []
        } : null
      };
    });
    
    res.json({
      success: true,
      sessions: sessionsWithDetails
    });
  } catch (error) {
    console.error('❌ Error getting event sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке сеансов мероприятия'
    });
  }
});

// GET /api/sessions/:id - Получить сеанс по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎬 Getting session ${id} - НОВАЯ ВЕРСИЯ КОДА`);
    
    // Получаем сеанс из MongoDB БЕЗ populate чтобы не потерять tickets
    const session = await Session.findById(id);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    // Получаем связанные данные из MongoDB
    console.log('🔍 Загружаем связанные данные:', {
      eventId: session.eventId,
      hallId: session.hallId,
      priceSchemeId: session.priceSchemeId
    });
    
    const [event, hall, priceScheme] = await Promise.all([
      Event.findById(session.eventId),
      Hall.findById(session.hallId).lean(false), // Не используем lean чтобы получить виртуальные поля
      PriceScheme.findById(session.priceSchemeId)
    ]);
    
    console.log('🔍 Результаты загрузки:', {
      hasEvent: !!event,
      hasHall: !!hall,
      hasPriceScheme: !!priceScheme,
      hallName: hall?.name,
      hallSeatsCount: hall?.seats?.length || 0,
      hallSeatConfig: hall?.seat_config?.length || 0,
      hallSeatsType: Array.isArray(hall?.seats) ? 'array' : typeof hall?.seats
    });
    
    console.log('🎬 Hall SVG данные:', {
      hallId: hall?._id,
      svg_file: hall?.svg_file,
      hallName: hall?.name
    });
    
    // Форматируем данные для фронтенда
    const sessionWithDetails = {
      id: session._id,
      eventId: session.eventId,
      hallId: session.hallId,
      priceSchemeId: session.priceSchemeId,
      date: session.date,
      time: session.time,
      ticketsSold: session.ticketsSold || 0,
      totalTickets: session.totalTickets || 0,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      tickets: session.tickets || [], // НОВОЕ ПОЛЕ - билеты из сеанса
      event: event ? {
        id: event._id,
        name: event.name,
        description: event.description,
        image: event.image
      } : null,
      hall: hall ? {
        id: hall._id,
        name: hall.name,
        capacity: hall.capacity,
        city: hall.city,
        country: hall.country,
        currency: hall.currency,
        svg_file: hall.svg_file,
        svg_url: hall.svg_file,
        seats: hall.seats || [], // НОВОЕ ПОЛЕ - места из зала
        seat_config: hall.seat_config, // Конфигурация мест с полигонами
        zone_config: hall.zone_config // Конфигурация зон
      } : null,
      priceScheme: priceScheme ? {
        id: priceScheme._id,
        name: priceScheme.name,
        hallId: priceScheme.hallId,
        prices: priceScheme.prices || [],
        seatPrices: priceScheme.seatPrices || []
      } : null
    };
    
    console.log('🔍 Финальный ответ API:', {
      hasHall: !!sessionWithDetails.hall,
      hallSeatsCount: sessionWithDetails.hall?.seats?.length || 0,
      hallId: sessionWithDetails.hall?.id,
      hallName: sessionWithDetails.hall?.name
    });
    
    res.json({
      success: true,
      session: sessionWithDetails
    });
  } catch (error) {
    console.error('❌ Error getting session:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке сеанса'
    });
  }
});

// POST /api/sessions - Создать новый сеанс
router.post('/', async (req, res) => {
  try {
    const { eventId, date, time, hallId, priceSchemeId } = req.body;
    console.log('🎬 Creating new session:', { eventId, date, time, hallId, priceSchemeId });
    
    // Валидация
    if (!eventId || !eventId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'ID мероприятия обязательно'
      });
    }
    
    if (!date || !date.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Дата сеанса обязательна'
      });
    }
    
    if (!time || !time.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Время сеанса обязательно'
      });
    }
    
    if (!hallId || !hallId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Зал обязателен'
      });
    }
    
    if (!priceSchemeId || !priceSchemeId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Распоясовка обязательна'
      });
    }
    
    // Проверяем существование связанных сущностей в MongoDB
    console.log('🔍 Checking related entities...');
    
    // Проверяем мероприятие
    const event = await Event.findById(eventId);
    if (!event) {
      console.log('❌ Event not found:', eventId);
      return res.status(400).json({
        success: false,
        message: 'Мероприятие не найдено'
      });
    }
    console.log('✅ Event found:', event.name);
    
    // Проверяем зал
    const hall = await Hall.findById(hallId).lean(false); // Не используем lean чтобы получить виртуальные поля
    if (!hall) {
      console.log('❌ Hall not found:', hallId);
      return res.status(400).json({
        success: false,
        message: 'Зал не найден'
      });
    }
    console.log('✅ Hall found:', hall.name);
    
    // Проверяем распаесовку
    const priceScheme = await PriceScheme.findById(priceSchemeId);
    if (!priceScheme) {
      console.log('❌ Price scheme not found:', priceSchemeId);
      return res.status(400).json({
        success: false,
        message: 'Распоясовка не найдена'
      });
    }
    console.log('✅ Price scheme found:', priceScheme.name);
    
    // Проверяем, что распоясовка принадлежит выбранному залу
    if (priceScheme.hallId.toString() !== hallId.toString()) {
      console.log('❌ Price scheme hall mismatch:', { priceSchemeHallId: priceScheme.hallId, selectedHallId: hallId });
      return res.status(400).json({
        success: false,
        message: 'Распоясовка не принадлежит выбранному залу'
      });
    }
    console.log('✅ Price scheme belongs to hall');
    
    // Создаем сеанс в MongoDB
    console.log('💾 Creating session in MongoDB...');
    const newSession = await createSessionData({
      eventId: eventId.trim(),
      date: date.trim(),
      time: time.trim(),
      hallId: hallId.trim(),
      priceSchemeId: priceSchemeId.trim()
    });
    
    console.log('✅ Session created in MongoDB:', newSession._id);
    
    // Генерируем билеты для сеанса
    console.log('🎫 Generating tickets for session...');
    await addTicketsToSession(newSession, hall, priceScheme);
    console.log('✅ Tickets generated for session:', newSession._id);
    
    // Форматируем ответ для фронтенда
    const sessionWithDetails = {
      id: newSession._id,
      eventId: newSession.eventId,
      date: newSession.date,
      time: newSession.time,
      hallId: newSession.hallId,
      priceSchemeId: newSession.priceSchemeId,
      ticketsSold: newSession.ticketsSold || 0,
      totalTickets: newSession.totalTickets || 0,
      createdAt: newSession.createdAt,
      updatedAt: newSession.updatedAt,
      event: {
        id: event._id,
        name: event.name,
        description: event.description,
        image: event.image
      },
      hall: {
        id: hall._id,
        name: hall.name,
        capacity: hall.capacity
      },
      priceScheme: {
        id: priceScheme._id,
        name: priceScheme.name,
        hallId: priceScheme.hallId,
        prices: priceScheme.prices || [],
        seatPrices: priceScheme.seatPrices || []
      }
    };
    
    console.log('✅ Session created successfully:', newSession._id);
    res.status(201).json({
      success: true,
      session: sessionWithDetails
    });
  } catch (error) {
    console.error('❌ Error creating session:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при создании сеанса'
    });
  }
});

// PUT /api/sessions/:id - Обновить сеанс
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { eventId, date, time, hallId, priceSchemeId } = req.body;
    console.log(`🎬 PUT ROUTE: Updating session ${id}`);
    console.log(`🎬 PUT ROUTE: Update data:`, { eventId, date, time, hallId, priceSchemeId });

    if (!isMongoConnected()) {
      throw new Error('MongoDB не подключена. Подключите базу данных для работы с сеансами.');
    }
    
    // Находим сеанс
    const session = await getSessionById(id);
    
    if (!session) {
      console.log('❌ PUT ROUTE: Сеанс не найден:', id);
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    // Валидация и проверка связанных сущностей при обновлении
    if (hallId && priceSchemeId) {
      console.log(`🔍 PUT ROUTE: Проверяем связанные сущности: hallId=${hallId}, priceSchemeId=${priceSchemeId}`);
      
      const [hall, priceScheme] = await Promise.all([
        Hall.findById(hallId),
        PriceScheme.findById(priceSchemeId)
      ]);
      
      if (!hall) {
        console.log('❌ PUT ROUTE: Зал не найден:', hallId);
        return res.status(400).json({
          success: false,
          message: 'Зал не найден'
        });
      }
      
      if (!priceScheme) {
        console.log('❌ PUT ROUTE: Распоясовка не найдена:', priceSchemeId);
        return res.status(400).json({
          success: false,
          message: 'Распоясовка не найдена'
        });
      }
      
      // Проверяем что распоясовка принадлежит залу
      const priceSchemeHallId = priceScheme.hallId.toString();
      const currentHallId = hallId.toString();
      
      if (priceSchemeHallId !== currentHallId) {
        console.log('❌ PUT ROUTE: Распоясовка не принадлежит залу:', { priceSchemeHallId, currentHallId });
        return res.status(400).json({
          success: false,
          message: 'Распоясовка не принадлежит выбранному залу'
        });
      }
    }
    
    // Подготавливаем данные для обновления
    const updateData = { updatedAt: new Date() };
    
    if (eventId !== undefined) updateData.eventId = eventId;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    if (hallId !== undefined) updateData.hallId = hallId;
    if (priceSchemeId !== undefined) updateData.priceSchemeId = priceSchemeId;
    
    console.log(`🔄 PUT ROUTE: Обновляем поля:`, Object.keys(updateData));
    
    // Обновляем в MongoDB
    const updatedSession = await Session.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedSession) {
      console.log('❌ PUT ROUTE: Не удалось обновить сеанс в MongoDB');
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    console.log('✅ PUT ROUTE: Session updated successfully:', id);
    
    // Форматируем ответ
    const formattedSession = {
      id: updatedSession._id,
      eventId: updatedSession.eventId,
      date: updatedSession.date,
      time: updatedSession.time,
      hallId: updatedSession.hallId,
      priceSchemeId: updatedSession.priceSchemeId,
      ticketsSold: updatedSession.ticketsSold || 0,
      totalTickets: updatedSession.totalTickets || 0,
      createdAt: updatedSession.createdAt,
      updatedAt: updatedSession.updatedAt
    };
    
    res.json({
      success: true,
      session: formattedSession
    });
  } catch (error) {
    console.error('❌ PUT ROUTE: Error updating session:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при обновлении сеанса'
    });
  }
});

// DELETE /api/sessions/:id - Удалить сеанс
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎬 Deleting session ${id}`);
    
    // Проверяем существование сеанса
    const session = await getSessionById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    // Удаляем сеанс из MongoDB
    const deletedSession = await deleteSessionData(id);
    
    if (!deletedSession) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    console.log('✅ Session deleted successfully:', id);
    res.json({
      success: true,
      message: 'Сеанс удален',
      session: {
        id: deletedSession._id,
        date: deletedSession.date,
        time: deletedSession.time,
        eventId: deletedSession.eventId,
        hallId: deletedSession.hallId,
        priceSchemeId: deletedSession.priceSchemeId
      }
    });
  } catch (error) {
    console.error('❌ Error deleting session:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при удалении сеанса'
    });
  }
});

// PATCH /api/sessions/:id/archive - Архивировать сеанс
router.patch('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗄️ Archiving session ${id}`);
    
    // Проверяем существование сеанса
    const session = await getSessionById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    // Архивируем сеанс
    session.isArchived = true;
    await session.save();
    
    console.log('✅ Session archived successfully:', id);
    res.json({
      success: true,
      message: 'Сеанс архивирован',
      session: {
        id: session._id,
        date: session.date,
        time: session.time,
        eventId: session.eventId,
        hallId: session.hallId,
        priceSchemeId: session.priceSchemeId,
        isArchived: session.isArchived
      }
    });
  } catch (error) {
    console.error('❌ Error archiving session:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при архивировании сеанса'
    });
  }
});

// PATCH /api/sessions/:id/unarchive - Разархивировать сеанс
router.patch('/:id/unarchive', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📂 Unarchiving session ${id}`);
    
    // Проверяем существование сеанса
    const session = await getSessionById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сеанс не найден'
      });
    }
    
    // Разархивируем сеанс
    session.isArchived = false;
    await session.save();
    
    console.log('✅ Session unarchived successfully:', id);
    res.json({
      success: true,
      message: 'Сеанс разархивирован',
      session: {
        id: session._id,
        date: session.date,
        time: session.time,
        eventId: session.eventId,
        hallId: session.hallId,
        priceSchemeId: session.priceSchemeId,
        isArchived: session.isArchived
      }
    });
  } catch (error) {
    console.error('❌ Error unarchiving session:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при разархивировании сеанса'
    });
  }
});

// GET /api/sessions/event/:eventId/active - Получить активные сеансы мероприятия
router.get('/event/:eventId/active', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(`🎬 Getting active sessions for event ${eventId}`);
    
    const allSessions = await Session.findActive(eventId)
      .populate('eventId', 'name description')
      .populate('hallId', 'name timezone')
      .populate('priceSchemeId', 'name prices seatPrices');
    
    // Фильтруем только активные (не прошедшие) сессии
    const activeSessions = allSessions.filter(session => {
      try {
        return !session.isPast();
      } catch (error) {
        console.error('Ошибка при проверке isPast для сессии:', session._id, error);
        // Если ошибка, считаем сессию активной
        return true;
      }
    });
    
    console.log(`✅ Found ${activeSessions.length} active sessions for event ${eventId}`);
    
    // Форматируем данные для фронтенда
    const sessionsWithDetails = activeSessions.map(session => {
      return {
        id: session._id,
        eventId: session.eventId?._id || session.eventId,
        hallId: session.hallId?._id || session.hallId,
        priceSchemeId: session.priceSchemeId?._id || session.priceSchemeId,
        date: session.date,
        time: session.time,
        ticketsSold: session.ticketsSold || 0,
        totalTickets: session.totalTickets || 0,
        isArchived: session.isArchived || false,
        event: session.eventId ? {
          id: session.eventId._id,
          name: session.eventId.name,
          description: session.eventId.description,
          image: session.eventId.image
        } : null,
        hall: session.hallId ? {
          id: session.hallId._id,
          name: session.hallId.name,
          city: session.hallId.city,
          capacity: session.hallId.capacity,
          timezone: session.hallId.timezone
        } : null,
        priceScheme: session.priceSchemeId ? {
          id: session.priceSchemeId._id,
          name: session.priceSchemeId.name,
          hallId: session.priceSchemeId.hallId,
          prices: session.priceSchemeId.prices || [],
          seatPrices: session.priceSchemeId.seatPrices || []
        } : null
      };
    });
    
    res.json({
      success: true,
      sessions: sessionsWithDetails
    });
  } catch (error) {
    console.error('❌ Error getting active event sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке активных сеансов мероприятия'
    });
  }
});

// GET /api/sessions/event/:eventId/past - Получить прошедшие сеансы мероприятия
router.get('/event/:eventId/past', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(`🎬 Getting past sessions for event ${eventId}`);
    
    const allSessions = await Session.findPast(eventId)
      .populate('eventId', 'name description')
      .populate('hallId', 'name timezone')
      .populate('priceSchemeId', 'name prices seatPrices');
    
    // Фильтруем только прошедшие сессии
    const pastSessions = allSessions.filter(session => {
      try {
        return session.isPast();
      } catch (error) {
        console.error('Ошибка при проверке isPast для сессии:', session._id, error);
        // Если ошибка, считаем сессию не прошедшей
        return false;
      }
    });
    
    console.log(`✅ Found ${pastSessions.length} past sessions for event ${eventId}`);
    
    // Форматируем данные для фронтенда
    const sessionsWithDetails = pastSessions.map(session => {
      return {
        id: session._id,
        eventId: session.eventId?._id || session.eventId,
        hallId: session.hallId?._id || session.hallId,
        priceSchemeId: session.priceSchemeId?._id || session.priceSchemeId,
        date: session.date,
        time: session.time,
        ticketsSold: session.ticketsSold || 0,
        totalTickets: session.totalTickets || 0,
        isArchived: session.isArchived || false,
        event: session.eventId ? {
          id: session.eventId._id,
          name: session.eventId.name,
          description: session.eventId.description,
          image: session.eventId.image
        } : null,
        hall: session.hallId ? {
          id: session.hallId._id,
          name: session.hallId.name,
          city: session.hallId.city,
          capacity: session.hallId.capacity,
          timezone: session.hallId.timezone
        } : null,
        priceScheme: session.priceSchemeId ? {
          id: session.priceSchemeId._id,
          name: session.priceSchemeId.name,
          hallId: session.priceSchemeId.hallId,
          prices: session.priceSchemeId.prices || [],
          seatPrices: session.priceSchemeId.seatPrices || []
        } : null
      };
    });
    
    res.json({
      success: true,
      sessions: sessionsWithDetails
    });
  } catch (error) {
    console.error('❌ Error getting past event sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке прошедших сеансов мероприятия'
    });
  }
});

// GET /api/sessions/event/:eventId/archived - Получить архивированные сеансы мероприятия
router.get('/event/:eventId/archived', async (req, res) => {
  try {
    const { eventId } = req.params;
    console.log(`🗄️ Getting archived sessions for event ${eventId}`);
    
    const archivedSessions = await Session.findArchived(eventId)
      .populate('eventId', 'name description')
      .populate('hallId', 'name timezone')
      .populate('priceSchemeId', 'name prices seatPrices');
    
    console.log(`✅ Found ${archivedSessions.length} archived sessions for event ${eventId}`);
    
    // Форматируем данные для фронтенда
    const sessionsWithDetails = archivedSessions.map(session => {
      return {
        id: session._id,
        eventId: session.eventId?._id || session.eventId,
        hallId: session.hallId?._id || session.hallId,
        priceSchemeId: session.priceSchemeId?._id || session.priceSchemeId,
        date: session.date,
        time: session.time,
        ticketsSold: session.ticketsSold || 0,
        totalTickets: session.totalTickets || 0,
        isArchived: session.isArchived || false,
        event: session.eventId ? {
          id: session.eventId._id,
          name: session.eventId.name,
          description: session.eventId.description,
          image: session.eventId.image
        } : null,
        hall: session.hallId ? {
          id: session.hallId._id,
          name: session.hallId.name,
          city: session.hallId.city,
          capacity: session.hallId.capacity,
          timezone: session.hallId.timezone
        } : null,
        priceScheme: session.priceSchemeId ? {
          id: session.priceSchemeId._id,
          name: session.priceSchemeId.name,
          hallId: session.priceSchemeId.hallId,
          prices: session.priceSchemeId.prices || [],
          seatPrices: session.priceSchemeId.seatPrices || []
        } : null
      };
    });
    
    res.json({
      success: true,
      sessions: sessionsWithDetails
    });
  } catch (error) {
    console.error('❌ Error getting archived event sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при загрузке архивированных сеансов мероприятия'
    });
  }
});

// POST /api/sessions/lock-tickets - Блокировка билетов за 10 минут до начала сеансов
router.post('/lock-tickets', async (req, res) => {
  try {
    console.log('🔒 Starting ticket locking process for upcoming sessions');
    
    const result = await Session.lockTicketsForUpcomingSessions();
    
    console.log(`✅ Ticket locking completed. Processed ${result.processed} sessions`);
    
    res.json({
      success: true,
      message: 'Процесс блокировки билетов завершен',
      processed: result.processed,
      results: result.results
    });
  } catch (error) {
    console.error('❌ Error locking tickets:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при блокировке билетов',
      error: error.message
    });
  }
});

// POST /api/sessions/:sessionId/lock-tickets - Блокировка билетов для конкретной сессии
router.post('/:sessionId/lock-tickets', async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!isValidObjectId(sessionId)) {
      return res.status(400).json({
        success: false,
        message: 'Некорректный ID сессии'
      });
    }
    
    console.log(`🔒 Locking tickets for session ${sessionId}`);
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Сессия не найдена'
      });
    }
    
    const result = await session.lockTicketsBeforeSession();
    
    console.log(`✅ Ticket locking for session ${sessionId} completed:`, result);
    
    res.json({
      success: true,
      message: 'Блокировка билетов для сессии завершена',
      sessionId: sessionId,
      ...result
    });
  } catch (error) {
    console.error('❌ Error locking tickets for session:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при блокировке билетов для сессии',
      error: error.message
    });
  }
});

module.exports = router;
