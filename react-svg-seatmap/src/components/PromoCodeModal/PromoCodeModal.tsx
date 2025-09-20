import React, { useState, useEffect } from 'react';
import { 
  PromoCode, 
  PromoCodeFormData, 
  PromoCodeType, 
  DiscountType, 
  Currency,
  CURRENCIES 
} from '../../types/PromoCode.types';
import './PromoCodeModal.scss';

interface PromoCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PromoCodeFormData) => void;
  promoCode?: PromoCode | null;
  isLoading?: boolean;
}

export const PromoCodeModal: React.FC<PromoCodeModalProps> = ({
  isOpen,
  onClose,
  onSave,
  promoCode,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<PromoCodeFormData>({
    code: '',
    name: '',
    type: 'permanent',
    startDate: '',
    endDate: '',
    discountType: 'percentage',
    discountValue: '',
    currency: 'RUB',
    description: ''
  });

  const [errors, setErrors] = useState<Partial<PromoCodeFormData>>({});

  // Заполнение формы при редактировании
  useEffect(() => {
    if (promoCode) {
      setFormData({
        code: promoCode.code,
        name: promoCode.name,
        type: promoCode.type,
        startDate: promoCode.startDate ? promoCode.startDate.split('T')[0] : '',
        endDate: promoCode.endDate ? promoCode.endDate.split('T')[0] : '',
        discountType: promoCode.discountType,
        discountValue: promoCode.discountValue.toString(),
        currency: promoCode.currency || 'RUB',
        description: promoCode.description || ''
      });
    } else {
      // Сброс формы для создания нового промокода
      setFormData({
        code: '',
        name: '',
        type: 'permanent',
        startDate: '',
        endDate: '',
        discountType: 'percentage',
        discountValue: '',
        currency: 'RUB',
        description: ''
      });
    }
    setErrors({});
  }, [promoCode, isOpen]);

  const handleInputChange = (field: keyof PromoCodeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Очистка ошибки при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<PromoCodeFormData> = {};

    if (!formData.code.trim()) {
      newErrors.code = 'Код промокода обязателен';
    } else if (!/^[A-Z0-9_-]+$/i.test(formData.code)) {
      newErrors.code = 'Код может содержать только буквы, цифры, дефис и подчеркивание';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Название обязательно';
    }

    if (formData.type === 'temporary') {
      if (!formData.startDate) {
        newErrors.startDate = 'Дата начала обязательна для временного промокода';
      }
      if (!formData.endDate) {
        newErrors.endDate = 'Дата окончания обязательна для временного промокода';
      }
      if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
        newErrors.endDate = 'Дата окончания должна быть позже даты начала';
      }
    }

    if (!formData.discountValue.trim()) {
      newErrors.discountValue = 'Значение скидки обязательно';
    } else {
      const value = parseFloat(formData.discountValue);
      if (isNaN(value) || value <= 0) {
        newErrors.discountValue = 'Значение скидки должно быть положительным числом';
      } else if (formData.discountType === 'percentage' && value > 100) {
        newErrors.discountValue = 'Процентная скидка не может быть больше 100%';
      }
    }

    if (formData.discountType === 'fixed' && !formData.currency) {
      newErrors.currency = 'Валюта обязательна для фиксированной скидки';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave(formData);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="promo-code-modal-backdrop" onClick={handleBackdropClick}>
      <div className="promo-code-modal">
        <div className="promo-code-modal__header">
          <h2 className="promo-code-modal__title">
            {promoCode ? 'Редактировать промокод' : 'Создать промокод'}
          </h2>
          <button 
            className="promo-code-modal__close-btn"
            onClick={handleClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="promo-code-modal__form">
          <div className="promo-code-modal__row">
            <div className="promo-code-modal__field">
              <label className="promo-code-modal__label">
                Код промокода *
              </label>
              <input
                type="text"
                className={`promo-code-modal__input ${errors.code ? 'error' : ''}`}
                value={formData.code}
                onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                placeholder="SUMMER2024"
                disabled={isLoading}
              />
              {errors.code && (
                <span className="promo-code-modal__error">{errors.code}</span>
              )}
            </div>

            <div className="promo-code-modal__field">
              <label className="promo-code-modal__label">
                Название *
              </label>
              <input
                type="text"
                className={`promo-code-modal__input ${errors.name ? 'error' : ''}`}
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Летняя скидка 2024"
                disabled={isLoading}
              />
              {errors.name && (
                <span className="promo-code-modal__error">{errors.name}</span>
              )}
            </div>
          </div>

          <div className="promo-code-modal__row">
            <div className="promo-code-modal__field">
              <label className="promo-code-modal__label">
                Тип промокода *
              </label>
              <select
                className="promo-code-modal__select"
                value={formData.type}
                onChange={(e) => handleInputChange('type', e.target.value as PromoCodeType)}
                disabled={isLoading}
              >
                <option value="permanent">Постоянный</option>
                <option value="temporary">Временный</option>
              </select>
            </div>
          </div>

          {formData.type === 'temporary' && (
            <div className="promo-code-modal__row">
              <div className="promo-code-modal__field">
                <label className="promo-code-modal__label">
                  Дата начала *
                </label>
                <input
                  type="date"
                  className={`promo-code-modal__input ${errors.startDate ? 'error' : ''}`}
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  disabled={isLoading}
                />
                {errors.startDate && (
                  <span className="promo-code-modal__error">{errors.startDate}</span>
                )}
              </div>

              <div className="promo-code-modal__field">
                <label className="promo-code-modal__label">
                  Дата окончания *
                </label>
                <input
                  type="date"
                  className={`promo-code-modal__input ${errors.endDate ? 'error' : ''}`}
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  disabled={isLoading}
                />
                {errors.endDate && (
                  <span className="promo-code-modal__error">{errors.endDate}</span>
                )}
              </div>
            </div>
          )}

          <div className="promo-code-modal__row">
            <div className="promo-code-modal__field">
              <label className="promo-code-modal__label">
                Тип скидки *
              </label>
              <select
                className="promo-code-modal__select"
                value={formData.discountType}
                onChange={(e) => handleInputChange('discountType', e.target.value as DiscountType)}
                disabled={isLoading}
              >
                <option value="percentage">Процентная скидка (%)</option>
                <option value="fixed">Фиксированная сумма</option>
              </select>
            </div>

            <div className="promo-code-modal__field">
              <label className="promo-code-modal__label">
                Значение скидки *
              </label>
              <div className="promo-code-modal__input-group">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discountType === 'percentage' ? '100' : undefined}
                  className={`promo-code-modal__input ${errors.discountValue ? 'error' : ''}`}
                  value={formData.discountValue}
                  onChange={(e) => handleInputChange('discountValue', e.target.value)}
                  placeholder={formData.discountType === 'percentage' ? '10' : '500'}
                  disabled={isLoading}
                />
                {formData.discountType === 'percentage' && (
                  <span className="promo-code-modal__input-suffix">%</span>
                )}
              </div>
              {errors.discountValue && (
                <span className="promo-code-modal__error">{errors.discountValue}</span>
              )}
            </div>
          </div>

          {formData.discountType === 'fixed' && (
            <div className="promo-code-modal__row">
              <div className="promo-code-modal__field">
                <label className="promo-code-modal__label">
                  Валюта *
                </label>
                <select
                  className={`promo-code-modal__select ${errors.currency ? 'error' : ''}`}
                  value={formData.currency}
                  onChange={(e) => handleInputChange('currency', e.target.value as Currency)}
                  disabled={isLoading}
                >
                  {CURRENCIES.map(currency => (
                    <option key={currency.value} value={currency.value}>
                      {currency.label} ({currency.symbol})
                    </option>
                  ))}
                </select>
                {errors.currency && (
                  <span className="promo-code-modal__error">{errors.currency}</span>
                )}
              </div>
            </div>
          )}

          <div className="promo-code-modal__field">
            <label className="promo-code-modal__label">
              Описание
            </label>
            <textarea
              className="promo-code-modal__textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Дополнительная информация о промокоде..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="promo-code-modal__actions">
            <button
              type="button"
              className="promo-code-modal__btn promo-code-modal__btn--secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              Отмена
            </button>
            <button
              type="submit"
              className="promo-code-modal__btn promo-code-modal__btn--primary"
              disabled={isLoading}
            >
              {isLoading ? 'Сохранение...' : (promoCode ? 'Сохранить' : 'Создать')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
