import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SessionWithDetails } from '../../../types/Event.types';
import { getId } from '../../../services/api';
import './SessionCard.scss';

interface SessionCardProps {
  session: SessionWithDetails;
  onDelete?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session,
  onDelete,
  onArchive,
  onUnarchive
}) => {
  const navigate = useNavigate();
  
  const handleTicketSales = () => {
    const sessionId = getId(session);
    navigate(`/sessions/${sessionId}/sales`);
  };

  const handleOfflineSales = () => {
    const sessionId = getId(session);
    navigate(`/sessions/${sessionId}/offline-sales`);
  };
  const formatDate = (dateString: string) => {
    const formattedDate = new Date(dateString).toLocaleDateString('ru-RU', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
    
    // Делаем первую букву дня недели заглавной
    return formattedDate.replace(/^[а-яё]/, (match) => match.toUpperCase());
  };

  const formatTime = (timeString: string) => {
    return timeString;
  };

  const formatDateTime = (dateString: string, timeString: string) => {
    const date = new Date(dateString + 'T' + timeString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isUpcoming = () => {
    const sessionDateTime = new Date(session.date + 'T' + session.time);
    return sessionDateTime > new Date();
  };

  const isPast = () => {
    const sessionDateTime = new Date(session.date + 'T' + session.time);
    return sessionDateTime < new Date();
  };


  const calculateTotalSeats = () => {
    if (!session.priceScheme) {
      return 0;
    }
    
    // Проверяем разные возможные структуры данных
    if (session.priceScheme.seatPrices && Array.isArray(session.priceScheme.seatPrices)) {
      return session.priceScheme.seatPrices.length;
    }
    
    if (session.priceScheme.prices && Array.isArray(session.priceScheme.prices)) {
      return session.priceScheme.prices.length;
    }
    
    return 0;
  };

  const calculateTotalRevenue = () => {
    if (!session.priceScheme) {
      return 0;
    }

    // Если есть seatPrices, считаем общую сумму всех мест
    if (session.priceScheme.seatPrices && Array.isArray(session.priceScheme.seatPrices) && session.priceScheme.prices && Array.isArray(session.priceScheme.prices)) {
      // Создаем мапу цен по ID для быстрого поиска
      const priceMap = new Map();
      session.priceScheme.prices.forEach(price => {
        priceMap.set(price.id, price.value || 0);
      });

      // Суммируем цены всех мест
      const totalRevenue = session.priceScheme.seatPrices.reduce((total, seatPrice) => {
        const priceValue = priceMap.get(seatPrice.priceId) || 0;
        return total + priceValue;
      }, 0);


      return totalRevenue;
    }

    // Fallback: если нет seatPrices, считаем только цены из prices
    if (session.priceScheme.prices && Array.isArray(session.priceScheme.prices)) {
      return session.priceScheme.prices.reduce((total, price) => {
        return total + (price.value || 0);
      }, 0);
    }

    return 0;
  };

  const getPriceRange = () => {
    if (!session.priceScheme || !session.priceScheme.prices || !Array.isArray(session.priceScheme.prices) || session.priceScheme.prices.length === 0) {
      return 'Цены не установлены';
    }

    const prices = session.priceScheme.prices.map(p => p.value || 0).filter(v => v > 0);
    
    if (prices.length === 0) {
      return 'Цены не установлены';
    }
    
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const currency = session.priceScheme.prices[0]?.currency || 'RUB';

    if (minPrice === maxPrice) {
      return `${minPrice} ${currency}`;
    } else {
      return `${minPrice} - ${maxPrice} ${currency}`;
    }
  };

  return (
    <div className={`session-card ${isPast() ? 'session-card--past' : ''}`}>
      <div className="session-card__header">
      </div>

      <div className="session-card__content">
        <h3 className="session-card__title">
          {formatDate(session.date)} в {formatTime(session.time)}
        </h3>

        <div className="session-card__details">
          <div className="session-card__detail">
            <span className="session-card__detail-label">Зал:</span>
            <span className="session-card__detail-value">
              {session.hall ? session.hall.name : 'Зал удален'}
            </span>
          </div>

          <div className="session-card__detail">
            <span className="session-card__detail-label">Распоясовка:</span>
            <span className="session-card__detail-value">
              {session.priceScheme ? session.priceScheme.name : 'Не найдена'}
            </span>
          </div>

          <div className="session-card__detail">
            <span className="session-card__detail-label">Мест с ценами:</span>
            <span className="session-card__detail-value">
              {calculateTotalSeats()}
            </span>
          </div>

          <div className="session-card__detail">
            <span className="session-card__detail-label">Цены:</span>
            <span className="session-card__detail-value">
              {getPriceRange()}
            </span>
          </div>

          {session.priceScheme && session.priceScheme.prices && session.priceScheme.prices.length > 0 && calculateTotalRevenue() > 0 && (
            <div className="session-card__detail">
              <span className="session-card__detail-label">Общий доход:</span>
              <span className="session-card__detail-value session-card__detail-value--revenue">
                {calculateTotalRevenue()} {session.priceScheme.prices?.[0]?.currency || 'RUB'}
              </span>
            </div>
          )}
        </div>

        <div className="session-card__meta">
          {session.createdAt && (
            <small>
              Создан: {formatDateTime(session.createdAt.split('T')[0], session.createdAt.split('T')[1]?.split('.')[0] || '00:00')}
            </small>
          )}
          {session.updatedAt && session.updatedAt !== session.createdAt && (
            <small>
              Обновлен: {formatDateTime(session.updatedAt.split('T')[0], session.updatedAt.split('T')[1]?.split('.')[0] || '00:00')}
            </small>
          )}
        </div>

        <div className="session-card__actions">
          <button 
            onClick={handleOfflineSales}
            className="btn btn--success"
            title="Схема зала"
          >
            Схема зала
          </button>
          
          {onArchive && (
            <button 
              onClick={onArchive}
              className="btn btn--outline-warning"
              title="Архивировать сеанс"
            >
              Архив
            </button>
          )}
          
          {onUnarchive && (
            <button 
              onClick={onUnarchive}
              className="btn btn--outline-success"
              title="Разархивировать сеанс"
            >
              Из архива
            </button>
          )}
          
          {onDelete && (
            <button 
              onClick={onDelete}
              className="btn btn--outline-danger"
              title="Удалить сеанс"
            >
              Удалить
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
