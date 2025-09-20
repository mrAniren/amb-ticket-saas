const express = require('express');
const router = express.Router();
const FacebookConfig = require('../models/FacebookConfig');
const facebookService = require('../services/facebookService');

// Получить конфигурацию Facebook
router.get('/config', async (req, res) => {
  try {
    const config = await FacebookConfig.findOne();
    res.json(config || {});
  } catch (error) {
    console.error('Ошибка получения конфигурации Facebook:', error);
    res.status(500).json({ error: 'Ошибка получения конфигурации' });
  }
});

// Сохранить конфигурацию Facebook
router.post('/config', async (req, res) => {
  try {
    const { pixelId, accessToken, testEventCode, isActive, events } = req.body;
    
    // Валидация
    if (!pixelId || !accessToken) {
      return res.status(400).json({ error: 'Pixel ID и Access Token обязательны' });
    }

    // Проверяем существующую конфигурацию
    let config = await FacebookConfig.findOne();
    
    if (config) {
      // Обновляем существующую
      config.pixelId = pixelId;
      config.accessToken = accessToken;
      config.testEventCode = testEventCode;
      config.isActive = isActive;
      config.events = events;
      await config.save();
    } else {
      // Создаем новую
      config = new FacebookConfig({
        pixelId,
        accessToken,
        testEventCode,
        isActive,
        events
      });
      await config.save();
    }

    res.json({ message: 'Конфигурация сохранена', config });
  } catch (error) {
    console.error('Ошибка сохранения конфигурации Facebook:', error);
    res.status(500).json({ error: 'Ошибка сохранения конфигурации' });
  }
});

// Тестирование отправки события
router.post('/test-event', async (req, res) => {
  try {
    const { 
      eventName, 
      eventData, 
      userData = {}, 
      attribution = {} 
    } = req.body;
    
    // Получаем IP адрес клиента
    const client_ip_address = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 
      (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      '127.0.0.1';
    
    // Формируем полный payload для Facebook
    const fullPayload = {
      event_name: eventName,
      event_id: eventData.event_id,
      event_source_url: eventData.event_source_url,
      event_time: eventData.event_time,
      action_source: eventData.action_source,
      client_ip_address,
      client_user_agent: eventData.client_user_agent,
      fbp: eventData.fbp,
      fbc: eventData.fbc,
      user_data: userData,
      custom_data: {
        content_ids: eventData.content_ids,
        content_type: eventData.content_type,
        content_name: eventData.content_name,
        content_category: eventData.content_category,
        value: eventData.value,
        currency: eventData.currency,
        num_items: eventData.num_items,
        order_id: eventData.order_id
      },
      // UTM параметры
      ...(attribution.utm_source && { utm_source: attribution.utm_source }),
      ...(attribution.utm_medium && { utm_medium: attribution.utm_medium }),
      ...(attribution.utm_campaign && { utm_campaign: attribution.utm_campaign }),
      ...(attribution.utm_term && { utm_term: attribution.utm_term }),
      ...(attribution.utm_content && { utm_content: attribution.utm_content })
    };
    
    const result = await facebookService.sendEvent(eventName, fullPayload);
    res.json({ message: 'Событие отправлено в Facebook', result });
  } catch (error) {
    console.error('Ошибка отправки события в Facebook:', error);
    res.status(500).json({ error: 'Ошибка отправки события' });
  }
});

// Endpoint для отправки событий из frontend
router.post('/events', async (req, res) => {
  try {
    const { eventName, eventData, userData } = req.body;
    
    const result = await facebookService.sendEvent(eventName, eventData, userData);
    res.json(result);
  } catch (error) {
    console.error('Ошибка отправки события:', error);
    res.status(500).json({ error: 'Ошибка отправки события' });
  }
});

module.exports = router;
