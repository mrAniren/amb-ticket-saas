import React, { useState } from 'react';
import { apiClient } from '../../services/api';
import './PromoCodeInput.scss';

interface PromoCodeResult {
  valid: boolean;
  promoCode?: {
    id: string;
    code: string;
    name: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountFormatted: string;
  };
  orderAmount: number;
  discount: number;
  finalAmount: number;
  message: string;
}

interface PromoCodeInputProps {
  orderAmount: number;
  onPromoCodeApplied: (result: PromoCodeResult) => void;
  onPromoCodeRemoved: () => void;
  appliedPromoCode?: PromoCodeResult | null;
}

export const PromoCodeInput: React.FC<PromoCodeInputProps> = ({
  orderAmount,
  onPromoCodeApplied,
  onPromoCodeRemoved,
  appliedPromoCode
}) => {
  const [promoCode, setPromoCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleApplyPromoCode = async () => {
    if (!promoCode.trim()) {
      setError('Введите промокод');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.validatePromoCodeWithAmount(promoCode.trim(), orderAmount);

      if (response.success && response.valid) {
        onPromoCodeApplied(response);
        setPromoCode('');
      } else {
        setError(response.message || 'Промокод недействителен');
      }
    } catch (error: any) {
      console.error('Ошибка применения промокода:', error);
      setError(error.message || 'Ошибка при проверке промокода');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemovePromoCode = () => {
    onPromoCodeRemoved();
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyPromoCode();
    }
  };

  return (
    <div className="promo-code-input">
      <div className="promo-code-input__header">
        <h4>Промокод</h4>
        {appliedPromoCode && (
          <button 
            className="promo-code-remove"
            onClick={handleRemovePromoCode}
            title="Удалить промокод"
          >
            ×
          </button>
        )}
      </div>

      {appliedPromoCode ? (
        <div className="promo-code-applied">
          <div className="promo-code-info">
            <div className="promo-code-name">
              {appliedPromoCode.promoCode?.name}
            </div>
            <div className="promo-code-code">
              {appliedPromoCode.promoCode?.code}
            </div>
          </div>
          <div className="promo-code-discount">
            -{appliedPromoCode.discount.toLocaleString('ru-RU')} ₽
          </div>
        </div>
      ) : (
        <div className="promo-code-form">
          <div className="promo-code-input-group">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              onKeyPress={handleKeyPress}
              placeholder="Введите промокод"
              className="promo-code-field"
              disabled={isLoading}
            />
            <button
              onClick={handleApplyPromoCode}
              disabled={isLoading || !promoCode.trim()}
              className="promo-code-apply"
            >
              {isLoading ? '...' : 'Применить'}
            </button>
          </div>
          
          {error && (
            <div className="promo-code-error">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
