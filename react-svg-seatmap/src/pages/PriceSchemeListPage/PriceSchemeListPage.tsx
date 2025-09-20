import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { usePriceSchemes } from '../../hooks/usePriceSchemes';
import { apiClient, getId } from '../../services/api';
import { Layout } from '../../components/Layout';
import { PriceSchemeCard } from './components/PriceSchemeCard';
import { PriceSchemeCreateModalSimple } from '../../components/PriceSchemeCreateModal/PriceSchemeCreateModalSimple';
import './PriceSchemeListPage.scss';

export const PriceSchemeListPage: React.FC = () => {
  const { data, loading, error, refetch } = usePriceSchemes();
  const priceSchemes = data?.priceSchemes || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreatePriceScheme = () => {
    setShowCreateModal(true);
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
  };

  const handleCreateSuccess = () => {
    refetch(); // Обновляем список распоясовок
  };

  const handleEdit = (id: string) => {
    window.location.href = `/price-schemes/${id}/edit`;
  };

  const handleDelete = async (id: string) => {
    const schemeToDelete = priceSchemes.find(ps => getId(ps) === id);
    const schemeName = schemeToDelete ? schemeToDelete.name : `ID ${id}`;
    
    if (confirm(`Вы уверены, что хотите удалить распоясовку "${schemeName}"?\n\nЭто действие нельзя отменить.`)) {
      try {
        await apiClient.deletePriceScheme(id);
        refetch();
        alert(`Распоясовка "${schemeName}" успешно удалена`);
      } catch (error) {
        console.error('❌ Ошибка удаления распоясовки:', error);
        alert(`Ошибка при удалении распоясовки "${schemeName}": ` + (error as any)?.message || 'Неизвестная ошибка');
      }
    }
  };

  const handleView = (id: string) => {
    window.location.href = `/price-schemes/${id}/edit`;
  };

  // Фильтрация распоясовок по поиску
  const filteredSchemes = priceSchemes.filter(scheme => 
    scheme.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    scheme.hallName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="price-scheme-list-page">
        <div className="price-scheme-list-page__loading">
          Загрузка списка распоясовок...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-scheme-list-page">
        <div className="price-scheme-list-page__error">
          <h2>Ошибка загрузки</h2>
          <p>Не удалось загрузить список распоясовок</p>
          <button onClick={() => window.location.reload()} className="btn btn--primary">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout currentPage="price-schemes">
      <div className="price-scheme-list-page">
        <header className="price-scheme-list-page__header">
        <div className="price-scheme-list-page__title">
          <h1>Распоясовки</h1>
        </div>
        
        <div className="price-scheme-list-page__controls">
          <div className="price-scheme-list-page__search">
            <input
              type="text"
              placeholder="Поиск распоясовок по названию или залу..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <button onClick={handleCreatePriceScheme} className="btn btn--primary">
            ➕ Добавить распоясовку
          </button>
          
        </div>
      </header>

      <main className="price-scheme-list-page__content">
        {priceSchemes.length === 0 ? (
          <div className="price-scheme-list-page__empty">
            <div className="price-scheme-list-page__empty-icon">💰</div>
            <h2>Распоясовки не найдены</h2>
            <p>Создайте первую распоясовку для начала работы с ценами на билеты</p>
            <button onClick={handleCreatePriceScheme} className="btn btn--primary btn--lg">
              ➕ Создать первую распоясовку
            </button>
          </div>
        ) : filteredSchemes.length === 0 ? (
          <div className="price-scheme-list-page__empty">
            <div className="price-scheme-list-page__empty-icon">🔍</div>
            <h2>Ничего не найдено</h2>
            <p>Попробуйте изменить поисковый запрос</p>
          </div>
        ) : (
          <>
            <div className="price-scheme-list-page__results">
              <span>Найдено распоясовок: <strong>{filteredSchemes.length}</strong> из {priceSchemes.length}</span>
            </div>
            
            <div className="price-scheme-list-page__grid">
              {filteredSchemes.map(priceScheme => (
                <PriceSchemeCard
                  key={getId(priceScheme)}
                  priceScheme={priceScheme}
                  onEdit={() => handleEdit(getId(priceScheme))}
                  onDelete={() => handleDelete(getId(priceScheme))}
                  onView={() => handleView(getId(priceScheme))}
                />
              ))}
            </div>
          </>
        )}
      </main>
      </div>

      {/* Модальное окно создания распоясовки */}
      <PriceSchemeCreateModalSimple
        isOpen={showCreateModal}
        onClose={handleCloseModal}
        onSuccess={handleCreateSuccess}
      />
    </Layout>
  );
};