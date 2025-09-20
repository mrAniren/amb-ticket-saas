import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Seat, Zone } from '../../types/Seat.types';
import { transformSvgToCanvas } from '../../utils/svgDataExtractor';
import './HallPreview.scss';

interface HallPreviewProps {
  seats: Seat[];
  zones: Zone[];
  width?: number;
  height?: number;
  onSeatClick?: (seat: Seat) => void;
  selectedSeats?: string[]; // IDs выбранных мест
}

interface CanvasSeat extends Seat {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const HallPreview: React.FC<HallPreviewProps> = ({
  seats,
  zones,
  width = 800,
  height = 600,
  onSeatClick,
  selectedSeats = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSeats, setCanvasSeats] = useState<CanvasSeat[]>([]);
  const [hoveredSeat, setHoveredSeat] = useState<string | null>(null);
  
  // State для зума и панорамирования
  const [transform, setTransform] = useState({
    scale: 1,
    offsetX: 0,
    offsetY: 0
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Рассчитываем позиции мест на основе SVG данных или fallback к автопозиционированию
  const calculateSeatPositions = useCallback(() => {
    if (!seats.length) return [];

    const newCanvasSeats: CanvasSeat[] = [];
    
    // Определяем границы всех SVG элементов для масштабирования
    const seatsWithSvgData = seats.filter(seat => seat.svgData);
    let svgBounds: DOMRect;

    console.log(`🎨 Canvas Preview: ${seats.length} мест всего, ${seatsWithSvgData.length} с SVG данными`);

    if (seatsWithSvgData.length > 0) {
      // Вычисляем общие границы всех SVG элементов
      const allX = seatsWithSvgData.map(s => s.svgData!.x);
      const allY = seatsWithSvgData.map(s => s.svgData!.y);
      const allMaxX = seatsWithSvgData.map(s => s.svgData!.x + s.svgData!.width);
      const allMaxY = seatsWithSvgData.map(s => s.svgData!.y + s.svgData!.height);

      const minX = Math.min(...allX);
      const minY = Math.min(...allY);
      const maxX = Math.max(...allMaxX);
      const maxY = Math.max(...allMaxY);

      svgBounds = {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      } as DOMRect;
    } else {
      // Fallback: используем размеры canvas
      svgBounds = {
        x: 0,
        y: 0,
        width: width,
        height: height
      } as DOMRect;
    }

    seats.forEach((seat, index) => {
      // Пропускаем места без названий (объекты типа 'seat' без ряда и места)
      if (seat.objectType === 'seat' && (!seat.row || !seat.place)) {
        console.log(`⏭️ Пропускаем неназванное место: ${seat.id}`);
        return;
      }
      
      if (seat.svgData) {
        // Используем реальные SVG данные
        const transformedData = transformSvgToCanvas(seat.svgData, svgBounds, width, height);
        
        // Устанавливаем минимальный размер для мест, чтобы они были видны
        const minSeatSize = seat.objectType === 'seat' ? 12 : 8; // Минимум 12px для мест
        const finalWidth = Math.max(transformedData.width, minSeatSize);
        const finalHeight = Math.max(transformedData.height, minSeatSize);
        
        if (index < 5) { // Логируем первые 5 мест для отладки
          console.log(`🎨 Canvas: место ${seat.id} - SVG:`, {
            x: seat.svgData.x, 
            y: seat.svgData.y, 
            width: seat.svgData.width, 
            height: seat.svgData.height
          }, '→ Canvas:', transformedData, '→ Final:', {width: finalWidth, height: finalHeight});
        }
        
        newCanvasSeats.push({
          ...seat,
          x: transformedData.x,
          y: transformedData.y,
          width: finalWidth,
          height: finalHeight
        });
      } else {
        // Fallback: автоматическое позиционирование для мест без SVG данных
        if (seat.objectType === 'seat' && seat.row !== undefined) {
          // Группируем по рядам (как было раньше)
          const rowNum = seat.row;
          const seatPlace = seat.place || 0;
          
          const seatWidth = 25;
          const seatHeight = 25;
          const rowSpacing = 35;
          const seatSpacing = 30;
          
          newCanvasSeats.push({
            ...seat,
            x: 50 + seatPlace * seatSpacing,
            y: 50 + rowNum * rowSpacing,
            width: seatWidth,
            height: seatHeight
          });
        } else {
          // Статичные элементы без SVG данных
          let elementWidth = 80;
          let elementHeight = 40;
          let x = width / 2 - elementWidth / 2;
          let y = 10;

          if (seat.objectType === 'scene') {
            elementWidth = 200;
            elementHeight = 30;
            x = width / 2 - elementWidth / 2;
            y = 10;
          } else if (seat.objectType === 'decoration') {
            elementWidth = 40;
            elementHeight = 40;
            x = 20 + (index % 3) * 50;
            y = height - 60;
          }

          newCanvasSeats.push({
            ...seat,
            x,
            y,
            width: elementWidth,
            height: elementHeight
          });
        }
      }
    });

    return newCanvasSeats;
  }, [seats, width, height]);

  // Получаем цвет зоны
  const getZoneColor = useCallback((zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone?.color || '#F8D013';
  }, [zones]);

  // Рендерим Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Очищаем canvas
    ctx.clearRect(0, 0, width, height);

    // Рисуем фон
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);

    // Применяем трансформации (зум и панорамирование)
    ctx.save();
    ctx.translate(transform.offsetX, transform.offsetY);
    ctx.scale(transform.scale, transform.scale);

    // console.log(`🎨 Рендеринг Canvas: ${canvasSeats.length} мест для отрисовки`);
    if (canvasSeats.length > 0) {
      console.log('🎨 Первые 3 места для рендеринга:', canvasSeats.slice(0, 3).map(seat => ({
        id: seat.id,
        x: seat.x,
        y: seat.y,
        width: seat.width,
        height: seat.height,
        objectType: seat.objectType,
        shape: seat.svgData?.shape
      })));
      
      // Ищем большие элементы (возможно, жёлтый квадрат)
      const bigElements = canvasSeats.filter(seat => seat.width > 200 || seat.height > 200);
      if (bigElements.length > 0) {
        console.log('🟨 БОЛЬШИЕ элементы (возможно перекрывают всё):', bigElements.map(seat => ({
          id: seat.id,
          objectType: seat.objectType,
          x: seat.x,
          y: seat.y,
          width: seat.width,
          height: seat.height,
          fillColor: seat.objectType === 'seat' ? getZoneColor(seat.zone || '') : 'unknown'
        })));
      }
    }

    // Сортируем места: сначала большие (фон), потом маленькие (места)
    const sortedSeats = [...canvasSeats].sort((a, b) => {
      // Сначала рисуем большие элементы (сцена, декорации, фон)
      const aSize = a.width * a.height;
      const bSize = b.width * b.height;
      return bSize - aSize; // От больших к маленьким
    });

    // Рисуем места в правильном порядке
    sortedSeats.forEach((seat, index) => {
      const isSelected = selectedSeats.includes(seat.id as string);
      const isHovered = hoveredSeat === seat.id;
      const isClickable = seat.objectType === 'seat';

      // Определяем цвет и стиль
      let fillColor = '#e0e0e0';
      let strokeColor = '#999';
      let strokeWidth = 1;

      if (seat.objectType === 'seat') {
        fillColor = isSelected ? '#ff6b35' : getZoneColor(seat.zone || '');
        strokeColor = isSelected ? '#ff6b35' : '#333';
        strokeWidth = isSelected ? 3 : 1;
        
        if (isHovered) {
          strokeColor = '#007bff';
          strokeWidth = 2;
        }
      } else if (seat.objectType === 'scene') {
        fillColor = '#8a2be2';
        strokeColor = '#5a1b82';
      } else if (seat.objectType === 'decoration') {
        fillColor = '#28a745';
        strokeColor = '#1e7e34';
      } else if (seat.objectType === 'passage') {
        fillColor = '#6c757d';
        strokeColor = '#495057';
      }

      // Рисуем элемент
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = strokeWidth;

      // Логируем отрисовку первых 3 мест
      if (index < 3 && seat.objectType === 'seat') {
        console.log(`🖌️ Рисуем место ${seat.id}:`, {
          x: seat.x, y: seat.y, width: seat.width, height: seat.height,
          fillColor, strokeColor, strokeWidth, zone: seat.zone
        });
      }

      // Определяем форму элемента для отрисовки
      const shape = seat.svgData?.shape;
      
      // Рисуем элемент согласно его форме из SVG
      if (shape === 'circle') {
        const centerX = seat.x + seat.width / 2;
        const centerY = seat.y + seat.height / 2;
        const radius = Math.min(seat.width, seat.height) / 2 - strokeWidth;

        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'ellipse') {
        const ellipseCenterX = seat.x + seat.width / 2;
        const ellipseCenterY = seat.y + seat.height / 2;
        const radiusX = seat.width / 2 - strokeWidth;
        const radiusY = seat.height / 2 - strokeWidth;

        ctx.beginPath();
        ctx.ellipse(ellipseCenterX, ellipseCenterY, radiusX, radiusY, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else if (shape === 'rect') {
        const rectX = seat.x + strokeWidth / 2;
        const rectY = seat.y + strokeWidth / 2;
        const rectWidth = seat.width - strokeWidth;
        const rectHeight = seat.height - strokeWidth;

        if (seat.svgData?.rx && seat.svgData?.ry) {
          // Прямоугольник с закругленными углами
          const rx = Math.min(seat.svgData.rx, rectWidth / 2);
          const ry = Math.min(seat.svgData.ry, rectHeight / 2);
          
          ctx.beginPath();
          ctx.roundRect(rectX, rectY, rectWidth, rectHeight, [rx, ry]);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
          ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
        }
      } else if (shape === 'path' && seat.svgData?.pathData) {
        // Рисуем реальный SVG path
        try {
          const path2D = new Path2D(seat.svgData.pathData);
          
          // Применяем трансформацию для правильного позиционирования
          ctx.save();
          
          // Масштабируем path к нужному размеру и позиции
          const originalBBox = seat.svgData;
          if (originalBBox.width && originalBBox.height) {
            const scaleX = seat.width / originalBBox.width;
            const scaleY = seat.height / originalBBox.height;
            const offsetX = seat.x - originalBBox.x * scaleX;
            const offsetY = seat.y - originalBBox.y * scaleY;
            
            ctx.translate(offsetX, offsetY);
            ctx.scale(scaleX, scaleY);
          }
          
          ctx.fill(path2D);
          ctx.stroke(path2D);
          ctx.restore();
          
          console.log(`🎨 Отрисован path для ${seat.id}: ${seat.svgData.pathData.substring(0, 50)}...`);
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
      } else {
        // Для неизвестных форм - рисуем прямоугольник
        const rectX = seat.x + strokeWidth / 2;
        const rectY = seat.y + strokeWidth / 2;
        const rectWidth = seat.width - strokeWidth;
        const rectHeight = seat.height - strokeWidth;

        ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
        ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
      }

      // Добавляем текст для всех элементов
      let displayText = '';
      if (seat.objectType === 'seat' && seat.place) {
        displayText = seat.place.toString();
      } else if (seat.objectType === 'scene') {
        displayText = 'СЦЕНА';
      } else if (seat.objectType === 'decoration') {
        displayText = 'ДЕК';
      } else if (seat.objectType === 'passage') {
        displayText = 'ПРОХОД';
      } else if (seat.objectType === 'technical_zone') {
        displayText = 'ТЕХ';
      }
      
      if (displayText) {
        ctx.fillStyle = (shape === 'circle' || shape === 'ellipse') ? '#fff' : '#333';
        ctx.font = `${Math.min(seat.width, seat.height) / 4}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const textX = seat.x + seat.width / 2;
        const textY = seat.y + seat.height / 2;
        
        ctx.fillText(displayText, textX, textY);
      }
    });

    // Рисуем номера рядов
    const rows = [...new Set(canvasSeats.filter(s => s.objectType === 'seat' && s.row).map(s => s.row))].sort();
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    // Восстанавливаем контекст после трансформаций
    ctx.restore();

    // Рисуем номера рядов (без трансформаций)
    rows.forEach(row => {
      const firstSeatInRow = canvasSeats.find(s => s.row === row);
      if (firstSeatInRow) {
        const transformedY = firstSeatInRow.y * transform.scale + transform.offsetY;
        ctx.fillText(`Ряд ${row}`, 10, transformedY + firstSeatInRow.height / 2 + 4);
      }
    });

  }, [canvasSeats, selectedSeats, hoveredSeat, zones, width, height, getZoneColor, transform]);

  // Функции управления зумом и панорамированием
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    
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
  }, [transform]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (event.button === 0) { // Левая кнопка мыши
      setIsDragging(true);
      setDragStart({ x: event.clientX - transform.offsetX, y: event.clientY - transform.offsetY });
    }
  }, [transform]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const newOffsetX = event.clientX - dragStart.x;
      const newOffsetY = event.clientY - dragStart.y;
      
      setTransform(prev => ({
        ...prev,
        offsetX: newOffsetX,
        offsetY: newOffsetY
      }));
    } else {
      // Обработка наведения на места
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left - transform.offsetX) / transform.scale;
      const y = (event.clientY - rect.top - transform.offsetY) / transform.scale;

      const hoveredSeatElement = canvasSeats.find(seat =>
        x >= seat.x && x <= seat.x + seat.width &&
        y >= seat.y && y <= seat.y + seat.height &&
        seat.objectType === 'seat'
      );

      const newHoveredId = hoveredSeatElement?.id as string || null;
      if (newHoveredId !== hoveredSeat) {
        setHoveredSeat(newHoveredId);
        canvas.style.cursor = newHoveredId ? 'pointer' : (isDragging ? 'grabbing' : 'grab');
      }
    }
  }, [isDragging, dragStart, transform, canvasSeats, hoveredSeat]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Обработка кликов
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return; // Не обрабатываем клики во время перетаскивания
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left - transform.offsetX) / transform.scale;
    const y = (event.clientY - rect.top - transform.offsetY) / transform.scale;

    // Проверяем клик по местам
    const clickedSeat = canvasSeats.find(seat => 
      seat.objectType === 'seat' &&
      x >= seat.x && 
      x <= seat.x + seat.width && 
      y >= seat.y && 
      y <= seat.y + seat.height
    );

    if (clickedSeat && onSeatClick) {
      onSeatClick(clickedSeat);
    }
  }, [canvasSeats, onSeatClick, transform, isDragging]);



  // Функции управления зумом (определяем ДО использования в useEffect!)
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

    const scaleX = (width - 40) / contentWidth;
    const scaleY = (height - 40) / contentHeight;
    const newScale = Math.min(scaleX, scaleY, 1);

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    setTransform({
      scale: newScale,
      offsetX: width / 2 - centerX * newScale,
      offsetY: height / 2 - centerY * newScale
    });
  }, [canvasSeats, width, height]);

  // Пересчитываем позиции при изменении данных
  useEffect(() => {
    const newCanvasSeats = calculateSeatPositions();
    setCanvasSeats(newCanvasSeats);
  }, [seats, zones, width, height]);

  // Автоматическое масштабирование при загрузке
  useEffect(() => {
    if (canvasSeats.length > 0) {
      // Небольшая задержка для корректного расчета
      setTimeout(() => {
        fitToView();
      }, 100);
    }
  }, [canvasSeats.length]);

  // Перерисовываем при изменении состояния
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  return (
    <div className="hall-preview">
      <div className="hall-preview__controls">
        <button onClick={zoomIn} className="hall-preview__control-btn">+</button>
        <button onClick={zoomOut} className="hall-preview__control-btn">-</button>
        <button onClick={fitToView} className="hall-preview__control-btn">⌂</button>
        <span className="hall-preview__zoom-level">{Math.round(transform.scale * 100)}%</span>
      </div>
      
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setHoveredSeat(null);
          setIsDragging(false);
        }}
        onWheel={handleWheel}
        className="hall-preview__canvas"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      />
    </div>
  );
};

export default HallPreview;
