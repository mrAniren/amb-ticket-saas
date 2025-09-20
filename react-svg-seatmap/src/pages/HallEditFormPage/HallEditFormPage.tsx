import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useHall } from '../../hooks/useApi';
import { apiClient } from '../../services/api';
import { HallForm } from '../HallCreatePage/components/HallForm';
import './HallEditFormPage.scss';

export const HallEditFormPage: React.FC = () => {
  const { hallId } = useParams<{ hallId: string }>();
  
  if (!hallId) {
    return <div>Ошибка: ID зала не найден</div>;
  }
  const { data: hallData, loading, error } = useHall(hallId);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const hall = hallData?.hall;

  const handleSubmit = async (data: any) => {
    if (!hall) return;

    try {
      setUpdating(true);
      setUpdateError(null);

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
      }

      await apiClient.updateHall(hall.id.toString(), formData);
      alert('Зал успешно обновлен!');
      window.location.href = '/halls';
    } catch (error) {
      console.error('Error updating hall:', error);
      setUpdateError(error instanceof Error ? error.message : 'Ошибка обновления зала');
    } finally {
      setUpdating(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Вы уверены, что хотите отменить изменения?')) {
      window.location.href = '/halls';
    }
  };

  if (loading) {
    return (
      <div className="hall-edit-form-page">
        <div className="hall-edit-form-page__loading">
          <div className="loading-spinner"></div>
          <p>Загрузка данных зала...</p>
        </div>
      </div>
    );
  }

  if (error || !hall) {
    return (
      <div className="hall-edit-form-page">
        <div className="hall-edit-form-page__error">
          <h2>Ошибка загрузки</h2>
          <p>{error || 'Зал не найден'}</p>
          <button 
            onClick={() => window.location.href = '/halls'}
            className="btn btn--primary"
          >
            ← К списку залов
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="hall-edit-form-page">
      <header className="hall-edit-form-page__header">
        <div className="hall-edit-form-page__title">
          <img src="/logo-black.png" alt="Логотип" className="hall-edit-form-page__logo" />
          <div>
            <h1>Редактирование зала</h1>
            <p>Изменение информации о зале "{hall.name}"</p>
          </div>
        </div>
        
        <div className="hall-edit-form-page__controls">
          <button 
            onClick={() => window.location.href = '/halls'}
            className="btn btn--secondary"
          >
            ← К списку залов
          </button>
          
        </div>
      </header>

      <main className="hall-edit-form-page__content">
        <div className="hall-edit-form-page__form-container">
          {updateError && (
            <div className="hall-edit-form-page__error">
              {updateError}
            </div>
          )}
          
          <HallForm
            initialData={{
              name: hall.name,
              country: hall.country,
              city: hall.city,
              address: hall.address,
              timezone: hall.timezone,
              capacity: hall.seat_count?.toString(),
            }}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            loading={updating}
            submitText="Обновить зал"
            hideSvgUpload={true} // Скрываем только SVG загрузку
          />
        </div>
      </main>
    </div>
  );
};