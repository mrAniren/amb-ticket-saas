import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useFileUpload } from '../../hooks/useFileUpload';
import { apiClient, getId } from '../../services/api';
import { HallCreateData } from '../../types/api.types';
import { HallForm } from './components/HallForm';
import './HallCreatePage.scss';

export const HallCreatePage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (data: HallCreateData | FormData) => {
    setLoading(true);
    setError('');
    
    try {
      let formData: FormData;
      
      if (data instanceof FormData) {
        formData = data;
      } else {
        formData = new FormData();
        formData.append('name', data.name);
        formData.append('country', data.country);
        formData.append('city', data.city);
        formData.append('timezone', data.timezone);
        if (data.address) formData.append('address', data.address);
        if (data.capacity) formData.append('capacity', data.capacity);
        if (data.photo) formData.append('photo', data.photo);
        if (data.svg) formData.append('svg', data.svg);
        
        // Отладочная информация
        console.log('📤 Отправляем данные зала:', {
          name: data.name,
          country: data.country,
          city: data.city,
          timezone: data.timezone,
          address: data.address,
          capacity: data.capacity,
          hasPhoto: !!data.photo,
          hasSvg: !!data.svg,
          photoName: data.photo?.name,
          svgName: data.svg?.name
        });
      }

      const result = await apiClient.createHall(formData);
      
      // Перенаправляем на страницу редактирования созданного зала
      alert(`Зал "${result.hall.name}" успешно создан!`);
      window.location.href = `/halls/${getId(result.hall)}/edit`;
    } catch (err) {
      console.error('Ошибка создания зала:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при создании зала');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Вы уверены, что хотите отменить создание зала?')) {
      window.location.href = '/halls';
    }
  };

  return (
    <div className="hall-create-page">
      <header className="hall-create-page__header">
        <div className="hall-create-page__title">
                      <img src="/logo.png" alt="Логотип" className="hall-create-page__logo" />
          <div>
            <h1>Создание зала</h1>
            <p>Заполните информацию о новом зале</p>
          </div>
        </div>
        
        <div className="hall-create-page__controls">
          <button 
            onClick={() => window.location.href = '/halls'}
            className="btn btn--secondary"
          >
            ← К списку залов
          </button>
          
        </div>
      </header>

      <main className="hall-create-page__content">
        <div className="hall-create-page__form-container">
          {error && (
            <div className="hall-create-page__error">
              {error}
            </div>
          )}
          
          <HallForm
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={loading}
            submitText="Создать зал"
          />
        </div>
      </main>
    </div>
  );
};