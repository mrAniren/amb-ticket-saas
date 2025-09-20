import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePriceScheme } from '../../hooks/usePriceSchemes';
import { apiClient } from '../../services/api';
import { PriceCanvasWithSelection, PriceManager, SeatPriceInlineWidget } from '../../components';
import { InteractionMode, Price } from '../../types/PriceScheme.types';
import { Seat, Zone } from '../../types/Seat.types';
import './PriceSchemeEditPage.scss';

export const PriceSchemeEditPage: React.FC = () => {
  const { priceSchemeId } = useParams<{ priceSchemeId: string }>();
  
  if (!priceSchemeId) {
    return <div>Ошибка: ID распоясовки не найден</div>;
  }
  
  const { logout } = useAuth();
  const { data: priceScheme, loading, error, refetch } = usePriceScheme(priceSchemeId);
  
  
  // Проверяем параметры URL для inline режима
  const urlParams = new URLSearchParams(window.location.search);
  const isInlineMode = urlParams.get('mode') === 'inline';
  const sessionContext = urlParams.get('sessionContext') === 'true';
  const returnTo = urlParams.get('returnTo');
  
  
  const [interactionMode, setInteractionMode] = useState<InteractionMode>(InteractionMode.ZOOM_PAN);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [hallSeats, setHallSeats] = useState<any[]>([]);
  const [hallCurrency, setHallCurrency] = useState<string>('RUB'); // Валюта зала
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  // Инициализируем имя при загрузке распоясовки
  React.useEffect(() => {
    if (priceScheme?.name) {
      setEditedName(priceScheme.name);
    }
  }, [priceScheme?.name]);

  // Загружаем данные зала когда получили распаесовку
  React.useEffect(() => {
    const loadHallData = async () => {
      if (priceScheme?.hallId) {
        try {
          // Проверяем авторизацию
          const token = localStorage.getItem('auth_token');
          
          if (!token) {
            console.error('❌ Пользователь не авторизован - токен отсутствует');
            return;
          }

          const hallData = await apiClient.getHall(priceScheme.hallId);
          
          
          // Сохраняем данные о местах из базы данных
          if ((hallData.hall as any).seats) {
            // Преобразуем данные под ожидаемый интерфейс PriceCanvas
            // ВАЖНО: Все места доступны при создании распоясовки
            const transformedHallSeats = (hallData.hall as any).seats.map((seat: any) => ({
              seatId: seat.id, // id -> seatId
              row: seat.row,
              seatNumber: seat.place, // place -> seatNumber
              section: seat.zone, // zone -> section
              x: seat.x,
              y: seat.y,
              width: seat.width,
              height: seat.height,
              objectType: seat.objectType,
              capacity: seat.capacity, // 🎪 Добавляем capacity для специальных зон
              svgElementId: seat.svgElementId || seat.id,
              svgTagName: seat.svgTagName || 'path',
              svgData: seat.svgData,
              // ВАЖНО: Все места доступны при создании распоясовки
              status: 'available',
              isAvailable: true,
              // Убираем данные, связанные с сессией
              // price: undefined, // Цена будет браться из распоясовки
              // zoneName: undefined, // Название зоны будет браться из zone_config
            }));
            
            
            setHallSeats(transformedHallSeats);
          }
          
          // Парсим конфигурацию мест
          if ((hallData.hall as any).seat_config) {
            try {
              const seatConfig = JSON.parse((hallData.hall as any).seat_config);
              
              // seat_config теперь содержит массив мест напрямую
              const seatsArray = Array.isArray(seatConfig) ? seatConfig : (seatConfig.seats || []);
              
              // ВАЖНО: Все места доступны при создании распоясовки
              const availableSeats = seatsArray.map((seat: any) => ({
                ...seat,
                status: 'available',
                isClickable: true,
                // Убираем данные, связанные с сессией
                // price: undefined, // Цена будет браться из распоясовки
              }));
              
              
              setSeats(availableSeats);
            } catch (error) {
              console.error('Ошибка парсинга seat_config:', error);
            }
          }

          // Парсим конфигурацию зон
          if ((hallData.hall as any).zone_config) {
            try {
              const zoneConfig = JSON.parse((hallData.hall as any).zone_config);
              setZones(zoneConfig.zones || []);
            } catch (error) {
              console.error('Ошибка парсинга zone_config:', error);
            }
          }

          // Загружаем валюту из данных зала
          if (hallData.hall.currency) {
            setHallCurrency(hallData.hall.currency);
          } else {
            // Если валюта не установлена в базе, используем значение по умолчанию
            setHallCurrency('RUB');
          }
        } catch (error) {
          console.error('Ошибка загрузки данных зала:', error);
          if (error instanceof Error && error.message.includes('Access token required')) {
            console.error('❌ Требуется авторизация. Пожалуйста, войдите в систему.');
          }
        }
      }
    };

    loadHallData();
  }, [priceScheme?.id, priceScheme?.hallId]); // Зависимость только от нужных полей

  // Обработчики событий
  const handleSeatClick = (seat: Seat) => {
    const seatId = seat.id as string;
    if (selectedSeats.includes(seatId)) {
      setSelectedSeats(prev => prev.filter(id => id !== seatId));
    } else {
      setSelectedSeats(prev => [...prev, seatId]);
    }
  };

  const handleSeatsSelected = (seatIds: string[]) => {
    setSelectedSeats(seatIds);
  };

  const handleClearSelection = () => {
    setSelectedSeats([]);
  };

  // Обработчики для редактирования имени
  const handleStartEditName = () => {
    setIsEditingName(true);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      alert('Название не может быть пустым');
      return;
    }

    try {
      await apiClient.updatePriceScheme(priceSchemeId, { name: editedName.trim() });
      setIsEditingName(false);
      refetch(); // Перезагружаем данные
    } catch (error) {
      console.error('Ошибка обновления названия:', error);
      alert('Ошибка при обновлении названия');
    }
  };

  const handleCancelEditName = () => {
    setEditedName(priceScheme?.name || '');
    setIsEditingName(false);
  };

  // Обработчики для управления ценами
  const handleAddPrice = async (newPrice: Omit<Price, 'id'>) => {
    try {
      await apiClient.addPrice(priceSchemeId, newPrice);
      refetch(); // Перезагружаем данные распаесовки
    } catch (error) {
      console.error('Ошибка добавления цены:', error);
      alert('Ошибка при добавлении цены');
    }
  };

  const handleUpdatePrice = async (priceId: string, updates: Partial<Price>) => {
    try {
      await apiClient.updatePrice(priceSchemeId, priceId, updates);
      refetch(); // Перезагружаем данные распаесовки
    } catch (error) {
      console.error('Ошибка обновления цены:', error);
      alert('Ошибка при обновлении цены');
    }
  };

  const handleDeletePrice = async (priceId: string) => {
    if (confirm('Вы уверены, что хотите удалить эту цену?')) {
      try {
        await apiClient.deletePrice(priceSchemeId, priceId);
        refetch(); // Перезагружаем данные распаесовки
      } catch (error) {
        console.error('Ошибка удаления цены:', error);
        alert('Ошибка при удалении цены');
      }
    }
  };

  // Обработчики виджета выбора цены
  const handleApplyPrice = async (priceId: string) => {
    try {
      // 🎪 Обрабатываем спец зоны - генерируем виртуальные места
      const expandedSeatIds: string[] = [];
      
      for (const seatId of selectedSeats) {
        // Ищем место в данных зала
        const seat = hallSeats?.find(s => s.seatId === seatId);
        
        if (seat && seat.objectType === 'special_zone') {
          // Для спец зоны генерируем виртуальные места на основе capacity
          const seatData = seats.find(s => s.id === seatId);
          const capacity = seatData?.capacity || 1;
          
          
          // Генерируем ID для виртуальных мест (capacity - 1, так как сам объект = 1 место)
          for (let i = 1; i < capacity; i++) {
            const virtualSeatId = `${seatId}_seat_${i}`;
            expandedSeatIds.push(virtualSeatId);
          }
          
          // ✅ ДОБАВЛЯЕМ сам объект спец зоны (это и есть последнее место)
          expandedSeatIds.push(seatId);
        } else {
          // Обычное место - добавляем как есть
          expandedSeatIds.push(seatId);
        }
      }
      
      
      await apiClient.applyPriceToSeats(priceSchemeId, expandedSeatIds, priceId);
      refetch(); // Перезагружаем данные распаесовки
      setSelectedSeats([]);
    } catch (error) {
      console.error('Ошибка применения цены:', error);
      alert('Ошибка при применении цены');
    }
  };

  const handleRemovePrice = async () => {
    try {
      // 🎪 Обрабатываем спец зоны - генерируем виртуальные места
      const expandedSeatIds: string[] = [];
      
      for (const seatId of selectedSeats) {
        // Ищем место в данных зала
        const seat = hallSeats?.find(s => s.seatId === seatId);
        
        if (seat && seat.objectType === 'special_zone') {
          // Для спец зоны генерируем виртуальные места на основе capacity
          const seatData = seats.find(s => s.id === seatId);
          const capacity = seatData?.capacity || 1;
          
          
          // Генерируем ID для виртуальных мест (capacity - 1, так как сам объект = 1 место)
          for (let i = 1; i < capacity; i++) {
            const virtualSeatId = `${seatId}_seat_${i}`;
            expandedSeatIds.push(virtualSeatId);
          }
          
          // ✅ ДОБАВЛЯЕМ сам объект спец зоны (это и есть последнее место)
          expandedSeatIds.push(seatId);
        } else {
          // Обычное место - добавляем как есть
          expandedSeatIds.push(seatId);
        }
      }
      
      
      // Убираем цены с выделенных мест (передаем пустой priceId)
      await apiClient.applyPriceToSeats(priceSchemeId, expandedSeatIds, '');
      refetch(); // Перезагружаем данные распаесовки
      setSelectedSeats([]);
    } catch (error) {
      console.error('Ошибка удаления цены с мест:', error);
      alert('Ошибка при удалении цены с мест');
    }
  };

  // Функции для inline режима
  const handleApplyAndReturn = () => {

    // Фильтруем только настоящие места (с рядом и местом, не декорации)
    // Убрали алерт для нормального тестирования

    const realSeats = seats.filter(seat => {
      // 🎪 Спец зоны всегда включаем (у них нет row/place, но есть capacity)
      if (seat.objectType === 'special_zone') {
        return seat.capacity && seat.capacity > 0;
      }
      
      // Проверяем row (должен быть числом или строкой числа)
      const hasValidRow = seat.row && 
                         String(seat.row) !== 'undefined' && 
                         String(seat.row) !== 'null' && 
                         !isNaN(Number(seat.row));
      
      // Проверяем место: используем place
      const hasValidSeatNumber = seat.place && 
                                String(seat.place) !== 'undefined' && 
                                String(seat.place) !== 'null' && 
                                String(seat.place) !== '';
      
      // Исключаем декорации и сцену по objectType (ключевое поле!)
      const isNotDecoration = seat.objectType !== 'decoration' && 
                             seat.objectType !== 'scene';
      
      // Исключаем элементы с id='seat'
      const isNotJustSeat = seat.id !== 'seat';
      
      const isRealSeat = hasValidRow && hasValidSeatNumber && isNotDecoration && isNotJustSeat;
      
      // Логируем каждое исключенное место
      if (!isRealSeat && (seat.row || seat.place)) {
      }
      
      return isRealSeat;
    });


    

    if (!priceScheme || !priceScheme.seatPrices || priceScheme.seatPrices.length === 0) {
      alert('Нельзя применить распоясовку без назначенных цен!\n\nВыберите места и назначьте им цены перед применением.');
      return;
    }

    // Проверяем, что у всех НАСТОЯЩИХ мест есть цены
    const realSeatsWithoutPrices = realSeats.filter(seat => {
      // Для спец зон проверяем по основному ID (без _seat_X)
      if (seat.objectType === 'special_zone') {
        // Проверяем, есть ли хотя бы одно виртуальное место с ценой
        const hasAnyVirtualSeatWithPrice = priceScheme.seatPrices.some(sp => 
          sp.seatId.startsWith(seat.id + '_seat_')
        );
        return !hasAnyVirtualSeatWithPrice;
      } else {
        // Для обычных мест проверяем по точному ID
        return !priceScheme.seatPrices.some(sp => sp.seatId === seat.id);
      }
    });


    if (realSeatsWithoutPrices.length > 0) {
      alert(`Нельзя применить распоясовку!\n\nУ ${realSeatsWithoutPrices.length} мест из ${realSeats.length} нет назначенных цен.\n\nВсе места с рядом и номером должны иметь цену.`);
      return;
    }


    // Возвращаемся к созданию сеанса с ID новой распоясовки
    if (returnTo) {
      const returnUrl = new URL(decodeURIComponent(returnTo), window.location.origin);
      returnUrl.searchParams.set('newPriceSchemeId', priceSchemeId);
      window.location.href = returnUrl.toString();
    } else {
      // Fallback если нет returnTo
      window.location.href = `/sessions/create?newPriceSchemeId=${priceSchemeId}`;
    }
  };

  const handleCancelAndReturn = async () => {
    const confirmMessage = 'Отменить создание распоясовки?\n\nВся распоясовка будет удалена без возможности восстановления.';
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      // Удаляем созданную распоясовку
      await apiClient.deletePriceScheme(priceSchemeId);
      
      // Возвращаемся к созданию сеанса
      if (returnTo) {
        window.location.href = decodeURIComponent(returnTo);
      } else {
        // Fallback если нет returnTo
        window.location.href = '/sessions/create';
      }
    } catch (error) {
      console.error('Ошибка удаления распоясовки:', error);
      alert('Ошибка при удалении распоясовки');
    }
  };

  if (loading) {
    return (
      <div className="price-scheme-edit-page">
        <div className="price-scheme-edit-page__loading">Загрузка распаесовки...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="price-scheme-edit-page">
        <div className="price-scheme-edit-page__error">
          Ошибка загрузки: {error}
          <button className="btn btn--primary">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="price-scheme-edit-page">
      <header className="price-scheme-edit-page__header">
        <div className="price-scheme-edit-page__title">
          <img src="/logo-black.png" alt="Логотип" className="price-scheme-edit-page__logo" />
          <div>
            <h1>{isInlineMode ? 'Настройка распоясовки для сеанса' : 'Редактирование распоясовки'}</h1>
            <p>{isInlineMode ? 'Назначьте цены местам и примените для создания сеанса' : `ID: ${priceSchemeId}`}</p>
          </div>
        </div>
        
        <div className="price-scheme-edit-page__controls">
          {isInlineMode && sessionContext ? (
            <>
              <button 
                onClick={() => {
                  try {
                    handleApplyAndReturn();
                  } catch (error) {
                    console.error('❌ Ошибка в handleApplyAndReturn:', error);
                  }
                }}
                className="btn btn--success"
                title="Применить распоясовку и вернуться к созданию сеанса"
              >
                ✅ Применить
              </button>
              
              <button 
                onClick={handleCancelAndReturn}
                className="btn btn--outline-danger"
                title="Отменить создание распоясовки и вернуться"
              >
                ❌ Отмена
              </button>
            </>
          ) : (
            <button 
              onClick={() => window.location.href = '/price-schemes'}
              className="btn btn--secondary"
            >
              ← К распоясовкам
            </button>
          )}
          
        </div>
      </header>

      <main className="price-scheme-edit-page__content">
        {/* Информация о распаесовке */}
        <div className="price-scheme-edit-page__info">
          <div className="price-scheme-edit-page__title-section">
            {isEditingName ? (
              <div className="price-scheme-edit-page__name-edit">
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="price-scheme-edit-page__name-input"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSaveName();
                    } else if (e.key === 'Escape') {
                      handleCancelEditName();
                    }
                  }}
                />
                <div className="price-scheme-edit-page__name-actions">
                  <button 
                    onClick={handleSaveName}
                    className="btn btn--success btn--sm"
                    title="Сохранить"
                  >
                    ✓
                  </button>
                  <button 
                    onClick={handleCancelEditName}
                    className="btn btn--outline btn--sm"
                    title="Отменить"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="price-scheme-edit-page__name-display">
                <h2>{priceScheme?.name}</h2>
                <button 
                  onClick={handleStartEditName}
                  className="btn btn--outline btn--sm"
                  title="Редактировать название"
                >
                  ✏️
                </button>
              </div>
            )}
            <p>Зал: {priceScheme?.hallName}</p>
            {selectedSeats.length > 0 && (
              <div className="price-scheme-edit-page__selection-info">
                Выбрано мест: {selectedSeats.length}
                <button onClick={handleClearSelection} className="btn btn--outline btn--sm">
                  Очистить выделение
                </button>
              </div>
            )}
            
            {/* Inline виджет выбора цены */}
            <SeatPriceInlineWidget
              selectedSeats={selectedSeats}
              prices={priceScheme?.prices || []}
              onApplyPrice={handleApplyPrice}
              onRemovePrice={handleRemovePrice}
            />
          </div>
        </div>

        {/* Канбан */}
        <div className="price-scheme-edit-page__canvas-container">
          {seats.length > 0 ? (
            <PriceCanvasWithSelection
              seats={seats}
              zones={zones}
              width={900}
              height={600}
              interactionMode={interactionMode}
              selectedSeats={selectedSeats}
              onSeatClick={handleSeatClick}
              onSeatsSelected={handleSeatsSelected}
              onModeChange={setInteractionMode}
              seatPrices={priceScheme?.seatPrices || []}
              prices={priceScheme?.prices || []}
              hallSeats={hallSeats}
            />
          ) : (
            <div className="price-scheme-edit-page__canvas-placeholder">
              <p>Загрузка схемы зала...</p>
              {priceScheme && !seats.length && (
                <p>В зале "{priceScheme.hallName}" пока нет настроенных мест.</p>
              )}
            </div>
          )}
        </div>

        {/* Управление ценами */}
        <div className="price-scheme-edit-page__price-manager">
          <PriceManager
            prices={priceScheme?.prices || []}
            seatPrices={priceScheme?.seatPrices || []}
            onAddPrice={handleAddPrice}
            onUpdatePrice={handleUpdatePrice}
            onDeletePrice={handleDeletePrice}
            hallCurrency={hallCurrency}
          />
        </div>
      </main>


    </div>
  );
};