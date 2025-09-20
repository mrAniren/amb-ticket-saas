const express = require('express');
const router = express.Router();
const Widget = require('../models/Widget');
const Session = require('../models/Session');

// GET /api/widget/script/:widgetId - скрипт виджета для встраивания
router.get('/script/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;

    const widget = await Widget.findByWidgetId(widgetId);
    if (!widget) {
      return res.status(404).send('// Виджет не найден');
    }

    // Генерируем JavaScript код виджета
    const script = `
(function() {
  'use strict';
  
  var WIDGET_ID = '${widgetId}';
  var FRONTEND_URL = 'http://localhost:5173';
  var BACKEND_URL = '${process.env.BACKEND_URL || 'http://localhost:3001'}';
  var WIDGET_API_BASE = BACKEND_URL + '/api/widget';
  
  // Проверяем, не загружен ли уже виджет
  if (window.SeatmapWidgets && window.SeatmapWidgets[WIDGET_ID]) {
    return;
  }
  
  // Инициализируем глобальный объект виджетов
  window.SeatmapWidgets = window.SeatmapWidgets || {};
  
  // Создаем контейнер для виджета
  var containerId = 'seatmap-widget-' + WIDGET_ID;
  var container = document.getElementById(containerId);
  
  if (!container) {
    // Если контейнер не найден, создаем его в месте подключения скрипта
    var scripts = document.getElementsByTagName('script');
    var currentScript = scripts[scripts.length - 1];
    container = document.createElement('div');
    container.id = containerId;
    currentScript.parentNode.insertBefore(container, currentScript.nextSibling);
  }
  
  // Функция для получения UTM-параметров из URL
  function getUTMParameter(name) {
    var urlParams = new URLSearchParams(window.location.search);
    var value = urlParams.get(name) || '';
    console.log('🔍 UTM параметр ' + name + ':', value, '(версия скрипта: 2.0)');
    return value;
  }
  
  // Функция для отправки статистики
  function trackEvent(eventType, data) {
    fetch(WIDGET_API_BASE + '/' + WIDGET_ID + '/stats/' + eventType, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        ...data
      })
    }).catch(function(error) {
      console.warn('Widget tracking error:', error);
    });
  }
  
  // Функция загрузки данных виджета
  function loadWidgetData() {
    return fetch(WIDGET_API_BASE + '/data/' + WIDGET_ID)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load widget data');
        return response.json();
      });
  }
  
  // Функция рендеринга виджета
  function renderWidget(data) {
    console.log('🎨 Начинаем рендер виджета с данными:', data);
    
    var widget = data.widget;
    var session = data.session;
    var event = data.event;
    var hall = data.hall;
    var availableSeats = data.availableSeats || 0;
    
    console.log('🔧 Настройки виджета:', widget?.settings);
    
    var settings = widget.settings;
    var displayMode = settings.displayMode || 'embedded';
    
    console.log('📱 Режим отображения:', displayMode);
    
    if (displayMode === 'modal') {
      // Режим с кнопкой и модальным окном
      renderModalWidget(data);
    } else {
      // Встроенный режим (по умолчанию)
      renderEmbeddedWidget(data);
    }
  }
  
  // Встроенный виджет (iframe сразу на странице)
  function renderEmbeddedWidget(data) {
    var widget = data.widget;
    var session = data.session;
    var event = data.event;
    var hall = data.hall;
    var settings = widget.settings;
    
    var widgetHTML = \`
      <div class="seatmap-widget-embedded" style="
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 4px 16px rgba(0,0,0,0.1);
        background-color: white;
      ">
        
        <iframe 
          src="\${FRONTEND_URL}/embed/tickets/\${session._id}?widgetId=\${WIDGET_ID}&utm_source=\${encodeURIComponent(getUTMParameter('utm_source'))}&utm_medium=\${encodeURIComponent(getUTMParameter('utm_medium'))}&utm_campaign=\${encodeURIComponent(getUTMParameter('utm_campaign'))}&utm_term=\${encodeURIComponent(getUTMParameter('utm_term'))}&utm_content=\${encodeURIComponent(getUTMParameter('utm_content'))}"
          style="
            width: 100%;
            height: 100vh;
            border: none;
            display: block;
          "
          onload="console.log('🎯 iframe загружен с URL:', this.src); if(window.parent && window.parent.trackEvent) window.parent.trackEvent('view', { sessionId: '\${session._id}' })"
        ></iframe>
      </div>
    \`;
    
    container.innerHTML = widgetHTML;
  }
  
  // Модальный виджет (кнопка + лайтбокс)
  function renderModalWidget(data) {
    var widget = data.widget;
    var session = data.session;
    var event = data.event;
    var hall = data.hall;
    var availableSeats = data.availableSeats || 0;
    var settings = widget.settings;
    
    // Создаем кнопку
    var widgetHTML = \`
      <div class="seatmap-widget-modal" style="
        width: \${settings.width};
        max-width: 400px;
        margin: 20px auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: \${settings.borderRadius};
        background: \${settings.backgroundColor};
        color: \${settings.textColor};
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        text-align: center;
      ">
        
        <button 
          id="seatmap-widget-button-\${WIDGET_ID}"
          style="
            width: 100%;
            padding: 12px 20px;
            background: \${settings.buttonColor};
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            margin-top: 15px;
            transition: background-color 0.2s;
          "
        >
          \${settings.buttonText}
        </button>
      </div>
      
      <!-- Модальное окно -->
      <div id="seatmap-modal-\${WIDGET_ID}" style="
        display: none;
        position: fixed;
        z-index: 999999;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        <div style="
          background-color: #fefefe;
          margin: 2% auto;
          padding: 0;
          border-radius: 10px;
          width: 95%;
          max-width: 1200px;
          height: 90%;
          position: relative;
          overflow: hidden;
        ">
          <div style="
            position: absolute;
            top: 15px;
            right: 20px;
            color: #aaa;
            font-size: 28px;
            font-weight: bold;
            cursor: pointer;
            z-index: 1000;
            background: rgba(255,255,255,0.9);
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          " onclick="closeModal\${WIDGET_ID}()">&times;</div>
          
          <iframe 
            id="seatmap-iframe-\${WIDGET_ID}"
            style="
              width: 100%;
              height: 100%;
              border: none;
              border-radius: 10px;
            "
          ></iframe>
        </div>
      </div>
    \`;
    
    container.innerHTML = widgetHTML;
    
    // Функции для работы с модальным окном
    window['openModal' + WIDGET_ID] = function() {
      trackEvent('click', { sessionId: session._id });
      
      var modal = document.getElementById('seatmap-modal-' + WIDGET_ID);
      var iframe = document.getElementById('seatmap-iframe-' + WIDGET_ID);
      
      // Загружаем iframe только при открытии модального окна
      if (!iframe.src) {
        var utmParams = '?widgetId=' + WIDGET_ID + 
                       '&utm_source=' + encodeURIComponent(getUTMParameter('utm_source')) + 
                       '&utm_medium=' + encodeURIComponent(getUTMParameter('utm_medium')) + 
                       '&utm_campaign=' + encodeURIComponent(getUTMParameter('utm_campaign')) + 
                       '&utm_term=' + encodeURIComponent(getUTMParameter('utm_term')) + 
                       '&utm_content=' + encodeURIComponent(getUTMParameter('utm_content'));
        iframe.src = FRONTEND_URL + '/embed/tickets/' + session._id + utmParams;
      }
      
      modal.style.display = 'block';
      document.body.style.overflow = 'hidden'; // Блокируем прокрутку страницы
    };
    
    window['closeModal' + WIDGET_ID] = function() {
      var modal = document.getElementById('seatmap-modal-' + WIDGET_ID);
      modal.style.display = 'none';
      document.body.style.overflow = 'auto'; // Возвращаем прокрутку страницы
    };
    
    // Обработчик клика по кнопке
    var button = document.getElementById('seatmap-widget-button-' + WIDGET_ID);
    if (button) {
      button.addEventListener('click', window['openModal' + WIDGET_ID]);
      
      // Эффект наведения
      button.addEventListener('mouseover', function() {
        this.style.backgroundColor = darkenColor(settings.buttonColor, 20);
      });
      button.addEventListener('mouseout', function() {
        this.style.backgroundColor = settings.buttonColor;
      });
    }
    
    // Закрытие по клику вне модального окна
    var modal = document.getElementById('seatmap-modal-' + WIDGET_ID);
    if (modal) {
      modal.addEventListener('click', function(event) {
        if (event.target === modal) {
          window['closeModal' + WIDGET_ID]();
        }
      });
    }
  }
  
  // Функция затемнения цвета
  function darkenColor(color, percent) {
    var num = parseInt(color.replace("#",""), 16);
    var amt = Math.round(2.55 * percent);
    var R = (num >> 16) - amt;
    var G = (num >> 8 & 0x00FF) - amt;
    var B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }
  
  // Инициализация виджета
  function initWidget() {
    trackEvent('view');
    
    loadWidgetData()
      .then(function(response) {
        console.log('🔍 Получен ответ API:', response);
        
        if (!response.success) {
          throw new Error(response.message || 'Failed to load widget data');
        }
        
        // API возвращает { success: true, data: { widget, session, event, hall, availableSeats } }
        const data = response.data;
        console.log('📦 Обработанные данные:', data);
        console.log('🎫 Session data:', data.session);
        
        if (!data.session || !data.session._id) {
          console.error('❌ Session data missing:', data);
          throw new Error('Session data is missing or invalid');
        }
        
        console.log('✅ Session ID найден:', data.session._id);
        
        window.SeatmapWidgets[WIDGET_ID] = {
          data: data,
          sessionId: data.session._id
        };
        renderWidget(data);
      })
      .catch(function(error) {
        console.error('Widget loading error:', error);
        container.innerHTML = \`
          <div style="
            padding: 16px;
            background-color: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            text-align: center;
            color: #6c757d;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          ">
            <p>⚠️ Ошибка загрузки виджета</p>
            <small>Попробуйте обновить страницу</small>
          </div>
        \`;
      });
  }
  
  // Запускаем инициализацию
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
  
})();`;

    // Устанавливаем правильные заголовки для JavaScript
    res.set({
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate', // Отключаем кеширование для тестирования
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.send(script);

  } catch (error) {
    console.error('❌ Ошибка генерации скрипта виджета:', error);
    res.status(500).send('// Ошибка генерации виджета');
  }
});

