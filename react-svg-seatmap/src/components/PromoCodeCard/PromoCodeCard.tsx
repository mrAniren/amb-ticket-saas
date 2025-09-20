import React from 'react';
import { PromoCode, formatDiscount, formatPromoCodeDates } from '../../types/PromoCode.types';
import './PromoCodeCard.scss';

interface PromoCodeCardProps {
  promoCode: PromoCode;
  onEdit: (promoCode: PromoCode) => void;
  onDelete: (promoCode: PromoCode) => void;
}

export const PromoCodeCard: React.FC<PromoCodeCardProps> = ({
  promoCode,
  onEdit,
  onDelete
}) => {
  const handleEdit = () => {
    onEdit(promoCode);
  };

  const handleDelete = () => {
    if (window.confirm(`Вы уверены, что хотите удалить промокод "${promoCode.code}"?`)) {
      onDelete(promoCode);
    }
  };

  const getStatusClass = () => {
    return promoCode.isActive ? 'active' : 'inactive';
  };

  const getStatusText = () => {
    return promoCode.isActive ? 'Активный' : 'Неактивный';
  };

  const getTypeText = () => {
    return promoCode.type === 'permanent' ? 'Постоянный' : 'Временный';
  };

  const formatCreatedDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`promo-code-card ${getStatusClass()}`}>
      <div className="promo-code-card__header">
        <div className="promo-code-card__code-section">
          <div className="promo-code-card__code">{promoCode.code}</div>
          <div className="promo-code-card__name">{promoCode.name}</div>
        </div>
        <div className="promo-code-card__status-section">
          <span className={`promo-code-card__status ${getStatusClass()}`}>
            {getStatusText()}
          </span>
          <span className="promo-code-card__type">{getTypeText()}</span>
        </div>
      </div>

      <div className="promo-code-card__body">
        <div className="promo-code-card__info">
          <div className="promo-code-card__discount">
            <span className="promo-code-card__label">Скидка:</span>
            <span className="promo-code-card__value">{formatDiscount(promoCode)}</span>
          </div>
          
          <div className="promo-code-card__dates">
            <span className="promo-code-card__label">Период:</span>
            <span className="promo-code-card__value">{formatPromoCodeDates(promoCode)}</span>
          </div>

          {promoCode.description && (
            <div className="promo-code-card__description">
              <span className="promo-code-card__label">Описание:</span>
              <span className="promo-code-card__value">{promoCode.description}</span>
            </div>
          )}
        </div>

        <div className="promo-code-card__meta">
          <div className="promo-code-card__created">
            <span className="promo-code-card__label">Создан:</span>
            <span className="promo-code-card__value">{formatCreatedDate(promoCode.createdAt)}</span>
          </div>
        </div>
      </div>

      <div className="promo-code-card__actions">
        <button 
          className="promo-code-card__action-btn promo-code-card__action-btn--edit"
          onClick={handleEdit}
          title="Редактировать промокод"
        >
          Редактировать
        </button>
        <button 
          className="promo-code-card__action-btn promo-code-card__action-btn--delete"
          onClick={handleDelete}
          title="Удалить промокод"
        >
          Удалить
        </button>
      </div>
    </div>
  );
};
