import React, { useState, useCallback } from 'react';
import './InvitationForm.scss';

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

interface InvitationFormProps {
  selectedSeats: SelectedSeat[];
  totalAmount: number;
  tempOrderId: string | null;
  onClose: () => void;
  onSubmit: (invitationData: InvitationData) => void;
}

interface InvitationData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes?: string;
  seats: SelectedSeat[];
  totalAmount: number;
  tempOrderId: string | null;
}

const InvitationForm: React.FC<InvitationFormProps> = ({
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
      const invitationData: InvitationData = {
        customerName: formData.customerName.trim(),
        customerEmail: formData.customerEmail.trim(),
        customerPhone: formData.customerPhone.trim(),
        notes: formData.notes.trim() || undefined,
        seats: selectedSeats,
        totalAmount,
        tempOrderId
      };

      await onSubmit(invitationData);
    } catch (error) {
      console.error('Ошибка создания приглашения:', error);
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, validateForm, selectedSeats, totalAmount, onSubmit]);

  return (
    <div className="invitation-form-overlay">
      <div className="invitation-form">
        <div className="invitation-form__header">
          <h2>🎫 Создание приглашений</h2>
          <button 
            className="invitation-form__close"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="invitation-form__content">
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

          {/* Форма данных клиента */}
          <form onSubmit={handleSubmit} className="customer-form">
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

            <div className="form-group">
              <label htmlFor="notes">
                Примечания
              </label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Дополнительная информация о приглашении..."
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
                    Создание...
                  </>
                ) : (
                  '🎫 Создать приглашения'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InvitationForm;
