import React, { useState } from 'react';
import { useHalls } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { apiClient, getId } from '../../services/api';
import { HallCard } from './components/HallCard';
import { Layout } from '../../components/Layout';
import { Hall } from '../../types/api.types';
import './HallListPage.scss';

export const HallListPage: React.FC = () => {
  const { data: hallsData, loading, error, refetch } = useHalls();
  const [filters, setFilters] = useState({
    searchTerm: '',
    city: '',
    minSeats: '',
    maxSeats: ''
  });


  const handleCreateHall = () => {
    window.location.href = '/halls/create';
  };

  const handleDelete = async (id: string) => {
    const hallToDelete = halls.find(h => getId(h) === id);
    const hallName = hallToDelete ? hallToDelete.name : `ID ${id}`;
    
    if (confirm(`Вы уверены, что хотите удалить зал "${hallName}"?\n\nЭто действие нельзя отменить. Все данные зала, включая места и файлы, будут удалены.`)) {
      try {
        await apiClient.deleteHall(id);
        refetch(); // Перезагружаем список
        alert(`Зал "${hallName}" успешно удален`);
      } catch (error: any) {
        console.error('❌ Ошибка удаления зала:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Неизвестная ошибка';
        alert(`Ошибка при удалении зала "${hallName}": ${errorMessage}`);
      }
    }
  };



  const handleEditHall = (id: string) => {
    window.location.href = `/halls/${id}/details`;
  };

  const handleViewSchema = (id: string) => {
    window.location.href = `/halls/${id}/schema`;
  };


  if (loading) {
    return (
      <div className="hall-list-page">
        <div className="hall-list-page__loading">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hall-list-page">
        <div className="hall-list-page__error">
          Ошибка загрузки: {error}
          <button onClick={refetch} className="btn btn--primary">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  const halls = hallsData?.halls || [];
  
  // Получаем уникальные города для выпадающего списка
  const uniqueCities = [...new Set(halls.map(hall => hall.city).filter(Boolean))].sort();
  
  const filteredHalls = halls.filter(hall => {
    // Фильтр по названию
    const matchesSearch = !filters.searchTerm || 
      hall.name.toLowerCase().includes(filters.searchTerm.toLowerCase());
    
    // Фильтр по городу
    const matchesCity = !filters.city || hall.city === filters.city;
    
    // Фильтр по количеству мест
    const seatCount = hall.seat_count || 0;
    const matchesMinSeats = !filters.minSeats || seatCount >= parseInt(filters.minSeats);
    const matchesMaxSeats = !filters.maxSeats || seatCount <= parseInt(filters.maxSeats);
    
    return matchesSearch && matchesCity && matchesMinSeats && matchesMaxSeats;
  });

  return (
    <Layout currentPage="halls">
      <div className="hall-list-page">
        <header className="hall-list-page__header">
        <div className="hall-list-page__title">
          <h1>Управление залами</h1>
        </div>
        
        <div className="hall-list-page__controls">
          <button 
            onClick={handleCreateHall}
            className="btn btn--primary"
          >
            ➕ Добавить зал
          </button>
          
        </div>
      </header>

      {/* Панель фильтров */}
      <div className="hall-list-page__filters">
        <div className="hall-list-page__filter">
          <label>Поиск по названию:</label>
          <input
            type="text"
            placeholder="Введите название зала"
            value={filters.searchTerm}
            onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
            className="filter-input"
          />
        </div>
        
        <div className="hall-list-page__filter">
          <label>Город:</label>
          <select
            value={filters.city}
            onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
            className="filter-select"
          >
            <option value="">Все города</option>
            {uniqueCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </div>
        
        <div className="hall-list-page__filter">
          <label>Мест от:</label>
          <input
            type="number"
            placeholder="0"
            value={filters.minSeats}
            onChange={(e) => setFilters(prev => ({ ...prev, minSeats: e.target.value }))}
            className="filter-input filter-input--small"
            min="0"
          />
        </div>
        
        <div className="hall-list-page__filter">
          <label>Мест до:</label>
          <input
            type="number"
            placeholder="∞"
            value={filters.maxSeats}
            onChange={(e) => setFilters(prev => ({ ...prev, maxSeats: e.target.value }))}
            className="filter-input filter-input--small"
            min="0"
          />
        </div>
        
        <div className="hall-list-page__filter">
          <button
            onClick={() => setFilters({ searchTerm: '', city: '', minSeats: '', maxSeats: '' })}
            className="btn btn--outline"
          >
            Сбросить
          </button>
        </div>
      </div>

      <main className="hall-list-page__content">
        {filteredHalls.length === 0 ? (
          <div className="hall-list-page__empty">
            <h2>Залы не найдены</h2>
            <p>
              {halls.length === 0 
                ? 'Создайте первый зал для начала работы'
                : 'Измените параметры поиска или создайте новый зал'
              }
            </p>
            <button 
              onClick={handleCreateHall}
              className="btn btn--primary"
            >
              Создать первый зал
            </button>
          </div>
        ) : (
          <div className="hall-list-page__grid">
            {filteredHalls.map(hall => (
              <HallCard
                key={getId(hall)}
                hall={hall}
                onEdit={() => handleEditHall(getId(hall))}
                onDelete={() => handleDelete(getId(hall))}
                onViewSchema={() => handleViewSchema(getId(hall))}
              />
            ))}
          </div>
        )}
      </main>

      </div>
    </Layout>
  );
};