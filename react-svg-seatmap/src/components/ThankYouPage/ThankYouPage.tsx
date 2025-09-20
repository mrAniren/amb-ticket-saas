import React from 'react';
import { formatCurrency } from '../../utils/currency';
import './ThankYouPage.scss';

interface ThankYouPageProps {
  orderId?: string;
  customerName?: string;
  totalAmount?: number;
  currency?: string;
  onClose: () => void;
}

const ThankYouPage: React.FC<ThankYouPageProps> = ({
  orderId,
  customerName,
  totalAmount,
  currency = 'RUB',
  onClose
}) => {
  return (
    <div className="thank-you-page">
      <div className="thank-you-page__container">
        <div className="thank-you-page__content">
          {/* Иконка успеха */}
          <div className="thank-you-page__icon">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="#4CAF50"/>
              <path 
                d="M25 40L35 50L55 30" 
                stroke="white" 
                strokeWidth="4" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>

          {/* Заголовок */}
          <h1 className="thank-you-page__title">
            Спасибо за покупку!
          </h1>

          {/* Подзаголовок */}
          <p className="thank-you-page__subtitle">
            Ваш заказ успешно оформлен
          </p>

          {/* Информация о заказе */}
          <div className="thank-you-page__order-info">
            {orderId && (
              <div className="thank-you-page__order-item">
                <span className="thank-you-page__label">Номер заказа:</span>
                <span className="thank-you-page__value">{orderId}</span>
              </div>
            )}
            
            {customerName && (
              <div className="thank-you-page__order-item">
                <span className="thank-you-page__label">Имя:</span>
                <span className="thank-you-page__value">{customerName}</span>
              </div>
            )}
            
            {totalAmount && (
              <div className="thank-you-page__order-item">
                <span className="thank-you-page__label">Сумма:</span>
                <span className="thank-you-page__value">{formatCurrency(totalAmount, currency)}</span>
              </div>
            )}
          </div>

          {/* Сообщение о билетах */}
          <div className="thank-you-page__message">
            <p>
              Билеты будут отправлены на указанный email в течение 5 минут.
            </p>
          </div>

          {/* Кнопка закрытия */}
          <button 
            className="thank-you-page__close-button"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThankYouPage;
