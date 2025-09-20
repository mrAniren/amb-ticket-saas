import React, { useState, useEffect } from 'react';
import { Price } from '../../types/PriceScheme.types';
import './PriceManager.scss';

interface PriceManagerProps {
  prices: Price[];
  seatPrices: { seatId: string; priceId: string }[];
  onAddPrice: (price: Omit<Price, 'id'>) => void;
  onUpdatePrice: (id: string, price: Partial<Price>) => void;
  onDeletePrice: (id: string) => void;
  hallCurrency?: string; // Валюта зала
}

export const PriceManager: React.FC<PriceManagerProps> = ({
  prices,
  seatPrices,
  onAddPrice,
  onUpdatePrice,
  onDeletePrice,
  hallCurrency = 'RUB' // Используем валюту зала или RUB по умолчанию
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState({
    value: 0,
    currency: hallCurrency, // Используем валюту зала
    color: '#2ECC71' // Изумрудно-зеленый по умолчанию
  });

  // Обновляем валюту при изменении hallCurrency
  useEffect(() => {
    setNewPrice(prev => ({
      ...prev,
      currency: hallCurrency
    }));
  }, [hallCurrency]);

  const handleAddPrice = () => {
    if (newPrice.value > 0) {
      onAddPrice({
        name: `Цена ${newPrice.value} ${newPrice.currency}`,
        value: newPrice.value,
        currency: newPrice.currency, // Используем валюту зала как есть
        color: newPrice.color
      });
      setNewPrice({
        value: 0,
        currency: hallCurrency,
        color: '#2ECC71' // Изумрудно-зеленый по умолчанию
      });
      setIsAdding(false);
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewPrice({
      value: 0,
      currency: hallCurrency, // Используем оригинальную валюту зала
      color: '#2ECC71' // Изумрудно-зеленый по умолчанию
    });
  };

  const handleUpdatePrice = (id: string, field: keyof Price, value: any) => {
    onUpdatePrice(id, { [field]: value });
  };


  // Функции для подсчета статистики
  const getSeatCountForPrice = (priceId: string) => {
    return seatPrices.filter(sp => sp.priceId === priceId).length;
  };

  const getTotalForPrice = (priceId: string) => {
    const price = prices.find(p => p.id === priceId);
    if (!price) return 0;
    const seatCount = getSeatCountForPrice(priceId);
    return seatCount * price.value;
  };

  const getGrandTotal = () => {
    return prices.reduce((total, price) => {
      return total + getTotalForPrice(price.id);
    }, 0);
  };

  const formatCurrency = (value: number, currency: string) => {
    return `${value.toLocaleString()} ${currency}`;
  };

  return (
    <div className="price-manager">
      <div className="price-manager__header">
        <h3>Управление ценами</h3>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)} 
            className="btn btn--primary btn--sm"
          >
            + Добавить цену
          </button>
        )}
      </div>

      {/* Форма добавления новой цены */}
      {isAdding && (
        <div className="price-manager__add-form">
          <div className="price-form">
            <div className="price-form__row">
              <div className="price-form__field">
                <label>Цена ({hallCurrency}):</label>
                <input
                  type="number"
                  value={newPrice.value}
                  onChange={(e) => setNewPrice(prev => ({ ...prev, value: Number(e.target.value) }))}
                  min="0"
                  step="0.01"
                  placeholder="1000"
                />
              </div>
            </div>
            <div className="price-form__actions">
              <button onClick={handleAddPrice} className="btn btn--success btn--sm">
                Добавить
              </button>
              <button onClick={handleCancelAdd} className="btn btn--outline btn--sm">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Список существующих цен */}
      <div className="price-manager__list">
        {prices.length === 0 ? (
          <div className="price-manager__empty">
            <p>Цены не добавлены. Нажмите "Добавить цену" для создания первой цены.</p>
          </div>
        ) : (
          prices.map(price => (
            <div key={price.id} className="price-item">
              {editingId === price.id ? (
                // Режим редактирования
                <div className="price-form">
                  <div className="price-form__row">
                    <div className="price-form__field">
                      <input
                        type="number"
                        value={price.value}
                        onChange={(e) => {
                          const newValue = Number(e.target.value);
                          handleUpdatePrice(price.id, 'value', newValue);
                          handleUpdatePrice(price.id, 'name', `Цена ${newValue} ${price.currency}`);
                        }}
                        min="0"
                        step="0.01"
                        placeholder="Цена"
                      />
                    </div>
                    <div className="price-form__field">
                      <select
                        value={price.currency}
                        onChange={(e) => {
                          handleUpdatePrice(price.id, 'currency', e.target.value);
                          handleUpdatePrice(price.id, 'name', `Цена ${price.value} ${e.target.value}`);
                        }}
                      >
                        <option value="RUB">RUB</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                  <div className="price-form__actions">
                    <button onClick={() => setEditingId(null)} className="btn btn--success btn--sm">
                      Сохранить
                    </button>
                    <button onClick={() => setEditingId(null)} className="btn btn--outline btn--sm">
                      Отмена
                    </button>
                  </div>
                </div>
              ) : (
                // Режим просмотра
                <div className="price-item__content">
                  <div className="price-item__info">
                    <span className="price-item__name">{price.name}</span>
                    <div className="price-item__stats">
                      <span className="price-item__seats">
                        {getSeatCountForPrice(price.id)} мест
                      </span>
                      <span className="price-item__total">
                        {formatCurrency(getTotalForPrice(price.id), price.currency)}
                      </span>
                    </div>
                  </div>
                  <div className="price-item__actions">
                    <button
                      onClick={() => setEditingId(price.id)}
                      className="btn btn--outline btn--sm"
                      title="Редактировать"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDeletePrice(price.id)}
                      className="btn btn--outline-danger btn--sm"
                      title="Удалить"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Общая сумма */}
      {prices.length > 0 && (
        <div className="price-manager__total">
          <div className="price-total">
            <span className="price-total__label">Общая сумма всех билетов:</span>
            <span className="price-total__value">
              {formatCurrency(getGrandTotal(), prices[0]?.currency || 'RUB')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
