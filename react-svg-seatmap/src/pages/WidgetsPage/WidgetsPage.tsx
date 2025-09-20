import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { apiClient } from '../../services/api';
import { SessionWithDetails, Event } from '../../types/Event.types';
import './WidgetsPage.scss';

interface Widget {
  _id: string;
  name: string;
  widgetId: string;
  sessionId: {
    _id: string;
    date: string;
    time: string;
    eventId?: {
      _id: string;
      name: string;
      description?: string;
    };
    hallId?: {
      _id: string;
      name: string;
    };
  };
  isActive: boolean;
  settings: {
    displayMode: 'embedded' | 'modal';
    buttonText: string;
  };
  createdAt: string;
}

// Используем импортированные типы SessionWithDetails и Event

const WidgetsPage: React.FC = () => {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Вкладки: активные и прошедшие
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  
  // Фильтры
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Загрузка виджетов
  const loadWidgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getWidgets();
      
      if (response.success) {
        setWidgets(response.data.widgets);
      } else {
        throw new Error('Ошибка загрузки виджетов');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки виджетов:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // Загрузка сеансов для создания виджета
  const loadSessions = useCallback(async () => {
    try {
      const response = await apiClient.getSessions();
      setSessions(response.sessions || []);
    } catch (err) {
      console.error('❌ Ошибка загрузки сеансов:', err);
    }
  }, []);

  // Загрузка мероприятий для фильтра
  const loadEvents = useCallback(async () => {
    try {
      const response = await apiClient.getEvents();
      setEvents(response.events || []);
    } catch (err) {
      console.error('❌ Ошибка загрузки мероприятий:', err);
    }
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadWidgets();
    loadSessions();
    loadEvents();
  }, [loadWidgets, loadSessions, loadEvents]);

  // Функция для определения, прошел ли сеанс (с учетом часового пояса)
  const isSessionPast = useCallback((sessionDate: string, sessionTime: string) => {
    const now = new Date();
    const sessionDateTime = new Date(`${sessionDate}T${sessionTime}`);
    
    // Учитываем часовой пояс (можно настроить под нужный)
    const timezoneOffset = now.getTimezoneOffset() * 60000;
    const localNow = new Date(now.getTime() - timezoneOffset);
    
    return sessionDateTime < localNow;
  }, []);

  // Разделение виджетов на активные и прошедшие
  const { activeWidgets, pastWidgets } = useMemo(() => {
    const active: Widget[] = [];
    const past: Widget[] = [];

    widgets.forEach(widget => {
      const isPast = isSessionPast(widget.sessionId.date, widget.sessionId.time);
      if (isPast) {
        past.push(widget);
      } else {
        active.push(widget);
      }
    });

    return { activeWidgets: active, pastWidgets: past };
  }, [widgets, isSessionPast]);

  // Фильтрация виджетов
  const filteredWidgets = useMemo(() => {
    const currentWidgets = activeTab === 'active' ? activeWidgets : pastWidgets;
    
    return currentWidgets.filter(widget => {
      // Фильтр по мероприятию
      if (selectedEventId && widget.sessionId.eventId?._id !== selectedEventId) {
        return false;
      }
      
      // Фильтр по дате
      if (selectedDate && widget.sessionId.date !== selectedDate) {
        return false;
      }
      
      return true;
    });
  }, [activeTab, activeWidgets, pastWidgets, selectedEventId, selectedDate]);

  // Создание нового виджета
  const handleCreateWidget = useCallback(async (widgetData: { name: string; sessionId: string; displayMode: string }) => {
    try {
      const response = await apiClient.createWidget(widgetData);

      if (response.success) {
        await loadWidgets(); // Перезагружаем список
        setShowCreateModal(false);
      } else {
        throw new Error('Ошибка создания виджета');
      }
    } catch (err) {
      console.error('❌ Ошибка создания виджета:', err);
      setError(err instanceof Error ? err.message : 'Ошибка создания виджета');
    }
  }, [loadWidgets]);

  // Удаление виджета
  const handleDeleteWidget = useCallback(async (widgetId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот виджет?')) {
      return;
    }

    try {
      const response = await apiClient.deleteWidget(widgetId);

      if (response.success) {
        await loadWidgets(); // Перезагружаем список
      } else {
        throw new Error(response.message || 'Ошибка удаления виджета');
      }
    } catch (err) {
      console.error('❌ Ошибка удаления виджета:', err);
      setError(err instanceof Error ? err.message : 'Ошибка удаления виджета');
    }
  }, [loadWidgets]);

  // Копирование кода виджета
  const handleCopyCode = useCallback((widget: Widget) => {
    const code = `<script src="${window.location.origin}/api/widget/script/${widget.widgetId}"></script>
<div id="seatmap-widget-${widget.widgetId}"></div>`;

    navigator.clipboard.writeText(code).then(() => {
      alert('Код виджета скопирован в буфер обмена!');
    }).catch(() => {
      // Fallback для старых браузеров
      const textArea = document.createElement('textarea');
      textArea.value = code;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Код виджета скопирован в буфер обмена!');
    });
  }, []);

  // Форматирование даты
  const formatDate = useCallback((dateString: string) => {
    // Проверяем, что дата валидна
    if (!dateString) {
      return 'Дата не указана';
    }
    
    // Исправляем некорректный формат даты
    let correctedDateString = dateString;
    
    // Исправляем формат +020251-11-26T18:00:00.000Z на 2025-11-26T18:00:00.000Z
    if (dateString.includes('+020251')) {
      correctedDateString = dateString.replace('+020251', '2025');
    }
    
    // Пытаемся создать дату
    let date: Date;
    
    // Если дата уже в формате YYYY-MM-DD, используем её напрямую
    if (typeof correctedDateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(correctedDateString)) {
      date = new Date(correctedDateString + 'T00:00:00');
    } else {
      date = new Date(correctedDateString);
    }
    
    // Проверяем, что дата валидна
    if (isNaN(date.getTime())) {
      console.error('❌ Невалидная дата:', correctedDateString);
      return 'Неверная дата';
    }
    
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  // Получение уникальных дат для фильтра
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    widgets.forEach(widget => {
      dates.add(widget.sessionId.date);
    });
    return Array.from(dates).sort();
  }, [widgets]);

  if (loading) {
    return (
      <Layout currentPage="widgets">
        <div className="widgets-page">
          <div className="widgets-page__loading">
            <div className="spinner"></div>
            <p>Загрузка виджетов...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="widgets">
      <div className="widgets-page">
        <div className="widgets-page__header">
          <h1>Виджеты</h1>
          <button 
            className="widgets-page__add-button"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Добавить виджет
          </button>
        </div>

        {error && (
          <div className="widgets-page__error">
            <p>❌ {error}</p>
            <button onClick={loadWidgets}>Попробовать снова</button>
          </div>
        )}

        {/* Вкладки */}
        <div className="widgets-page__tabs">
          <button
            className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Активные ({activeWidgets.length})
          </button>
          <button
            className={`tab-button ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Прошедшие ({pastWidgets.length})
          </button>
        </div>

        {/* Фильтры */}
        <div className="widgets-page__filters">
          <div className="filter-group">
            <label htmlFor="event-filter">Мероприятие:</label>
            <select
              id="event-filter"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
            >
              <option value="">Все мероприятия</option>
              {events.map((event, index) => (
                <option key={event.id || `event-${index}`} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="date-filter">Дата сеанса:</label>
            <select
              id="date-filter"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            >
              <option value="">Все даты</option>
              {Array.from(availableDates).map((date, index) => (
                <option key={date || `date-${index}`} value={date}>
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="widgets-page__content">
          {filteredWidgets.length === 0 ? (
            <div className="widgets-page__empty">
              <div className="empty-state">
                <div className="empty-state__icon">📱</div>
                <h3>
                  {activeTab === 'active' ? 'Активных виджетов нет' : 'Прошедших виджетов нет'}
                </h3>
                <p>
                  {activeTab === 'active' 
                    ? 'Создайте виджет для активного сеанса' 
                    : 'Здесь будут отображаться виджеты прошедших сеансов'
                  }
                </p>
                {activeTab === 'active' && (
                  <button 
                    className="empty-state__button"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Создать виджет
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="widgets-page__grid">
              {filteredWidgets.map((widget) => (
                <div key={widget._id} className="widget-card">
                  <div className="widget-card__header">
                    <div className="widget-card__title">
                      <h3 className="widget-card__name">
                        {widget.name}
                      </h3>
                      <div className="widget-card__event">
                        {widget.sessionId.eventId?.name || 'Без названия'}
                      </div>
                    </div>
                    <div className="widget-card__type">
                      {widget.settings.displayMode === 'modal' ? 'Модальное окно' : 'Встраивание'}
                    </div>
                  </div>

                  <div className="widget-card__session">
                    <div className="session-details">
                      📅 {formatDate(widget.sessionId.date)} в {widget.sessionId.time}
                    </div>
                    {widget.sessionId.hallId && (
                      <div className="session-hall">
                        🏛️ {widget.sessionId.hallId.name}
                      </div>
                    )}
                  </div>

                  <div className="widget-card__code">
                    <label>Код для встраивания:</label>
                    <div className="code-container">
                      <code className="widget-code">
                        {`<script src="${window.location.origin}/api/widget/script/${widget.widgetId}"></script>`}
                        <br />
                        {`<div id="seatmap-widget-${widget.widgetId}"></div>`}
                      </code>
                      <button 
                        className="copy-button"
                        onClick={() => handleCopyCode(widget)}
                        title="Копировать код"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  <div className="widget-card__actions">
                    <button
                      className="action-button delete-button"
                      onClick={() => handleDeleteWidget(widget.widgetId)}
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Модальное окно создания виджета */}
        {showCreateModal && (
          <CreateWidgetModal
            sessions={sessions}
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateWidget}
          />
        )}
      </div>
    </Layout>
  );
};

// Компонент модального окна создания виджета
interface CreateWidgetModalProps {
  sessions: SessionWithDetails[];
  onClose: () => void;
  onCreate: (data: { name: string; sessionId: string; displayMode: string }) => void;
}

const CreateWidgetModal: React.FC<CreateWidgetModalProps> = ({ sessions, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [displayMode, setDisplayMode] = useState('embedded');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && sessionId) {
      onCreate({ name: name.trim(), sessionId, displayMode });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal__header">
          <h2>Создать виджет</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit} className="modal__form">
          <div className="form-group">
            <label htmlFor="widget-name">Название виджета:</label>
            <input
              id="widget-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Виджет для главной страницы"
              required
              maxLength={100}
            />
          </div>
          <div className="form-group">
            <label htmlFor="session-select">Выберите сеанс:</label>
            <select
              id="session-select"
              value={sessionId}
              onChange={(e) => setSessionId(e.target.value)}
              required
            >
              <option value="">-- Выберите сеанс --</option>
              {sessions.map((session, index) => (
                <option key={session.id || `session-${index}`} value={session.id}>
                  {session.event?.name || 'Без названия'} - {' '}
                  {new Date(session.date).toLocaleDateString('ru-RU')} в {session.time}
                  {session.hall?.name && ` (${session.hall.name})`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="display-mode">Режим отображения:</label>
            <select
              id="display-mode"
              value={displayMode}
              onChange={(e) => setDisplayMode(e.target.value)}
              required
            >
              <option value="embedded">Встроенный (сразу на странице)</option>
              <option value="modal">Модальное окно (кнопка + лайтбокс)</option>
            </select>
            <small style={{ color: '#666', fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {displayMode === 'embedded' 
                ? 'Полноценная страница продажи билетов будет отображаться сразу на сайте'
                : 'На сайте будет кнопка, которая открывает страницу продажи в модальном окне'
              }
            </small>
          </div>
          <div className="modal__actions">
            <button type="button" onClick={onClose} className="button-secondary">
              Отмена
            </button>
            <button type="submit" className="button-primary">
              Создать виджет
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WidgetsPage;
