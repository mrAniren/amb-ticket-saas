import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { BulkEditWidgetProps } from '../../types/Editor.types';
import { BulkEditData, ObjectType } from '../../types/Seat.types';
import './BulkEditWidget.scss';

export const BulkEditWidget: React.FC<BulkEditWidgetProps> = ({
  selectedSeats,
  zones,
  position, // Игнорируем position, используем фиксированную позицию
  onApply,
  onClear,
  onCancel,
  onPositionChange // Игнорируем onPositionChange
}) => {
  // Определяем преобладающий тип объектов и особенности выбора
  const selectionInfo = useMemo(() => {
    const count = selectedSeats.length;
    const isSingle = count === 1;
    
    // Подсчитываем типы объектов
    const typeCounts = selectedSeats.reduce((acc, seat) => {
      const type = seat.objectType || 'seat';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<ObjectType, number>);
    
    // Определяем преобладающий тип
    const predominantType = Object.entries(typeCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as ObjectType || 'seat';
    
    // Определяем нужно ли показывать поля ряда и места
    const showSeatingFields = predominantType === 'seat';
    
    // Определяем нужно ли показывать поля для спец. зон
    const showSpecialZoneFields = predominantType === 'special_zone';
    
    // Название для заголовка
    const getObjectTypeName = (type: ObjectType) => {
      switch (type) {
        case 'seat': return isSingle ? 'место' : 'мест';
        case 'scene': return isSingle ? 'сцену' : 'сцен';
        case 'decoration': return isSingle ? 'декор' : 'декораций';
        case 'passage': return isSingle ? 'тех. зону' : 'тех. зон';
        case 'special_zone': return isSingle ? 'спец. зону' : 'спец. зон';
        default: return isSingle ? 'объект' : 'объектов';
      }
    };
    
    return {
      count,
      isSingle,
      predominantType,
      showSeatingFields,
      showSpecialZoneFields,
      typeCounts,
      objectTypeName: getObjectTypeName(predominantType)
    };
  }, [selectedSeats]);

  const [formData, setFormData] = useState<BulkEditData>({
    row: undefined,
    startPlace: 1,
    direction: 'left-to-right',
    objectType: selectionInfo.predominantType,
    zone: zones.find(z => z.isDefault)?.id || zones[0]?.id,
    capacity: undefined
  });

  // Обновляем formData при изменении selectedSeats
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      objectType: selectionInfo.predominantType,
      zone: zones.find(z => z.isDefault)?.id || zones[0]?.id || prev.zone
    }));
  }, [selectedSeats, selectionInfo.predominantType, zones]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Очищаем поля в зависимости от типа объекта
    const cleanedData = { ...formData };
    if (formData.objectType !== 'seat') {
      cleanedData.row = undefined;
      cleanedData.startPlace = undefined;
      cleanedData.direction = undefined;
    }
    if (formData.objectType !== 'special_zone') {
      cleanedData.capacity = undefined;
    }
    
    onApply(cleanedData);
  };

  const handleInputChange = (field: keyof BulkEditData, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // Если изменился тип объекта, очищаем связанные поля
      if (field === 'objectType') {
        if (value !== 'seat') {
          newData.row = undefined;
          newData.startPlace = undefined;
          newData.direction = 'left-to-right';
        }
        if (value !== 'special_zone') {
          newData.capacity = undefined;
        }
      }
      
      return newData;
    });
  };

  // Обработчик для предотвращения закрытия виджета при клике внутри
  const handleWidgetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  // Логика перетаскивания виджета
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [widgetPosition, setWidgetPosition] = useState(position);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Обновляем позицию виджета при изменении position извне
  useEffect(() => {
    setWidgetPosition(position);
    setDragOffset({ x: 0, y: 0 });
  }, [position]);

  // Обработчики для перетаскивания
  const handleMouseDown = (e: React.MouseEvent) => {
    // Проверяем, что клик по заголовку (не по кнопке закрытия)
    if (e.target === e.currentTarget || (e.target as HTMLElement).tagName === 'H3') {
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY
      });
      setDragOffset({ x: 0, y: 0 });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      
      setDragOffset({ x: deltaX, y: deltaY });
      
      // Обновляем позицию для родительского компонента
      const newPosition = {
        x: widgetPosition.x + deltaX,
        y: widgetPosition.y + deltaY
      };
      onPositionChange?.(newPosition);
    }
  };

  const handleMouseUp = () => {
    if (isDragging) {
      // Финализируем позицию
      const finalPosition = {
        x: widgetPosition.x + dragOffset.x,
        y: widgetPosition.y + dragOffset.y
      };
      setWidgetPosition(finalPosition);
      setDragOffset({ x: 0, y: 0 });
      setIsDragging(false);
    }
  };

  // Добавляем глобальные обработчики для перетаскивания
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div 
      className={`bulk-edit-widget ${isDragging ? 'bulk-edit-widget--dragging' : ''}`}
      style={{
        position: 'fixed',
        top: widgetPosition.y,
        left: widgetPosition.x,
        transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
        zIndex: isDragging ? 1001 : 1000
      }}
    >
      <div 
        className="bulk-edit-widget__header" 
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <h3 onClick={(e) => e.stopPropagation()}>
          {selectionInfo.isSingle 
            ? `Редактирование (1 ${selectionInfo.objectTypeName})`
            : `Редактирование (${selectionInfo.count} ${selectionInfo.objectTypeName})`
          }
        </h3>
        <button 
          className="bulk-edit-widget__close"
          onClick={(e) => { e.stopPropagation(); onCancel(); }}
          type="button"
        >
          ×
        </button>
      </div>
      
      {/* Показываем дополнительную информацию для смешанных типов */}
      {Object.keys(selectionInfo.typeCounts).length > 1 && (
        <div className="bulk-edit-widget__info" onClick={(e) => e.stopPropagation()}>
          <small>
            Выбрано: {Object.entries(selectionInfo.typeCounts).map(([type, count]) => {
              const typeName = type === 'seat' ? 'мест' : 
                            type === 'scene' ? 'сцен' : 
                            type === 'decoration' ? 'декораций' : 
                            type === 'passage' ? 'тех. зон' :
                            type === 'special_zone' ? 'спец. зон' : 'объектов';
              return `${count} ${typeName}`;
            }).join(', ')}
          </small>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="bulk-edit-widget__form" onClick={(e) => e.stopPropagation()}>
        <div className="bulk-edit-widget__field">
          <label>Тип объекта:</label>
          <select 
            value={formData.objectType}
            onChange={(e) => handleInputChange('objectType', e.target.value as ObjectType)}
            onClick={(e) => e.stopPropagation()}
          >
            <option value="seat">Место</option>
            <option value="scene">Сцена</option>
            <option value="decoration">Декор</option>
            <option value="passage">Тех. зона</option>
            <option value="special_zone">Спец. зона</option>
          </select>
        </div>

        <div className="bulk-edit-widget__field">
          <label>Зона зала:</label>
          <select 
            value={formData.zone || ''}
            onChange={(e) => handleInputChange('zone', e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            {zones.length === 0 ? (
              <option value="">Нет доступных зон</option>
            ) : (
              zones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                  {zone.isDefault ? ' (по умолчанию)' : ''}
                </option>
              ))
            )}
          </select>
          <small className="bulk-edit-widget__hint">
            Выберите зону для группировки объектов
          </small>
        </div>

        {/* Поля ряда и места показываются только для мест */}
        {formData.objectType === 'seat' && (
          <>
            <div className="bulk-edit-widget__field">
              <label>Номер ряда:</label>
              <input 
                type="number"
                min="1"
                value={formData.row || ''}
                onChange={(e) => handleInputChange('row', e.target.value ? parseInt(e.target.value) : undefined)}
                onClick={(e) => e.stopPropagation()}
                placeholder={selectionInfo.isSingle ? "Не назначать" : "Номер ряда"}
              />
            </div>

            <div className="bulk-edit-widget__field">
              <label>
                {selectionInfo.isSingle ? 'Номер места:' : 'Стартовое место:'}
              </label>
              <input 
                type="number"
                min="1"
                value={formData.startPlace}
                onChange={(e) => handleInputChange('startPlace', parseInt(e.target.value) || 1)}
                onClick={(e) => e.stopPropagation()}
                placeholder={selectionInfo.isSingle ? "Номер места" : "Стартовое место"}
              />
              {!selectionInfo.isSingle && (
                <small className="bulk-edit-widget__hint">
                  Места будут пронумерованы начиная с этого номера
                </small>
              )}
            </div>

            {!selectionInfo.isSingle && (
              <div className="bulk-edit-widget__field">
                <label>Направление:</label>
                <select 
                  value={formData.direction}
                  onChange={(e) => handleInputChange('direction', e.target.value as 'left-to-right' | 'right-to-left')}
                  onClick={(e) => e.stopPropagation()}
                >
                  <option value="left-to-right">Слева направо</option>
                  <option value="right-to-left">Справа налево</option>
                </select>
                <small className="bulk-edit-widget__hint">
                  Направление нумерации мест в ряду
                </small>
              </div>
            )}
          </>
        )}

        {/* Поля для спец. зон */}
        {formData.objectType === 'special_zone' && (
          <div className="bulk-edit-widget__field">
            <label>Количество мест:</label>
            <input 
              type="number"
              min="1"
              value={formData.capacity || ''}
              onChange={(e) => handleInputChange('capacity', e.target.value ? parseInt(e.target.value) : undefined)}
              onClick={(e) => e.stopPropagation()}
              placeholder="Количество мест в зоне"
            />
            <small className="bulk-edit-widget__hint">
              Общее количество мест в спец. зоне
            </small>
          </div>
        )}

        {/* Дополнительная информация для не-мест */}
        {formData.objectType !== 'seat' && formData.objectType !== 'special_zone' && (
          <div className="bulk-edit-widget__note">
            <small>
              {formData.objectType === 'scene' && "Сценам не назначаются ряды и места"}
              {formData.objectType === 'decoration' && "Декорациям не назначаются ряды и места"}
              {formData.objectType === 'passage' && "Техническим зонам не назначаются ряды и места"}
            </small>
          </div>
        )}

        <div className="bulk-edit-widget__actions">
          <button type="submit" className="btn btn--primary" onClick={(e) => e.stopPropagation()}>
            Применить
          </button>
          <button type="button" className="btn btn--secondary" onClick={(e) => { e.stopPropagation(); onClear(); }}>
            Очистить
          </button>
        </div>
      </form>
    </div>
  );
};