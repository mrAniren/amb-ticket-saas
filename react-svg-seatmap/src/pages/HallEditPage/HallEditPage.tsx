import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useHall } from '../../hooks/useApi';
import { useFileUpload } from '../../hooks/useFileUpload';
import { apiClient } from '../../services/api';
import { SeatEditor } from '../../components/SeatEditor';
import { ObjectListPanel } from '../../components/ObjectListPanel';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { Seat, Zone } from '../../types/Seat.types';
import { ExportConfig, SeatStatistics } from '../../types/Editor.types';
import { Hall } from '../../types/api.types';
import './HallEditPage.scss';

export const HallEditPage: React.FC = () => {
  const { hallId } = useParams<{ hallId: string }>();
  
  if (!hallId) {
    return <div>Ошибка: ID зала не найден</div>;
  }
  const { data: hallData, loading, error, refetch } = useHall(hallId);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [availableSeats, setAvailableSeats] = useState<Seat[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [seatStats, setSeatStats] = useState<SeatStatistics>({ total: 0, permanent: 0, temp: 0 });
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [svgUrl, setSvgUrl] = useState<string>('');
  const [objectListPanel, setObjectListPanel] = useState<{
    isOpen: boolean;
    mode: 'processed' | 'unprocessed';
  }>({ isOpen: false, mode: 'processed' });
  const [currency, setCurrency] = useState<string>('RUB'); // Валюта зала
  
  const { uploadHallSvg } = useFileUpload();

  const hall = hallData?.hall;

  // Загружаем данные зала при монтировании
  useEffect(() => {
    if (hall) {
      // Устанавливаем SVG URL только если он есть (проверяем оба поля для совместимости)
      const svgPath = hall.svg_url || hall.svg_file;
      if (svgPath) {
        const fullSvgUrl = apiClient.getResourceUrl(svgPath);
        setSvgUrl(fullSvgUrl);
      } else {
        setSvgUrl(''); // Очищаем URL если SVG файл не найден
      }

      // Загружаем места из конфигурации зала
      if (hall.seat_config) {
        try {
          const seatConfig = JSON.parse(hall.seat_config);
          setSeats(seatConfig.seats || []);
        } catch (error) {
          console.error('Ошибка парсинга конфигурации мест:', error);
        }
      }

      // Загружаем зоны из конфигурации зала
      if (hall.zone_config) {
        try {
          const zoneConfig = JSON.parse(hall.zone_config);
          setZones(zoneConfig.zones || []);
        } catch (error) {
          console.error('Ошибка парсинга конфигурации зон:', error);
        }
      }

      // Загружаем валюту зала
      if (hall.currency && hall.currency.trim() !== '') {
        setCurrency(hall.currency);
      } else {
        // Если валюта не установлена в базе, используем значение по умолчанию
        setCurrency('RUB');
      }

      // Если зон нет, создаем зону по умолчанию
      if (!hall.zone_config || zones.length === 0) {
        const defaultZone: Zone = {
          id: 'zone-parterre',
          name: 'Партер',
          color: '#F8D013',
          isDefault: true,
          description: 'Основная зона зала'
        };
        setZones([defaultZone]);
      }
    }
  }, [hall]);

  const handleSeatsChange = useCallback((newSeats: Seat[]) => {
    setSeats(newSeats);
  }, []);

  const handleStatsChange = useCallback((stats: SeatStatistics) => {
    setSeatStats(stats);
  }, []);

  const handleAvailableSeatsChange = useCallback((newAvailableSeats: Seat[]) => {
    setAvailableSeats(newAvailableSeats);
  }, []);

  // Вычисляем статистику для нижней панели
  const statistics = useMemo(() => {
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

    const processed = availableSeats.filter(isProcessed).length;
    const total = availableSeats.length;
    const unprocessed = total - processed;

    return { total, processed, unprocessed };
  }, [availableSeats]);

  // Обработчики для панели статистики
  const handleOpenObjectList = useCallback((mode: 'processed' | 'unprocessed') => {
    setObjectListPanel({ isOpen: true, mode });
  }, []);

  const handleCloseObjectList = useCallback(() => {
    setObjectListPanel(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Ссылка на функцию обновления места в SeatEditor
  const [seatEditorUpdateFn, setSeatEditorUpdateFn] = useState<((seatId: string, updates: Partial<Seat>) => void) | null>(null);

  // Обработчик обновления места из ObjectListPanel
  const handleSeatUpdate = useCallback((seatId: string, updates: Partial<Seat> | ((seatId: string, updates: Partial<Seat>) => void)) => {
    // Специальная регистрация функции обновления из SeatEditor
    if (seatId === '__register__') {
      setSeatEditorUpdateFn(() => updates as any);
      return;
    }
    
    // Обновляем через SeatEditor если функция доступна
    if (seatEditorUpdateFn) {
      seatEditorUpdateFn(seatId, updates as Partial<Seat>);
    } else {
      // Fallback - обновляем локально
      setSeats(prev => {
        const newSeats = prev.map(seat =>
          seat.id === seatId ? { ...seat, ...updates as Partial<Seat> } : seat
        );
        return newSeats;
      });

      setAvailableSeats(prev => {
        const newSeats = prev.map(seat =>
          seat.id === seatId ? { ...seat, ...updates as Partial<Seat> } : seat
        );
        return newSeats;
      });
    }
  }, [seatEditorUpdateFn]);

  const handleZonesChange = useCallback((newZones: Zone[]) => {
    setZones(newZones);
  }, []);

  const handleCurrencyChange = useCallback((newCurrency: string) => {
    setCurrency(newCurrency);
  }, []);

  const handleSvgUpload = useCallback(async (file: File) => {
    if (!hall) return;

    try {
      const result = await uploadHallSvg(hall.id, file);
      
      if (result) {
        setSvgUrl(result.svg_url || `/uploads/svg/${file.name}`);
        // Обновляем данные зала
        refetch();
      }
    } catch (error) {
      console.error('Ошибка загрузки SVG:', error);
      alert('Ошибка при загрузке SVG файла');
    }
  }, [hall, uploadHallSvg, refetch]);

  const handleSave = async () => {
    if (!hall) return;

    // Проверяем есть ли что сохранять
    if (availableSeats.length === 0) {
      alert('Нет мест для сохранения. Сначала загрузите и обработайте SVG файл.');
      return;
    }

    setSaving(true);
    try {
      // Фильтруем только обработанные элементы для сохранения
      const configuredSeats = availableSeats.filter(seat => {
        // Сохраняем места с полной информацией
        if (seat.objectType === 'seat') {
          return seat.row && seat.place && seat.zone;
        }
        // Сохраняем спец. зоны с полной информацией
        if (seat.objectType === 'special_zone') {
          return seat.zone && seat.capacity && seat.capacity > 0;
        }
        // Сохраняем известные типы объектов (сцена, декорации и т.д.)
        return ['scene', 'decoration', 'passage', 'technical_zone'].includes(seat.objectType);
      });
      
      // ПОЛНАЯ ПЕРЕЗАПИСЬ: заменяем старые данные только обработанными элементами
      const seatConfig = {
        seats: configuredSeats, // Сохраняем ТОЛЬКО обработанные элементы!
        statistics: {
          ...seatStats,
          totalConfigured: configuredSeats.length,
          totalAvailable: availableSeats.length,
          configuredSeats: configuredSeats.filter(s => s.objectType === 'seat').length,
          specialZones: configuredSeats.filter(s => s.objectType === 'special_zone').length,
          nonSeatObjects: configuredSeats.filter(s => 
            ['scene', 'decoration', 'passage', 'technical_zone'].includes(s.objectType)
          ).length
        },
        lastUpdated: new Date().toISOString()
      };
      

      const zoneConfig = {
        zones: zones,
        lastUpdated: new Date().toISOString()
      };



      // Обновляем зал через API с новой вместимостью
      const validSeats = configuredSeats.filter(seat => seat.objectType === 'seat');
      const specialZones = configuredSeats.filter(seat => seat.objectType === 'special_zone');
      
      // Подсчитываем общую вместимость: места + спец. зоны
      const totalCapacity = validSeats.length + 
        specialZones.reduce((sum, zone) => sum + (zone.capacity || 0), 0);
      
      const updateData = {
        seat_config: JSON.stringify(seatConfig),
        zone_config: JSON.stringify(zoneConfig),
        capacity: totalCapacity, // Используем общую вместимость
        currency: currency // Добавляем валюту
      };
      
      
      await apiClient.updateHallConfig(hall.id, updateData);

      setLastSaved(new Date());
      alert('Зал сохранен успешно!');
    } catch (error) {
      console.error('❌ Ошибка сохранения конфигурации зала:', error);
      alert('Ошибка при сохранении конфигурации зала');
    } finally {
      setSaving(false);
    }
  };

  const handleExport = (config: ExportConfig) => {
    // Можно добавить дополнительную логику экспорта
  };

  const handleBackToList = () => {
    window.location.href = '/halls';
  };

  if (loading) {
    return (
      <div className="hall-edit-page">
        <div className="hall-edit-page__loading">
          <div className="loading-spinner"></div>
          <p>Загрузка зала...</p>
        </div>
      </div>
    );
  }

  if (error || !hall) {
    return (
      <div className="hall-edit-page">
        <div className="hall-edit-page__error">
          <h2>Ошибка загрузки зала</h2>
          <p>{error || 'Зал не найден'}</p>
          <div className="hall-edit-page__error-actions">
            <button onClick={refetch} className="btn btn--primary">
              Попробовать снова
            </button>
            <button onClick={handleBackToList} className="btn btn--secondary">
              Вернуться к списку
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hall-edit-page">
      <header className="hall-edit-page__header">
        <div className="hall-edit-page__title">
          <img src="/logo-black.png" alt="Логотип" className="hall-edit-page__logo" />
          <div>
            <h1>Редактирование зала: {hall.name}</h1>
            <p>{hall.city} • {seatStats.total} мест</p>
          </div>
        </div>
        
        <div className="hall-edit-page__controls">
          <div className="hall-edit-page__save-info">
            {lastSaved && (
              <span className="hall-edit-page__last-saved">
                Сохранено: {lastSaved.toLocaleTimeString()}
              </span>
            )}

          </div>

          <button 
            onClick={handleSave}
            disabled={saving}
            className="btn btn--primary"
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          
          <button 
            onClick={handleBackToList}
            className="btn btn--secondary"
          >
            ← К списку залов
          </button>
        </div>
      </header>

      <main className="hall-edit-page__content">
        <div className="hall-edit-page__editor">
          {svgUrl ? (
            <ErrorBoundary>
              <SeatEditor
                svg={svgUrl}
                initialSeats={seats}
                initialZones={zones}
                initialCurrency={hall.currency || 'RUB'}
                onSeatsChange={handleSeatsChange}
                onStatsChange={handleStatsChange}
                onAvailableSeatsChange={handleAvailableSeatsChange}
                onZonesChange={handleZonesChange}
                onCurrencyChange={handleCurrencyChange}
                onExport={handleExport}
                onSeatUpdate={handleSeatUpdate}
              />
            </ErrorBoundary>
          ) : hall ? (
            <div className="hall-edit-page__error">
              <div className="error-icon">⚠️</div>
              <h3>SVG файл схемы зала не найден</h3>
              <p>Для этого зала не загружен SVG файл схемы. Без схемы невозможно редактировать места.</p>
              <div className="error-actions">
                <button 
                  onClick={() => window.location.href = `/halls/${hallId}/details`}
                  className="btn btn--primary"
                >
                  Загрузить SVG файл
                </button>
                <button 
                  onClick={() => window.location.href = '/halls'}
                  className="btn btn--secondary"
                >
                  ← К списку залов
                </button>
              </div>
            </div>
          ) : (
            <div className="hall-edit-page__loading">
              <div className="loading-spinner"></div>
              <p>Загрузка данных зала...</p>
            </div>
          )}
        </div>
      </main>

      {/* Нижняя панель статистики */}
      <footer className="hall-edit-page__footer">
        <div className="hall-edit-page__stats">
          <span className="hall-edit-page__stat">
            Всего объектов: {statistics.total}
          </span>
          <span 
            className="hall-edit-page__stat hall-edit-page__stat--clickable"
            onClick={() => handleOpenObjectList('processed')}
            title="Нажмите для просмотра списка"
          >
            Обработано: {statistics.processed}
          </span>
          <span 
            className="hall-edit-page__stat hall-edit-page__stat--clickable"
            onClick={() => handleOpenObjectList('unprocessed')}
            title="Нажмите для просмотра списка"
          >
            Осталось: {statistics.unprocessed}
          </span>
        </div>
      </footer>

      {/* Панель списка объектов */}
      <ObjectListPanel
        seats={availableSeats}
        zones={zones}
        isOpen={objectListPanel.isOpen}
        mode={objectListPanel.mode}
        onClose={handleCloseObjectList}
        onSeatUpdate={handleSeatUpdate}
      />
    </div>
  );
};