// GET /api/widget/data/:widgetId - данные для виджета
router.get('/data/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;
    console.log('🔍 Ищем виджет с ID:', widgetId);

    const widget = await Widget.findByWidgetId(widgetId)
      .populate({
        path: 'sessionId',
        populate: [
          { path: 'eventId', select: 'title description' },
          { path: 'hallId', select: 'name capacity' }
        ]
      });

    console.log('📦 Найденный виджет:', widget ? 'найден' : 'не найден');

    if (!widget) {
      console.log('❌ Виджет не найден, возвращаем 404');
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }

    const session = widget.sessionId;
    const event = session.eventId;
    const hall = session.hallId;

    // Подсчитываем доступные места
    const availableSeats = session.tickets ? 
      session.tickets.filter(ticket => ticket.status === 'available').length : 0;

    // Возвращаем публичные данные
    const responseData = {
      widget: widget.toPublicJSON(),
      session: {
        _id: session._id,
        date: session.date,
        time: session.time
      },
      event: event ? {
        title: event.title,
        description: event.description
      } : null,
      hall: hall ? {
        name: hall.name,
        seats: hall.seats // Добавляем данные о местах зала
      } : null,
      availableSeats
    };

    res.set({
      'Cache-Control': 'public, max-age=60', // Кешируем на 1 минуту
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Content-Type'
    });

    res.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('❌ Ошибка получения данных виджета:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при получении данных виджета',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/widget/iframe/:widgetId - HTML для iframe виджета (альтернативный способ встраивания)
router.get('/iframe/:widgetId', async (req, res) => {
  try {
    const { widgetId } = req.params;

    const widget = await Widget.findByWidgetId(widgetId);
    if (!widget) {
      return res.status(404).send('<!DOCTYPE html><html><body><p>Виджет не найден</p></body></html>');
    }

    const iframeHTML = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Билеты - ${widget.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: transparent;
            overflow: hidden;
        }
        #widget-container {
            width: 100%;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
    <div id="widget-container">
        <div id="seatmap-widget-${widgetId}"></div>
    </div>
    <script src="${process.env.BACKEND_URL || 'http://localhost:3001'}/api/widget/script/${widgetId}"></script>
</body>
</html>`;

    res.set({
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
      'X-Frame-Options': 'SAMEORIGIN'
    });

    res.send(iframeHTML);

  } catch (error) {
    console.error('❌ Ошибка генерации iframe виджета:', error);
    res.status(500).send('<!DOCTYPE html><html><body><p>Ошибка загрузки виджета</p></body></html>');
  }
});

// POST /api/widget/:widgetId/stats/:eventType - отслеживание событий виджета
router.post('/:widgetId/stats/:eventType', async (req, res) => {
  try {
    const { widgetId, eventType } = req.params;
    const trackingData = req.body;

    console.log(`📊 Отслеживание события ${eventType} для виджета ${widgetId}:`, trackingData);

    const widget = await Widget.findByWidgetId(widgetId);
    if (!widget) {
      return res.status(404).json({
        success: false,
        message: 'Виджет не найден'
      });
    }

    // Обновляем статистику в зависимости от типа события
    switch (eventType) {
      case 'view':
        await widget.incrementViews();
        break;
      case 'click':
        await widget.incrementClicks();
        break;
      default:
        console.log(`⚠️ Неизвестный тип события: ${eventType}`);
    }

    res.json({
      success: true,
      message: `Событие ${eventType} зафиксировано`
    });

  } catch (error) {
    console.error('❌ Ошибка отслеживания события:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка при отслеживании события',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
