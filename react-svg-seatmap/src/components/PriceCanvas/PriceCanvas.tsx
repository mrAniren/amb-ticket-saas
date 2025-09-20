import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Seat, Zone } from '../../types/Seat.types';
import { InteractionMode } from '../../types/PriceScheme.types';
import SpecialZoneSelector from '../SpecialZoneSelector/SpecialZoneSelector';
import './PriceCanvas.scss';

interface PriceCanvasProps {
  seats: Seat[];
  zones: Zone[];
  width?: number;
  height?: number;
  interactionMode?: InteractionMode;
  selectedSeats?: string[];
  onSeatClick?: (seat: Seat) => void;
  onSeatsSelected?: (seatIds: string[]) => void;
  onModeChange?: (mode: InteractionMode) => void;
  // Цены для раскраски мест
  seatPrices?: { 
    seatId: string; 
    priceId: string; 
    row?: number; 
    seatNumber?: number; 
    section?: string; 
  }[];
  prices?: { id: string; color: string; name: string; value: number; currency: string }[];
  // Данные мест из базы данных
  hallSeats?: {
    seatId: string;
    row: number;
    seatNumber: number;
    section: string;
    zoneName?: string; // Название зоны из билета
    price?: number; // Цена билета
    x: number;
    y: number;
    width: number;
    height: number;
    objectType: string;
    capacity?: number; // Количество мест для специальных зон
        // svgData больше не используется (легаси код)
  }[];
  // Виртуальные билеты для подсчета доступных мест
  virtualTickets?: {
    seatId: string;
    status: string;
    objectType: string;
    [key: string]: any;
  }[];
}

interface CanvasSeat extends Seat {
  x: number;
  y: number;
  width: number;
  height: number;
  section?: string; // Добавляем section
}

