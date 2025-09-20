import React, { useState, useCallback } from 'react';
import './OfflinePaymentForm.scss';

interface SelectedSeat {
  seatId: string;
  row: number;
  place: number;
  zone?: string;
  price: number;
  priceColor?: string;
  virtualSeatsCount?: number;
  virtualSeatIds?: string[];
}

interface OfflinePaymentFormProps {
  selectedSeats: SelectedSeat[];
  totalAmount: number;
  tempOrderId: string | null;
  onClose: () => void;
  onSubmit: (paymentData: PaymentData) => void;
}

interface PaymentData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  paymentMethod: 'cash' | 'card' | 'transfer';
  paymentStatus: 'paid' | 'pending';
  notes?: string;
  seats: SelectedSeat[];
  totalAmount: number;
  tempOrderId: string | null;
}

const OfflinePaymentForm: React.FC<OfflinePaymentFormProps> = ({
  selectedSeats,
  totalAmount,
  tempOrderId,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    paymentMethod: 'cash' as 'cash' | 'card' | 'transfer',
    paymentStatus: 'pending' as 'paid' | 'pending',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Валидация формы
  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    if (!formData.customerName.trim()) {
      newErrors.customerName = 'Имя клиента обязательно';
    }

    if (!formData.customerEmail.trim()) {
      newErrors.customerEmail = 'Email обязателен';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      newErrors.customerEmail = 'Некорректный email';
    }

    if (!formData.customerPhone.trim()) {
      newErrors.customerPhone = 'Телефон обязателен';
    } else if (!/^[\+]?[1-9][\d]{0,15}$/.test(formData.customerPhone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.customerPhone = 'Некорректный номер телефона';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Обработка изменений в полях
  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  // Обработка отправки формы
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const paymentData: PaymentData = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim(),
        paymentMethod: formData.paymentMethod,
        paymentStatus: formData.paymentStatus,
        notes: formData.notes.trim() || undefined,
        seats: selectedSeats,
        totalAmount,
        tempOrderId
      };

      await onSubmit(paymentData);
    } catch (error) {
      console.error('Ошибка обработки оплаты:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, selectedSeats, totalAmount, onSubmit]);

  return (
    <div className="offline-payment-form-overlay">
      <div className="offline-payment-form">
        <div className="offline-payment-form__header">
          <h2>💳 Офлайн оплата</h2>
          <button 
            className="offline-payment-form__close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="offline-payment-form__content">
          {/* Информация о выбранных местах */}
          <div className="selected-seats-info">
            <h3>Выбранные места</h3>
            <div className="seats-list">
              {selectedSeats.map((seat, index) => (
                <div key={index} className="seat-item">
                  <div className="seat-details">
                    {seat.seatId.includes('-virtual-') ? (
                      <>
                        <span className="seat-name">{seat.zone || 'Специальная зона'}</span>
                        <span className="seat-type">Виртуальное место</span>
                      </>
                    ) : (
                      <>
                        <span className="seat-name">{seat.place} место, {seat.row} ряд</span>
                        <span className="seat-zone">{seat.zone || 'Партер'}</span>
                      </>
                    )}
                  </div>
                  <div className="seat-price">
                    {seat.price.toLocaleString('ru-RU')} ₽
                  </div>
                </div>
              ))}
            </div>
            <div className="total-amount">
              <strong>Итого: {totalAmount.toLocaleString('ru-RU')} ₽</strong>
            </div>
          </div>

          {/* Форма данных клиента и оплаты */}
          <form onSubmit={handleSubmit} className="payment-form">
            <h3>Данные клиента</h3>
            
            <div className="form-group">
              <label htmlFor="customerName">
                Имя клиента <span className="required">*</span>
              </label>
              <input
                type="text"
                id="customerName"
                value={formData.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                className={errors.customerName ? 'error' : ''}
                placeholder="Введите имя клиента"
                disabled={isSubmitting}
              />
              {errors.customerName && (
                <span className="error-message">{errors.customerName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="customerEmail">
                Email <span className="required">*</span>
              </label>
              <input
                type="email"
                id="customerEmail"
                value={formData.customerEmail}
                onChange={(e) => handleInputChange('customerEmail', e.target.value)}
                className={errors.customerEmail ? 'error' : ''}
                placeholder="example@email.com"
                disabled={isSubmitting}
              />
              {errors.customerEmail && (
                <span className="error-message">{errors.customerEmail}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="customerPhone">
                Телефон <span className="required">*</span>
              </label>
              <input
                type="tel"
                id="customerPhone"
                value={formData.customerPhone}
                onChange={(e) => handleInputChange('customerPhone', e.target.value)}
                className={errors.customerPhone ? 'error' : ''}
                placeholder="+7 (999) 123-45-67"
                disabled={isSubmitting}
              />
              {errors.customerPhone && (
                <span className="error-message">{errors.customerPhone}</span>
              )}
            </div>

            <h3>Способ оплаты</h3>

            <div className="form-group">
              <label>Выберите способ оплаты</label>
              <div className="payment-methods">
                <label className="payment-method">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={formData.paymentMethod === 'cash'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="payment-method-content">
                    <span className="payment-icon">💵</span>
                    <span className="payment-name">Наличные</span>
                  </div>
                </label>

                <label className="payment-method">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="card"
                    checked={formData.paymentMethod === 'card'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="payment-method-content">
                    <span className="payment-icon">💳</span>
                    <span className="payment-name">Банковская карта</span>
                  </div>
                </label>

                <label className="payment-method">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="transfer"
                    checked={formData.paymentMethod === 'transfer'}
                    onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="payment-method-content">
                    <span className="payment-icon">🏦</span>
                    <span className="payment-name">Банковский перевод</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label>Статус оплаты</label>
              <div className="payment-status">
                <label className="status-option">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="paid"
                    checked={formData.paymentStatus === 'paid'}
                    onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="status-content">
                    <span className="status-icon">✅</span>
                    <span className="status-name">Оплачено</span>
                  </div>
                </label>

                <label className="status-option">
                  <input
                    type="radio"
                    name="paymentStatus"
                    value="pending"
                    checked={formData.paymentStatus === 'pending'}
                    onChange={(e) => handleInputChange('paymentStatus', e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="status-content">
                    <span className="status-icon">⏳</span>
                    <span className="status-name">Ожидает оплаты</span>
                  </div>
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="notes">
                Примечания
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Дополнительная информация о заказе..."
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={onClose}
                className="btn-cancel"
                disabled={isSubmitting}
              >
                Отмена
              </button>
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting || selectedSeats.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <span className="spinner"></span>
                    Обработка...
                  </>
                ) : (
                  '💳 Оформить заказ'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default OfflinePaymentForm;
