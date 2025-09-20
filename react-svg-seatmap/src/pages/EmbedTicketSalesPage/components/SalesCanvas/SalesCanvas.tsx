import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './SalesCanvas.scss';

export interface SeatInfo {
  seatId: string;
  priceId: string;
  status: 'available' | 'reserved' | 'sold' | 'locked';
  cssSelector?: string;
}

interface TicketInfo {
  id: string;
  sessionId: string;
  seatId: string;
  row: number;
  seat: number;
  price: number;
  currency: string;
  status: 'available' | 'reserved' | 'sold' | 'locked';
  reservedUntil?: string;
}

interface SalesCanvasProps {
  // Убираем svgUrl - больше не нужен
  seatInfos: SeatInfo[];
  selectedSeats: string[];
  onSeatClick: (seatId: string) => void;
  priceFilters: string[];
  priceScheme: any;
  // Новые пропсы для Canvas подхода
  hallSeats?: {
    seatId: string;
    row: number;
    seatNumber: number;
    section: string;
    x: number;
    y: number;
    width: number;
    height: number;
    objectType: string;
  }[];
  tickets?: TicketInfo[];
  width?: number;
  height?: number;
}

interface CanvasSeat {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  objectType?: string;
  isClickable?: boolean;
  section?: string;
  row?: number;
  place?: number;
  status?: 'available' | 'reserved' | 'sold';
  priceId?: string;
}

