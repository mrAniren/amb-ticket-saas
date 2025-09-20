import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useEvent } from '../../hooks/useEvents';
import { apiClient } from '../../services/api';
import { Layout } from '../../components/Layout';
import { ImageUpload } from '../EventCreatePage/components/ImageUpload';
import './EventEditPage.scss';

export const EventEditPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { data: eventData, loading: eventLoading, error: eventError, refetch } = useEvent(eventId || '');
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: ''
  });

  const [errors, setErrors] = useState<{
    name?: string;
    description?: string;
    image?: string;
  }>({});

  // Загружаем данные мероприятия при монтировании компонента
  useEffect(() => {
    if (eventData?.event) {
      setFormData({
        name: eventData.event.name || '',
        description: eventData.event.description || '',
        image: eventData.event.image || ''
      });
    }
  }, [eventData]);

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleImageChange = (imageData: string) => {
    setFormData(prev => ({
      ...prev,
      image: imageData
    }));
    
    // Очищаем ошибку изображения
    if (errors.image) {
      setErrors(prev => ({
        ...prev,
        image: undefined
      }));
    }
  };

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название мероприятия обязательно';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание мероприятия обязательно';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!eventId) {
      alert('Ошибка: ID мероприятия не найден');
      return;
    }

    setLoading(true);
    
    try {
      await apiClient.updateEvent(eventId, {
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: formData.image
      });
      
      alert('Мероприятие успешно обновлено!');
      window.location.href = '/events';
    } catch (error: any) {
      console.error('Ошибка обновления мероприятия:', error);
      alert('Ошибка при обновлении мероприятия: ' + (error?.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = '/events';
  };

  if (eventLoading) {
    return (
      <Layout currentPage="events">
        <div className="event-edit-page">
          <div className="event-edit-page__loading">
            Загрузка данных мероприятия...
          </div>
        </div>
      </Layout>
    );
  }

  if (eventError || !eventData?.event) {
    return (
      <Layout currentPage="events">
        <div className="event-edit-page">
          <div className="event-edit-page__error">
            <h2>Ошибка загрузки</h2>
            <p>Не удалось загрузить данные мероприятия</p>
            <button onClick={handleBack} className="btn btn--primary">
              Вернуться к списку
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="events">
      <div className="event-edit-page">
        <div className="event-edit-page__header">
          <button onClick={handleBack} className="btn btn--outline">
            ← Назад к списку
          </button>
          <h1>Редактирование мероприятия</h1>
        </div>

        <div className="event-edit-page__content">
          <form onSubmit={handleSubmit} className="event-edit-form">
            <div className="event-edit-form__section">
              <h2>Основная информация</h2>
              
              <div className="form-group">
                <label htmlFor="name" className="form-label">
                  Название мероприятия *
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange('name')}
                  className={`form-input ${errors.name ? 'form-input--error' : ''}`}
                  placeholder="Введите название мероприятия"
                />
                {errors.name && <span className="form-error">{errors.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="description" className="form-label">
                  Описание мероприятия *
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={handleInputChange('description')}
                  className={`form-textarea ${errors.description ? 'form-textarea--error' : ''}`}
                  placeholder="Опишите мероприятие"
                  rows={4}
                />
                {errors.description && <span className="form-error">{errors.description}</span>}
              </div>
            </div>

            <div className="event-edit-form__section">
              <h2>Изображение</h2>
              <ImageUpload
                onImageChange={handleImageChange}
                initialImage={formData.image}
                error={errors.image}
              />
            </div>

            <div className="event-edit-form__actions">
              <button
                type="button"
                onClick={handleBack}
                className="btn btn--outline"
                disabled={loading}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={loading}
              >
                {loading ? 'Сохранение...' : 'Сохранить изменения'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};
