import React from 'react';
import { Hall } from '../../../types/api.types';

interface HallCardProps {
  hall: Hall;
  onEdit: () => void;
  onDelete: () => void;
  onViewSchema?: () => void;
}

export const HallCard: React.FC<HallCardProps> = ({ hall, onEdit, onDelete, onViewSchema }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="hall-card">
      <div className="hall-card__image">
        {hall.photo_url ? (
          <img src={hall.photo_url} alt={hall.name} />
        ) : (
          <div className="hall-card__placeholder">
            <span>📷</span>
          </div>
        )}
      </div>
      
      <div className="hall-card__content">
        <h3 className="hall-card__title">{hall.name}</h3>
        
        <div className="hall-card__details">
          <div className="hall-card__detail">
            <span className="hall-card__label">Город:</span>
            <span>{hall.city || 'Не указан'}</span>
          </div>
          
          <div className="hall-card__detail">
            <span className="hall-card__label">Адрес:</span>
            <span>{hall.address || 'Не указан'}</span>
          </div>
          
          <div className="hall-card__detail">
            <span className="hall-card__label">Кол-во мест:</span>
            <span>{hall.seat_count}</span>
          </div>
          
          <div className="hall-card__detail">
            <span className="hall-card__label">Изменен:</span>
            <span>{formatDate(hall.last_modified)}</span>
          </div>
        </div>
        
        <div className="hall-card__actions">
          {onViewSchema && (
            <button 
              onClick={onViewSchema}
              className="btn btn--secondary"
            >
              Схема зала
            </button>
          )}
          
          <button 
            onClick={onEdit}
            className="btn btn--primary"
          >
            Редактировать
          </button>
          
          <button 
            onClick={onDelete}
            className="btn btn--danger"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};