import React, { useState } from 'react';
import { useHalls } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { apiClient } from '../../services/api';
import { PriceSchemeCreateData } from '../../types/PriceScheme.types';
import './PriceSchemeCreatePage.scss';

export const PriceSchemeCreatePage: React.FC = () => {
  const { data: hallsData, loading: hallsLoading } = useHalls();
  
  // Проверяем параметры URL для inline режима
  const urlParams = new URLSearchParams(window.location.search);
  const isInlineMode = urlParams.get('mode') === 'inline';
  const sessionContext = urlParams.get('sessionContext') === 'true';
  const preselectedHallId = urlParams.get('hallId');
  const returnTo = urlParams.get('returnTo');
  
  const [formData, setFormData] = useState<PriceSchemeCreateData>({
    name: '',
    hallId: preselectedHallId || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const halls = hallsData?.halls || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Название распаесовки обязательно');
      return;
    }
    
    if (!formData.hallId) {
      setError('Выберите зал');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiClient.createPriceScheme(formData);
      
      if (isInlineMode && sessionContext && returnTo) {
        // В inline режиме переходим к редактированию с особым режимом
        const editUrl = `/price-schemes/${result.priceScheme.id}/edit?mode=inline&sessionContext=true&returnTo=${encodeURIComponent(returnTo)}`;
        window.location.href = editUrl;
      } else {
        alert(`Распоясовка "${formData.name}" успешно создана!`);
        window.location.href = `/price-schemes/${result.priceScheme.id}/edit`;
      }
    } catch (err) {
      console.error('Ошибка создания распаесовки:', err);
      setError(err instanceof Error ? err.message : 'Ошибка при создании распаесовки');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const hasUnsavedChanges = formData.name.trim() || (formData.hallId && formData.hallId !== preselectedHallId);
    
    if (hasUnsavedChanges && !confirm('Вы уверены, что хотите отменить создание распоясовки? Все введенные данные будут потеряны.')) {
      return;
    }

    if (isInlineMode && sessionContext && returnTo) {
      // В inline режиме возвращаемся к созданию сеанса
      window.location.href = decodeURIComponent(returnTo);
    } else {
      window.location.href = '/price-schemes';
    }
  };

  if (hallsLoading) {
    return (
      <div className="price-scheme-create-page">
        <div className="price-scheme-create-page__loading">Загрузка залов...</div>
      </div>
    );
  }

  return (
    <div className="price-scheme-create-page">
      <header className="price-scheme-create-page__header">
        <div className="price-scheme-create-page__title">
          <img src="/logo.png" alt="Логотип" className="price-scheme-create-page__logo" />
          <div>
            <h1>{isInlineMode ? 'Создание распоясовки для сеанса' : 'Создание распоясовки'}</h1>
            <p>{isInlineMode ? 'Создайте распоясовку и вернитесь к созданию сеанса' : 'Выберите зал и задайте название'}</p>
          </div>
        </div>
        
        <div className="price-scheme-create-page__controls">
          {!isInlineMode && (
            <button 
              onClick={() => window.location.href = '/price-schemes'}
              className="btn btn--secondary"
            >
              ← К распоясовкам
            </button>
          )}
          
        </div>
      </header>

      <main className="price-scheme-create-page__content">
        <div className="price-scheme-create-page__form-container">
          {error && (
            <div className="price-scheme-create-page__error">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="price-scheme-form">
            <div className="price-scheme-form__field">
              <label htmlFor="name" className="price-scheme-form__label">
                Название распаесовки *
              </label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="price-scheme-form__input"
                placeholder="Введите название распаесовки"
                required
                disabled={loading}
              />
            </div>

            <div className="price-scheme-form__field">
              <label htmlFor="hallId" className="price-scheme-form__label">
                Зал *
              </label>
              <select
                id="hallId"
                value={formData.hallId}
                onChange={(e) => setFormData(prev => ({ ...prev, hallId: e.target.value }))}
                className="price-scheme-form__select"
                required
                disabled={loading || (isInlineMode && !!preselectedHallId)}
              >
                <option value="">Выберите зал</option>
                {halls.map(hall => (
                  <option key={hall.id} value={hall.id}>
                    {hall.name} {hall.city && `(${hall.city})`}
                  </option>
                ))}
              </select>
              {halls.length === 0 && (
                <p className="price-scheme-form__help">
                  Залы не найдены. <a href="/halls/create">Создайте первый зал</a>
                </p>
              )}
              {isInlineMode && preselectedHallId && (
                <p className="price-scheme-form__help">
                  Зал выбран автоматически для создания сеанса
                </p>
              )}
            </div>

            <div className="price-scheme-form__actions">
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
                disabled={loading || !formData.name.trim() || !formData.hallId}
              >
                {loading ? 'Создание...' : 'Создать распаесовку'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};
