const crypto = require('crypto');
const FacebookConfig = require('../models/FacebookConfig');

class FacebookService {
  constructor() {
    this.apiUrl = 'https://graph.facebook.com/v18.0';
  }

  // Хеширование PII данных
  hashPII(data) {
    if (!data) return null;
    return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
  }

  // Получение конфигурации
  async getConfig() {
    return await FacebookConfig.findOne();
  }

  // Отправка события в Facebook Conversions API
  async sendEvent(eventName, fullPayload) {
    try {
      const config = await this.getConfig();
      
      if (!config || !config.isActive) {
        console.log('Facebook интеграция неактивна');
        return { success: false, message: 'Facebook интеграция неактивна' };
      }

      // Проверяем, включено ли это событие
      const eventKey = eventName.charAt(0).toLowerCase() + eventName.slice(1);
      if (!config.events[eventKey]) {
        console.log(`Событие ${eventName} отключено в конфигурации`);
        return { success: false, message: `Событие ${eventName} отключено` };
      }

      // Хешируем PII данные пользователя
      const hashedUserData = {};
      if (fullPayload.user_data) {
        if (fullPayload.user_data.email) hashedUserData.em = this.hashPII(fullPayload.user_data.email);
        if (fullPayload.user_data.phone) hashedUserData.ph = this.hashPII(fullPayload.user_data.phone);
        if (fullPayload.user_data.first_name) hashedUserData.fn = this.hashPII(fullPayload.user_data.first_name);
        if (fullPayload.user_data.last_name) hashedUserData.ln = this.hashPII(fullPayload.user_data.last_name);
        if (fullPayload.user_data.city) hashedUserData.ct = this.hashPII(fullPayload.user_data.city);
        if (fullPayload.user_data.country) hashedUserData.country = this.hashPII(fullPayload.user_data.country);
      }

      // Подготавливаем данные события
      const eventPayload = {
        data: [{
          event_name: fullPayload.event_name,
          event_time: fullPayload.event_time,
          event_id: fullPayload.event_id,
          event_source_url: fullPayload.event_source_url,
          action_source: fullPayload.action_source,
          user_data: {
            ...hashedUserData,
            // Эти поля НЕ хешируются
            client_ip_address: fullPayload.client_ip_address,
            client_user_agent: fullPayload.client_user_agent,
            fbp: fullPayload.fbp,
            fbc: fullPayload.fbc
          },
          custom_data: fullPayload.custom_data || {}
        }],
        access_token: config.accessToken
      };

      // Добавляем UTM параметры в custom_data если есть
      if (fullPayload.utm_source || fullPayload.utm_medium || fullPayload.utm_campaign || fullPayload.utm_term || fullPayload.utm_content) {
        eventPayload.data[0].custom_data = {
          ...eventPayload.data[0].custom_data,
          ...(fullPayload.utm_source && { utm_source: fullPayload.utm_source }),
          ...(fullPayload.utm_medium && { utm_medium: fullPayload.utm_medium }),
          ...(fullPayload.utm_campaign && { utm_campaign: fullPayload.utm_campaign }),
          ...(fullPayload.utm_term && { utm_term: fullPayload.utm_term }),
          ...(fullPayload.utm_content && { utm_content: fullPayload.utm_content })
        };
      }

      // Добавляем test_event_code если есть
      if (config.testEventCode) {
        eventPayload.test_event_code = config.testEventCode;
      }

      // Отправляем запрос в Facebook
      const response = await fetch(`${this.apiUrl}/${config.pixelId}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventPayload)
      });

      const result = await response.json();

      if (response.ok) {
        console.log(`✅ Facebook событие ${eventName} отправлено успешно:`, result);
        return { success: true, result };
      } else {
        console.error(`❌ Ошибка отправки Facebook события ${eventName}:`, result);
        return { success: false, error: result };
      }

    } catch (error) {
      console.error('❌ Ошибка Facebook сервиса:', error);
      return { success: false, error: error.message };
    }
  }

  // Отправка тестового события
  async sendTestEvent(eventName, eventData) {
    const testData = {
      eventId: `test_${Date.now()}`,
      sourceUrl: 'https://test.example.com',
      currency: 'USD',
      value: 100,
      contentIds: ['test_ticket_1'],
      contentType: 'ticket',
      numItems: 1
    };

    const testUserData = {
      email: 'test@example.com',
      phone: '+1234567890',
      firstName: 'Test',
      lastName: 'User',
      city: 'Test City',
      state: 'Test State',
      country: 'US',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0 (Test Browser)'
    };

    return await this.sendEvent(eventName, { ...testData, ...eventData }, testUserData);
  }

  // Генерация уникального ID события
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Отправка события ViewContent
  async sendViewContent(sessionId, userData = {}) {
    return await this.sendEvent('ViewContent', {
      eventId: `view_${sessionId}_${Date.now()}`,
      sourceUrl: `${process.env.FRONTEND_URL}/embed/tickets/${sessionId}`,
      contentIds: [sessionId],
      contentType: 'session',
      numItems: 1
    }, userData);
  }

  // Отправка события AddToCart
  async sendAddToCart(sessionId, ticketIds, userData = {}) {
    return await this.sendEvent('AddToCart', {
      eventId: `add_${sessionId}_${Date.now()}`,
      sourceUrl: `${process.env.FRONTEND_URL}/embed/tickets/${sessionId}`,
      contentIds: ticketIds,
      contentType: 'ticket',
      numItems: ticketIds.length
    }, userData);
  }

  // Отправка события InitiateCheckout
  async sendInitiateCheckout(sessionId, orderId, totalValue, userData = {}) {
    return await this.sendEvent('InitiateCheckout', {
      eventId: `init_${orderId}_${Date.now()}`,
      sourceUrl: `${process.env.FRONTEND_URL}/embed/tickets/${sessionId}`,
      contentIds: [orderId],
      contentType: 'order',
      value: totalValue,
      numItems: 1
    }, userData);
  }

  // Отправка события Purchase
  async sendPurchase(orderId, totalValue, currency, userData = {}) {
    return await this.sendEvent('Purchase', {
      eventId: `purchase_${orderId}_${Date.now()}`,
      sourceUrl: `${process.env.FRONTEND_URL}/orders/${orderId}`,
      contentIds: [orderId],
      contentType: 'order',
      value: totalValue,
      currency: currency,
      numItems: 1
    }, userData);
  }
}

module.exports = new FacebookService();
