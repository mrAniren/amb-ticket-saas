import React, { useState, useEffect } from 'react';
import { ZoneDialogProps } from '../../types/Editor.types';
import { Zone } from '../../types/Seat.types';

const ZONE_COLORS = [
  '#976bbd', // Фиолетовый (основной)
  '#4876e1', // Синий
  '#28a745', // Зеленый
  '#ffc107', // Желтый
  '#dc3545', // Красный
  '#17a2b8', // Бирюзовый
  '#fd7e14', // Оранжевый
  '#6f42c1', // Пурпурный
];

export const ZoneDialog: React.FC<ZoneDialogProps> = ({
  isOpen,
  zone,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    color: ZONE_COLORS[0],
    description: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (zone) {
      setFormData({
        name: zone.name,
        color: zone.color,
        description: zone.description || ''
      });
    } else {
      setFormData({
        name: '',
        color: ZONE_COLORS[0],
        description: ''
      });
    }
    setErrors({});
  }, [zone, isOpen]);

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Очищаем ошибку при изменении поля
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название зоны обязательно';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Название должно содержать минимум 2 символа';
    }

    if (!formData.color) {
      newErrors.color = 'Выберите цвет зоны';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      color: formData.color,
      description: formData.description.trim() || undefined
    });
  };

  if (!isOpen) return null;

  return (
    <div className="zone-dialog-overlay">
      <div className="zone-dialog">
        <div className="zone-dialog__header">
          <h3>{zone ? 'Редактировать зону' : 'Создать зону'}</h3>
          <button 
            className="zone-dialog__close"
            onClick={onCancel}
            type="button"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="zone-dialog__form">
          <div className="zone-dialog__field">
            <label>Название зоны *</label>
            <input 
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="Например: Партер, Балкон, Ложа"
              className={errors.name ? 'zone-dialog__input--error' : ''}
            />
            {errors.name && (
              <span className="zone-dialog__error">{errors.name}</span>
            )}
          </div>

          <div className="zone-dialog__field">
            <label>Цвет зоны *</label>
            <div className="zone-dialog__colors">
              {ZONE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`zone-dialog__color ${formData.color === color ? 'zone-dialog__color--selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleInputChange('color', color)}
                  title={`Выбрать цвет ${color}`}
                />
              ))}
            </div>
            {errors.color && (
              <span className="zone-dialog__error">{errors.color}</span>
            )}
          </div>

          <div className="zone-dialog__field">
            <label>Описание (необязательно)</label>
            <textarea 
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Дополнительная информация о зоне"
              rows={3}
            />
          </div>

          <div className="zone-dialog__preview">
            <span>Предпросмотр:</span>
            <div className="zone-dialog__preview-item">
              <div 
                className="zone-dialog__preview-color"
                style={{ backgroundColor: formData.color }}
              />
              <span>{formData.name || 'Название зоны'}</span>
            </div>
          </div>

          <div className="zone-dialog__actions">
            <button type="submit" className="btn btn--primary">
              {zone ? 'Сохранить' : 'Создать'}
            </button>
            <button type="button" className="btn btn--secondary" onClick={onCancel}>
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};