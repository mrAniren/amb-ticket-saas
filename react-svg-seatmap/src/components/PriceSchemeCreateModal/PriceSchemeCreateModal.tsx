import React, { useState, useEffect } from 'react';
import { apiClient, getId } from '../../services/api';
import { PriceSchemeCreateData } from '../../types/PriceScheme.types';
import './PriceSchemeCreateModal.scss';

interface PriceSchemeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (priceSchemeId: string) => void;
  preselectedHallId?: number;
  hallName?: string;
  sessionFormData?: {
    eventId?: string;
    date?: string;
    time?: string;
  };
}

export const PriceSchemeCreateModal: React.FC<PriceSchemeCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess: _onSuccess,
  preselectedHallId,
  hallName,
  sessionFormData
}) => {
  const [formData, setFormData] = useState<PriceSchemeCreateData>({
    name: '',
    hallId: preselectedHallId?.toString() || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Обновляем hallId при изменении preselectedHallId
  useEffect(() => {
    console.log('useEffect: preselectedHallId изменился:', preselectedHallId);
    if (preselectedHallId) {
      setFormData(prev => ({
        ...prev,
        hallId: preselectedHallId.toString()
      }));
    }
  }, [preselectedHallId]);

  // Логируем при открытии модала
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 Модал открыт. Параметры:');
      console.log('  - preselectedHallId:', preselectedHallId, '(type:', typeof preselectedHallId, ')');
      console.log('  - hallName:', hallName);
      console.log('  - sessionFormData:', sessionFormData);
      console.log('  - formData:', formData);
    }
  }, [isOpen, preselectedHallId, hallName, sessionFormData, formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Данные формы перед валидацией:', formData);
    console.log('preselectedHallId:', preselectedHallId);
    console.log('hallName:', hallName);
    
    if (!formData.name.trim()) {
      setError('Название распоясовки обязательно');
      return;
    }
    
    if (!formData.hallId) {
      setError('Выберите зал');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('Отправляем в API данные:', formData);
      const result = await apiClient.createPriceScheme(formData);
      console.log('Результат создания:', result);
      
      // Закрываем модал
      onClose();
      
      // Переходим на редактирование распоясовки в inline режиме
      // Сохраняем все текущие данные формы из SessionCreatePage
      const sessionData = new URLSearchParams();
      
      // Добавляем основные данные сеанса
      if (sessionFormData?.eventId) sessionData.set('eventId', sessionFormData.eventId);
      if (sessionFormData?.date) sessionData.set('date', sessionFormData.date);
      if (sessionFormData?.time) sessionData.set('time', sessionFormData.time);
      sessionData.set('hallId', formData.hallId);
      const priceSchemeId = getId(result.priceScheme);
      sessionData.set('newPriceSchemeId', priceSchemeId);
      
      const returnUrl = `/sessions/create?${sessionData.toString()}`;
      window.location.href = `/price-schemes/${priceSchemeId}/edit?mode=inline&sessionContext=true&returnTo=${encodeURIComponent(returnUrl)}`;
      
    } catch (err) {
      console.error('Ошибка создания распоясовки:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при создании распоясовки');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Сбрасываем форму и закрываем модал
    setFormData({
      name: '',
      hallId: preselectedHallId?.toString() || ''
    });
    setError('');
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCancel();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="price-scheme-create-modal" onClick={handleOverlayClick}>
      <div className="price-scheme-create-modal__content">
        <div className="price-scheme-create-modal__header">
          <h2 className="price-scheme-create-modal__title">
            Создание распоясовки
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="price-scheme-create-modal__close"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="price-scheme-create-modal__body">
          {error && (
            <div className="price-scheme-create-modal__error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="price-scheme-create-form">
            <div className="price-scheme-create-form__field">
              <label htmlFor="modal-name" className="price-scheme-create-form__label">
                Название распоясовки *
              </label>
              <input
                type="text"
                id="modal-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="price-scheme-create-form__input"
                placeholder="Введите название распоясовки"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="price-scheme-create-form__field">
              <label htmlFor="modal-hall" className="price-scheme-create-form__label">
                Зал *
              </label>
              {preselectedHallId ? (
                <div className="price-scheme-create-form__selected-hall">
                  <span className="price-scheme-create-form__hall-name">
                    {hallName || `Зал ID: ${preselectedHallId}`}
                  </span>
                  <span className="price-scheme-create-form__hall-note">
                    (выбран автоматически для сеанса)
                  </span>
                </div>
              ) : (
                <div className="price-scheme-create-form__no-hall">
                  <span className="price-scheme-create-form__error-text">
                    Зал не выбран. Сначала выберите зал в форме создания сеанса.
                  </span>
                </div>
              )}
            </div>

            <div className="price-scheme-create-form__info">
              <div className="price-scheme-create-form__info-icon">💡</div>
              <div className="price-scheme-create-form__info-text">
                После создания распоясовки вы сможете настроить цены и назначить их местам в редакторе.
              </div>
            </div>
          </form>
        </div>

        <div className="price-scheme-create-modal__footer">
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
            onClick={handleSubmit}
            className="btn btn--primary"
            disabled={loading || !preselectedHallId}
          >
            {loading ? (
              <>
                <span className="btn__spinner"></span>
                Создание...
              </>
            ) : (
              '✨ Создать распоясовку'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
