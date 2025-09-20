import React from 'react';
import { Event } from '../../../types/Event.types';
import './EventCard.scss';

interface EventCardProps {
  event: Event;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onView: () => void;
  showArchiveButton?: boolean;
  showRestoreButton?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onEdit,
  onArchive,
  onRestore,
  onView,
  showArchiveButton = true,
  showRestoreButton = false
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <div className="event-card">
      <div className="event-card__image">
        {event.image ? (
          <img 
            src={event.image} 
            alt={event.name}
            className="event-card__img"
            onError={(e) => {
              // Fallback на случай ошибки загрузки изображения
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = '<div class="event-card__img-fallback">🎭</div>';
              }
            }}
          />
        ) : (
          <div className="event-card__img-fallback">🎭</div>
        )}
      </div>

      <div className="event-card__content">
        <h3 className="event-card__title">{event.name}</h3>
        
        <p className="event-card__description">
          {truncateText(event.description, 120)}
        </p>

        <div className="event-card__details">
          <div className="event-card__detail">
            <span className="event-card__detail-label">Создано:</span>
            <span className="event-card__detail-value">
              {formatDate(event.createdAt)}
            </span>
          </div>
          
          {event.updatedAt !== event.createdAt && (
            <div className="event-card__detail">
              <span className="event-card__detail-label">Обновлено:</span>
              <span className="event-card__detail-value">
                {formatDate(event.updatedAt)}
              </span>
            </div>
          )}
        </div>

        <div className="event-card__actions">
          <button 
            onClick={onView}
            className="btn btn--primary"
            title="Просмотреть мероприятие"
          >
            Просмотр
          </button>
          
          <button 
            onClick={onEdit}
            className="btn btn--secondary"
            title="Редактировать мероприятие"
          >
            Редактировать
          </button>
          
          {showArchiveButton && (
            <button 
              onClick={onArchive}
              className="btn btn--danger"
              title="Заархивировать мероприятие"
            >
              Архив
            </button>
          )}
          
          {showRestoreButton && (
            <button 
              onClick={onRestore}
              className="btn btn--success"
              title="Восстановить мероприятие"
            >
              Восстановить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
