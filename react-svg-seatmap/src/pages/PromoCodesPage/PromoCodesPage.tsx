import React, { useState, useEffect, useCallback } from 'react';
import { PromoCode, PromoCodeFormData, PromoCodeFilter } from '../../types/PromoCode.types';
import { PromoCodeCard } from '../../components/PromoCodeCard';
import { PromoCodeModal } from '../../components/PromoCodeModal';
import { Layout } from '../../components/Layout';
import { apiClient, getId } from '../../services/api';
import './PromoCodesPage.scss';

export const PromoCodesPage: React.FC = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [filteredPromoCodes, setFilteredPromoCodes] = useState<PromoCode[]>([]);
  const [activeFilter, setActiveFilter] = useState<PromoCodeFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromoCode, setEditingPromoCode] = useState<PromoCode | null>(null);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Загрузка промокодов при монтировании компонента
  useEffect(() => {
    loadPromoCodes();
  }, []);

  // Debounce для поискового запроса
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Фильтрация промокодов при изменении фильтра или поискового запроса
  useEffect(() => {
    filterPromoCodes();
  }, [promoCodes, activeFilter, debouncedSearchQuery]);

  const loadPromoCodes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.getPromoCodes();
      setPromoCodes(response.promoCodes);
    } catch (error) {
      console.error('❌ Ошибка загрузки промокодов:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(`Ошибка загрузки промокодов: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPromoCodes = () => {
    let filtered = [...promoCodes];

    // Фильтрация по активности
    if (activeFilter === 'active') {
      filtered = filtered.filter(pc => pc.isActive);
    } else if (activeFilter === 'inactive') {
      filtered = filtered.filter(pc => !pc.isActive);
    }

    // Фильтрация по поисковому запросу
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase();
      filtered = filtered.filter(pc => 
        pc.code.toLowerCase().includes(query) ||
        pc.name.toLowerCase().includes(query) ||
        pc.description.toLowerCase().includes(query)
      );
    }

    // Сортировка: активные сначала, затем по дате создания (новые сначала)
    filtered.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    setFilteredPromoCodes(filtered);
  };

  const handleCreatePromoCode = () => {
    setEditingPromoCode(null);
    setIsModalOpen(true);
  };

  const handleEditPromoCode = (promoCode: PromoCode) => {
    setEditingPromoCode(promoCode);
    setIsModalOpen(true);
  };

  const handleDeletePromoCode = async (promoCode: PromoCode) => {
    try {
      const promoCodeId = getId(promoCode);
      // Используем утилиту getId для совместимости с MongoDB
      const idToUse = getId(promoCode);
      
      if (!idToUse) {
        throw new Error('ID промокода не найден');
      }
      
      await apiClient.deletePromoCode(idToUse);
      await loadPromoCodes(); // Перезагружаем список
      // Успешное удаление - убираем alert, так как список обновится
    } catch (error) {
      console.error('❌ Ошибка удаления промокода:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(`Ошибка удаления промокода: ${errorMessage}`);
    }
  };

  const handleSavePromoCode = async (formData: PromoCodeFormData) => {
    try {
      setIsModalLoading(true);
      setError(null);

      const requestData = {
        code: formData.code,
        name: formData.name,
        type: formData.type,
        startDate: formData.type === 'temporary' ? formData.startDate : undefined,
        endDate: formData.type === 'temporary' ? formData.endDate : undefined,
        discountType: formData.discountType,
        discountValue: parseFloat(formData.discountValue),
        currency: formData.discountType === 'fixed' ? formData.currency : undefined,
        description: formData.description || undefined
      };

      if (editingPromoCode) {
        const promoCodeId = getId(editingPromoCode);
        await apiClient.updatePromoCode(promoCodeId, requestData);
        // Успешное обновление - убираем alert
      } else {
        await apiClient.createPromoCode(requestData);
        // Успешное создание - убираем alert
      }

      setIsModalOpen(false);
      setEditingPromoCode(null);
      await loadPromoCodes(); // Перезагружаем список
    } catch (error) {
      console.error('Ошибка сохранения промокода:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setError(`Ошибка сохранения промокода: ${errorMessage}`);
    } finally {
      setIsModalLoading(false);
    }
  };

  const handleCloseModal = () => {
    if (!isModalLoading) {
      setIsModalOpen(false);
      setEditingPromoCode(null);
    }
  };

  const getFilterCounts = () => {
    return {
      all: promoCodes.length,
      active: promoCodes.filter(pc => pc.isActive).length,
      inactive: promoCodes.filter(pc => !pc.isActive).length
    };
  };

  const filterCounts = getFilterCounts();

  if (isLoading) {
    return (
      <Layout currentPage="promo-codes">
        <div className="promo-codes-page">
          <div className="promo-codes-page__loading">
            <div className="loading-spinner"></div>
            <p>Загрузка промокодов...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPage="promo-codes">
        <div className="promo-codes-page">
          <div className="promo-codes-page__error">
            <h2>Ошибка</h2>
            <p>{error}</p>
            <button 
              className="promo-codes-page__empty-btn"
              onClick={() => {
                setError(null);
                loadPromoCodes();
              }}
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="promo-codes">
      <div className="promo-codes-page">
      <div className="promo-codes-page__header">
        <div className="promo-codes-page__title-section">
          <h1 className="promo-codes-page__title">Промокоды</h1>
          <p className="promo-codes-page__subtitle">
            Управление промокодами и скидками
          </p>
        </div>
        <button 
          className="promo-codes-page__create-btn"
          onClick={handleCreatePromoCode}
        >
          ➕ Создать промокод
        </button>
      </div>

      <div className="promo-codes-page__controls">
        <div className="promo-codes-page__search">
          <input
            type="text"
            placeholder="Поиск по коду, названию или описанию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="promo-codes-page__search-input"
          />
        </div>

        <div className="promo-codes-page__filters">
          <button
            className={`promo-codes-page__filter-btn ${activeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveFilter('all')}
          >
            Все ({filterCounts.all})
          </button>
          <button
            className={`promo-codes-page__filter-btn ${activeFilter === 'active' ? 'active' : ''}`}
            onClick={() => setActiveFilter('active')}
          >
            Активные ({filterCounts.active})
          </button>
          <button
            className={`promo-codes-page__filter-btn ${activeFilter === 'inactive' ? 'active' : ''}`}
            onClick={() => setActiveFilter('inactive')}
          >
            Неактивные ({filterCounts.inactive})
          </button>
        </div>
      </div>

      <div className="promo-codes-page__content">
        {filteredPromoCodes.length === 0 ? (
          <div className="promo-codes-page__empty">
            {searchQuery.trim() ? (
              <>
                <div className="promo-codes-page__empty-icon">🔍</div>
                <h3>Промокоды не найдены</h3>
                <p>По запросу "{searchQuery}" ничего не найдено</p>
                <button 
                  className="promo-codes-page__empty-btn"
                  onClick={() => setSearchQuery('')}
                >
                  Очистить поиск
                </button>
              </>
            ) : promoCodes.length === 0 ? (
              <>
                <div className="promo-codes-page__empty-icon">🎫</div>
                <h3>Промокодов пока нет</h3>
                <p>Создайте первый промокод для предоставления скидок клиентам</p>
                <button 
                  className="promo-codes-page__empty-btn"
                  onClick={handleCreatePromoCode}
                >
                  ➕ Создать промокод
                </button>
              </>
            ) : (
              <>
                <div className="promo-codes-page__empty-icon">🎫</div>
                <h3>Нет {activeFilter === 'active' ? 'активных' : 'неактивных'} промокодов</h3>
                <p>
                  {activeFilter === 'active' 
                    ? 'Все промокоды неактивны или истекли' 
                    : 'Все промокоды активны'
                  }
                </p>
                <button 
                  className="promo-codes-page__empty-btn"
                  onClick={() => setActiveFilter('all')}
                >
                  Показать все
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="promo-codes-page__list">
            {filteredPromoCodes.map(promoCode => (
              <PromoCodeCard
                key={getId(promoCode)}
                promoCode={promoCode}
                onEdit={handleEditPromoCode}
                onDelete={handleDeletePromoCode}
              />
            ))}
          </div>
        )}
      </div>

      <PromoCodeModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePromoCode}
        promoCode={editingPromoCode}
        isLoading={isModalLoading}
      />
      </div>
    </Layout>
  );
};
