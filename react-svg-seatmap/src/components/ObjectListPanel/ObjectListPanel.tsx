import React, { useState, useMemo, useCallback } from 'react';
import { Seat, ObjectType, Zone } from '../../types/Seat.types';
import './ObjectListPanel.scss';

interface ObjectListPanelProps {
  seats: Seat[];
  zones: Zone[];
  isOpen: boolean;
  mode: 'processed' | 'unprocessed';
  onClose: () => void;
  onSeatUpdate: (seatId: string, updates: Partial<Seat>) => void;
}

export const ObjectListPanel: React.FC<ObjectListPanelProps> = ({
  seats,
  zones,
  isOpen,
  mode,
  onClose,
  onSeatUpdate
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<ObjectType | 'all'>('all');

  // Определяем обработанные/необработанные объекты
  const filteredSeats = useMemo(() => {
    const isProcessed = (seat: Seat) => {
      const hasObjectType = seat.objectType && seat.objectType !== 'seat' ? true : 
                           seat.objectType === 'seat' && seat.row !== undefined && seat.place !== undefined;
      const hasZone = seat.zone !== undefined && seat.zone !== '';
      
      // Для спец. зон дополнительно проверяем наличие capacity
      if (seat.objectType === 'special_zone') {
        return hasObjectType && hasZone && 
               seat.capacity !== undefined && seat.capacity > 0;
      }
      
      return hasObjectType && hasZone;
    };

    let filtered = seats.filter(seat => mode === 'processed' ? isProcessed(seat) : !isProcessed(seat));

    // Фильтр по типу
    if (filterType !== 'all') {
      filtered = filtered.filter(seat => (seat.objectType || 'seat') === filterType);
    }

    // Поиск по названию
    if (searchTerm) {
      filtered = filtered.filter(seat => 
        seat.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        seat.cssSelector.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [seats, mode, filterType, searchTerm]);

  const handleSeatChange = useCallback((seatId: string, field: keyof Seat, value: any) => {
    const updates: Partial<Seat> = { [field]: value };
    
    // Если меняется тип объекта, очищаем связанные поля
    if (field === 'objectType') {
      if (value !== 'seat') {
        updates.row = undefined;
        updates.place = undefined;
      }
      if (value !== 'special_zone') {
        updates.capacity = undefined;
      }
    }
    

    onSeatUpdate(seatId, updates);
  }, [onSeatUpdate]);

  const getObjectTypeName = (type: ObjectType | undefined) => {
    switch (type) {
      case 'seat': return 'Место';
      case 'scene': return 'Сцена';
      case 'decoration': return 'Декор';
      case 'passage': return 'Тех. зона';
      case 'special_zone': return 'Спец. зона';
      default: return 'Место';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="object-list-panel">
      <div className="object-list-panel__overlay" onClick={onClose} />
      <div className="object-list-panel__content">
        <div className="object-list-panel__header">
          <h3>
            {mode === 'processed' ? 'Обработанные объекты' : 'Необработанные объекты'} 
            ({filteredSeats.length})
          </h3>
          <button className="object-list-panel__close" onClick={onClose}>×</button>
        </div>

        <div className="object-list-panel__filters">
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="object-list-panel__search"
          />
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ObjectType | 'all')}
            className="object-list-panel__filter"
          >
            <option value="all">Все типы</option>
            <option value="seat">Места</option>
            <option value="scene">Сцены</option>
            <option value="decoration">Декор</option>
            <option value="passage">Тех. зоны</option>
            <option value="special_zone">Спец. зоны</option>
          </select>
        </div>

        <div className="object-list-panel__list">
          {filteredSeats.length === 0 ? (
            <div className="object-list-panel__empty">
              {mode === 'processed' ? 'Нет обработанных объектов' : 'Все объекты обработаны'}
            </div>
          ) : (
            filteredSeats.map((seat) => (
              <div key={seat.id} className="object-list-panel__item">
                <div className="object-list-panel__item-header">
                  <strong className="object-list-panel__item-name">
                    {seat.id || `Элемент ${seat.cssSelector.split(':')[1] || ''}`}
                  </strong>
                  <span className="object-list-panel__item-selector">
                    {seat.cssSelector}
                  </span>
                </div>

                <div className="object-list-panel__item-fields">
                  <div className="object-list-panel__field">
                    <label>Тип объекта:</label>
                    <select
                      value={seat.objectType || 'seat'}
                      onChange={(e) => handleSeatChange(seat.id, 'objectType', e.target.value as ObjectType)}
                    >
                      <option value="seat">Место</option>
                      <option value="scene">Сцена</option>
                      <option value="decoration">Декор</option>
                      <option value="passage">Тех. зона</option>
                      <option value="special_zone">Спец. зона</option>
                    </select>
                  </div>

                  <div className="object-list-panel__field">
                    <label>Зона:</label>
                    <select
                      value={seat.zone || ''}
                      onChange={(e) => handleSeatChange(seat.id, 'zone', e.target.value)}
                    >
                      <option value="">Не выбрана</option>
                      {zones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {zone.name}
                          {zone.isDefault ? ' (по умолчанию)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(seat.objectType === 'seat' || !seat.objectType) && (
                    <>
                      <div className="object-list-panel__field">
                        <label>Ряд:</label>
                        <input
                          type="text"
                          value={seat.row || ''}
                          onChange={(e) => handleSeatChange(seat.id, 'row', e.target.value)}
                          placeholder="Номер ряда"
                        />
                      </div>

                      <div className="object-list-panel__field">
                        <label>Место:</label>
                        <input
                          type="number"
                          value={seat.place || ''}
                          onChange={(e) => handleSeatChange(seat.id, 'place', parseInt(e.target.value) || undefined)}
                          placeholder="Номер места"
                          min="1"
                        />
                      </div>
                    </>
                  )}

                  {seat.objectType === 'special_zone' && (
                    <div className="object-list-panel__field">
                      <label>Количество мест:</label>
                      <input
                        type="number"
                        value={seat.capacity || ''}
                        onChange={(e) => handleSeatChange(seat.id, 'capacity', parseInt(e.target.value) || undefined)}
                        placeholder="Количество мест"
                        min="1"
                      />
                    </div>
                  )}

                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};