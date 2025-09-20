import React, { useState } from 'react';
import TicketDownload from '../TicketDownload';
import './PaymentSuccess.scss';

interface PaymentSuccessProps {
  orderData: {
    customerName: string;
    ticketCount: number;
    total: number;
    sessionInfo: {
      eventName: string;
      hallName: string;
      date: string;
      time: string;
    };
    orderNumber: string;
    orderId: string;
  };
  onClose: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ orderData, onClose }) => {
  const { customerName, ticketCount, total, sessionInfo, orderNumber, orderId } = orderData;
  const [showTickets, setShowTickets] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleShowTickets = () => {
    setShowTickets(true);
    setTicketError(null);
  };

  const handleTicketError = (error: string) => {
    setTicketError(error);
  };

  return (
    <div className="payment-success-overlay">
      <div className="payment-success">
        <div className="payment-success__header">
          <div className="payment-success__icon">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="32" fill="#10B981"/>
              <path 
                d="M20 32L28 40L44 24" 
                stroke="white" 
                strokeWidth="3" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="payment-success__title">Спасибо за покупку!</h1>
          <p className="payment-success__subtitle">
            Ваш заказ успешно оформлен и билеты забронированы
          </p>
        </div>

        <div className="payment-success__content">
          <div className="payment-success__order-info">
            <h2>Информация о заказе</h2>
            <div className="order-details">
              <div className="order-details__row">
                <span className="label">Номер заказа:</span>
                <span className="value">#{orderNumber}</span>
              </div>
              <div className="order-details__row">
                <span className="label">Покупатель:</span>
                <span className="value">{customerName}</span>
              </div>
              <div className="order-details__row">
                <span className="label">Количество билетов:</span>
                <span className="value">{ticketCount} шт.</span>
              </div>
              <div className="order-details__row">
                <span className="label">Общая сумма:</span>
                <span className="value total">{total.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          <div className="payment-success__event-info">
            <h2>Информация о мероприятии</h2>
            <div className="event-details">
              <div className="event-details__row">
                <span className="label">Мероприятие:</span>
                <span className="value">{sessionInfo.eventName}</span>
              </div>
              <div className="event-details__row">
                <span className="label">Зал:</span>
                <span className="value">{sessionInfo.hallName}</span>
              </div>
              <div className="event-details__row">
                <span className="label">Дата:</span>
                <span className="value">{sessionInfo.date}</span>
              </div>
              <div className="event-details__row">
                <span className="label">Время:</span>
                <span className="value">{sessionInfo.time}</span>
              </div>
            </div>
          </div>

          <div className="payment-success__tickets">
            <h2>Ваши билеты</h2>
            <p className="tickets-description">
              Ваши билеты готовы к скачиванию. Нажмите кнопку ниже, чтобы просмотреть и скачать PDF-билеты.
            </p>
            
            {ticketError && (
              <div className="ticket-error">
                <p>⚠️ {ticketError}</p>
              </div>
            )}
            
            <button 
              className="btn btn--primary btn--large"
              onClick={handleShowTickets}
            >
              🎫 Просмотреть и скачать билеты
            </button>
          </div>

          <div className="payment-success__notice">
            <div className="notice-box">
              <h3>Важная информация:</h3>
              <ul>
                <li>Билеты успешно забронированы на ваше имя</li>
                <li>Обязательно возьмите с собой документ, удостоверяющий личность</li>
                <li>Приходите на мероприятие за 30 минут до начала</li>
                <li>При утере билета обратитесь к администратору с номером заказа</li>
                <li>Сохраните PDF-билеты на устройство или распечатайте их</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="payment-success__actions">
          <button 
            className="btn btn--outline" 
            onClick={handlePrint}
          >
            🖨️ Распечатать
          </button>
          <button 
            className="btn btn--primary" 
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>

      {/* Модальное окно с билетами */}
      {showTickets && (
        <div className="tickets-modal-overlay">
          <div className="tickets-modal">
            <div className="tickets-modal__header">
              <h2>Ваши билеты</h2>
              <button 
                className="tickets-modal__close"
                onClick={() => setShowTickets(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="tickets-modal__content">
              {orderId ? (
                <TicketDownload 
                  orderId={orderId}
                  onError={handleTicketError}
                />
              ) : (
                <div className="ticket-download__error">
                  <div className="error-icon">⚠️</div>
                  <p>Ошибка: ID заказа не найден</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
