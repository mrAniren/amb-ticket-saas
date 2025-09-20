import { Seat } from '../types/Seat.types';

export interface SvgElementData {
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rect' | 'circle' | 'ellipse' | 'path' | 'polygon';
  pathData?: string; // Для path элементов
  rx?: number; // Для rect с закругленными углами
  ry?: number; // Для rect с закругленными углами
  cx?: number; // Центр для circle/ellipse
  cy?: number; // Центр для circle/ellipse
  r?: number;  // Радиус для circle
  points?: Array<{x: number, y: number}>; // Массив точек полигона для рендеринга
  polygonPoints?: string; // Для polygon элементов (строка)
  transform?: string; // CSS transform
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  originalShape?: string; // Оригинальная форма элемента
  generatedAsCircle?: boolean; // Флаг что полигон сгенерирован как идеальный круг
}

/**
 * Извлекает геометрические данные из SVG элемента
 */
export function extractSvgElementData(element: SVGElement): SvgElementData {
  const tagName = element.tagName.toLowerCase();
  const bbox = element.getBBox();
  const computedStyle = window.getComputedStyle(element);
  
  // Базовые данные из bounding box
  let data: SvgElementData = {
    x: bbox.x,
    y: bbox.y,
    width: bbox.width,
    height: bbox.height,
    shape: 'rect', // По умолчанию
    fill: computedStyle.fill || element.getAttribute('fill') || '#000000',
    stroke: computedStyle.stroke || element.getAttribute('stroke') || 'none',
    strokeWidth: parseFloat(computedStyle.strokeWidth || element.getAttribute('stroke-width') || '1'),
    transform: element.getAttribute('transform') || undefined
  };

  // Специфичные данные в зависимости от типа элемента
  switch (tagName) {
    case 'rect':
      data.shape = 'rect';
      data.x = parseFloat(element.getAttribute('x') || '0') || bbox.x;
      data.y = parseFloat(element.getAttribute('y') || '0') || bbox.y;
      data.width = parseFloat(element.getAttribute('width') || '0') || bbox.width;
      data.height = parseFloat(element.getAttribute('height') || '0') || bbox.height;
      data.rx = parseFloat(element.getAttribute('rx') || '0') || undefined;
      data.ry = parseFloat(element.getAttribute('ry') || '0') || undefined;
      break;

    case 'circle':
      data.shape = 'circle';
      data.cx = parseFloat(element.getAttribute('cx') || '0');
      data.cy = parseFloat(element.getAttribute('cy') || '0');
      data.r = parseFloat(element.getAttribute('r') || '0');
      data.x = data.cx - data.r;
      data.y = data.cy - data.r;
      data.width = data.r * 2;
      data.height = data.r * 2;
      break;

    case 'ellipse':
      data.shape = 'ellipse';
      data.cx = parseFloat(element.getAttribute('cx') || '0');
      data.cy = parseFloat(element.getAttribute('cy') || '0');
      const rx = parseFloat(element.getAttribute('rx') || '0');
      const ry = parseFloat(element.getAttribute('ry') || '0');
      data.rx = rx;
      data.ry = ry;
      data.x = data.cx - rx;
      data.y = data.cy - ry;
      data.width = rx * 2;
      data.height = ry * 2;
      break;

    case 'path':
      data.shape = 'path';
      data.pathData = element.getAttribute('d') || '';
      break;

    case 'polygon':
      data.shape = 'polygon';
      data.polygonPoints = element.getAttribute('points') || '';
      break;

    default:
      // Для других элементов используем bbox
      data.shape = 'rect';
      break;
  }

  // Конвертируем в полигон для высококачественного рендеринга
  const polygonData = convertToPolygon(element, data);
  
  return polygonData;
}

/**
 * Обновляет объект Seat данными из SVG элемента
 */
export function enhanceSeatWithSvgData(seat: Seat, svgElement: SVGElement): Seat {
  try {
    const svgData = extractSvgElementData(svgElement);
    
    return {
      ...seat,
      svgData: svgData,
      // Сохраняем дополнительные поля для совместимости
      x: svgData.x,
      y: svgData.y,
      width: svgData.width,
      height: svgData.height
    };
  } catch (error) {
    console.warn('Ошибка извлечения SVG данных для места:', seat.id, error);
    return seat;
  }
}

/**
 * Ищет SVG элемент по CSS селектору
 */
export function findSvgElementBySelector(selector: string, container?: HTMLElement): SVGElement | null {
  try {
    const element = (container || document).querySelector(selector);
    return element as SVGElement;
  } catch (error) {
    console.warn('Ошибка поиска SVG элемента по селектору:', selector, error);
    return null;
  }
}

/**
 * Преобразует координаты SVG в координаты Canvas с учетом масштабирования
 */
