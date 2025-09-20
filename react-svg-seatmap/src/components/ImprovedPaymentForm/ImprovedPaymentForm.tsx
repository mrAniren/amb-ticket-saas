import React, { useState, useCallback } from 'react';
import { PhoneInput } from '../PhoneInput/PhoneInput';
import { ReservationTimer } from '../ReservationTimer/ReservationTimer';
import { formatCurrency, getPrimaryCurrency } from '../../utils/currency';
import './ImprovedPaymentForm.scss';

interface CustomerInfo {
  name: string;
  phone: string;
  email: string;
}

interface SelectedSeat {
  seatId: string;
  row: number;
  place: number;
  zone?: string;
  price: number;
  priceColor?: string;
  currency?: string;
  virtualSeatsCount?: number;
  virtualSeatIds?: string[];
}

interface ImprovedPaymentFormProps {
  selectedSeats: SelectedSeat[];
  sessionId: string;
  totalAmount: number;
  tempOrderId: string | null;
  attribution?: any;
  widgetId?: string; // ID виджета
  onPaymentSuccess: (orderData: any) => void;
  onCancel: () => void;
  orderExpiresAt?: Date; // Время истечения заказа с сервера
}

export const ImprovedPaymentForm: React.FC<ImprovedPaymentFormProps> = ({
  selectedSeats,
  sessionId,
  totalAmount,
  tempOrderId,
  attribution = {},
  widgetId,
  onPaymentSuccess,
  onCancel,
  orderExpiresAt
}) => {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    phone: '',
    email: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<CustomerInfo>>({});
  
  // Определяем основную валюту из выбранных мест
  const primaryCurrency = getPrimaryCurrency(selectedSeats);

  // Валидация полей
  const validateForm = useCallback((): boolean => {
    const errors: Partial<CustomerInfo> = {};

    if (!customerInfo.name.trim()) {
      errors.name = 'Имя обязательно для заполнения';
    } else if (customerInfo.name.trim().length < 2) {
      errors.name = 'Имя должно содержать минимум 2 символа';
    }

    if (!customerInfo.phone.trim()) {
      errors.phone = 'Телефон обязателен для заполнения';
    } else if (customerInfo.phone.length < 10) {
      errors.phone = 'Введите корректный номер телефона';
    }

    if (!customerInfo.email.trim()) {
      errors.email = 'Email обязателен для заполнения';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email)) {
      errors.email = 'Введите корректный email адрес';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [customerInfo]);

  const handleInputChange = (field: keyof CustomerInfo, value: string) => {
    setCustomerInfo(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Очищаем ошибку при изменении поля
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!tempOrderId) {
        throw new Error('ID временного заказа не найден');
      }

      // Обновляем заказ с данными покупателя и переводим в статус pending
      const updateData = {
        customerName: customerInfo.name,
        customerPhone: customerInfo.phone,
        customerEmail: customerInfo.email,
        attribution, // UTM-метки для атрибуции
        widgetId, // ID виджета
        status: 'pending' // Переводим из temporary в pending для оплаты
      };

      console.log('💳 Обновляем заказ для оплаты:', updateData);

      // Импортируем apiClient
      const { apiClient } = await import('../../services/api');
      
      const response = await apiClient.updateOrder(tempOrderId, updateData);
      
      if (response.success) {
        console.log('✅ Заказ обновлен для оплаты');
        
        // Здесь должна быть логика реальной оплаты (Stripe, PayPal и т.д.)
        // Пока что имитируем успешную оплату
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // После успешной оплаты переводим заказ в статус paid
        const payResponse = await apiClient.payOrder(tempOrderId);
        
        if (payResponse.success) {
          onPaymentSuccess({
            orderId: tempOrderId,
            customerInfo,
            totalAmount
          });
        } else {
          throw new Error(payResponse.message || 'Ошибка при оплате заказа');
        }
      } else {
        throw new Error(response.message || 'Ошибка при обновлении заказа');
      }
    } catch (err) {
      console.error('❌ Ошибка при оплате:', err);
      setError(err instanceof Error ? err.message : 'Произошла ошибка при обработке заказа. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  }, [customerInfo, validateForm, tempOrderId, totalAmount, onPaymentSuccess]);

  const handleTimeExpired = () => {
    setError('Время бронирования истекло. Пожалуйста, выберите места заново.');
  };

  return (
    <div className="improved-payment-form">
      <div className="improved-payment-form__container">
        {/* Таймер бронирования */}
        <ReservationTimer 
          initialTime={orderExpiresAt ? Math.max(0, Math.floor((orderExpiresAt.getTime() - Date.now()) / 1000)) : 15 * 60}
          onTimeExpired={handleTimeExpired}
        />

        {/* Список выбранных мест */}
        <div className="improved-payment-form__seats">
          <h3 className="improved-payment-form__seats-title">Ваши билеты</h3>
          <div className="improved-payment-form__seats-list">
            {selectedSeats.map((seat, index) => (
              <div key={index} className="seat-item">
                <div className="seat-item__info">
                  {seat.seatId.includes('-virtual-') ? (
                    // Специальная зона
                    <>
                      <div className="seat-item__position">{seat.zone || 'Специальная зона'}</div>
                      <div className="seat-item__zone"></div>
                    </>
                  ) : (
                    // Обычное место
                    <>
                      <div className="seat-item__position">{seat.place} место, {seat.row} ряд</div>
                      <div className="seat-item__zone">{seat.zone || 'Партер'}</div>
                    </>
                  )}
                </div>
                <div className="seat-item__price">
                  {formatCurrency(seat.price, seat.currency || primaryCurrency)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="improved-payment-form__total">
            <div className="total-line">
              <span>Итого к оплате:</span>
              <span className="total-amount">{formatCurrency(totalAmount, primaryCurrency)}</span>
            </div>
          </div>
        </div>

        {/* Форма данных покупателя */}
        <form onSubmit={handleSubmit} className="improved-payment-form__form">
          <h3 className="improved-payment-form__form-title">Данные покупателя</h3>
          
          {error && (
            <div className="improved-payment-form__error">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
                <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="name">Имя и фамилия *</label>
            <input
              id="name"
              type="text"
              value={customerInfo.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={validationErrors.name ? 'error' : ''}
              placeholder="Введите ваше имя и фамилию"
              disabled={isSubmitting}
            />
            {validationErrors.name && (
              <span className="error-message">{validationErrors.name}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="phone">Телефон *</label>
            <PhoneInput
              value={customerInfo.phone}
              onChange={(value) => handleInputChange('phone', value)}
              error={validationErrors.phone}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              id="email"
              type="email"
              value={customerInfo.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className={validationErrors.email ? 'error' : ''}
              placeholder="example@email.com"
              disabled={isSubmitting}
            />
            {validationErrors.email && (
              <span className="error-message">{validationErrors.email}</span>
            )}
          </div>

          <div className="improved-payment-form__actions">
            <button
              type="button"
              onClick={onCancel}
              className="action-button action-button--secondary"
              disabled={isSubmitting}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="action-button action-button--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.416" strokeDashoffset="31.416">
                      <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                      <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                  Обработка...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Оплатить {formatCurrency(totalAmount, primaryCurrency)}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
