import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api';
import { Layout } from '../../components/Layout';
import { ImageUpload } from './components/ImageUpload';
import './EventCreatePage.scss';

export const EventCreatePage: React.FC = () => {
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
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Название должно содержать минимум 3 символа';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Название не должно превышать 100 символов';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание мероприятия обязательно';
    } else if (formData.description.trim().length < 10) {
      newErrors.description = 'Описание должно содержать минимум 10 символов';
    } else if (formData.description.trim().length > 1000) {
      newErrors.description = 'Описание не должно превышать 1000 символов';
    }

    if (!formData.image.trim()) {
      newErrors.image = 'Изображение мероприятия обязательно';
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
      const response = await apiClient.createEvent({
        name: formData.name.trim(),
        description: formData.description.trim(),
        image: formData.image
      });

      console.log('Мероприятие создано:', response.event);
      alert('Мероприятие успешно создано!');
      
      // Переходим к списку мероприятий
      window.location.href = '/events';
    } catch (error) {
      console.error('Ошибка при создании мероприятия:', error);
      alert('Ошибка при создании мероприятия. Попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (formData.name || formData.description || formData.image) {
      if (confirm('У вас есть несохраненные изменения. Вы уверены, что хотите выйти?')) {
        window.location.href = '/events';
      }
    } else {
      window.location.href = '/events';
    }
  };

  return (
    <Layout currentPage="events">
      <div className="event-create-page">
        <header className="event-create-page__header">
          <div className="event-create-page__title">
            <img src="/logo.png" alt="Логотип" className="event-create-page__logo" />
            <h1>Создание мероприятия</h1>
          </div>
          
        </header>

        <main className="event-create-page__content">
          <div className="event-create-page__container">
            <form onSubmit={handleSubmit} className="event-form">
              <div className="event-form__section">
                <h2 className="event-form__section-title">Основная информация</h2>
                
                <div className="event-form__field">
                  <label htmlFor="name" className="event-form__label">
                    Название мероприятия *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={formData.name}
                    onChange={handleInputChange('name')}
                    className={`event-form__input ${errors.name ? 'event-form__input--error' : ''}`}
                    placeholder="Введите название мероприятия"
                    maxLength={100}
                    disabled={loading}
                  />
                  {errors.name && (
                    <span className="event-form__error">{errors.name}</span>
                  )}
                  <span className="event-form__hint">
                    {formData.name.length}/100 символов
                  </span>
                </div>

                <div className="event-form__field">
                  <label htmlFor="description" className="event-form__label">
                    Описание мероприятия *
                  </label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={handleInputChange('description')}
                    className={`event-form__textarea ${errors.description ? 'event-form__textarea--error' : ''}`}
                    placeholder="Опишите ваше мероприятие, его особенности, целевую аудиторию..."
                    rows={6}
                    maxLength={1000}
                    disabled={loading}
                  />
                  {errors.description && (
                    <span className="event-form__error">{errors.description}</span>
                  )}
                  <span className="event-form__hint">
                    {formData.description.length}/1000 символов
                  </span>
                </div>
              </div>

              <div className="event-form__section">
                <h2 className="event-form__section-title">Изображение мероприятия</h2>
                
                <div className="event-form__field">
                  <ImageUpload
                    onImageChange={handleImageChange}
                    currentImage={formData.image}
                    error={errors.image}
                    disabled={loading}
                  />
                  {errors.image && (
                    <span className="event-form__error">{errors.image}</span>
                  )}
                </div>
              </div>

              <div className="event-form__actions">
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
                    '✨ Создать мероприятие'
                  )}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </Layout>
  );
};