export function transformSvgToCanvas(
  svgData: SvgElementData, 
  svgBounds: DOMRect, 
  canvasWidth: number, 
  canvasHeight: number,
  padding: number = 20
): SvgElementData {
  const availableWidth = canvasWidth - (padding * 2);
  const availableHeight = canvasHeight - (padding * 2);
  
  const scaleX = availableWidth / svgBounds.width;
  const scaleY = availableHeight / svgBounds.height;
  const scale = Math.min(scaleX, scaleY, 1); // Не увеличиваем, только уменьшаем
  
  const scaledWidth = svgBounds.width * scale;
  const scaledHeight = svgBounds.height * scale;
  
  const offsetX = (canvasWidth - scaledWidth) / 2;
  const offsetY = (canvasHeight - scaledHeight) / 2;
  
  return {
    ...svgData,
    x: (svgData.x - svgBounds.x) * scale + offsetX,
    y: (svgData.y - svgBounds.y) * scale + offsetY,
    width: svgData.width * scale,
    height: svgData.height * scale,
    r: svgData.r ? svgData.r * scale : undefined,
    rx: svgData.rx ? svgData.rx * scale : undefined,
    ry: svgData.ry ? svgData.ry * scale : undefined,
    cx: svgData.cx ? (svgData.cx - svgBounds.x) * scale + offsetX : undefined,
    cy: svgData.cy ? (svgData.cy - svgBounds.y) * scale + offsetY : undefined,
    strokeWidth: svgData.strokeWidth ? svgData.strokeWidth * scale : undefined
  };
}

/**
 * Конвертирует SVG элемент в полигон с высоким разрешением (128 точек)
 */
function convertToPolygon(element: SVGElement, svgData: SvgElementData): SvgElementData {
  const tagName = element.tagName.toLowerCase();
  
  try {
    switch(tagName) {
      case 'circle':
        return {
          ...svgData,
          points: circleToPolygon(svgData.cx || svgData.x + svgData.width/2, svgData.cy || svgData.y + svgData.height/2, svgData.r || Math.min(svgData.width, svgData.height)/2),
          originalShape: 'circle',
          generatedAsCircle: true
        };
      case 'ellipse':
        return {
          ...svgData,
          points: ellipseToPolygon(svgData.cx || svgData.x + svgData.width/2, svgData.cy || svgData.y + svgData.height/2, svgData.width/2, svgData.height/2),
          originalShape: 'ellipse'
        };
      case 'path':
        return {
          ...svgData,
          points: pathToPolygon(element, svgData),
          originalShape: 'path'
        };
      case 'polygon':
        return {
          ...svgData,
          points: parsePolygonPoints(svgData.polygonPoints || ''),
          originalShape: 'polygon'
        };
      case 'rect':
        return {
          ...svgData,
          points: rectToPolygon(svgData.x, svgData.y, svgData.width, svgData.height),
          originalShape: 'rect'
        };
      default:
        return svgData;
    }
  } catch (error) {
    console.warn('Ошибка конвертации в полигон:', error);
    return svgData;
  }
}

/**
 * Создает полигон из круга
 */
function circleToPolygon(cx: number, cy: number, r: number, pointCount: number = 128): Array<{x: number, y: number}> {
  const points: Array<{x: number, y: number}> = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * 2 * Math.PI;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  return points;
}

/**
 * Создает полигон из эллипса
 */
function ellipseToPolygon(cx: number, cy: number, rx: number, ry: number, pointCount: number = 128): Array<{x: number, y: number}> {
  const points: Array<{x: number, y: number}> = [];
  for (let i = 0; i < pointCount; i++) {
    const angle = (i / pointCount) * 2 * Math.PI;
    points.push({
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle)
    });
  }
  return points;
}

/**
 * Создает полигон из прямоугольника
 */
function rectToPolygon(x: number, y: number, width: number, height: number): Array<{x: number, y: number}> {
  return [
    {x, y},
    {x: x + width, y},
    {x: x + width, y: y + height},
    {x, y: y + height}
  ];
}

/**
 * Конвертирует path в полигон
 */
function pathToPolygon(pathElement: SVGElement, svgData: SvgElementData): Array<{x: number, y: number}> {
  const pathData = pathElement.getAttribute('d');
  if (!pathData) return [];

  // Для маленьких элементов (вероятно места) создаем идеальный круг
  const area = svgData.width * svgData.height;
  if (area < 2000 && svgData.width < 80 && svgData.height < 80) {
    const cx = svgData.x + svgData.width / 2;
    const cy = svgData.y + svgData.height / 2;
    const r = Math.min(svgData.width, svgData.height) / 2;
    return circleToPolygon(cx, cy, r, 128);
  }

  // Для больших элементов пытаемся получить точки из path
  try {
    const pathLength = (pathElement as SVGPathElement).getTotalLength?.() || 0;
    if (pathLength === 0) {
      // Fallback: создаем прямоугольник
      return rectToPolygon(svgData.x, svgData.y, svgData.width, svgData.height);
    }

    const pointCount = Math.min(128, Math.max(16, Math.floor(pathLength / 2)));
    const points: Array<{x: number, y: number}> = [];
    
    for (let i = 0; i < pointCount; i++) {
      const distance = (i / (pointCount - 1)) * pathLength;
      const point = (pathElement as SVGPathElement).getPointAtLength?.(distance);
      if (point) {
        points.push({x: point.x, y: point.y});
      }
    }
    
    return points.length > 0 ? points : rectToPolygon(svgData.x, svgData.y, svgData.width, svgData.height);
  } catch (error) {
    console.warn('Ошибка обработки path:', error);
    return rectToPolygon(svgData.x, svgData.y, svgData.width, svgData.height);
  }
}

/**
 * Парсит строку точек полигона
 */
function parsePolygonPoints(pointsStr: string): Array<{x: number, y: number}> {
  if (!pointsStr) return [];
  
  const coords = pointsStr.trim().split(/[\s,]+/).map(Number);
  const points: Array<{x: number, y: number}> = [];
  
  for (let i = 0; i < coords.length; i += 2) {
    if (i + 1 < coords.length) {
      points.push({x: coords[i], y: coords[i + 1]});
    }
  }
  
  return points;
}

