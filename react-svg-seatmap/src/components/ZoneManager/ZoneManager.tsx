import React, { useState } from 'react';
import { ZoneManagerProps } from '../../types/Editor.types';
import { Zone } from '../../types/Seat.types';
import { ZoneDialog } from './ZoneDialog';
import { CurrencySelector } from '../CurrencySelector';
import './ZoneManager.scss';

export const ZoneManager: React.FC<ZoneManagerProps> = ({
  zones,
  currentZone,
  currency,
  onZoneCreate,
  onZoneUpdate,
  onZoneDelete,
  onZoneSelect,
  onCurrencyChange
}) => {
  const [showDialog, setShowDialog] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | undefined>();

  const handleCreateZone = () => {
    setEditingZone(undefined);
    setShowDialog(true);
  };

  const handleEditZone = (zone: Zone) => {
    setEditingZone(zone);
    setShowDialog(true);
  };

  const handleSaveZone = (zoneData: Omit<Zone, 'id'>) => {
    if (editingZone) {
      onZoneUpdate(editingZone.id, zoneData);
    } else {
      onZoneCreate(zoneData);
    }
    setShowDialog(false);
    setEditingZone(undefined);
  };

  const handleDeleteZone = (zone: Zone) => {
    if (zone.isDefault) {
      alert('Нельзя удалить зону по умолчанию');
      return;
    }

    if (confirm(`Вы уверены, что хотите удалить зону "${zone.name}"?`)) {
      onZoneDelete(zone.id);
    }
  };

  const handleCancelDialog = () => {
    setShowDialog(false);
    setEditingZone(undefined);
  };

  const handleCurrencyChange = (newCurrency: string) => {
    if (onCurrencyChange) {
      onCurrencyChange(newCurrency);
    }
  };

  return (
    <div className="zone-manager">
      <div className="zone-manager__header">
        <h3>Зоны зала</h3>
        <button 
          className="btn btn--primary btn--sm"
          onClick={handleCreateZone}
          title="Добавить зону"
        >
          + Зона
        </button>
      </div>

      <div className="zone-manager__currency">
        <label className="zone-manager__currency-label">
          Валюта зала:
        </label>
        <CurrencySelector
          value={currency}
          onChange={handleCurrencyChange}
          placeholder="Выберите валюту..."
          className="zone-manager__currency-selector"
        />
      </div>

      <div className="zone-manager__list">
        {zones.map((zone) => (
          <div 
            key={zone.id}
            className={`zone-manager__item ${currentZone === zone.id ? 'zone-manager__item--active' : ''}`}
            onClick={() => onZoneSelect(zone.id)}
          >
            <div 
              className="zone-manager__color"
              style={{ backgroundColor: zone.color }}
            />
            
            <div className="zone-manager__info">
              <span className="zone-manager__name">
                {zone.name}
                {zone.isDefault && (
                  <span className="zone-manager__badge">По умолчанию</span>
                )}
              </span>
              {zone.description && (
                <span className="zone-manager__description">
                  {zone.description}
                </span>
              )}
            </div>

            <div className="zone-manager__actions">
              <button 
                className="zone-manager__action"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditZone(zone);
                }}
                title="Редактировать"
              >
                ✎
              </button>
              {!zone.isDefault && (
                <button 
                  className="zone-manager__action zone-manager__action--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteZone(zone);
                  }}
                  title="Удалить"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {zones.length === 0 && (
        <div className="zone-manager__empty">
          <p>Нет доступных зон</p>
          <button 
            className="btn btn--secondary"
            onClick={handleCreateZone}
          >
            Создать первую зону
          </button>
        </div>
      )}

      <ZoneDialog
        isOpen={showDialog}
        zone={editingZone}
        onSave={handleSaveZone}
        onCancel={handleCancelDialog}
      />
    </div>
  );
};