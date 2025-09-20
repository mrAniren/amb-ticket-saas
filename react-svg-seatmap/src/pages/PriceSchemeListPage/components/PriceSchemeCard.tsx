import React from 'react';
import { PriceScheme } from '../../../types/PriceScheme.types';

interface PriceSchemeCardProps {
  priceScheme: PriceScheme;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

export const PriceSchemeCard: React.FC<PriceSchemeCardProps> = ({ 
  priceScheme, 
  onEdit, 
  onDelete, 
  onView 
}) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTotalSeats = () => {
    return priceScheme.seatPrices?.length || 0;
  };

  const getTotalRevenue = () => {
    if (!priceScheme.seatPrices || !priceScheme.prices) return 0;
    
    return priceScheme.seatPrices.reduce((total, seatPrice) => {
      const price = priceScheme.prices.find(p => p.id === seatPrice.priceId);
      return total + (price?.value || 0);
    }, 0);
  };

  const getPriceCount = () => {
    return priceScheme.prices?.length || 0;
  };

  const getMainCurrency = () => {
    return priceScheme.prices?.[0]?.currency || 'RUB';
  };

  return (
    <div className="price-scheme-card">
      <div className="price-scheme-card__header">
        <div className="price-scheme-card__badge">
          {getPriceCount()} {getPriceCount() === 1 ? 'цена' : getPriceCount() < 5 ? 'цены' : 'цен'}
        </div>
      </div>
      
      <div className="price-scheme-card__content">
        <h3 className="price-scheme-card__title">{priceScheme.name}</h3>
        
        <div className="price-scheme-card__details">
          <div className="price-scheme-card__detail">
            <span className="price-scheme-card__label">Зал:</span>
            <span className="price-scheme-card__value">{priceScheme.hallName}</span>
          </div>
          
          <div className="price-scheme-card__detail">
            <span className="price-scheme-card__label">Мест с ценами:</span>
            <span className="price-scheme-card__value">{getTotalSeats()}</span>
          </div>
          
          {getTotalRevenue() > 0 && (
            <div className="price-scheme-card__detail">
              <span className="price-scheme-card__label">Общий доход:</span>
              <span className="price-scheme-card__value price-scheme-card__value--revenue">
                {getTotalRevenue().toLocaleString()} {getMainCurrency()}
              </span>
            </div>
          )}
          
          <div className="price-scheme-card__detail">
            <span className="price-scheme-card__label">Создано:</span>
            <span className="price-scheme-card__value">{formatDate(priceScheme.createdAt)}</span>
          </div>
          
          <div className="price-scheme-card__detail">
            <span className="price-scheme-card__label">Изменено:</span>
            <span className="price-scheme-card__value">{formatDate(priceScheme.updatedAt)}</span>
          </div>
        </div>
        
        
        <div className="price-scheme-card__actions">
          <button 
            onClick={onView}
            className="btn btn--info"
            title="Редактировать распоясовку"
          >
            Редактировать
          </button>
          
          <button 
            onClick={onEdit}
            className="btn btn--secondary"
            title="Быстрое редактирование"
          >
            Настройки
          </button>
          
          <button 
            onClick={onDelete}
            className="btn btn--outline-danger"
            title="Удалить распоясовку"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
};