import React, { useState, useEffect } from 'react';
import { Seat, Zone } from '../../types/Seat.types';
import { HallPreview } from '../HallPreview';
import './HallPreviewModal.scss';

interface HallPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  hallName: string;
  seats: Seat[];
  zones: Zone[];
}

export const HallPreviewModal: React.FC<HallPreviewModalProps> = ({
  isOpen,
  onClose,
  hallName,
  seats,
  zones
}) => {
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);

  // Закрытие по ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  // Закрытие по клику на backdrop
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  // Обработка клика по месту
  const handleSeatClick = (seat: Seat) => {
    const seatId = seat.id as string;
    setSelectedSeats(prev => {
      if (prev.includes(seatId)) {
        return prev.filter(id => id !== seatId);
      } else {
        return [...prev, seatId];
      }
    });
  };

  // Очистка выбранных мест
  const handleClearSelection = () => {
    setSelectedSeats([]);
  };

  // Статистика
  const stats = {
    total: seats.filter(s => s.objectType === 'seat').length,
    selected: selectedSeats.length,
    zones: zones.length
  };

  if (!isOpen) return null;

  return (
    <div className="hall-preview-modal" onClick={handleBackdropClick}>
      <div className="hall-preview-modal__content">
        {/* Заголовок */}
        <div className="hall-preview-modal__header">
          <h2 className="hall-preview-modal__title">
            Предпросмотр зала: {hallName}
          </h2>
          <button 
            className="hall-preview-modal__close"
            onClick={onClose}
            title="Закрыть"
          >
            ×
          </button>
        </div>

        {/* Основной контент */}
        <div className="hall-preview-modal__body">
          <HallPreview
            seats={seats}
            zones={zones}
            width={900}
            height={650}
            onSeatClick={handleSeatClick}
            selectedSeats={selectedSeats}
          />

          {/* Легенда */}
          <div className="hall-preview-modal__legend">
            <div className="hall-preview-modal__legend-group">
              <h4>Типы объектов:</h4>
              <div className="hall-preview-modal__legend-items">
                <div className="hall-preview-modal__legend-item">
                  <div className="hall-preview-modal__legend-color hall-preview-modal__legend-color--seat"></div>
                  <span>Места</span>
                </div>
                <div className="hall-preview-modal__legend-item">
                  <div className="hall-preview-modal__legend-color hall-preview-modal__legend-color--scene"></div>
                  <span>Сцена</span>
                </div>
                <div className="hall-preview-modal__legend-item">
                  <div className="hall-preview-modal__legend-color hall-preview-modal__legend-color--decoration"></div>
                  <span>Декорации</span>
                </div>
                <div className="hall-preview-modal__legend-item">
                  <div className="hall-preview-modal__legend-color hall-preview-modal__legend-color--passage"></div>
                  <span>Проходы</span>
                </div>
                <div className="hall-preview-modal__legend-item">
                  <div className="hall-preview-modal__legend-color hall-preview-modal__legend-color--selected"></div>
                  <span>Выбранные</span>
                </div>
              </div>
            </div>

            {/* Зоны */}
            {zones.length > 0 && (
              <div className="hall-preview-modal__legend-group">
                <h4>Зоны:</h4>
                <div className="hall-preview-modal__legend-items">
                  {zones.map(zone => (
                    <div key={zone.id} className="hall-preview-modal__legend-item">
                      <div 
                        className="hall-preview-modal__legend-color" 
                        style={{ backgroundColor: zone.color }}
                      ></div>
                      <span>{zone.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Статистика и контролы */}
          <div className="hall-preview-modal__controls">
            <div className="hall-preview-modal__stats">
              <span>Всего мест: <strong>{stats.total}</strong></span>
              <span>Выбрано: <strong>{stats.selected}</strong></span>
              <span>Зон: <strong>{stats.zones}</strong></span>
            </div>

            {selectedSeats.length > 0 && (
              <button 
                className="hall-preview-modal__clear-btn"
                onClick={handleClearSelection}
              >
                Очистить выбор
              </button>
            )}
          </div>

          {/* Инструкция */}
          <div className="hall-preview-modal__help">
            <p>💡 <strong>Инструкция:</strong> Кликайте по местам для выбора. Сцена, декорации и тех. зоны — только для просмотра.</p>
          </div>
        </div>

        {/* Подвал */}
        <div className="hall-preview-modal__footer">
          <button 
            className="hall-preview-modal__btn hall-preview-modal__btn--secondary"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default HallPreviewModal;

