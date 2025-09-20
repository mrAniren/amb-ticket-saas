import React, { useState } from 'react';
import { useHalls } from '../../hooks/useApi';
import { apiClient } from '../../services/api';
import { PriceSchemeCreateData } from '../../types/PriceScheme.types';
import './PriceSchemeCreateModalSimple.scss';

interface PriceSchemeCreateModalSimpleProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const PriceSchemeCreateModalSimple: React.FC<PriceSchemeCreateModalSimpleProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { data: hallsData, loading: hallsLoading } = useHalls();
  const [formData, setFormData] = useState<PriceSchemeCreateData>({
    name: '',
    hallId: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const halls = hallsData?.halls || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      await apiClient.createPriceScheme(formData);
      
      // Сбрасываем форму
      setFormData({
        name: '',
        hallId: ''
      });
      
      // Закрываем модал и обновляем список
      onClose();
      onSuccess();
      
    } catch (err) {
      console.error('Ошибка создания распоясовки:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при создании распоясовки');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      hallId: ''
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
    <div className="price-scheme-create-modal-simple" onClick={handleOverlayClick}>
      <div className="price-scheme-create-modal-simple__content">
        <div className="price-scheme-create-modal-simple__header">
          <h2 className="price-scheme-create-modal-simple__title">
            Создание распоясовки
          </h2>
          <button
            type="button"
            onClick={handleCancel}
            className="price-scheme-create-modal-simple__close"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="price-scheme-create-modal-simple__body">
          {error && (
            <div className="price-scheme-create-modal-simple__error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="price-scheme-create-form-simple">
            <div className="price-scheme-create-form-simple__field">
              <label htmlFor="modal-name" className="price-scheme-create-form-simple__label">
                Название распоясовки *
              </label>
              <input
                type="text"
                id="modal-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="price-scheme-create-form-simple__input"
                placeholder="Введите название распоясовки"
                required
                disabled={loading}
                autoFocus
              />
            </div>

            <div className="price-scheme-create-form-simple__field">
              <label htmlFor="modal-hall" className="price-scheme-create-form-simple__label">
                Зал *
              </label>
              {hallsLoading ? (
                <div className="price-scheme-create-form-simple__loading">
                  Загрузка залов...
                </div>
              ) : (
                <select
                  id="modal-hall"
                  value={formData.hallId}
                  onChange={(e) => setFormData(prev => ({ ...prev, hallId: e.target.value }))}
                  className="price-scheme-create-form-simple__select"
                  required
                  disabled={loading}
                >
                  <option value="">Выберите зал</option>
                  {halls.map((hall) => (
                    <option key={hall.id} value={hall.id}>
                      {hall.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="price-scheme-create-form-simple__info">
              <div className="price-scheme-create-form-simple__info-icon">💡</div>
              <div className="price-scheme-create-form-simple__info-text">
                После создания распоясовки вы сможете настроить цены и назначить их местам в редакторе.
              </div>
            </div>
          </form>
        </div>

        <div className="price-scheme-create-modal-simple__footer">
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
            disabled={loading || !formData.name.trim() || !formData.hallId}
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
