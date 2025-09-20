import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useEvent, useEventSessions } from '../../hooks/useEvents';
import { apiClient, getId } from '../../services/api';
import { Layout } from '../../components/Layout';
import { SessionCard } from './components/SessionCard';
import { Event, SessionWithDetails } from '../../types/Event.types';
import './EventDetailPage.scss';

export const EventDetailPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  
  if (!eventId) {
    return <div>Ошибка: ID мероприятия не найден</div>;
  }
  
  const { data: eventData, loading: eventLoading, error: eventError, refetch: refetchEvent } = useEvent(eventId);
  
  const event = eventData?.event;

  // Состояние для вкладок
  const [activeTab, setActiveTab] = useState<'active' | 'past' | 'archived'>('active');
  const [activeSessions, setActiveSessions] = useState<SessionWithDetails[]>([]);
  const [pastSessions, setPastSessions] = useState<SessionWithDetails[]>([]);
  const [archivedSessions, setArchivedSessions] = useState<SessionWithDetails[]>([]);
  const [loadingActive, setLoadingActive] = useState(false);
  const [loadingPast, setLoadingPast] = useState(false);
  const [loadingArchived, setLoadingArchived] = useState(false);
  
  // Кэш для отслеживания загруженных данных
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set());

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleBackToEvents = () => {
    window.location.href = '/events';
  };

  const handleCreateSession = () => {
    window.location.href = `/sessions/create?eventId=${eventId}`;
  };


  const handleDeleteSession = async (sessionId: string) => {
    const sessionToDelete = sessions.find(s => getId(s) === sessionId);
    if (!sessionToDelete) return;

    const sessionDate = new Date(sessionToDelete.date + 'T' + sessionToDelete.time);
    const dateStr = sessionDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!confirm(`Вы уверены, что хотите удалить сеанс от ${dateStr}?\n\nЭто действие необратимо!`)) {
      return;
    }

    try {
      await apiClient.deleteSession(sessionId);
      alert('Сеанс успешно удален');
      refetchSessions();
    } catch (error) {
      alert('Ошибка при удалении сеанса');
    }
  };

  // Функции для загрузки данных по вкладкам
  const loadActiveSessions = async (force = false) => {
    if (!force && loadedTabs.has('active')) return;
    
    setLoadingActive(true);
    try {
      const response = await apiClient.getActiveEventSessions(eventId);
      setActiveSessions(response.sessions);
      setLoadedTabs(prev => new Set(prev).add('active'));
    } catch (error) {
    } finally {
      setLoadingActive(false);
    }
  };

  const loadPastSessions = async (force = false) => {
    if (!force && loadedTabs.has('past')) return;
    
    setLoadingPast(true);
    try {
      const response = await apiClient.getPastEventSessions(eventId);
      setPastSessions(response.sessions);
      setLoadedTabs(prev => new Set(prev).add('past'));
    } catch (error) {
    } finally {
      setLoadingPast(false);
    }
  };

  const loadArchivedSessions = async (force = false) => {
    if (!force && loadedTabs.has('archived')) return;
    
    setLoadingArchived(true);
    try {
      const response = await apiClient.getArchivedEventSessions(eventId);
      setArchivedSessions(response.sessions);
      setLoadedTabs(prev => new Set(prev).add('archived'));
    } catch (error) {
    } finally {
      setLoadingArchived(false);
    }
  };

  // Загружаем только активные сессии при загрузке страницы
  useEffect(() => {
    if (eventId) {
      // Очищаем кэш при смене eventId
      setLoadedTabs(new Set());
      setActiveSessions([]);
      setPastSessions([]);
      setArchivedSessions([]);
      
      // Загружаем только активные сессии по умолчанию
      loadActiveSessions();
    }
  }, [eventId]);

  // Функции для архивирования и разархивирования
  const handleArchiveSession = async (sessionId: string) => {
    const sessionToArchive = [...activeSessions, ...pastSessions].find(s => getId(s) === sessionId);
    if (!sessionToArchive) return;

    const sessionDate = new Date(sessionToArchive.date + 'T' + sessionToArchive.time);
    const dateStr = sessionDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!confirm(`Вы уверены, что хотите архивировать сеанс от ${dateStr}?\n\nСеанс будет перемещен в архив.`)) {
      return;
    }

    try {
      await apiClient.archiveSession(sessionId);
      alert('Сеанс успешно архивирован');
      
      // Обновляем данные только для текущей вкладки (принудительно)
      if (activeTab === 'active') {
        loadActiveSessions(true);
      } else if (activeTab === 'past') {
        loadPastSessions(true);
      }
      // Архив загружаем только если это текущая вкладка
      if (activeTab === 'archived') {
        loadArchivedSessions(true);
      }
    } catch (error) {
      alert('Ошибка при архивировании сеанса');
    }
  };

  const handleUnarchiveSession = async (sessionId: string) => {
    const sessionToUnarchive = archivedSessions.find(s => getId(s) === sessionId);
    if (!sessionToUnarchive) return;

    const sessionDate = new Date(sessionToUnarchive.date + 'T' + sessionToUnarchive.time);
    const dateStr = sessionDate.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    if (!confirm(`Вы уверены, что хотите разархивировать сеанс от ${dateStr}?\n\nСеанс будет возвращен в активные.`)) {
      return;
    }

    try {
      await apiClient.unarchiveSession(sessionId);
      alert('Сеанс успешно разархивирован');
      
      // Обновляем данные только для текущей вкладки (принудительно)
      if (activeTab === 'archived') {
        loadArchivedSessions(true);
      } else if (activeTab === 'active') {
        loadActiveSessions(true);
      } else if (activeTab === 'past') {
        loadPastSessions(true);
      }
    } catch (error) {
      alert('Ошибка при разархивировании сеанса');
    }
  };

  if (eventLoading) {
    return (
      <Layout currentPage="events">
        <div className="event-detail-page">
          <div className="event-detail-page__loading">
            <div className="spinner"></div>
            <p>Загрузка мероприятия...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (eventError || !event) {
    return (
      <Layout currentPage="events">
        <div className="event-detail-page">
          <div className="event-detail-page__error">
            <h2>Ошибка загрузки</h2>
            <p>{eventError || 'Мероприятие не найдено'}</p>
            <div className="event-detail-page__error-actions">
              <button onClick={refetchEvent} className="btn btn--primary">
                Попробовать еще раз
              </button>
              <button onClick={handleBackToEvents} className="btn btn--secondary">
                Вернуться к списку
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="events">
      <div className="event-detail-page">
        <header className="event-detail-page__header">
          <div className="event-detail-page__title">
            <button 
              onClick={handleBackToEvents}
              className="event-detail-page__back-btn"
              title="Вернуться к списку мероприятий"
            >
              ← Мероприятия
            </button>
            <h1>{event.name}</h1>
          </div>
          
        </header>

        <main className="event-detail-page__content">
          {/* Информация о мероприятии */}
          <section className="event-info">
            <div className="event-info__visual">
              {event.image ? (
                <img 
                  src={event.image} 
                  alt={event.name}
                  className="event-info__image"
                />
              ) : (
                <div className="event-info__image-placeholder">
                  🎭
                </div>
              )}
            </div>
            
            <div className="event-info__details">
              <div className="event-info__header">
                <h2 className="event-info__title">{event.name}</h2>
              </div>
              
              <div className="event-info__description">
                <h3>Описание</h3>
                <p>{event.description}</p>
              </div>
            </div>
          </section>

          {/* Список сеансов */}
          <section className="sessions-section">
            <div className="sessions-section__header">
              <h2>Сеансы мероприятия</h2>
              <button onClick={handleCreateSession} className="btn btn--primary">
                ➕ Добавить сеанс
              </button>
            </div>

            {/* Вкладки */}
            <div className="event-detail-page__tabs">
              <button 
                className={`event-detail-page__tab ${activeTab === 'active' ? 'event-detail-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab('active');
                  loadActiveSessions();
                }}
              >
                Активные сеансы
              </button>
              <button 
                className={`event-detail-page__tab ${activeTab === 'past' ? 'event-detail-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab('past');
                  loadPastSessions();
                }}
              >
                Прошедшие сеансы
              </button>
              <button 
                className={`event-detail-page__tab ${activeTab === 'archived' ? 'event-detail-page__tab--active' : ''}`}
                onClick={() => {
                  setActiveTab('archived');
                  loadArchivedSessions();
                }}
              >
                Архив
              </button>
            </div>

            {/* Отображение контента в зависимости от активной вкладки */}
            {activeTab === 'active' && (
              <>
                {loadingActive ? (
                  <div className="sessions-section__loading">
                    <div className="spinner"></div>
                    <p>Загрузка активных сеансов...</p>
                  </div>
                ) : activeSessions.length === 0 ? (
                  <div className="sessions-section__empty">
                    <div className="sessions-section__empty-icon">🎬</div>
                    <h3>Нет активных сеансов</h3>
                    <p>Создайте первый сеанс для этого мероприятия</p>
                    <button onClick={handleCreateSession} className="btn btn--primary btn--lg">
                      ➕ Создать первый сеанс
                    </button>
                  </div>
                ) : (
                  <div className="sessions-section__grid">
                    {activeSessions.map((session) => (
                      <SessionCard
                        key={getId(session)}
                        session={session}
                        onArchive={() => handleArchiveSession(getId(session))}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'past' && (
              <>
                {loadingPast ? (
                  <div className="sessions-section__loading">
                    <div className="spinner"></div>
                    <p>Загрузка прошедших сеансов...</p>
                  </div>
                ) : pastSessions.length === 0 ? (
                  <div className="sessions-section__empty">
                    <div className="sessions-section__empty-icon">📅</div>
                    <h3>Нет прошедших сеансов</h3>
                    <p>Прошедшие сеансы появятся здесь автоматически</p>
                  </div>
                ) : (
                  <div className="sessions-section__grid">
                    {pastSessions.map((session) => (
                      <SessionCard
                        key={getId(session)}
                        session={session}
                        onArchive={() => handleArchiveSession(getId(session))}
                      />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'archived' && (
              <>
                {loadingArchived ? (
                  <div className="sessions-section__loading">
                    <div className="spinner"></div>
                    <p>Загрузка архивированных сеансов...</p>
                  </div>
                ) : archivedSessions.length === 0 ? (
                  <div className="sessions-section__empty">
                    <div className="sessions-section__empty-icon">🗄️</div>
                    <h3>Архив пуст</h3>
                    <p>Архивированные сеансы появятся здесь</p>
                  </div>
                ) : (
                  <div className="sessions-section__grid">
                    {archivedSessions.map((session) => (
                      <SessionCard
                        key={getId(session)}
                        session={session}
                        onUnarchive={() => handleUnarchiveSession(getId(session))}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </Layout>
  );
};
