import React, { useState, useEffect } from 'react';
import './SpecialZoneSelector.scss';

interface SpecialZoneSelectorProps {
  isVisible: boolean;
  position: { x: number; y: number };
  zoneName: string;
  capacity: number;
  price: number;
  currency: string;
  onAddToCart: (quantity: number) => void;
  onCancel: () => void;
}

const SpecialZoneSelector: React.FC<SpecialZoneSelectorProps> = ({
  isVisible,
  position,
  zoneName,
  capacity,
  price,
  currency,
  onAddToCart,
  onCancel
}) => {
  const [quantity, setQuantity] = useState(1);
  const [totalPrice, setTotalPrice] = useState(price);

  useEffect(() => {
    setTotalPrice(price * quantity);
  }, [price, quantity]);

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= capacity) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = () => {
    onAddToCart(quantity);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Затемнение фона */}
      <div 
        className="special-zone-selector__backdrop"
        onClick={onCancel}
      />
      
      {/* Селектор */}
      <div 
        className="special-zone-selector"
        style={{
          left: position.x,
          top: position.y,
        }}
      >
      <div className="special-zone-selector__header">
        <h3 className="special-zone-selector__title">{zoneName}</h3>
        <button 
          className="special-zone-selector__close"
          onClick={onCancel}
          aria-label="Закрыть"
        >
          ×
        </button>
      </div>
      
      <div className="special-zone-selector__content">
        <div className="special-zone-selector__info">
          <p className="special-zone-selector__capacity">
            Доступно мест: <span className="special-zone-selector__capacity-number">{capacity}</span>
          </p>
          <p className="special-zone-selector__price">
            Цена за место: <span className="special-zone-selector__price-value">{price.toLocaleString('ru-RU')} {currency}</span>
          </p>
        </div>

        <div className="special-zone-selector__quantity">
          <label className="special-zone-selector__quantity-label">
            Количество мест:
          </label>
          <div className="special-zone-selector__quantity-controls">
            <button 
              className="special-zone-selector__quantity-btn"
              onClick={() => handleQuantityChange(quantity - 1)}
              disabled={quantity <= 1}
            >
              −
            </button>
            <input
              type="number"
              className="special-zone-selector__quantity-input"
              value={quantity}
              onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
              min="1"
              max={capacity}
            />
            <button 
              className="special-zone-selector__quantity-btn"
              onClick={() => handleQuantityChange(quantity + 1)}
              disabled={quantity >= capacity}
            >
              +
            </button>
          </div>
        </div>

        <div className="special-zone-selector__total">
          <span className="special-zone-selector__total-label">Итого:</span>
          <span className="special-zone-selector__total-value">
            {totalPrice.toLocaleString('ru-RU')} {currency}
          </span>
        </div>

        <div className="special-zone-selector__actions">
          <button 
            className="special-zone-selector__btn special-zone-selector__btn--cancel"
            onClick={onCancel}
          >
            Отмена
          </button>
          <button 
            className="special-zone-selector__btn special-zone-selector__btn--add"
            onClick={handleAddToCart}
          >
            Добавить в корзину
          </button>
        </div>
      </div>
    </div>
    </>
  );
};

export default SpecialZoneSelector;