export const SalesCanvas: React.FC<SalesCanvasProps> = ({
  seatInfos,
  selectedSeats,
  onSeatClick,
  priceFilters,
  priceScheme,
  hallSeats = [],
  tickets = [],
  width = 800,
  height = 600
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSeats, setCanvasSeats] = useState<CanvasSeat[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  
  // console.log('🎫 SalesCanvas данные:', {
  //   seatInfosCount: seatInfos.length,
  //   hallSeatsCount: hallSeats.length,
  //   ticketsCount: tickets.length,
  //   selectedSeatsCount: selectedSeats.length,
  //   priceFiltersCount: priceFilters.length
  // });
  
  // 🎯 Преобразуем hallSeats в canvasSeats с учетом билетов
  const calculateSeatPositions = useCallback(() => {
    if (hallSeats.length === 0) {
      // console.log('❌ Нет данных hallSeats для рендеринга');
      return [];
    }

    // console.log('💺 Используем данные из hallSeats:', {
    //   count: hallSeats.length,
    //   firstSeat: hallSeats[0]
    // });

    const newCanvasSeats: CanvasSeat[] = [];

    hallSeats.forEach((hallSeat, index) => {
      // Определяем является ли место кликабельным
      const isClickableSeat = hallSeat.objectType === 'seat' && 
                             hallSeat.row && 
                             hallSeat.seatNumber && 
                             hallSeat.section;

      // Находим информацию о билете для этого места
      const ticketInfo = tickets.find(t => t.seatId === hallSeat.seatId);
      
      // Находим информацию о цене из seatInfos
      const seatInfo = seatInfos.find(si => si.seatId === hallSeat.seatId);
      
      const canvasSeat: CanvasSeat = {
        id: hallSeat.seatId,
        x: hallSeat.x,
        y: hallSeat.y,
        width: hallSeat.width,
        height: hallSeat.height,
        objectType: hallSeat.objectType,
        isClickable: Boolean(isClickableSeat),
        section: hallSeat.section,
        row: hallSeat.row,
        place: hallSeat.seatNumber,
        status: ticketInfo?.status || seatInfo?.status || 'available',
        priceId: seatInfo?.priceId
      };

      newCanvasSeats.push(canvasSeat);

      // Логируем первые несколько мест
      if (index < 5) {
        console.log(`🎫 Canvas место ${index + 1}:`, {
          seatId: canvasSeat.id,
          status: canvasSeat.status,
          priceId: canvasSeat.priceId,
          isClickable: canvasSeat.isClickable,
          coords: { x: canvasSeat.x, y: canvasSeat.y }
        });
      }
    });

    console.log('✅ Обработано мест для продажи:', newCanvasSeats.length);
    return newCanvasSeats;
  }, [hallSeats, tickets, seatInfos]);

  // Обновляем позиции мест при изменении данных
  useEffect(() => {
    const seats = calculateSeatPositions();
    setCanvasSeats(seats);
  }, [calculateSeatPositions]);

  // 🎨 Получаем цвет места на основе цены
  const getSeatColor = useCallback((seatId: string, priceId?: string) => {
    if (priceId && priceScheme?.prices) {
      const price = priceScheme.prices.find((p: any) => p.id === priceId);
      if (price?.color) return price.color;
    }
    
    // Красивые цвета по умолчанию
    const colorPalette = [
      '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
      '#dda0dd', '#98d8c8', '#f7dc6f', '#bb8fce'
    ];
    
    const hash = seatId.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    
    return colorPalette[Math.abs(hash) % colorPalette.length];
  }, [priceScheme]);

  // 🎨 Рендеринг Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.log('❌ Canvas ref не найден');
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('❌ Canvas context не найден');
      return;
    }

    console.log('🎨 Начинаем рендеринг canvas:', {
      canvasSize: { width, height },
      seatsCount: canvasSeats.length,
      canvasElement: canvas
    });

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);

    // Рендерим каждое место
    console.log('🎨 Рендерим места:', canvasSeats.length);
    canvasSeats.forEach((seat, index) => {
      if (index < 3) {
        console.log(`🎨 Место ${index + 1}:`, {
          id: seat.id,
          coords: { x: seat.x, y: seat.y, width: seat.width, height: seat.height },
          objectType: seat.objectType,
          isClickable: seat.isClickable
        });
      }
      
      const isSelected = selectedSeats.includes(seat.id);
      const isHovered = hoveredSeat === seat.id;
      const isClickable = seat.isClickable === true;
      
      // 🎨 КРАСИВЫЕ СТИЛИ ДЛЯ ПРОДАЖИ БИЛЕТОВ
      let fillColor = '#f8f9fa';
      let strokeColor = '#dee2e6';
      let strokeWidth = 1;
      let shadow = false;

      if (seat.objectType === 'seat' && isClickable) {
        // Определяем цвет в зависимости от статуса
        if (seat.status === 'sold') {
          // 🚫 Проданные места
          fillColor = '#6c757d'; // Серый
          strokeColor = '#495057';
          strokeWidth = 1;
        } else if (seat.status === 'reserved') {
          // ⏳ Зарезервированные места
          fillColor = '#ffc107'; // Желтый
          strokeColor = '#e0a800';
          strokeWidth = 1.5;
        } else if (isSelected) {
          // ✅ Выбранные места
          fillColor = '#28a745'; // Зеленый
          strokeColor = '#ffffff';
          strokeWidth = 3;
          shadow = true;
        } else {
          // 💺 Доступные места
          fillColor = getSeatColor(seat.id, seat.priceId);
          strokeColor = '#2d3436';
          strokeWidth = 1.5;
          
          // Проверяем фильтр цен
          if (priceFilters.length > 0 && seat.priceId && !priceFilters.includes(seat.priceId)) {
            fillColor = '#f1f3f4'; // Приглушенный для отфильтрованных
            strokeColor = '#dadce0';
          }
        }
        
        if (isHovered && seat.status === 'available' && !isSelected) {
          // ⚡ Эффект при наведении
          strokeColor = '#0984e3';
          strokeWidth = 2.5;
          shadow = true;
        }
      } else if (seat.objectType === 'scene') {
        // 🎭 Сцена
        fillColor = '#2d3436';
        strokeColor = '#636e72';
        strokeWidth = 2;
      } else if (seat.objectType === 'decoration') {
        // 🎨 Декорации
        fillColor = '#a29bfe';
        strokeColor = '#6c5ce7';
        strokeWidth = 1.5;
      }

      // Применяем тень
      if (shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // Рисуем место
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      // Рендерим полигоны из БД (как в PriceCanvas)
      const shape = (seat as any).svgData?.shape;
      
      if (shape === 'polygon' && (seat as any).svgData?.points) {
        const points = (seat as any).svgData.points;
        
        if (points.length >= 3) {
          // Рисуем полигон по точкам
          ctx.beginPath();
          ctx.moveTo(seat.x + (points[0].x - (seat as any).svgData.x), seat.y + (points[0].y - (seat as any).svgData.y));
          
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(seat.x + (points[i].x - (seat as any).svgData.x), seat.y + (points[i].y - (seat as any).svgData.y));
          }
          
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Логируем рендеринг полигона
          if (index < 3) {
            console.log(`🔷 Отрисован полигон ${seat.id}:`, {
              pointsCount: points.length,
              originalShape: (seat as any).svgData?.originalShape
            });
          }
        } else {
          // Fallback: если точек мало, рисуем прямоугольник
          const rectX = seat.x + strokeWidth / 2;
          const rectY = seat.y + strokeWidth / 2;
          const rectWidth = seat.width - strokeWidth;
          const rectHeight = seat.height - strokeWidth;
          
          ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        }
      } else if (shape === 'path' && (seat as any).svgData?.pathData && (seat as any).svgData.pathData.includes('C')) {
        // Рисуем как идеальный круг
        const centerX = seat.x + seat.width / 2;
        const centerY = seat.y + seat.height / 2;
        const radius = Math.min(seat.width, seat.height) / 2 - strokeWidth;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        // Для неизвестных форм - рисуем прямоугольник
        const rectX = seat.x + strokeWidth / 2;
        const rectY = seat.y + strokeWidth / 2;
        const rectWidth = seat.width - strokeWidth;
        const rectHeight = seat.height - strokeWidth;

        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      }

      // Добавляем галочку для выбранных мест
      if (isSelected && seat.status === 'available') {
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✓', seat.x + seat.width / 2, seat.y + seat.height / 2 + 4);
      }

      // Добавляем X для проданных мест
      if (seat.status === 'sold') {
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('✗', seat.x + seat.width / 2, seat.y + seat.height / 2 + 4);
      }
    });
    
    console.log('✅ Рендеринг canvas завершен');
  }, [canvasSeats, selectedSeats, hoveredSeat, priceFilters, getSeatColor, width, height]);

  // Рендерим при изменении состояния
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // 🖱️ Обработка кликов
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Ищем место под кликом
    const clickedSeat = canvasSeats.find(seat => 
      seat.objectType === 'seat' &&
      seat.isClickable === true &&
      seat.status === 'available' && // Можно кликать только доступные места
      x >= seat.x && 
      x <= seat.x + seat.width && 
      y >= seat.y && 
      y <= seat.y + seat.height
    );

    if (clickedSeat) {
      console.log('🎫 Клик по месту:', clickedSeat.id, 'статус:', clickedSeat.status);
      onSeatClick(clickedSeat.id);
    }
  }, [canvasSeats, onSeatClick]);

  // 🖱️ Обработка наведения
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hoveredSeatFound = canvasSeats.find(seat => 
      seat.objectType === 'seat' &&
      seat.isClickable === true &&
      x >= seat.x && 
      x <= seat.x + seat.width && 
      y >= seat.y && 
      y <= seat.y + seat.height
    );

    setHoveredSeat(hoveredSeatFound ? hoveredSeatFound.id : null);
  }, [canvasSeats]);

  const handleMouseLeave = useCallback(() => {
    setHoveredSeat(null);
  }, []);

  return (
    <div className="sales-canvas">
      {/* Сцена */}
      <div className="stage-label">Сцена</div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ 
          cursor: hoveredSeat ? 'pointer' : 'default',
          border: '2px solid #dee2e6',
          borderRadius: '8px',
          background: '#ffffff',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
        className="sales-canvas__canvas"
      />
      
      {/* Легенда статусов */}
      <div className="sales-canvas__legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4ecdc4' }}></div>
          <span>Доступно</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#28a745' }}></div>
          <span>Выбрано</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#ffc107' }}></div>
          <span>Забронировано</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#6c757d' }}></div>
          <span>Продано</span>
      </div>
      </div>
    </div>
  );
};
