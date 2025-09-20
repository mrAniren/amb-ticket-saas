import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { SeatEditorProps, EditorState, SeatStatistics } from '../../types/Editor.types';
import { Seat, BulkEditData, Zone } from '../../types/Seat.types';
import { GroupedSeatmap } from '../base/GroupedSeatmap/GroupedSeatmap';
import { BulkEditWidget } from '../BulkEditWidget/BulkEditWidget';

import { ZoneManager } from '../ZoneManager';
import { generateTempId } from '../../utils/idUtils';
import { enhanceSeatWithSvgData } from '../../utils/svgDataExtractor';


import { clearSeatAssignments } from '../../utils/seatUtils';
import { AutoAssignmentService } from '../../services/AutoAssignmentService';
import { ExportImportService } from '../../services/ExportImportService';
import './SeatEditor.scss';

export const SeatEditor: React.FC<SeatEditorProps> = ({
  svg,
  initialSeats = [],
  initialZones = [],
  initialCurrency = 'RUB',
  onSeatsChange,
  onStatsChange,
  onAvailableSeatsChange,
  onZonesChange,
  onCurrencyChange,
  onExport,
  onSeatUpdate
}) => {
  // Создаем зону "Партер" по умолчанию, если нет начальных зон
  const defaultZone: Zone = {
    id: 'zone-parterre',
    name: 'Партер',
    color: '#F8D013',
    isDefault: true,
    description: 'Основная зона зала'
  };

  const initialZonesWithDefault = initialZones.length > 0 ? initialZones : [defaultZone];
  const defaultCurrentZone = initialZonesWithDefault.find(zone => zone.isDefault)?.id || initialZonesWithDefault[0]?.id;

  const [editorState, setEditorState] = useState<EditorState>({
    mode: 'selection',
    selectedSeats: [],
    tempSeats: new Map(),
    editingEnabled: true,
    zones: initialZonesWithDefault,
    currentZone: defaultCurrentZone
  });

  const [allSeats, setAllSeats] = useState<Seat[]>(initialSeats);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [currency, setCurrency] = useState<string>(initialCurrency);
  const [bulkEditPosition, setBulkEditPosition] = useState({ x: 0, y: 0 });
  
  // Обновляем валюту при изменении initialCurrency
  useEffect(() => {
    if (initialCurrency) {
      setCurrency(initialCurrency);
    }
  }, [initialCurrency]);
  
  // Ref для актуальной версии allSeats в асинхронных операциях
  const allSeatsRef = useRef<Seat[]>(allSeats);
  const editorStateRef = useRef<EditorState>(editorState);
  const scanningInProgress = useRef<boolean>(false);
  const scanCountRef = useRef<number>(0);
  
  // Обновляем ref при изменении allSeats
  useEffect(() => {
    allSeatsRef.current = allSeats;
  }, [allSeats]);

  // Обновляем ref при изменении editorState
  useEffect(() => {
    editorStateRef.current = editorState;
  }, [editorState]);

  // Обновляем все места при изменении initialSeats
  useEffect(() => {
    setAllSeats(initialSeats);
  }, [initialSeats]);

  // Обновляем зоны при изменении initialZones
  useEffect(() => {
    if (initialZones.length > 0) {
      const newCurrentZone = initialZones.find(zone => zone.isDefault)?.id || initialZones[0]?.id;
      setEditorState(prev => ({
        ...prev,
        zones: initialZones,
        currentZone: newCurrentZone
      }));
    }
  }, [initialZones]);

  // (Уведомление о изменениях теперь происходит после определения availableSeats)

  // Автоматическое сканирование SVG элементов при загрузке
  useEffect(() => {
    if (!svg || scanningInProgress.current) return;

    const scanSVGElements = async () => {
      scanningInProgress.current = true;
      scanCountRef.current += 1;
  
      
      // Даем время на загрузку SVG
      setTimeout(() => {
        const svgElement = document.querySelector('.seatmap__svg svg');
        if (!svgElement) return;

        // Ищем все потенциальные элементы мест
        const elements = svgElement.querySelectorAll('circle, path, ellipse, rect, polygon');
        const tempSeats: Seat[] = [];
        const tempSeatsMap = new Map<string, Seat>();

        elements.forEach((element, index) => {
          const svgEl = element as SVGElement;
          const hasId = !!svgEl.id;
          
          // Создаем CSS селектор
          let cssSelector: string;
          if (hasId) {
            cssSelector = `#${svgEl.id}`;
          } else {
            // Используем селектор по тегу и индексу для элементов без ID
            const tagElements = svgElement.querySelectorAll(svgEl.tagName.toLowerCase());
            const elementIndex = Array.from(tagElements).indexOf(svgEl);
            cssSelector = `.seatmap__svg ${svgEl.tagName.toLowerCase()}:nth-of-type(${elementIndex + 1})`;
          }

          // Создаем временное место только если у элемента нет ID или он не в allSeats
          const existingSeat = allSeatsRef.current.find(seat => 
            seat.cssSelector === cssSelector || 
            (hasId && seat.id === svgEl.id)
          );

          if (!existingSeat) {
            // Создаем стабильный ID на основе cssSelector чтобы избежать дублирования
            const stableId = hasId ? svgEl.id : `temp-element-${index}`;
            // console.log(`Creating temp seat: ${stableId}`);
            
            let tempSeat: Seat = {
              id: stableId,
              cssSelector,
              tempId: stableId,
              originalId: svgEl.id || undefined,
              objectType: 'seat'
            };
            
            // Извлекаем SVG данные (позиции, размеры, форму)
            try {
              tempSeat = enhanceSeatWithSvgData(tempSeat, svgEl);
            } catch (error) {
              console.warn('Ошибка извлечения SVG данных для места:', stableId, error);
            }
            
            tempSeats.push(tempSeat);
            tempSeatsMap.set(stableId, tempSeat);
          }
        });

        // ПОЛНОСТЬЮ ЗАМЕНЯЕМ временные места, не объединяем
  
        
        setEditorState(prev => ({
          ...prev,
          tempSeats: tempSeatsMap // ПОЛНАЯ ЗАМЕНА, НЕ ОБЪЕДИНЕНИЕ
        }));
        
        // Сбрасываем флаг сканирования
        scanningInProgress.current = false;
      }, 500); // Задержка для загрузки SVG
    };

    scanSVGElements();
  }, [svg]); // Убираем allSeats из зависимостей чтобы избежать циклов

  // Объединяем все места (включая временные) - строго мемоизированный useMemo
  const availableSeats = useMemo(() => {
    const tempSeatsArray = Array.from(editorState.tempSeats.values());
    const combined = [...allSeats, ...tempSeatsArray];
    // console.log(`availableSeats: ${allSeats.length} permanent + ${tempSeatsArray.length} temp = ${combined.length} total`);
    return combined;
  }, [allSeats, editorState.tempSeats]);

  // Используем useRef для отслеживания последних отправленных данных без состояния
  const lastSentDataRef = useRef({ count: 0, hash: '' });
  
  // Уведомляем о изменениях постоянных мест
  useEffect(() => {
    // КРИТИЧНО: передаем в DemoPage только allSeats (постоянные места), НЕ tempSeats!
    const seatsHash = allSeats.map(s => `${s.id}-${s.objectType}-${s.row}-${s.place}-${s.zone}`).sort().join('|');
    
    // Вызываем onSeatsChange только если количество или содержимое действительно изменилось
    if (allSeats.length !== lastSentDataRef.current.count || seatsHash !== lastSentDataRef.current.hash) {
      // Permanent seats changed
      lastSentDataRef.current = { count: allSeats.length, hash: seatsHash };
      onSeatsChange?.(allSeats); // ПЕРЕДАЕМ ТОЛЬКО ПОСТОЯННЫЕ МЕСТА!
    }
  }, [allSeats]);

  // Отдельно уведомляем о статистике (при изменении любых мест)
  useEffect(() => {
    const stats = {
      total: allSeats.length + editorState.tempSeats.size,
      permanent: allSeats.length,
      temp: editorState.tempSeats.size
    };
    
    // Stats updated
    onStatsChange?.(stats);
  }, [allSeats, editorState.tempSeats]);

  // Уведомляем о всех доступных местах для UI (включая временные)
  useEffect(() => {
    // Sending available seats to ObjectListPanel
    onAvailableSeatsChange?.(availableSeats);
  }, [availableSeats]);

  // Обработка выделения мест
  const handleSeatSelect = useCallback((seats: Seat[]) => {
    setEditorState(prev => ({
      ...prev,
      selectedSeats: seats
    }));
    
    if (seats.length > 0) {
      setShowBulkEdit(true);
      // Позиция виджета в правой части канваса
      const canvasElement = document.querySelector('.seatmap');
      if (canvasElement) {
        const canvasRect = canvasElement.getBoundingClientRect();
        const widgetWidth = 320; // Ширина виджета из CSS
        const margin = 20;
        setBulkEditPosition({ 
          x: canvasRect.right - widgetWidth - margin, 
          y: canvasRect.top + margin 
        });
      } else {
        // Fallback на фиксированную позицию
        setBulkEditPosition({ x: window.innerWidth - 340, y: 20 });
      }
    } else {
      setShowBulkEdit(false);
      
      // Дополнительная очистка классов выделения при полной очистке
      setTimeout(() => {
        const selectoElements = document.querySelectorAll('.selecto-selection, .selecto-drag, .selecto-hover, .seat--drag-preview');
        selectoElements.forEach(element => {
          element.classList.remove('selecto-selection', 'selecto-drag', 'selecto-hover', 'seat--drag-preview');
        });
      }, 100);
    }
  }, []);

  // Применение массовых изменений
  const handleBulkEdit = useCallback((bulkData: BulkEditData) => {
    // Applying bulk edit
    const updatedSeats = AutoAssignmentService.bulkAssign(editorState.selectedSeats, bulkData);
    // Updated seats after bulk edit
    
    // Применяем каждое обновленное место через handleSeatUpdateFromParent
    // чтобы использовать ту же логику перехода temp -> permanent
    updatedSeats.forEach(updatedSeat => {
  
      
      // Применяем обновления через существующую логику
      // updatedSeats уже содержит все изменения от AutoAssignmentService
      const updates: Partial<Seat> = {
        ...(updatedSeat.objectType !== undefined && { objectType: updatedSeat.objectType }),
        ...(updatedSeat.zone !== undefined && { zone: updatedSeat.zone }),
        ...(updatedSeat.row !== undefined && { row: updatedSeat.row }),
        ...(updatedSeat.place !== undefined && { place: updatedSeat.place }),
        ...(updatedSeat.capacity !== undefined && { capacity: updatedSeat.capacity }),
      };
      

      handleSeatUpdateFromParent(updatedSeat.id, updates);
    });

    // Закрываем виджет после применения изменений
    setShowBulkEdit(false);
    // Очищаем выделение после применения изменений
    setEditorState(prev => ({
      ...prev,
      selectedSeats: []
    }));
  }, [editorState.selectedSeats]);

  // Обработка обновления отдельного места из внешнего компонента
  const handleSeatUpdateFromParent = useCallback((seatId: string, updates: Partial<Seat>) => {
    // Проверяем, есть ли место в временных местах
    const currentTempSeats = editorStateRef.current.tempSeats;
    let seatToMove = null;
    
    if (currentTempSeats.has(seatId)) {
      // Место найдено в временных - получаем его и удаляем из временных
      seatToMove = { ...currentTempSeats.get(seatId), ...updates };
      
      // Сначала обновляем временные места
      setEditorState(prev => ({
        ...prev,
        tempSeats: new Map([...prev.tempSeats].filter(([id]) => id !== seatId))
      }));
      
      // Затем добавляем в постоянные места
      setAllSeats(allSeatsPrev => {
        const existingIndex = allSeatsPrev.findIndex(s => s.id === seatId);
        if (existingIndex !== -1) {
          // Обновляем существующее место
          const newSeats = [...allSeatsPrev];
          newSeats[existingIndex] = seatToMove;
          return newSeats;
        } else {
          // Добавляем новое место
          return [...allSeatsPrev, seatToMove];
        }
      });
    } else {
      // Место уже в постоянных - просто обновляем его
      setAllSeats(allSeatsPrev => {
        const newSeats = allSeatsPrev.map(seat =>
          seat.id === seatId ? { ...seat, ...updates } : seat
        );
        return newSeats;
      });
    }
  }, []);

  // Предоставляем обработчик обновления места родительскому компоненту
  useEffect(() => {
    if (onSeatUpdate) {
      onSeatUpdate('__register__', handleSeatUpdateFromParent as any);
    }
  }, [onSeatUpdate, handleSeatUpdateFromParent]);



  // Очистка назначений
  const handleClearAssignments = useCallback(() => {
    const clearedSeats = clearSeatAssignments(editorState.selectedSeats);
    
    // Обновляем места
    setAllSeats(prev => {
      const newSeats = [...prev];
      clearedSeats.forEach(clearedSeat => {
        const index = newSeats.findIndex(s => s.id === clearedSeat.id);
        if (index !== -1) {
          newSeats[index] = clearedSeat;
        }
      });
      return newSeats;
    });

    // Очищаем выделение и закрываем виджет
    setEditorState(prev => ({
      ...prev,
      selectedSeats: [] // Полностью очищаем выделение
    }));
    
    setShowBulkEdit(false);
  }, [editorState.selectedSeats]);

  // Экспорт конфигурации
  const handleExportConfig = useCallback(() => {
    const config = ExportImportService.exportConfiguration(availableSeats);
    onExport?.(config);
  }, [availableSeats, onExport]);

  // Очистка всех назначений
  const handleClearAll = useCallback(() => {
    const clearedSeats = clearSeatAssignments(allSeats);
    setAllSeats(clearedSeats);
    setEditorState(prev => ({
      ...prev,
      selectedSeats: [],
      tempSeats: new Map()
    }));
    setShowBulkEdit(false);
  }, [allSeats]);

  // Функции управления зонами
  const handleZoneCreate = useCallback((zoneData: Omit<Zone, 'id'>) => {
    const newZone: Zone = {
      ...zoneData,
      id: `zone-${Date.now()}`
    };

    setEditorState(prev => {
      const newZones = [...prev.zones, newZone];
      onZonesChange?.(newZones);
      return {
        ...prev,
        zones: newZones
      };
    });
  }, [onZonesChange]);

  const handleZoneUpdate = useCallback((id: string, zoneData: Partial<Zone>) => {
    setEditorState(prev => {
      const newZones = prev.zones.map(zone => 
        zone.id === id ? { ...zone, ...zoneData } : zone
      );
      onZonesChange?.(newZones);
      return {
        ...prev,
        zones: newZones
      };
    });
  }, [onZonesChange]);

  const handleZoneDelete = useCallback((id: string) => {
    setEditorState(prev => {
      const zoneToDelete = prev.zones.find(z => z.id === id);
      if (zoneToDelete?.isDefault) {
        return prev; // Не удаляем зону по умолчанию
      }

      const newZones = prev.zones.filter(zone => zone.id !== id);
      const newCurrentZone = prev.currentZone === id 
        ? newZones.find(z => z.isDefault)?.id || newZones[0]?.id
        : prev.currentZone;

      onZonesChange?.(newZones);
      return {
        ...prev,
        zones: newZones,
        currentZone: newCurrentZone
      };
    });

    // Удаляем зону из всех мест
    setAllSeats(prev => prev.map(seat => 
      seat.zone === id ? { ...seat, zone: undefined } : seat
    ));
  }, [onZonesChange]);

  const handleZoneSelect = useCallback((id: string) => {
    setEditorState(prev => ({
      ...prev,
      currentZone: id
    }));
  }, []);

  // Обработчик изменения валюты
  const handleCurrencyChange = useCallback((newCurrency: string) => {
    setCurrency(newCurrency);
    onCurrencyChange?.(newCurrency);
  }, [onCurrencyChange]);

  return (
    <div className="seat-editor">
      <div className="seat-editor__content">
        <div className="seat-editor__sidebar">
          <ZoneManager
            zones={editorState.zones}
            currentZone={editorState.currentZone}
            currency={currency}
            onZoneCreate={handleZoneCreate}
            onZoneUpdate={handleZoneUpdate}
            onZoneDelete={handleZoneDelete}
            onZoneSelect={handleZoneSelect}
            onCurrencyChange={handleCurrencyChange}
          />
        </div>

        <div className="seat-editor__main">
          <GroupedSeatmap
            availableSeats={availableSeats}
            selectedSeatIds={editorState.selectedSeats.map(s => s.id)}
            svg={svg}
            zones={editorState.zones}
            onSeatSelect={(seats) => handleSeatSelect(seats)}
            onSeatDeselect={(deselectedSeats) => {
              // Убираем только снятые с выделения места
              setEditorState(prev => {
                const newSelectedSeats = prev.selectedSeats.filter(seat => 
                  !deselectedSeats.some(deselected => deselected.id === seat.id)
                );
                
                // Закрываем виджет только если не осталось выделенных мест
                if (newSelectedSeats.length === 0) {
                  setShowBulkEdit(false);
                }
                
                return {
                  ...prev,
                  selectedSeats: newSelectedSeats
                };
              });
            }}
            withDragSelection={editorState.mode === 'selection'}
            withGroupSelection={false}
          />
          
          {showBulkEdit && (
            <BulkEditWidget
              selectedSeats={editorState.selectedSeats}
              zones={editorState.zones}
              position={bulkEditPosition}
              onApply={handleBulkEdit}
              onClear={handleClearAssignments}
              onCancel={() => {
                setShowBulkEdit(false);
                // Очищаем выделение при закрытии виджета
                setEditorState(prev => ({
                  ...prev,
                  selectedSeats: []
                }));
              }}
              onPositionChange={setBulkEditPosition}
            />
          )}
        </div>
      </div>
    </div>
  );
};