export const PriceCanvas: React.FC<PriceCanvasProps> = ({
  seats,
  zones = [], // Используем зоны из zone_config
  width = 1920,
  height = 1080,
  interactionMode = InteractionMode.ZOOM_PAN,
  selectedSeats = [],
  onSeatClick,
  onSeatsSelected,
  onModeChange,
  seatPrices = [],
  prices = [],
  hallSeats = [],
  virtualTickets = []
}) => {
  
  // Логируем только специальные зоны для отладки
  const specialZones = hallSeats.filter((hs: any) => hs.objectType === 'special_zone');
  if (specialZones.length > 0) {
    console.log('🎪 Специальные зоны найдены:', {
      count: specialZones.length,
      firstSpecialZone: specialZones[0],
      allSpecialZones: specialZones.map(sz => ({ id: sz.seatId, section: sz.section, objectType: sz.objectType }))
    });
  }
  
  // Логируем виртуальные билеты
  console.log('🎫 Виртуальные билеты в PriceCanvas:', {
    totalVirtualTickets: virtualTickets.length,
    sampleVirtualTickets: virtualTickets.slice(0, 3).map((vt: any) => ({
      seatId: vt.seatId,
      status: vt.status,
      objectType: vt.objectType
    }))
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSeats, setCanvasSeats] = useState<CanvasSeat[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({ visible: false, x: 0, y: 0, content: '' });

  // // Логируем данные при инициализации
  // React.useEffect(() => {
  //   console.log('🎨 PriceCanvas данные:', {
  //     hallSeatsType: Array.isArray(hallSeats) ? 'array' : typeof hallSeats,
  //     hallSeatsCount: Array.isArray(hallSeats) ? hallSeats.length : 0,
  //     seatPricesCount: seatPrices.length,
  //     pricesCount: prices.length,
  //     sampleHallSeat: Array.isArray(hallSeats) && hallSeats.length > 0 ? hallSeats[0] : null,
  //     sampleSeatPrice: seatPrices.length > 0 ? seatPrices[0] : null
  //   });
  // }, [hallSeats, seatPrices, prices]);
  
  // State для зума и панорамирования
  const [transform, setTransform] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });

  // State для анимации возвращения
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationTarget, setAnimationTarget] = useState<{offsetX: number, offsetY: number} | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // State для выделения рамкой
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  
  // State для выбранных мест
  const [localSelectedSeats, setLocalSelectedSeats] = useState<string[]>([]);
  
  // State для фильтра цен - изначально все цены выбраны
  const [selectedPriceFilters, setSelectedPriceFilters] = useState<number[]>([]);

  // State для адаптивного размера канваса
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  
  // Состояние для селектора специальной зоны
  const [specialZoneSelector, setSpecialZoneSelector] = useState<{
    isVisible: boolean;
    position: { x: number; y: number };
    zoneName: string;
    capacity: number;
    price: number;
    currency: string;
    seatId: string;
  } | null>(null);
  
  // Синхронизируем с внешним состоянием selectedSeats
  useEffect(() => {
    setLocalSelectedSeats(selectedSeats);
  }, [selectedSeats]);

  // Получаем уникальные цены из данных
  const availablePrices = useMemo(() => {
    const priceSet = new Set<number>();
    
    // Добавляем цены из hallSeats
    hallSeats.forEach(seat => {
      if (seat.price && seat.price > 0) {
        priceSet.add(seat.price);
      }
    });
    
    // Добавляем цены из seats
    seats.forEach(seat => {
      if (seat.price && seat.price > 0) {
        priceSet.add(seat.price);
      }
    });
    
    // Добавляем цены из seatPrices (через priceId)
    seatPrices.forEach(seatPrice => {
      const priceObj = prices.find(p => p.id === seatPrice.priceId);
      if (priceObj && priceObj.value > 0) {
        priceSet.add(priceObj.value);
      }
    });
    
    return Array.from(priceSet).sort((a, b) => a - b);
  }, [hallSeats, seats, seatPrices, prices]);

  // Инициализируем все цены как выбранные
  useEffect(() => {
    if (availablePrices.length > 0 && selectedPriceFilters.length === 0) {
      setSelectedPriceFilters([...availablePrices]);
    }
  }, [availablePrices, selectedPriceFilters.length]);

  // Вычисляем оптимальный размер канваса
  useEffect(() => {
    const calculateCanvasSize = () => {
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Базовое разрешение 1920x1080
      const baseWidth = 1920;
      const baseHeight = 1080;
      
      // Используем всю ширину экрана
      const maxWidth = screenWidth;
      const maxHeight = screenHeight * 0.9;
      
      // Вычисляем масштаб
      const scaleX = maxWidth / baseWidth;
      const scaleY = maxHeight / baseHeight;
      const scale = Math.min(scaleX, scaleY);
      
      const newWidth = Math.floor(baseWidth * scale);
      const newHeight = Math.floor(baseHeight * scale);
      
      setCanvasSize({ width: newWidth, height: newHeight });
    };

    calculateCanvasSize();
    window.addEventListener('resize', calculateCanvasSize);
    
    return () => window.removeEventListener('resize', calculateCanvasSize);
  }, []);

  // Функция для получения цвета цены (соответствует цветам мест на схеме)
  const getPriceColor = useCallback((price: number): string => {
    const colors = [
      '#2ECC71', // Изумрудно-зеленый (0-100)
      '#3498DB', // Синий (100-200)
      '#9B59B6', // Фиолетовый (200-300)
      '#E67E22', // Оранжевый (300-400)
      '#E74C3C', // Красный (400-500)
      '#F39C12', // Янтарный (500-600)
      '#1ABC9C', // Бирюзовый (600-700)
      '#34495E', // Темно-серый (700-800)
      '#E91E63', // Розовый (800-900)
      '#795548', // Коричневый (900-1000)
      '#607D8B', // Сине-серый (1000-1100)
      '#FF5722', // Глубокий оранжевый (1100-1200)
      '#3F51B5', // Индиго (1200-1300)
      '#009688', // Теал (1300-1400)
      '#FF9800', // Янтарный (1400-1500)
      '#4CAF50', // Зеленый (1500-1600)
      '#2196F3', // Синий (1600-1700)
      '#9C27B0', // Фиолетовый (1700-1800)
      '#FFC107', // Желтый (1800-1900)
      '#F44336', // Красный (1900-2000)
      '#8BC34A', // Светло-зеленый (2000-2100)
      '#00BCD4', // Циан (2100-2200)
      '#FFEB3B', // Ярко-желтый (2200-2300)
      '#FF9800', // Оранжевый (2300-2400)
      '#673AB7', // Глубокий фиолетовый (2400-2500)
      '#CDDC39', // Лайм (2500-2600)
      '#FF5722', // Глубокий оранжевый (2600-2700)
      '#795548', // Коричневый (2700-2800)
      '#607D8B', // Сине-серый (2800-2900)
      '#E91E63', // Розовый (2900-3000)
      '#3F51B5', // Индиго (3000-3100)
      '#009688', // Теал (3100-3200)
      '#FFC107', // Янтарный (3200-3300)
      '#4CAF50', // Зеленый (3300-3400)
      '#2196F3', // Синий (3400-3500)
      '#9C27B0', // Фиолетовый (3500-3600)
      '#FF9800', // Оранжевый (3600-3700)
      '#F44336', // Красный (3700-3800)
      '#2ECC71', // Изумрудно-зеленый (3800-3900)
      '#3498DB', // Синий (3900-4000)
      '#9B59B6', // Фиолетовый (4000-4100)
      '#E67E22', // Оранжевый (4100-4200)
      '#E74C3C', // Красный (4200-4300)
      '#F39C12', // Янтарный (4300-4400)
      '#1ABC9C', // Бирюзовый (4400-4500)
      '#34495E', // Темно-серый (4500-4600)
      '#E91E63', // Розовый (4600-4700)
      '#795548', // Коричневый (4700-4800)
      '#607D8B', // Сине-серый (4800-4900)
      '#FF5722', // Глубокий оранжевый (4900-5000)
      '#3F51B5', // Индиго (5000-5100)
      '#009688', // Теал (5100-5200)
      '#FF9800', // Янтарный (5200-5300)
      '#4CAF50', // Зеленый (5300-5400)
      '#2196F3', // Синий (5400-5500)
      '#9C27B0', // Фиолетовый (5500-5600)
      '#FFC107', // Желтый (5600-5700)
      '#F44336', // Красный (5700-5800)
      '#8BC34A', // Светло-зеленый (5800-5900)
      '#00BCD4', // Циан (5900-6000)
      '#FFEB3B', // Ярко-желтый (6000-6100)
      '#FF9800', // Оранжевый (6100-6200)
      '#673AB7', // Глубокий фиолетовый (6200-6300)
      '#CDDC39', // Лайм (6300-6400)
      '#FF5722', // Глубокий оранжевый (6400-6500)
      '#795548', // Коричневый (6500-6600)
      '#607D8B', // Сине-серый (6600-6700)
      '#E91E63', // Розовый (6700-6800)
      '#3F51B5', // Индиго (6800-6900)
      '#009688', // Теал (6900-7000)
      '#FFC107', // Янтарный (7000-7100)
      '#4CAF50', // Зеленый (7100-7200)
      '#2196F3', // Синий (7200-7300)
      '#9C27B0', // Фиолетовый (7300-7400)
      '#FF9800', // Оранжевый (7400-7500)
      '#F44336', // Красный (7500-7600)
      '#2ECC71', // Изумрудно-зеленый (7600-7700)
      '#3498DB', // Синий (7700-7800)
      '#9B59B6', // Фиолетовый (7800-7900)
      '#E67E22', // Оранжевый (7900-8000)
      '#E74C3C', // Красный (8000-8100)
      '#F39C12', // Янтарный (8100-8200)
      '#1ABC9C', // Бирюзовый (8200-8300)
      '#34495E', // Темно-серый (8300-8400)
      '#E91E63', // Розовый (8400-8500)
      '#795548', // Коричневый (8500-8600)
      '#607D8B', // Сине-серый (8600-8700)
      '#FF5722', // Глубокий оранжевый (8700-8800)
      '#3F51B5', // Индиго (8800-8900)
      '#009688', // Теал (8900-9000)
      '#FF9800', // Янтарный (9000-9100)
      '#4CAF50', // Зеленый (9100-9200)
      '#2196F3', // Синий (9200-9300)
      '#9C27B0', // Фиолетовый (9300-9400)
      '#FFC107', // Желтый (9400-9500)
      '#F44336', // Красный (9500-9600)
      '#8BC34A', // Светло-зеленый (9600-9700)
      '#00BCD4', // Циан (9700-9800)
      '#FFEB3B', // Ярко-желтый (9800-9900)
      '#FF9800', // Оранжевый (9900-10000)
      '#673AB7', // Глубокий фиолетовый (10000-10100)
      '#CDDC39', // Лайм (10100-10200)
      '#FF5722', // Глубокий оранжевый (10200-10300)
      '#795548', // Коричневый (10300-10400)
      '#607D8B', // Сине-серый (10400-10500)
      '#E91E63', // Розовый (10500-10600)
      '#3F51B5', // Индиго (10600-10700)
      '#009688', // Теал (10700-10800)
      '#FFC107', // Янтарный (10800-10900)
      '#4CAF50', // Зеленый (10900-11000)
      '#2196F3', // Синий (11000-11100)
      '#9C27B0', // Фиолетовый (11100-11200)
      '#FF9800', // Оранжевый (11200-11300)
      '#F44336', // Красный (11300-11400)
      '#2ECC71', // Изумрудно-зеленый (11400-11500)
      '#3498DB', // Синий (11500-11600)
      '#9B59B6', // Фиолетовый (11600-11700)
      '#E67E22', // Оранжевый (11700-11800)
      '#E74C3C', // Красный (11800-11900)
      '#F39C12', // Янтарный (11900-12000)
      '#1ABC9C', // Бирюзовый (12000-12100)
      '#34495E', // Темно-серый (12100-12200)
      '#E91E63', // Розовый (12200-12300)
      '#795548', // Коричневый (12300-12400)
      '#607D8B', // Сине-серый (12400-12500)
      '#FF5722', // Глубокий оранжевый (12500-12600)
      '#3F51B5', // Индиго (12600-12700)
      '#009688', // Теал (12700-12800)
      '#FF9800', // Янтарный (12800-12900)
      '#4CAF50', // Зеленый (12900-13000)
      '#2196F3', // Синий (13000-13100)
      '#9C27B0', // Фиолетовый (13100-13200)
      '#FFC107', // Желтый (13200-13300)
      '#F44336', // Красный (13300-13400)
      '#8BC34A', // Светло-зеленый (13400-13500)
      '#00BCD4', // Циан (13500-13600)
      '#FFEB3B', // Ярко-желтый (13600-13700)
      '#FF9800', // Оранжевый (13700-13800)
      '#673AB7', // Глубокий фиолетовый (13800-13900)
      '#CDDC39', // Лайм (13900-14000)
      '#FF5722', // Глубокий оранжевый (14000-14100)
      '#795548', // Коричневый (14100-14200)
      '#607D8B', // Сине-серый (14200-14300)
      '#E91E63', // Розовый (14300-14400)
      '#3F51B5', // Индиго (14400-14500)
      '#009688', // Теал (14500-14600)
      '#FFC107', // Янтарный (14600-14700)
      '#4CAF50', // Зеленый (14700-14800)
      '#2196F3', // Синий (14800-14900)
      '#9C27B0', // Фиолетовый (14900-15000)
    ];
    
    const priceIndex = Math.floor(price / 100);
    return colors[priceIndex] || '#95A5A6'; // Серый по умолчанию
  }, []);

  // Функция для проверки, активно ли место (кликабельно и не серое)
  const isSeatActive = useCallback((seat: any): boolean => {
    // Забронированные, купленные и заблокированные места неактивны
    if (seat.status === 'reserved' || seat.status === 'sold' || seat.status === 'locked') {
      return false;
    }
    
    if (selectedPriceFilters.length === 0) return true;
    
    // Проверяем цену места
    const seatPrice = seat.price || 0;
    return selectedPriceFilters.includes(seatPrice);
  }, [selectedPriceFilters]);

  // Функция для создания содержимого подсказки
  const createTooltipContent = useCallback((seatId: string): string => {
    // Сначала ищем в hallSeats (содержат правильные названия зон)
    // ПРИОРИТЕТ: сначала ищем специальные зоны, потом обычные места
    let hallSeat = Array.isArray(hallSeats) ? 
      hallSeats.find(hs => hs.objectType === 'special_zone' && hs.seatId === seatId) : null;
    
    // Если не найдено, попробуем найти по capacity (специальные зоны с capacity > 1)
    if (!hallSeat) {
      hallSeat = Array.isArray(hallSeats) ? 
        hallSeats.find(hs => hs.seatId === seatId && hs.capacity && hs.capacity > 1) : null;
    }
    
    // Если все еще не найдено, ищем обычное место
    if (!hallSeat) {
      hallSeat = Array.isArray(hallSeats) ? 
        hallSeats.find(hs => hs.seatId === seatId) : null;
    }
    
    // Логируем поиск для отладки
    console.log(`🔍 Поиск подсказки для ${seatId}:`, {
      seatId: seatId,
      hallSeatsCount: hallSeats?.length || 0,
      foundHallSeat: !!hallSeat,
      hallSeat: hallSeat,
      hallSeatObjectType: hallSeat?.objectType,
      hallSeatSection: hallSeat?.section,
      firstFewHallSeats: hallSeats?.slice(0, 3).map(hs => ({ 
        seatId: hs.seatId, 
        objectType: hs.objectType, 
        section: hs.section 
      }))
    });
    
    let content = '';
    
    if (hallSeat) {
      // Получаем название зоны из zone_config
      const zone = zones.find(z => z.id === hallSeat.section);
      const zoneName = zone ? zone.name : hallSeat.section || 'Неизвестная зона';
      
      // Проверяем, является ли это специальной зоной
      // Специальная зона может иметь objectType: 'special_zone' или objectType: 'seat' с capacity > 1
      const isSpecialZone = hallSeat.objectType === 'special_zone' || 
                           (hallSeat.objectType === 'seat' && hallSeat.capacity && hallSeat.capacity > 1);
      
      if (isSpecialZone) {
        // 🎪 Специальная зона - показываем количество доступных виртуальных билетов + 1 (основной объект)
        const availableVirtualTickets = virtualTickets.filter(vt => 
          vt.seatId && vt.seatId.startsWith(`${seatId}_seat_`) && (vt.status === 'available' || vt.status === 'reserved')
        );
        const availableCount = availableVirtualTickets.length + 1; // +1 для основного объекта специальной зоны
        
        // Детальное логирование для отладки
        const allVirtualTickets = virtualTickets.filter(vt => 
          vt.seatId && vt.seatId.startsWith(`${seatId}_seat_`)
        );
        const reservedVirtualTickets = virtualTickets.filter(vt => 
          vt.seatId && vt.seatId.startsWith(`${seatId}_seat_`) && vt.status === 'reserved'
        );
        
        console.log(`🎪 Обработка специальной зоны ${seatId}:`, {
          seatId: seatId,
          hallSeatObjectType: hallSeat.objectType,
          hallSeatSection: hallSeat.section,
          totalVirtualTickets: virtualTickets.length,
          allVirtualTickets: allVirtualTickets.length,
          availableVirtualTickets: availableVirtualTickets.length,
          reservedVirtualTickets: reservedVirtualTickets.length,
          availableCount: availableCount,
          zoneName: zoneName,
          sampleVirtualTickets: allVirtualTickets.slice(0, 3).map(t => ({
            seatId: t.seatId,
            status: t.status
          }))
        });
        
        content += `${availableCount} мест`;
        content += `\\n${zoneName}`;
      } else {
        // Обычное место - показываем ряд и место
        content += `Ряд ${hallSeat.row}, место ${hallSeat.seatNumber}`;
        content += `\\n${zoneName}`;
      }
      
      // Цена из распоясовки
      let seatPrice = seatPrices.find(sp => sp.seatId === seatId);
      
      // Логируем для отладки цен (только для первых нескольких мест)
      if (hallSeat.objectType === 'special_zone' || (hallSeat.objectType === 'seat' && !seatPrice)) {
        console.log(`🔍 Отладка цены для ${hallSeat.objectType} ${seatId}:`, {
          seatId: seatId,
          section: hallSeat.section,
          objectType: hallSeat.objectType,
          seatPrices: seatPrices.length,
          prices: prices.length,
          foundSeatPrice: !!seatPrice,
          seatPrice: seatPrice,
          availablePrices: prices.map(p => ({ id: p.id, name: p.name, value: p.value })),
          firstFewSeatPrices: seatPrices.slice(0, 3)
        });
      }
      
      // Для специальных зон ищем цену по zone
      if (!seatPrice && isSpecialZone && hallSeat.section) {
        // Ищем цену для зоны
        const zonePrice = prices.find(p => p.name === hallSeat.section || p.id === hallSeat.section);
        if (zonePrice) {
          content += `\\n${zonePrice.value.toLocaleString('ru-RU')} ${zonePrice.currency}`;
        } else {
          content += `\\nЦена не назначена`;
        }
      } else if (seatPrice) {
        const price = prices.find(p => p.id === seatPrice.priceId);
        if (price) {
          content += `\\n${price.value.toLocaleString('ru-RU')} ${price.currency}`;
        } else {
          content += `\\nЦена не назначена`;
        }
      } else {
        content += `\\nЦена не назначена`;
      }
      
      // Логирование убрано для чистоты консоли
      } else {
      // Fallback - ищем в seats
      const seat = seats.find(s => s.id === seatId);
      
      console.log(`🔍 Fallback поиск в seats для ${seatId}:`, {
        seatId: seatId,
        seatsCount: seats.length,
        foundSeat: !!seat,
        seat: seat,
        firstFewSeats: seats.slice(0, 3).map(s => ({ id: s.id, objectType: s.objectType, zone: s.zone }))
      });
      
      if (seat) {
        // Получаем название зоны из zone_config
        let zoneName = 'Неизвестная зона';
        if (seat.zone) {
          const foundZone = zones.find(z => z.id === seat.zone);
          if (foundZone) {
            zoneName = foundZone.name;
          } else {
            zoneName = seat.zone;
          }
        }
        
        // Проверяем, является ли это специальной зоной
        // Специальная зона может иметь objectType: 'special_zone' или objectType: 'seat' с capacity > 1
        const isSpecialZone = seat.objectType === 'special_zone' || 
                             (seat.objectType === 'seat' && seat.capacity && seat.capacity > 1);
        
        if (isSpecialZone) {
          // 🎪 Специальная зона - показываем количество мест
          const capacity = seat.capacity || 0;
          content += `${capacity} мест`;
          content += `\\n${zoneName}`;
        } else {
          // Обычное место - показываем ряд и место
          const row = seat.row || 0;
          const place = seat.place || 0;
          content += `Ряд ${row}, место ${place}`;
          content += `\\n${zoneName}`;
        }
        
        // Цена из распоясовки
        let seatPrice = seatPrices.find(sp => sp.seatId === String(seatId));
        
        // Для специальных зон ищем цену по zone
        if (!seatPrice && isSpecialZone && seat.zone) {
          // Ищем цену для зоны
          const zonePrice = prices.find(p => p.name === seat.zone || p.id === seat.zone);
          if (zonePrice) {
            content += `\\n${zonePrice.value.toLocaleString('ru-RU')} ${zonePrice.currency}`;
          } else {
            content += `\\nЦена не назначена`;
          }
        } else if (seatPrice) {
          const price = prices.find(p => p.id === seatPrice.priceId);
          if (price) {
            content += `\\n${price.value.toLocaleString('ru-RU')} ${price.currency}`;
          } else {
            content += `\\nЦена не назначена`;
          }
        } else {
          content += `\\nЦена не назначена`;
        }
        
        // Логирование убрано для чистоты консоли
      } else {
        content += `Место: ${seatId}`;
        // Логирование убрано для чистоты консоли
      }
    }
    
    return content;
  }, [seats, hallSeats, seatPrices, prices, zones]);

  // Рассчитываем позиции мест на основе SVG данных
  const calculateSeatPositions = useCallback(() => {
    // Логирование убрано для чистоты консоли
    
    if (!seats.length) {
      // Логирование убрано для чистоты консоли
      return [];
    }

    const newCanvasSeats: CanvasSeat[] = [];
    
    // Приоритет: используем hallSeats если они есть
    if (hallSeats && hallSeats.length > 0) {
      // Логирование убрано для чистоты консоли
      
      // Логирование убрано для чистоты консоли
      
      // Логирование убрано для чистоты консоли
      
      // Создаем canvas места из hallSeats (все элементы в базе уже отфильтрованы)
      // Логирование убрано для чистоты консоли
      hallSeats.forEach((hallSeat) => {
        // Определяем кликабельность для мест и специальных зон
        const isClickableSeat = (hallSeat.objectType === 'seat' && 
                                hallSeat.row && 
                                hallSeat.seatNumber && 
                                hallSeat.section) ||
                               (hallSeat.objectType === 'special_zone' && 
                                hallSeat.section);
        
        // Логируем только специальные зоны
        if (hallSeat.objectType === 'special_zone') {
          console.log(`🎪 Специальная зона найдена:`, {
            seatId: hallSeat.seatId,
            section: hallSeat.section,
            isClickable: isClickableSeat
          });
        }
        
        // Находим соответствующее место в seats для получения дополнительных данных (полигоны из seat_config)
        const foundSeat = seats.find(s => s.id === hallSeat.seatId);
        
        // Логируем только для специальных зон
        if (hallSeat.objectType === 'special_zone') {
          console.log(`🎪 Данные seat_config для специальной зоны ${hallSeat.seatId}:`, {
            foundSeat: foundSeat,
            hasSvgData: !!(foundSeat as any)?.svgData,
            svgData: (foundSeat as any)?.svgData
          });
        }
        
        // ✅ isClickable корректно вычисляется
        
        const correspondingSeat = foundSeat ? {
          ...foundSeat,
          isClickable: isClickableSeat // ✅ ВСЕГДА используем вычисленное значение
        } : {
          id: hallSeat.seatId,
          row: hallSeat.row,
          place: hallSeat.seatNumber,
          section: hallSeat.section,
          objectType: hallSeat.objectType || 'seat',
          isClickable: isClickableSeat
        };
        
        // Используем координаты напрямую из hallSeat (уже в координатах canvas)
        const transformedData = {
          x: hallSeat.x,
          y: hallSeat.y,
          width: hallSeat.width,
          height: hallSeat.height
        };
        
        // Устанавливаем минимальный размер для мест
        const minSeatSize = hallSeat.objectType === 'seat' ? 12 : 8;
        const finalWidth = Math.max(transformedData.width, minSeatSize);
        const finalHeight = Math.max(transformedData.height, minSeatSize);
        
        const canvasSeat: CanvasSeat = {
          ...(correspondingSeat as any || {}),
          id: correspondingSeat?.id || hallSeat.seatId,
          cssSelector: `#${hallSeat.seatId}`,
          x: transformedData.x,
          y: transformedData.y,
          width: finalWidth,
          height: finalHeight,
          objectType: hallSeat.objectType as any,
          isClickable: Boolean(isClickableSeat),
          row: hallSeat.row,
          place: hallSeat.seatNumber,
          section: hallSeat.section,
          // svgData больше не используется (легаси код)
        };
        
        newCanvasSeats.push(canvasSeat);
        
        // // Логируем первые несколько мест
        // if (index < 5) {
        //   console.log(`🎭 Canvas место ${index + 1}:`, {
        //     seatId: canvasSeat.id,
        //     objectType: canvasSeat.objectType,
        //     isClickable: canvasSeat.isClickable,
        //     row: hallSeat.row,
        //     seatNumber: hallSeat.seatNumber,
        //     section: hallSeat.section,
        //     coords: { x: canvasSeat.x, y: canvasSeat.y, width: canvasSeat.width, height: canvasSeat.height }
        //   });
        // }
      });
      
      // Статистика рендеринга
      // const renderStats = {
      //   totalElements: hallSeats.length,
      //   renderedElements: newCanvasSeats.length,
      //   objectTypes: newCanvasSeats.reduce((acc, s) => {
      //     acc[s.objectType || 'unknown'] = (acc[s.objectType || 'unknown'] || 0) + 1;
      //     return acc;
      //   }, {} as Record<string, number>),
      //   clickableSeats: newCanvasSeats.filter(s => s.isClickable).length
      // };
      
      // console.log(`✅ Статистика рендеринга (из чистой БД):`, renderStats);
      return newCanvasSeats;
    }
    
    // ❌ НЕТ ДАННЫХ HALLSEATS - НЕ МОЖЕМ РЕНДЕРИТЬ
    // console.log('❌ Нет данных hallSeats для рендеринга');
    return [];
  }, [seats, hallSeats, width, height]);

  // 🎨 Получаем красивый цвет места (на основе цены или стильный по умолчанию)
  const getSeatColor = useCallback((seatId: string) => {
    const seatPrice = seatPrices.find(sp => sp.seatId === seatId);
    if (seatPrice) {
      const price = prices.find(p => p.id === seatPrice.priceId);
      if (price) return price.color;
    }
    
    // 🌈 Красивые цвета по умолчанию в зависимости от ID места
    const colorPalette = [
      '#4ecdc4', // Мятный
      '#45b7d1', // Небесно-голубой  
      '#96ceb4', // Мягкий зеленый
      '#ffeaa7', // Теплый желтый
      '#dda0dd', // Светло-фиолетовый
      '#98d8c8', // Морская волна
      '#f7dc6f', // Золотистый
      '#bb8fce'  // Лавандовый
    ];
    
    // Выбираем цвет на основе хеша ID места
    const hash = seatId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colorPalette[Math.abs(hash) % colorPalette.length];
  }, [seatPrices, prices]);

  // Функция для создания фоновой подложки
  const drawBackgroundOverlay = useCallback((ctx: CanvasRenderingContext2D) => {
    if (canvasSeats.length === 0) return;

    // Находим границы всех мест
    const minX = Math.min(...canvasSeats.map(s => s.x));
    const minY = Math.min(...canvasSeats.map(s => s.y));
    const maxX = Math.max(...canvasSeats.map(s => s.x + s.width));
    const maxY = Math.max(...canvasSeats.map(s => s.y + s.height));

    // Добавляем отступы
    const padding = 50;
    const bgX = minX - padding;
    const bgY = minY - padding;
    const bgWidth = maxX - minX + padding * 2;
    const bgHeight = maxY - minY + padding * 2;

    // Рисуем закругленный прямоугольник с белым фоном
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 20);
    ctx.fillStyle = '#ffffff'; // Полностью белый фон
    ctx.fill();
    
    // Добавляем тонкую обводку
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }, [canvasSeats]);

  // Рендерим Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Включаем высококачественное сглаживание для гладких полигонов
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Очищаем canvas
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);

    // Рисуем фон
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

    // Применяем трансформации (зум и панорамирование)
    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    // Рисуем фоновую подложку
    drawBackgroundOverlay(ctx);

    // Сортируем места: сначала большие (фон), потом маленькие (места)
    const sortedSeats = [...canvasSeats].sort((a, b) => {
      const aSize = a.width * a.height;
      const bSize = b.width * b.height;
      return bSize - aSize; // От больших к маленьким
    });

    // Рисуем места
    // console.log('🎭 Рендеринг мест:', {
    //   canvasSeatsCount: canvasSeats.length,
    //   sortedSeatsCount: sortedSeats.length,
    //   firstSeat: sortedSeats[0]
    // });
    
    // Рендерим выделенные места
    
    sortedSeats.forEach((seat) => {
      const isSelected = selectedSeats.includes(seat.id as string);
      const isHovered = hoveredSeat === seat.id;
      const isClickable = seat.isClickable === true; // Используем наше новое поле
      const isActive = isSeatActive(seat); // Проверяем активность места
      
      // Обрабатываем выделенные места

      // 🎨 СОВРЕМЕННЫЕ КРАСИВЫЕ СТИЛИ
      let fillColor = '#f8f9fa';
      let strokeColor = '#dee2e6';
      let strokeWidth = 1;
      let shadow = false;
      let gradient = false;

      if (seat.objectType === 'seat' || seat.objectType === 'special_zone') {
        // Проверяем статус билета для определения внешнего вида
        if (seat.status === 'sold') {
          // 🔴 Проданные места - серый цвет
          fillColor = '#9ca3af'; // Серый
          strokeColor = 'transparent';
          strokeWidth = 0;
        } else if (seat.status === 'locked') {
          // 🔒 Заблокированные места - темно-серый цвет
          fillColor = '#6b7280'; // Темно-серый
          strokeColor = 'transparent';
          strokeWidth = 0;
        } else if (seat.status === 'reserved') {
          // 🟡 Забронированные места - темно-серый
          fillColor = '#6b7280'; // Темно-серый
          strokeColor = 'transparent';
          strokeWidth = 0;
        } else if (isClickable && seat.status === 'available') {
          // ✨ Доступные места - цвет по цене
          if (!isActive) {
            // 🚫 Неактивные места (не выбраны в фильтре) - серые
            fillColor = '#d1d5db';
            strokeColor = '#9ca3af';
            strokeWidth = 1;
          } else if (isSelected) {
            // 🔥 Выделенные места - синий цвет
            fillColor = '#3b82f6'; // Синий
            strokeColor = 'transparent';
            strokeWidth = 0;
            shadow = true;
          } else {
            // 💎 Обычные места - цвет по цене
            fillColor = seat.priceColor || '#10b981'; // Цвет по цене
            strokeColor = 'transparent';
            strokeWidth = 0;
          }
          
        } else {
          // 🚫 Недоступные места - приглушенные
          fillColor = '#d1d5db';
          strokeColor = 'transparent';
          strokeWidth = 0;
        }
      } else if (seat.objectType === 'scene') {
        // 🎭 Сцена - серый цвет
        fillColor = '#b0b0b0';
        strokeColor = 'transparent';
        strokeWidth = 0;
      } else if (seat.objectType === 'decoration') {
        // 🎨 Декорации - серый цвет без обводки
        fillColor = '#b0b0b0';
        strokeColor = 'transparent';
        strokeWidth = 0;
      } else if (seat.objectType === 'passage') {
        // Проходы
        fillColor = '#6c757d';
        strokeColor = '#495057';
        strokeWidth = 1;
      } else {
        // Технические зоны и прочее
        fillColor = '#f0f0f0';
        strokeColor = '#ccc';
        strokeWidth = 1;
      }

      // 🎨 ПРИМЕНЯЕМ КРАСИВЫЕ ЭФФЕКТЫ
      
      // Тень для выделенных и наведенных мест
      if (shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }
      
      // Градиент для выделенных мест
      if (gradient && isSelected) {
        const gradientFill = ctx.createLinearGradient(
          seat.x, seat.y, 
          seat.x + seat.width, seat.y + seat.height
        );
        gradientFill.addColorStop(0, '#ff6b6b');
        gradientFill.addColorStop(0.5, '#ff5252');
        gradientFill.addColorStop(1, '#ff4444');
        ctx.fillStyle = gradientFill;
      } else {
      ctx.fillStyle = fillColor;
      }
      
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      // 🔍 Эффект увеличения при наведении или выборе
      let scaleEffect = 1;
      const isSeatSelected = localSelectedSeats.includes(seat.id.toString());
      // Забронированные, купленные и заблокированные места не увеличиваются
      const isReservedOrSold = seat.status === 'reserved' || seat.status === 'sold' || seat.status === 'locked';
      // Специальные зоны тоже могут увеличиваться при наведении/выборе
      const shouldScale = (isHovered || isSeatSelected) && 
                         (seat.objectType === 'seat' || seat.objectType === 'special_zone') && 
                         isClickable && isActive && !isReservedOrSold;
      
      if (shouldScale) {
        // Разный эффект масштабирования для разных типов объектов
        if (seat.objectType === 'special_zone') {
          scaleEffect = 1.08; // Меньше увеличение для специальных зон (8%)
        } else {
          scaleEffect = 1.15; // Обычное увеличение для мест (15%)
        }
        
        ctx.save();
        
        // Масштабируем относительно центра места
        const centerX = seat.x + seat.width / 2;
        const centerY = seat.y + seat.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.scale(scaleEffect, scaleEffect);
        ctx.translate(-centerX, -centerY);
        
        // Добавляем дополнительную тень для эффекта
        if (seat.objectType === 'special_zone') {
          // Более мягкая тень для специальных зон
          ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 2;
        } else {
          // Обычная тень для мест
          ctx.shadowColor = 'rgba(59, 130, 246, 0.4)';
          ctx.shadowBlur = 12;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 4;
        }
      }

      // Определяем форму элемента на основе objectType (современный подход)
      const objectType = seat.objectType;
      
      // Логируем только специальные зоны
      if (objectType === 'special_zone') {
        console.log(`🎪 Рендеринг специальной зоны ${seat.id}:`, {
          objectType: objectType,
          x: seat.x,
          y: seat.y,
          width: seat.width,
          height: seat.height
        });
      }
      
      // Рисуем элемент на основе данных из seat_config (полигоны)
      const foundSeat = seats.find(s => s.id === seat.id);
      
      // Логируем только для специальных зон
      if (objectType === 'special_zone') {
        console.log(`🎪 Данные seat_config для специальной зоны ${seat.id}:`, {
          foundSeat: foundSeat,
          hasSvgData: !!(foundSeat as any)?.svgData,
          svgData: (foundSeat as any)?.svgData,
          shape: (foundSeat as any)?.svgData?.shape,
          hasRxRy: !!((foundSeat as any)?.svgData?.rx && (foundSeat as any)?.svgData?.ry)
        });
      }
      
      if (foundSeat && foundSeat.svgData) {
        // Используем полигоны из seat_config
        const svgData = foundSeat.svgData;
        
        if (svgData.shape === 'circle') {
          const centerX = seat.x + seat.width / 2;
          const centerY = seat.y + seat.height / 2;
          const radius = Math.min(seat.width, seat.height) / 2 - strokeWidth;

          ctx.beginPath();
          ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (svgData.shape === 'rect') {
          const rectX = seat.x + strokeWidth / 2;
          const rectY = seat.y + strokeWidth / 2;
          const rectWidth = seat.width - strokeWidth;
          const rectHeight = seat.height - strokeWidth;

          if (svgData.rx && svgData.ry) {
            // Прямоугольник с закругленными углами
            const rx = Math.min(svgData.rx, rectWidth / 2);
            const ry = Math.min(svgData.ry, rectHeight / 2);
            
            ctx.beginPath();
            ctx.roundRect(rectX, rectY, rectWidth, rectHeight, [rx, ry]);
            ctx.fill();
            ctx.stroke();
          } else {
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
          }
        } else if (svgData.shape === 'path' && svgData.pathData) {
          // Рисуем реальный SVG path
          try {
            const path2D = new Path2D(svgData.pathData);
            
            // Применяем трансформацию для правильного позиционирования
            ctx.save();
            
            // Масштабируем path к нужному размеру и позиции
            if (svgData.width && svgData.height) {
              const scaleX = seat.width / svgData.width;
              const scaleY = seat.height / svgData.height;
              const offsetX = seat.x - svgData.x * scaleX;
              const offsetY = seat.y - svgData.y * scaleY;
              
              ctx.translate(offsetX, offsetY);
              ctx.scale(scaleX, scaleY);
            }
            
            ctx.fill(path2D);
            ctx.stroke(path2D);
            ctx.restore();
          } catch (error) {
            console.warn('Ошибка отрисовки path:', error);
            // Fallback к прямоугольнику
            const rectX = seat.x + strokeWidth / 2;
            const rectY = seat.y + strokeWidth / 2;
            const rectWidth = seat.width - strokeWidth;
            const rectHeight = seat.height - strokeWidth;
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
          }
        } else if (svgData.shape === 'polygon' && svgData.points) {
          // Рисуем полигон по точкам
          const points = svgData.points;
          
          if (points.length >= 3) {
            ctx.beginPath();
            ctx.moveTo(seat.x + (points[0].x - svgData.x), seat.y + (points[0].y - svgData.y));
            
            for (let i = 1; i < points.length; i++) {
              ctx.lineTo(seat.x + (points[i].x - svgData.x), seat.y + (points[i].y - svgData.y));
            }
            
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
          } else {
            // Fallback: если точек мало, рисуем прямоугольник
            const rectX = seat.x + strokeWidth / 2;
            const rectY = seat.y + strokeWidth / 2;
            const rectWidth = seat.width - strokeWidth;
            const rectHeight = seat.height - strokeWidth;
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
          }
        } else {
          // Fallback для неизвестных форм
          const rectX = seat.x + strokeWidth / 2;
          const rectY = seat.y + strokeWidth / 2;
          const rectWidth = seat.width - strokeWidth;
          const rectHeight = seat.height - strokeWidth;
          ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        }
      } else {
        // Fallback: если нет данных из seat_config, рисуем прямоугольник
        const rectX = seat.x + strokeWidth / 2;
        const rectY = seat.y + strokeWidth / 2;
        const rectWidth = seat.width - strokeWidth;
        const rectHeight = seat.height - strokeWidth;
        
        if (objectType === 'special_zone') {
          // Специальные зоны - прямоугольник с закругленными углами
          const defaultRadius = Math.min(rectWidth, rectHeight) * 0.1;
          ctx.beginPath();
          ctx.roundRect(rectX, rectY, rectWidth, rectHeight, defaultRadius);
          ctx.fill();
          ctx.stroke();
        } else {
          // Обычные места - простой прямоугольник
          ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        }
      }
      
      // Легаси код удален - используем только современный подход на основе objectType

      // Добавляем текст для элементов
      let displayText = '';
      if (seat.objectType === 'seat' && seat.isClickable && seat.place) {
        // Показываем галочку только для выбранных активных мест
        if (isSeatSelected && isActive && !isReservedOrSold) {
          displayText = '✓';
        } else {
        displayText = seat.place.toString();
        }
      } else if (seat.objectType === 'special_zone' && seat.isClickable) {
        // Для специальных зон показываем название зоны
        if (isSeatSelected && isActive && !isReservedOrSold) {
          displayText = '✓';
        } else {
          // Получаем название зоны из zone_config по section
          const zone = zones.find(z => z.id === seat.section);
          displayText = zone ? zone.name : seat.section || 'ЗОНА';
        }
      } else if (seat.objectType === 'scene') {
        displayText = 'СЦЕНА';
      } else if (seat.objectType === 'decoration') {
        // Декорации без надписи
        displayText = '';
      } else if (seat.objectType === 'passage') {
        displayText = 'ПРОХОД';
      }
      
      if (displayText) {
        // Цвет текста зависит от типа объекта
        if (seat.objectType === 'scene') {
          ctx.fillStyle = '#808080'; // Темно-серый для сцены
        } else if (seat.objectType === 'seat' || seat.objectType === 'special_zone') {
          ctx.fillStyle = '#ffffff'; // Белый для всех мест (цифры и галочки)
        } else {
        ctx.fillStyle = '#333'; // Цвет текста по умолчанию
        }
        // Размер шрифта зависит от состояния и типа объекта
        let fontSize;
        if (shouldScale && isActive) {
          // При наведении или выборе активных мест - увеличенный шрифт
          if (seat.objectType === 'special_zone') {
            // Для специальных зон - увеличение в 2 раза меньше (30% от размера объекта)
            fontSize = Math.min(seat.width, seat.height) * 0.3;
          } else {
            // Для обычных мест - обычное увеличение (50% от размера объекта)
            fontSize = Math.min(seat.width, seat.height) * 0.5;
          }
          ctx.font = `bold ${fontSize}px Arial`;
        } else {
          // Обычный размер шрифта (как было раньше)
          if (seat.objectType === 'special_zone') {
            // Для специальных зон - немного больше шрифт
            fontSize = Math.min(seat.width, seat.height) * 0.2;
          } else {
            // Для обычных мест - стандартный размер
            fontSize = Math.min(seat.width, seat.height) / 4;
          }
          ctx.font = `${fontSize}px Arial`;
        }
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textX = seat.x + seat.width / 2;
        // Улучшенное центрирование по высоте с небольшой корректировкой
        const textY = seat.y + seat.height / 2 + (fontSize * 0.1);
        
        ctx.fillText(displayText, textX, textY);
      }

      // Восстанавливаем состояние canvas после эффекта увеличения
      if (shouldScale) {
        ctx.restore();
      }
    });

    // Восстанавливаем контекст после трансформаций
    ctx.restore();

    // Рисуем рамку выделения (если активна)
    if (isSelecting && interactionMode === InteractionMode.SELECTION && selectionStart && selectionEnd) {
      const selectionRect = {
        x: Math.min(selectionStart.x, selectionEnd.x),
        y: Math.min(selectionStart.y, selectionEnd.y),
        width: Math.abs(selectionEnd.x - selectionStart.x),
        height: Math.abs(selectionEnd.y - selectionStart.y)
      };

      // Преобразуем в координаты canvas с учетом трансформаций для предварительного выделения
      const canvasRect = {
        x: (selectionRect.x - transform.offsetX) / transform.scale,
        y: (selectionRect.y - transform.offsetY) / transform.scale,
        width: selectionRect.width / transform.scale,
        height: selectionRect.height / transform.scale
      };

      // Находим места в области выделения для предварительного показа
      const previewSelectedSeats = canvasSeats.filter(seat => 
        (seat.objectType === 'seat' || seat.objectType === 'special_zone') &&
        seat.x < canvasRect.x + canvasRect.width &&
        seat.x + seat.width > canvasRect.x &&
        seat.y < canvasRect.y + canvasRect.height &&
        seat.y + seat.height > canvasRect.y
      );

      // Применяем трансформации для рисования предварительного выделения
      ctx.save();
      ctx.translate(transform.offsetX, transform.offsetY);
      ctx.scale(transform.scale, transform.scale);

      // Подсвечиваем места в области выделения
      previewSelectedSeats.forEach(seat => {
        ctx.fillStyle = 'rgba(0, 123, 255, 0.3)';
        ctx.strokeStyle = '#007bff';
        ctx.lineWidth = 2;
        
        // Рендерим preview на основе данных из seat_config
        const foundSeat = seats.find(s => s.id === seat.id);
        
        if (foundSeat && foundSeat.svgData) {
          const svgData = foundSeat.svgData;
          
          if (svgData.shape === 'circle') {
            const centerX = seat.x + seat.width / 2;
            const centerY = seat.y + seat.height / 2;
            const radius = Math.min(seat.width, seat.height) / 2 - 1;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.stroke();
          } else if (svgData.shape === 'rect' && svgData.rx && svgData.ry) {
            // Прямоугольник с закругленными углами
            const rx = Math.min(svgData.rx, seat.width / 2);
            const ry = Math.min(svgData.ry, seat.height / 2);
            ctx.beginPath();
            ctx.roundRect(seat.x, seat.y, seat.width, seat.height, [rx, ry]);
            ctx.fill();
            ctx.stroke();
          } else {
            // Обычный прямоугольник
            ctx.fillRect(seat.x, seat.y, seat.width, seat.height);
            ctx.strokeRect(seat.x, seat.y, seat.width, seat.height);
          }
        } else {
          // Fallback: если нет данных из seat_config
          if (seat.objectType === 'special_zone') {
            // Специальные зоны - прямоугольник с закругленными углами
            const defaultRadius = Math.min(seat.width, seat.height) * 0.1;
            ctx.beginPath();
            ctx.roundRect(seat.x, seat.y, seat.width, seat.height, defaultRadius);
            ctx.fill();
            ctx.stroke();
          } else {
            // Обычные места - простой прямоугольник
            ctx.fillRect(seat.x, seat.y, seat.width, seat.height);
            ctx.strokeRect(seat.x, seat.y, seat.width, seat.height);
          }
        }
      });

      ctx.restore();

      // Рисуем саму рамку выделения
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      
      // Полупрозрачная заливка рамки
      ctx.fillStyle = 'rgba(0, 123, 255, 0.05)';
      ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.width, selectionRect.height);
      ctx.setLineDash([]);
    }
  }, [canvasSeats, selectedSeats, hoveredSeat, width, height, transform, isSelecting, selectionStart, selectionEnd, interactionMode, getSeatColor]);

  // Функции управления зумом
  const zoomIn = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(5, prev.scale * 1.2)
    }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(0.1, prev.scale / 1.2)
    }));
  }, []);

  const fitToView = useCallback(() => {
    if (canvasSeats.length === 0) return;

    const minX = Math.min(...canvasSeats.map(s => s.x));
    const minY = Math.min(...canvasSeats.map(s => s.y));
    const maxX = Math.max(...canvasSeats.map(s => s.x + s.width));
    const maxY = Math.max(...canvasSeats.map(s => s.y + s.height));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;

    const scaleX = (canvasSize.width - 40) / contentWidth;
    const scaleY = (canvasSize.height - 40) / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      scale: newScale,
      offsetX: canvasSize.width / 2 - centerX * newScale,
      offsetY: canvasSize.height / 2 - centerY * newScale
    });
  }, [canvasSeats, canvasSize]);

  // Функция для проверки видимости мест
  const getVisibleSeats = useCallback(() => {
    if (!canvasRef.current || canvasSeats.length === 0) return [];

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    return canvasSeats.filter(seat => {
      // Преобразуем координаты места в координаты canvas
      const seatCanvasX = seat.x * transform.scale + transform.offsetX;
      const seatCanvasY = seat.y * transform.scale + transform.offsetY;
      const seatCanvasWidth = seat.width * transform.scale;
      const seatCanvasHeight = seat.height * transform.scale;
      
      // Проверяем, пересекается ли место с видимой областью
      return !(seatCanvasX + seatCanvasWidth < 0 || 
               seatCanvasX > rect.width || 
               seatCanvasY + seatCanvasHeight < 0 || 
               seatCanvasY > rect.height);
    });
  }, [canvasSeats, transform, canvasSize]);

  // Функция для поиска ближайшего места к центру экрана
  const findNearestSeatToCenter = useCallback(() => {
    if (canvasSeats.length === 0) return null;

    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    
    let nearestSeat = null;
    let minDistance = Infinity;
    
    canvasSeats.forEach(seat => {
      const seatCenterX = seat.x + seat.width / 2;
      const seatCenterY = seat.y + seat.height / 2;
      
      // Преобразуем в координаты canvas
      const seatCanvasX = seatCenterX * transform.scale + transform.offsetX;
      const seatCanvasY = seatCenterY * transform.scale + transform.offsetY;
      
      const distance = Math.sqrt(
        Math.pow(seatCanvasX - centerX, 2) + 
        Math.pow(seatCanvasY - centerY, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearestSeat = seat;
      }
    });
    
    return nearestSeat;
  }, [canvasSeats, transform, canvasSize]);

  // Функция для плавного возвращения к ближайшему месту
  const returnToNearestSeat = useCallback(() => {
    const nearestSeat = findNearestSeatToCenter() as CanvasSeat | null;
    if (!nearestSeat) return;

    const seatCenterX = nearestSeat.x + nearestSeat.width / 2;
    const seatCenterY = nearestSeat.y + nearestSeat.height / 2;
    
    // Вычисляем новые offset для центрирования места
    const targetOffsetX = canvasSize.width / 2 - seatCenterX * transform.scale;
    const targetOffsetY = canvasSize.height / 2 - seatCenterY * transform.scale;
    
    // Запускаем анимацию
    setIsAnimating(true);
    setAnimationTarget({ offsetX: targetOffsetX, offsetY: targetOffsetY });
  }, [findNearestSeatToCenter, transform.scale, canvasSize]);

  // Функция для получения координат мыши (совместимость с Safari)
  const getCanvasCoordinates = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    // Получаем bounding rect
    const rect = canvas.getBoundingClientRect();
    
    // Вычисляем координаты с учетом масштаба canvas
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const displayWidth = rect.width;
    const displayHeight = rect.height;
    
    // Координаты относительно canvas элемента
    const clientX = event.clientX - rect.left;
    const clientY = event.clientY - rect.top;
    
    // Масштабируем координаты к внутренним размерам canvas
    const scaleX = canvasWidth / displayWidth;
    const scaleY = canvasHeight / displayHeight;
    
    const result = {
      x: clientX * scaleX,
      y: clientY * scaleY
    };
    
    // Отладочная информация для Safari
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
      // Логирование убрано для чистоты консоли
    }
    
    return result;
  }, []);

  // Обработчики событий мыши
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(event);

    if (interactionMode === InteractionMode.SELECTION) {
      // Начинаем выделение рамкой
      setIsSelecting(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
    } else if (interactionMode === InteractionMode.ZOOM_PAN) {
      // Начинаем перетаскивание
      setIsDragging(true);
      setDragStart({ x: event.clientX - transform.offsetX, y: event.clientY - transform.offsetY });
    }
  }, [interactionMode, transform, getCanvasCoordinates]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { x, y } = getCanvasCoordinates(event);

    if (isSelecting && interactionMode === InteractionMode.SELECTION) {
      // Обновляем рамку выделения
      setSelectionEnd({ x, y });
    } else if (isDragging && interactionMode === InteractionMode.ZOOM_PAN) {
      // Панорамирование
      const newOffsetX = event.clientX - dragStart.x;
      const newOffsetY = event.clientY - dragStart.y;
      
      setTransform(prev => ({
        ...prev,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      }));
    } else {
      // Обработка наведения на места
      const canvasX = (x - transform.offsetX) / transform.scale;
      const canvasY = (y - transform.offsetY) / transform.scale;

      // Отладочная информация для Safari
      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        // Логирование убрано для чистоты консоли
      }

      const hoveredSeatElement = canvasSeats.find(seat =>
        canvasX >= seat.x && canvasX <= seat.x + seat.width &&
        canvasY >= seat.y && canvasY <= seat.y + seat.height &&
        (seat.objectType === 'seat' || seat.objectType === 'special_zone') &&
        seat.isClickable === true && // Только кликабельные места могут быть подсвечены
        isSeatActive(seat) // Только активные места могут быть подсвечены
      );

      const newHoveredId = hoveredSeatElement?.id as string || null;
      
      // Отладочная информация для Safari
      if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
        if (hoveredSeatElement) {
          // Логирование убрано для чистоты консоли
        } else {
          // Логирование убрано для чистоты консоли
        }
      }
      
      if (newHoveredId !== hoveredSeat) {
        setHoveredSeat(newHoveredId);
        canvas.style.cursor = newHoveredId ? 'pointer' : (isDragging ? 'grabbing' : (interactionMode === InteractionMode.SELECTION ? 'crosshair' : 'grab'));
        
        // Обновляем подсказку
        if (newHoveredId) {
          const tooltipContent = createTooltipContent(newHoveredId);
          // Логирование убрано для чистоты консоли
          setTooltip({
            visible: true,
            x: event.clientX + 10,
            y: event.clientY - 10,
            content: tooltipContent
          });
        } else {
          // Логирование убрано для чистоты консоли
          setTooltip(prev => ({ ...prev, visible: false }));
        }
      }
    }
  }, [isSelecting, isDragging, interactionMode, transform, canvasSeats, hoveredSeat, dragStart, createTooltipContent, getCanvasCoordinates]);

  const handleMouseUp = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSelecting && interactionMode === InteractionMode.SELECTION && selectionStart) {
      // Завершаем выделение рамкой
      const canvas = canvasRef.current;
      if (!canvas) return;

      const { x: endX, y: endY } = getCanvasCoordinates(event);

      // Проверяем, что рамка достаточно большая (минимум 5px)
      const minSelectionSize = 5;
      if (Math.abs(endX - selectionStart.x) > minSelectionSize || Math.abs(endY - selectionStart.y) > minSelectionSize) {
        // Вычисляем область выделения в координатах canvas
        const selectionRect = {
          x: Math.min(selectionStart.x, endX),
          y: Math.min(selectionStart.y, endY),
          width: Math.abs(endX - selectionStart.x),
          height: Math.abs(endY - selectionStart.y)
        };

        // Преобразуем в координаты canvas с учетом трансформаций
        const canvasRect = {
          x: (selectionRect.x - transform.offsetX) / transform.scale,
          y: (selectionRect.y - transform.offsetY) / transform.scale,
          width: selectionRect.width / transform.scale,
          height: selectionRect.height / transform.scale
        };

        // Находим места в области выделения
        const newSelectedSeatIds = canvasSeats
          .filter(seat => 
            (seat.objectType === 'seat' || seat.objectType === 'special_zone') &&
            seat.x < canvasRect.x + canvasRect.width &&
            seat.x + seat.width > canvasRect.x &&
            seat.y < canvasRect.y + canvasRect.height &&
            seat.y + seat.height > canvasRect.y
          )
          .map(seat => seat.id as string);

        if (newSelectedSeatIds.length > 0 && onSeatsSelected) {
          // Улучшенная логика выделения:
          // 1. Если все новые места уже выделены - снимаем выделение
          // 2. Иначе добавляем к существующему выделению
          const allAlreadySelected = newSelectedSeatIds.every(id => selectedSeats.includes(id));
          
          if (allAlreadySelected && newSelectedSeatIds.length === selectedSeats.length) {
            // Если выделили точно те же места - очищаем
            onSeatsSelected([]);
          } else if (allAlreadySelected) {
            // Если все новые места уже выделены, но есть и другие - убираем только новые
            const remainingSeats = selectedSeats.filter(id => !newSelectedSeatIds.includes(id));
            onSeatsSelected(remainingSeats);
          } else {
            // Добавляем новые места к существующему выделению
            const combinedSelection = [...new Set([...selectedSeats, ...newSelectedSeatIds])];
            onSeatsSelected(combinedSelection);
          }
        }
      }

      setIsSelecting(false);
      
      // Автоматически переключаемся обратно в режим панорамирования
      if (onModeChange) {
        onModeChange(InteractionMode.ZOOM_PAN);
      }
    }

    setIsDragging(false);
    
    // Проверяем видимость мест после перетаскивания
    if (interactionMode === InteractionMode.ZOOM_PAN) {
      setTimeout(() => {
        const visibleSeats = getVisibleSeats();
        if (visibleSeats.length === 0) {
          // Если нет видимых мест, возвращаемся к ближайшему
          returnToNearestSeat();
        }
      }, 100);
    }
  }, [isSelecting, interactionMode, selectionStart, transform, canvasSeats, onSeatsSelected, onModeChange, selectedSeats, getVisibleSeats, returnToNearestSeat, getCanvasCoordinates]);

  // 🆕 НОВЫЙ ПРОСТОЙ ОБРАБОТЧИК КЛИКОВ
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    // Логирование убрано для чистоты консоли
    
    // Игнорируем клики во время перетаскивания
    if (isDragging || isSelecting) {
      // Логирование убрано для чистоты консоли
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas) {
      // Логирование убрано для чистоты консоли
      return;
    }

    // Получаем координаты клика
    const { x: canvasX, y: canvasY } = getCanvasCoordinates(event);
    
    // Преобразуем в координаты с учетом масштаба и сдвига
    const worldX = (canvasX - transform.offsetX) / transform.scale;
    const worldY = (canvasY - transform.offsetY) / transform.scale;
    
    // Логирование убрано для чистоты консоли

    // Ищем место под кликом
    let foundSeat = null;
    for (const seat of canvasSeats) {
      if ((seat.objectType === 'seat' || seat.objectType === 'special_zone') && 
          seat.isClickable === true && 
          isSeatActive(seat)) {
        const inBounds = worldX >= seat.x && 
                        worldX <= seat.x + seat.width && 
                        worldY >= seat.y && 
                        worldY <= seat.y + seat.height;
        
        if (inBounds) {
          foundSeat = seat;
          break;
        }
      }
    }

    if (foundSeat) {
      // Логирование убрано для чистоты консоли
      
      // Проверяем, является ли это специальной зоной
      if (foundSeat.objectType === 'special_zone') {
        // Для специальных зон показываем селектор
        const seatId = foundSeat.id.toString();
        const hallSeat = hallSeats.find(hs => hs.seatId === seatId);
        
        if (hallSeat) {
          // Получаем название зоны
          const zone = zones.find(z => z.id === hallSeat.section);
          const zoneName = zone ? zone.name : hallSeat.section || 'Специальная зона';
          
          // Получаем цену
          let price = 0;
          let currency = 'RUB';
          const seatPrice = seatPrices.find(sp => sp.seatId === seatId);
          if (seatPrice) {
            const priceInfo = prices.find(p => p.id === seatPrice.priceId);
            if (priceInfo) {
              price = priceInfo.value;
              currency = priceInfo.currency;
            }
          }
          
          // Получаем capacity из seat_config
          const seat = seats.find(s => s.id === seatId);
          const capacity = seat?.capacity || hallSeat.capacity || 1;
          
          // Показываем селектор по центру канваса
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            // Рассчитываем количество доступных виртуальных билетов + 1 (основной объект)
            const availableVirtualTickets = virtualTickets.filter(vt => 
              vt.seatId && vt.seatId.startsWith(`${seatId}_seat_`) && (vt.status === 'available' || vt.status === 'reserved')
            );
            const availableCapacity = availableVirtualTickets.length + 1; // +1 для основного объекта специальной зоны
            
            // Детальное логирование для отладки
            const allVirtualTickets = virtualTickets.filter(vt => 
              vt.seatId && vt.seatId.startsWith(`${seatId}_seat_`)
            );
            const reservedVirtualTickets = virtualTickets.filter(vt => 
              vt.seatId && vt.seatId.startsWith(`${seatId}_seat_`) && vt.status === 'reserved'
            );
            
            console.log(`🎪 Создаем селектор для ${seatId}:`, {
              totalCapacity: capacity,
              totalVirtualTickets: virtualTickets.length,
              allVirtualTickets: allVirtualTickets.length,
              availableVirtualTickets: availableVirtualTickets.length,
              reservedVirtualTickets: reservedVirtualTickets.length,
              availableCapacity: availableCapacity,
              sampleVirtualTickets: allVirtualTickets.slice(0, 3).map(t => ({
                seatId: t.seatId,
                status: t.status
              }))
            });
            
            setSpecialZoneSelector({
              isVisible: true,
              position: { x: centerX, y: centerY },
              zoneName,
              capacity: availableCapacity, // Используем количество доступных виртуальных билетов
              price,
              currency,
              seatId
            });
          }
        }
      } else {
        // Обычная логика для обычных мест
        setLocalSelectedSeats(prev => {
          const seatId = foundSeat.id.toString();
          const isCurrentlySelected = prev.includes(seatId);
          let newSelectedSeats;
          
          if (isCurrentlySelected) {
            // Убираем место из выбранных
            newSelectedSeats = prev.filter(id => id !== seatId);
          } else {
            // Добавляем место к выбранным
            newSelectedSeats = [...prev, seatId];
          }
          
          // Вызываем колбэк с обновленным списком
          if (onSeatsSelected) {
            onSeatsSelected(newSelectedSeats);
          }
          
          return newSelectedSeats;
        });
        
        // Вызываем колбэк для отдельного места
        if (onSeatClick) {
          onSeatClick(foundSeat);
        }
      }
    } else {
      // Логирование убрано для чистоты консоли
    }
  }, [canvasSeats, onSeatClick, onSeatsSelected, transform, isDragging, isSelecting, getCanvasCoordinates, isSeatActive, hallSeats, zones, seatPrices, prices, seats]);

  // Обработчики для селектора специальной зоны
  const handleSpecialZoneAddToCart = useCallback((quantity: number) => {
    if (!specialZoneSelector) return;
    
    // Создаем виртуальные места для специальной зоны
    const virtualSeats: string[] = [];
    for (let i = 0; i < quantity; i++) {
      virtualSeats.push(`${specialZoneSelector.seatId}-virtual-${i + 1}`);
    }
    
    // Добавляем виртуальные места к выбранным
    setLocalSelectedSeats(prev => {
      const newSelectedSeats = [...prev, ...virtualSeats];
      
      // Вызываем колбэк с обновленным списком
      if (onSeatsSelected) {
        onSeatsSelected(newSelectedSeats);
      }
      
      return newSelectedSeats;
    });
    
    // Скрываем селектор
    setSpecialZoneSelector(null);
  }, [specialZoneSelector, onSeatsSelected]);

  const handleSpecialZoneCancel = useCallback(() => {
    setSpecialZoneSelector(null);
  }, []);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    if (interactionMode !== InteractionMode.ZOOM_PAN) return;
    
    // Исправляем предупреждение preventDefault
    if (event.cancelable) {
    event.preventDefault();
    }
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    
    const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, transform.scale * scaleFactor));
    
    // Зум к точке курсора
    const newOffsetX = mouseX - (mouseX - transform.offsetX) * (newScale / transform.scale);
    const newOffsetY = mouseY - (mouseY - transform.offsetY) * (newScale / transform.scale);
    
    setTransform({
      scale: newScale,
      offsetX: newOffsetX,
      offsetY: newOffsetY
    });
  }, [transform, interactionMode]);


  // Пересчитываем позиции при изменении данных
  useEffect(() => {
    // console.log('🔄 Пересчет позиций мест...');
    const newCanvasSeats = calculateSeatPositions();
    // console.log('📍 Новые canvas места:', {
    //   count: newCanvasSeats.length,
    //   firstSeat: newCanvasSeats[0]
    // });
    setCanvasSeats(newCanvasSeats);
  }, [seats, hallSeats, width, height]);

  // Автоматическое масштабирование при загрузке
  useEffect(() => {
    if (canvasSeats.length > 0) {
      setTimeout(() => {
        fitToView();
      }, 100);
    }
  }, [canvasSeats.length]);

  // Анимация возвращения к ближайшему месту
  useEffect(() => {
    if (!isAnimating || !animationTarget) return;

    const startTime = Date.now();
    const duration = 500; // 500ms анимация
    const startOffsetX = transform.offsetX;
    const startOffsetY = transform.offsetY;
    const deltaX = animationTarget.offsetX - startOffsetX;
    const deltaY = animationTarget.offsetY - startOffsetY;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Используем easing функцию для плавности
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      
      const currentOffsetX = startOffsetX + deltaX * easeOutCubic;
      const currentOffsetY = startOffsetY + deltaY * easeOutCubic;
      
      setTransform(prev => ({
        ...prev,
        offsetX: currentOffsetX,
        offsetY: currentOffsetY
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
        setAnimationTarget(null);
      }
    };

    requestAnimationFrame(animate);
  }, [isAnimating, animationTarget, transform.offsetX, transform.offsetY]);

  // Перерисовываем при изменении состояния
  useEffect(() => {
    renderCanvas();
  }, [canvasSeats, selectedSeats, hoveredSeat, transform, selectedPriceFilters, drawBackgroundOverlay, canvasSize]);

  // Логируем состояние подсказки (только при изменении)
  useEffect(() => {
    if (tooltip.visible && tooltip.content) {
      // Логирование убрано для чистоты консоли
    }
  }, [tooltip.visible, tooltip.content, tooltip.x, tooltip.y]);

  return (
    <div className="price-canvas">
      {/* Фильтр цен */}
      {availablePrices.length > 0 && (
        <div className="price-canvas__price-filter">
          {availablePrices.map((price) => {
            const isSelected = selectedPriceFilters.includes(price);
            return (
              <div key={price} className="price-filter__item" onClick={() => {
                if (isSelected) {
                  // Убираем цену из выбранных
                  setSelectedPriceFilters(prev => prev.filter(p => p !== price));
                } else {
                  // Добавляем цену к выбранным
                  setSelectedPriceFilters(prev => [...prev, price]);
                }
              }}>
                <span 
                  className={`price-filter__button ${isSelected ? 'active' : ''}`}
                  style={{ 
                    '--price-color': isSelected ? getPriceColor(price) : '#d1d5db'
                  } as React.CSSProperties}
                >
                  {price.toLocaleString('ru-RU')} ₽
                </span>
        </div>
            );
          })}
      </div>
      )}
      
      <div className="price-canvas__canvas-container">
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredSeat(null);
          setIsDragging(false);
          setIsSelecting(false);
          setTooltip(prev => ({ ...prev, visible: false }));
        }}
        onWheel={handleWheel}
        className="price-canvas__canvas"
        style={{ 
          cursor: interactionMode === InteractionMode.SELECTION ? 'crosshair' : 
                 (isDragging ? 'grabbing' : 'grab') 
        }}
      />
      
      {/* Кнопки зума на канвасе */}
      <div className="price-canvas__zoom-buttons">
        <button onClick={zoomIn} className="price-canvas__zoom-btn" title="Увеличить">+</button>
        <button onClick={zoomOut} className="price-canvas__zoom-btn" title="Уменьшить">-</button>
      </div>
      </div>
      
      {/* Подсказка при наведении - рендерим в body через Portal */}
      {tooltip.visible && createPortal(
        <div 
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            zIndex: 99999,
            pointerEvents: 'none',
            background: 'white',
            color: '#2c3e50',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: '1.4',
            maxWidth: '200px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
            border: '2px solid #3b82f6',
            fontFamily: 'Arial, sans-serif',
            whiteSpace: 'pre-line'
          }}
        >
          {tooltip.content.split('\\n').map((line, index) => (
            <div key={index} style={{ margin: '2px 0' }}>{line}</div>
          ))}
        </div>,
        document.body
      )}
      
      {/* Селектор специальной зоны */}
      {specialZoneSelector && (
        <SpecialZoneSelector
          isVisible={specialZoneSelector.isVisible}
          position={specialZoneSelector.position}
          zoneName={specialZoneSelector.zoneName}
          capacity={specialZoneSelector.capacity}
          price={specialZoneSelector.price}
          currency={specialZoneSelector.currency}
          onAddToCart={handleSpecialZoneAddToCart}
          onCancel={handleSpecialZoneCancel}
        />
      )}
    </div>
  );
};
