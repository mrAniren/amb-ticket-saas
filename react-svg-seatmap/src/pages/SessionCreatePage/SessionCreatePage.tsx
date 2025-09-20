import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useEvent } from '../../hooks/useEvents';
import { useHalls } from '../../hooks/useApi';
import { apiClient, getId } from '../../services/api';
import { Layout } from '../../components/Layout';
import { PriceSchemeCreateModal } from '../../components/PriceSchemeCreateModal';
import { Event, SessionFormData } from '../../types/Event.types';
import { Hall } from '../../types/api.types';
import { PriceScheme } from '../../types/PriceScheme.types';
import './SessionCreatePage.scss';

export const SessionCreatePage: React.FC = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('eventId');
  const newPriceSchemeId = urlParams.get('newPriceSchemeId');
  
  console.log('🔄 SessionCreatePage загружена с параметрами:');
  console.log('  - eventId:', eventId);
  console.log('  - newPriceSchemeId:', newPriceSchemeId);
  
  const { data: eventData, loading: eventLoading, error: eventError } = useEvent(eventId || undefined);
  const { data: hallsData, loading: hallsLoading, error: hallsError } = useHalls();
  
  const event = eventData?.event;
  const halls = hallsData?.halls || [];

  const [loading, setLoading] = useState(false);
  const [priceSchemes, setPriceSchemes] = useState<PriceScheme[]>([]);
  const [loadingPriceSchemes, setLoadingPriceSchemes] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const [formData, setFormData] = useState<SessionFormData>({
    eventId: eventId || '',
    date: '',
    time: '',
    hallId: '',
    priceSchemeId: ''
  });

  const [errors, setErrors] = useState<{
    date?: string;
    time?: string;
    hallId?: string;
    priceSchemeId?: string;
  }>({});

  // Восстанавливаем данные формы из URL при загрузке
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const restoredData: Partial<SessionFormData> = {};
    
    if (params.get('eventId')) restoredData.eventId = params.get('eventId')!;
    if (params.get('date')) restoredData.date = params.get('date')!;
    if (params.get('time')) restoredData.time = params.get('time')!;
    if (params.get('hallId')) restoredData.hallId = params.get('hallId')!; // Не парсим в число!
    
    console.log('🔄 Восстанавливаем данные формы из URL:', restoredData);
    
    if (Object.keys(restoredData).length > 0) {
      setFormData(prev => ({ ...prev, ...restoredData }));
      
      // Загружаем распоясовки для зала если он выбран
      if (restoredData.hallId) {
        loadPriceSchemes(restoredData.hallId);
      }
    }
  }, []); // Пустой массив зависимостей - выполняется только при монтировании

  // Устанавливаем новую распоясовку при возврате из создания
  useEffect(() => {
    if (newPriceSchemeId) {
      console.log('✅ Автоматически выбираем созданную распоясовку:', newPriceSchemeId);
      setFormData(prev => ({
        ...prev,
        priceSchemeId: newPriceSchemeId
      }));
      
      // Очищаем URL от параметра newPriceSchemeId
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('newPriceSchemeId');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [newPriceSchemeId]);

  const loadPriceSchemes = useCallback(async (hallId: string) => {
    if (!hallId) {
      setPriceSchemes([]);
      return;
    }

    setLoadingPriceSchemes(true);
    try {
      const response = await apiClient.getHallPriceSchemes(hallId);
      setPriceSchemes(response.priceSchemes);
      
      // Если нет распоясовок, сбрасываем выбор
      if (response.priceSchemes.length === 0) {
        setFormData(prev => ({ ...prev, priceSchemeId: '' }));
      }
    } catch (error) {
      console.error('Ошибка при загрузке распоясовок:', error);
      setPriceSchemes([]);
    } finally {
      setLoadingPriceSchemes(false);
    }
  }, []);

  const handleInputChange = (field: keyof SessionFormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.value;
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Очищаем ошибку при изменении поля
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // При изменении зала загружаем его распоясовки
    if (field === 'hallId' && value) {
      loadPriceSchemes(value as string);
    }
  };

  const handleCreatePriceScheme = () => {
    console.log('Текущие данные формы сеанса:', formData);
    console.log('Выбранный зал ID:', formData.hallId);
    
    if (!formData.hallId) {
      alert('Сначала выберите зал');
      return;
    }

    // Открываем модальное окно
    setShowCreateModal(true);
  };

  const handlePriceSchemeCreated = async (priceSchemeId: string) => {
    // Эта функция больше не используется, так как переходим на страницу редактирования
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.date) {
      newErrors.date = 'Дата сеанса обязательна';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.date = 'Дата не может быть в прошлом';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Время сеанса обязательно';
    }

    if (!formData.hallId) {
      newErrors.hallId = 'Выбор зала обязателен';
    }

    if (!formData.priceSchemeId) {
      newErrors.priceSchemeId = 'Выбор распоясовки обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const sessionData = {
        eventId: formData.eventId,
        date: formData.date,
        time: formData.time,
        hallId: formData.hallId,
        priceSchemeId: formData.priceSchemeId
      };

      const response = await apiClient.createSession(sessionData);
      alert('Сеанс успешно создан!');
      
      // Возвращаемся к мероприятию
      window.location.href = `/events/${formData.eventId}`;
    } catch (error) {
      console.error('❌ Ошибка при создании сеанса:', error);
      alert(`Ошибка при создании сеанса: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (Object.values(formData).some(value => value)) {
      if (confirm('У вас есть несохраненные изменения. Вы уверены, что хотите выйти?')) {
        window.location.href = eventId ? `/events/${eventId}` : '/events';
      }
    } else {
      window.location.href = eventId ? `/events/${eventId}` : '/events';
    }
  };

  // Получаем минимальную дату (сегодня)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  if (!eventId) {
    return (
      <Layout currentPage="events">
        <div className="session-create-page">
          <div className="session-create-page__error">
            <h2>Ошибка</h2>
            <p>Не указано мероприятие для создания сеанса</p>
            <button onClick={() => window.location.href = '/events'} className="btn btn--primary">
              Вернуться к мероприятиям
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (eventLoading || hallsLoading) {
    return (
      <Layout currentPage="events">
        <div className="session-create-page">
          <div className="session-create-page__loading">
            <div className="spinner"></div>
            <p>Загрузка данных...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (eventError || !event) {
    return (
      <Layout currentPage="events">
        <div className="session-create-page">
          <div className="session-create-page__error">
            <h2>Ошибка загрузки</h2>
            <p>{eventError || 'Мероприятие не найдено'}</p>
            <button onClick={() => window.location.href = '/events'} className="btn btn--primary">
              Вернуться к мероприятиям
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (hallsError || halls.length === 0) {
    return (
      <Layout currentPage="events">
        <div className="session-create-page">
          <div className="session-create-page__error">
            <h2>Нет доступных залов</h2>
            <p>Для создания сеанса необходимо создать хотя бы один зал</p>
            <div className="session-create-page__error-actions">
              <button onClick={() => window.location.href = '/halls/create'} className="btn btn--primary">
                Создать зал
              </button>
              <button onClick={handleCancel} className="btn btn--secondary">
                Вернуться назад
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="events">
      <div className="session-create-page">
        <header className="session-create-page__header">
          <div className="session-create-page__title">
            <button 
              onClick={handleCancel}
              className="session-create-page__back-btn"
              title="Вернуться к мероприятию"
            >
              ← {event.name}
            </button>
            <h1>Создание сеанса</h1>
          </div>
          
        </header>

        <main className="session-create-page__content">
          <div className="session-create-page__container">
            <form onSubmit={handleSubmit} className="session-form">
              <div className="session-form__section">
                <h2 className="session-form__section-title">Информация о мероприятии</h2>
                
                <div className="session-form__event-info">
                  <div className="session-form__event-visual">
                    {event.image ? (
                      <img src={event.image} alt={event.name} className="session-form__event-image" />
                    ) : (
                      <div className="session-form__event-placeholder">🎭</div>
                    )}
                  </div>
                  <div className="session-form__event-details">
                    <h3>{event.name}</h3>
                    <p>{event.description}</p>
                  </div>
                </div>
              </div>

              <div className="session-form__section">
                <h2 className="session-form__section-title">Дата и время</h2>
                
                <div className="session-form__row">
                  <div className="session-form__field">
                    <label htmlFor="date" className="session-form__label">
                      Дата сеанса *
                    </label>
                    <input
                      type="date"
                      id="date"
                      value={formData.date}
                      min={getMinDate()}
                      onChange={handleInputChange('date')}
                      className={`session-form__input ${errors.date ? 'session-form__input--error' : ''}`}
                      disabled={loading}
                    />
                    {errors.date && (
                      <span className="session-form__error">{errors.date}</span>
                    )}
                  </div>

                  <div className="session-form__field">
                    <label htmlFor="time" className="session-form__label">
                      Время сеанса *
                    </label>
                    <input
                      type="time"
                      id="time"
                      value={formData.time}
                      onChange={handleInputChange('time')}
                      className={`session-form__input ${errors.time ? 'session-form__input--error' : ''}`}
                      disabled={loading}
                    />
                    {errors.time && (
                      <span className="session-form__error">{errors.time}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="session-form__section">
                <h2 className="session-form__section-title">Зал и распоясовка</h2>
                
                <div className="session-form__field">
                  <label htmlFor="hallId" className="session-form__label">
                    Выберите зал *
                  </label>
                  <select
                    id="hallId"
                    value={formData.hallId}
                    onChange={handleInputChange('hallId')}
                    className={`session-form__select ${errors.hallId ? 'session-form__select--error' : ''}`}
                    disabled={loading}
                  >
                    <option value="">-- Выберите зал --</option>
                    {halls.map((hall) => (
                      <option key={hall.id} value={hall.id}>
                        {hall.name} {hall.city ? `(${hall.city})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.hallId && (
                    <span className="session-form__error">{errors.hallId}</span>
                  )}
                </div>

                <div className="session-form__field">
                  <label htmlFor="priceSchemeId" className="session-form__label">
                    Выберите распоясовку *
                  </label>
                  <div className="session-form__price-scheme-wrapper">
                    <select
                      id="priceSchemeId"
                      value={formData.priceSchemeId}
                      onChange={handleInputChange('priceSchemeId')}
                      className={`session-form__select ${errors.priceSchemeId ? 'session-form__select--error' : ''}`}
                      disabled={loading || loadingPriceSchemes || !formData.hallId}
                    >
                      <option value="">
                        {!formData.hallId 
                          ? '-- Сначала выберите зал --' 
                          : loadingPriceSchemes 
                            ? 'Загрузка...'
                            : priceSchemes.length === 0 
                              ? 'Нет доступных распоясовок'
                              : '-- Выберите распоясовку --'
                        }
                      </option>
                      {priceSchemes.map((scheme) => (
                        <option key={scheme.id} value={scheme.id}>
                          {scheme.name} ({scheme.prices.length} {scheme.prices.length === 1 ? 'цена' : scheme.prices.length < 5 ? 'цены' : 'цен'})
                        </option>
                      ))}
                    </select>
                    
                    {formData.hallId && (
                      <button
                        type="button"
                        onClick={handleCreatePriceScheme}
                        className="session-form__create-price-scheme-btn"
                        disabled={loading || loadingPriceSchemes}
                        title="Создать новую распоясовку для выбранного зала"
                      >
                        ➕ Создать новую
                      </button>
                    )}
                  </div>
                  {errors.priceSchemeId && (
                    <span className="session-form__error">{errors.priceSchemeId}</span>
                  )}
                  
                  {formData.hallId && priceSchemes.length === 0 && !loadingPriceSchemes && (
                    <div className="session-form__hint session-form__hint--warning">
                      ⚠️ Для этого зала нет распоясовок. Создайте новую распоясовку.
                    </div>
                  )}
                </div>
              </div>

              <div className="session-form__actions">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="btn btn--secondary"
                  disabled={loading}
                >
                  Отмена
                </button>
                
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="btn__spinner"></span>
                      Создание...
                    </>
                  ) : (
                    '🎬 Создать сеанс'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>

      {/* Модальное окно создания распоясовки */}
      <PriceSchemeCreateModal
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={handlePriceSchemeCreated}
        preselectedHallId={formData.hallId}
        hallName={halls.find(h => h.id === formData.hallId)?.name}
        sessionFormData={{
          eventId: formData.eventId,
          date: formData.date,
          time: formData.time
        }}
      />
    </Layout>
  );
};
