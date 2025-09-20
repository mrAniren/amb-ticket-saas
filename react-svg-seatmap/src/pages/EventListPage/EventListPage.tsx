import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useEvents } from '../../hooks/useEvents';
import { apiClient, getId } from '../../services/api';
import { Layout } from '../../components/Layout';
import { EventCard } from './components/EventCard';
import { Event } from '../../types/Event.types';
import './EventListPage.scss';

export const EventListPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const { data, loading, error, refetch } = useEvents(activeTab === 'active');
  const events = data?.events || [];
  const [searchTerm, setSearchTerm] = useState('');

  // Смена вкладки - хук автоматически перезагрузит данные
  const handleTabChange = (tab: 'active' | 'archived') => {
    console.log('🔄 EventListPage: Смена вкладки на:', tab);
    setActiveTab(tab);
  };

  const handleCreateEvent = () => {
    window.location.href = '/events/create';
  };

  const handleEdit = (id: string) => {
    window.location.href = `/events/${id}/edit`;
  };

  const handleView = (id: string) => {
    window.location.href = `/events/${id}`;
  };

  const handleArchive = async (id: string) => {
    const eventToArchive = events.find(e => getId(e) === id);
    const eventName = eventToArchive ? eventToArchive.name : `ID ${id}`;
    
    if (!confirm(`Вы уверены, что хотите заархивировать мероприятие "${eventName}"?\n\nМероприятие будет скрыто из активного списка, но данные сохранятся.`)) {
      return;
    }

    try {
      await apiClient.archiveEvent(id);
      alert('Мероприятие успешно заархивировано');
      refetch();
    } catch (error) {
      console.error('❌ Ошибка при архивировании мероприятия:', error);
      alert('Ошибка при архивировании мероприятия: ' + (error as any)?.message || 'Неизвестная ошибка');
    }
  };

  const handleRestore = async (id: string) => {
    const eventToRestore = events.find(e => getId(e) === id);
    const eventName = eventToRestore ? eventToRestore.name : `ID ${id}`;
    
    if (!confirm(`Вы уверены, что хотите восстановить мероприятие "${eventName}"?\n\nМероприятие будет возвращено в активный список.`)) {
      return;
    }

    try {
      await apiClient.restoreEvent(id);
      alert('Мероприятие успешно восстановлено');
      refetch();
    } catch (error) {
      console.error('❌ Ошибка при восстановлении мероприятия:', error);
      alert('Ошибка при восстановлении мероприятия: ' + (error as any)?.message || 'Неизвестная ошибка');
    }
  };

  // Фильтрация мероприятий
  const filteredEvents = events.filter(event => {
    const matchesSearch = !searchTerm || 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <Layout currentPage="events">
        <div className="event-list-page">
          <div className="event-list-page__loading">
            <div className="spinner"></div>
            <p>Загрузка мероприятий...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPage="events">
        <div className="event-list-page">
          <div className="event-list-page__error">
            <h2>Ошибка загрузки</h2>
            <p>{error}</p>
            <button onClick={refetch} className="btn btn--primary">
              Попробовать еще раз
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="events">
      <div className="event-list-page">
        <header className="event-list-page__header">
          <div className="event-list-page__title">
            <h1>Мои мероприятия</h1>
          </div>
          
          <div className="event-list-page__tabs">
            <button 
              className={`event-list-page__tab ${activeTab === 'active' ? 'event-list-page__tab--active' : ''}`}
              onClick={() => handleTabChange('active')}
            >
              Активные мероприятия
            </button>
            <button 
              className={`event-list-page__tab ${activeTab === 'archived' ? 'event-list-page__tab--active' : ''}`}
              onClick={() => handleTabChange('archived')}
            >
              Архивные мероприятия
            </button>
          </div>
          
          <div className="event-list-page__controls">
            <div className="event-list-page__search">
              <input
                type="text"
                placeholder="Поиск мероприятий..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            
            <button onClick={handleCreateEvent} className="btn btn--primary">
              ➕ Создать мероприятие
            </button>
          </div>
        </header>

        <main className="event-list-page__content">
          {filteredEvents.length === 0 ? (
            <div className="event-list-page__empty">
              <div className="event-list-page__empty-icon">🎭</div>
              <h3>Пока нет мероприятий</h3>
              <p>Создайте первое мероприятие, чтобы начать планировать ваши события</p>
              <button onClick={handleCreateEvent} className="btn btn--primary btn--lg">
                ➕ Создать первое мероприятие
              </button>
            </div>
          ) : (
            <>
              <div className="event-list-page__stats">
                <span className="event-list-page__count">
                  {filteredEvents.length === events.length 
                    ? `Всего мероприятий: ${events.length}`
                    : `Найдено: ${filteredEvents.length} из ${events.length}`
                  }
                </span>
              </div>
              
              <div className="event-list-page__grid">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={getId(event)}
                    event={event}
                    onEdit={() => handleEdit(getId(event))}
                    onArchive={() => handleArchive(getId(event))}
                    onRestore={() => handleRestore(getId(event))}
                    onView={() => handleView(getId(event))}
                    showArchiveButton={activeTab === 'active'}
                    showRestoreButton={activeTab === 'archived'}
                  />
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </Layout>
  );
};
