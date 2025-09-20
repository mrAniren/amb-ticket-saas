const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

/**
 * Парсер SVG файлов для извлечения информации о местах
 */
class SVGParser {
  constructor() {
    this.seatElements = ['circle', 'rect', 'ellipse', 'path', 'polygon'];
    this.excludeAttributes = ['stroke-dasharray']; // Исключаем декоративные элементы
    
    // Настройки разрешения для конвертации в полигоны (ультра качество)
    this.shapeResolution = {
      'circle': 128,    // Круги - ультра гладкость
      'ellipse': 128,   // Эллипсы - ультра гладкость  
      'path': 128,      // Сложные path - ультра качество
      'polygon': 0      // Полигоны остаются как есть
    };
  }

  /**
   * Парсит SVG файл и извлекает информацию о местах
   * @param {string} svgFilePath - путь к SVG файлу
   * @returns {Promise<Array>} массив объектов с информацией о местах
   */
  async parseSVGFile(svgFilePath) {
    try {
      console.log('📄 Парсим SVG файл:', svgFilePath);
      
      // Читаем SVG файл
      const svgContent = fs.readFileSync(svgFilePath, 'utf8');
      
      // Создаем DOM из SVG
      const dom = new JSDOM(svgContent, { contentType: 'image/svg+xml' });
      const document = dom.window.document;
      const svgElement = document.querySelector('svg');
      
      if (!svgElement) {
        throw new Error('SVG элемент не найден в файле');
      }

      // Получаем размеры SVG
      const svgWidth = parseFloat(svgElement.getAttribute('width')) || 800;
      const svgHeight = parseFloat(svgElement.getAttribute('height')) || 600;
      
      console.log('📏 Размеры SVG:', { width: svgWidth, height: svgHeight });

      // Ищем все элементы, которые могут быть местами
      const allElements = svgElement.querySelectorAll(
        this.seatElements.map(tag => tag).join(', ')
      );
      
      console.log('🔍 Найдено элементов:', allElements.length);

      const seats = [];
      let seatCounter = 0;

      allElements.forEach((element, index) => {
        // Пропускаем декоративные элементы
        if (this.isDecorativeElement(element)) {
          return;
        }

        // Извлекаем координаты элемента
        const coords = this.getElementCoordinates(element);
        if (!coords) {
          return;
        }

        seatCounter++;
        
        // Определяем секцию на основе позиции
        const section = this.determineSectionByPosition(coords, svgWidth, svgHeight);
        
        // Вычисляем ряд и место на основе позиции и секции
        const { row, seatNumber } = this.calculateRowAndSeat(coords, section, seatCounter);
        
        // Конвертируем элемент в полигон для высококачественного рендеринга
        const polygonData = this.convertToPolygon(element);
        
        // Создаем уникальный ID для элемента
        const seatId = element.id || `element-${row}-${seatNumber}-${index}`;
        
        const seat = {
          seatId: seatId,
          row: row,
          seatNumber: seatNumber,
          section: section,
          x: Math.round(coords.x),
          y: Math.round(coords.y),
          width: Math.round(coords.width || 0),
          height: Math.round(coords.height || 0),
          objectType: 'seat', // По умолчанию, будет переопределен в маршруте
          svgElementId: element.id || `temp-element-${index}`,
          svgTagName: element.tagName,
          isAvailable: true,
          svgData: polygonData || {
            shape: element.tagName.toLowerCase(),
            originalShape: element.tagName.toLowerCase(),
            fallback: true
          },
          metadata: {
            originalIndex: index,
            svgAttributes: this.getRelevantAttributes(element)
          }
        };

        seats.push(seat);
        
        // Логируем первые несколько мест
        if (seatCounter <= 10) {
          console.log(`🎭 Место ${seatCounter}:`, {
            seatId: seat.seatId,
            row: seat.row,
            seatNumber: seat.seatNumber,
            section: seat.section,
            coords: { x: seat.x, y: seat.y, width: seat.width, height: seat.height },
            shape: seat.svgData?.shape || 'unknown',
            pointsCount: seat.svgData?.points?.length || 0,
            originalShape: seat.svgData?.originalShape || seat.svgTagName
          });
        }
      });

      console.log('✅ Парсинг завершен. Найдено мест:', seats.length);
      
      // Сортируем места по секциям, рядам и номерам
      seats.sort((a, b) => {
        if (a.section !== b.section) {
          return this.getSectionPriority(a.section) - this.getSectionPriority(b.section);
        }
        if (a.row !== b.row) {
          return a.row - b.row;
        }
        return a.seatNumber - b.seatNumber;
      });

      return seats;
      
    } catch (error) {
      console.error('❌ Ошибка парсинга SVG:', error);
      throw error;
    }
  }

  /**
   * Проверяет, является ли элемент декоративным
   */
  isDecorativeElement(element) {
    // Проверяем наличие исключающих атрибутов
    for (const attr of this.excludeAttributes) {
      if (element.hasAttribute(attr)) {
        return true;
      }
    }

    // Проверяем размер элемента (слишком большие элементы - скорее всего декоративные)
    const coords = this.getElementCoordinates(element);
    if (coords && (coords.width > 100 || coords.height > 100)) {
      return true;
    }

    return false;
  }

  /**
   * Извлекает координаты элемента в зависимости от типа
   */
  getElementCoordinates(element) {
    const tagName = element.tagName.toLowerCase();
    
    try {
      switch (tagName) {
        case 'circle':
          return {
            x: parseFloat(element.getAttribute('cx')) || 0,
            y: parseFloat(element.getAttribute('cy')) || 0,
            width: (parseFloat(element.getAttribute('r')) || 5) * 2,
            height: (parseFloat(element.getAttribute('r')) || 5) * 2
          };
          
        case 'rect':
          return {
            x: parseFloat(element.getAttribute('x')) || 0,
            y: parseFloat(element.getAttribute('y')) || 0,
            width: parseFloat(element.getAttribute('width')) || 10,
            height: parseFloat(element.getAttribute('height')) || 10
          };
          
        case 'ellipse':
          return {
            x: parseFloat(element.getAttribute('cx')) || 0,
            y: parseFloat(element.getAttribute('cy')) || 0,
            width: (parseFloat(element.getAttribute('rx')) || 5) * 2,
            height: (parseFloat(element.getAttribute('ry')) || 5) * 2
          };
          
        case 'path':
          // Для path элементов пытаемся получить bounding box
          const d = element.getAttribute('d');
          if (d) {
            // Простое извлечение первых координат из path
            const match = d.match(/[ML]\s*(-?\d+(?:\.\d+)?)\s*,?\s*(-?\d+(?:\.\d+)?)/);
            if (match) {
              return {
                x: parseFloat(match[1]),
                y: parseFloat(match[2]),
                width: 10, // Предполагаемый размер
                height: 10
              };
            }
          }
          return null;
          
        case 'polygon':
          const pointsStr = element.getAttribute('points') || '';
          const coords = pointsStr.trim().split(/[\s,]+/);
          if (coords.length >= 4) {
            const xs = [], ys = [];
            for (let i = 0; i < coords.length; i += 2) {
              if (coords[i] && coords[i + 1]) {
                xs.push(parseFloat(coords[i]));
                ys.push(parseFloat(coords[i + 1]));
              }
            }
            if (xs.length > 0 && ys.length > 0) {
              const minX = Math.min(...xs);
              const maxX = Math.max(...xs);
              const minY = Math.min(...ys);
              const maxY = Math.max(...ys);
              return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
            }
          }
          return null;
          
        default:
          return null;
      }
    } catch (error) {
      console.warn('⚠️ Ошибка извлечения координат для элемента:', tagName, error);
      return null;
    }
  }

  /**
   * Определяет секцию зала на основе позиции элемента
   */
  determineSectionByPosition(coords, svgWidth, svgHeight) {
    const { x, y } = coords;
    const centerX = svgWidth / 2;
    const centerY = svgHeight / 2;
    
    // Простая логика определения секций на основе позиции
    if (y < svgHeight * 0.6) {
      return 'parterre'; // Партер - нижняя часть
    } else if (y < svgHeight * 0.8) {
      return 'amphitheatre'; // Амфитеатр - средняя часть
    } else {
      return 'balcony'; // Балкон - верхняя часть
    }
  }

  /**
   * Вычисляет ряд и номер места на основе позиции и секции
   */
  calculateRowAndSeat(coords, section, globalIndex) {
    const { x, y } = coords;
    
    // Базовая логика - можно улучшить для конкретного зала
    let row, seatNumber;
    
    switch (section) {
      case 'parterre':
        // Партер: более точное определение с учетом глобального индекса
        row = Math.max(1, Math.min(15, Math.ceil(y / 40) + Math.floor(globalIndex / 50)));
        seatNumber = Math.max(1, Math.ceil(x / 25) + (globalIndex % 10));
        break;
        
      case 'amphitheatre':
        // Амфитеатр: 8 рядов
        row = Math.max(1, Math.min(8, Math.ceil(((y - 300) / 100) * 2)));
        seatNumber = Math.max(1, Math.ceil((x / 40)));
        break;
        
      case 'balcony':
        // Балкон: 6 рядов
        row = Math.max(1, Math.min(6, Math.ceil(((y - 500) / 100) * 2)));
        seatNumber = Math.max(1, Math.ceil((x / 60)));
        break;
        
      default:
        // Fallback - используем глобальный индекс
        row = Math.ceil(globalIndex / 20);
        seatNumber = ((globalIndex - 1) % 20) + 1;
    }
    
    return { row, seatNumber };
  }

  /**
   * Получает релевантные атрибуты элемента для сохранения
   */
  getRelevantAttributes(element) {
    const relevantAttrs = ['fill', 'stroke', 'stroke-width', 'opacity', 'class'];
    const attrs = {};
    
    relevantAttrs.forEach(attr => {
      const value = element.getAttribute(attr);
      if (value) {
        attrs[attr] = value;
      }
    });
    
    return attrs;
  }

  /**
   * Конвертирует SVG элемент в полигон с высоким разрешением
   * @param {Element} element - SVG элемент
   * @returns {Object|null} объект с данными полигона
   */
  convertToPolygon(element) {
    const tagName = element.tagName.toLowerCase();
    
    try {
      switch(tagName) {
        case 'circle':
          return this.circleToPolygon(element);
        case 'ellipse':
          return this.ellipseToPolygon(element);
        case 'path':
          return this.pathToPolygon(element);
        case 'polygon':
          return this.parsePolygon(element);
        case 'rect':
          // Прямоугольники остаются прямоугольниками
          return null;
        default:
          return null;
      }
    } catch (error) {
      console.warn('⚠️ Ошибка конвертации элемента в полигон:', tagName, error.message);
      return null;
    }
  }

  /**
   * Конвертирует круг в полигон с 64 точками
   * @param {Element} circleElement - circle элемент
   * @returns {Object} объект с данными полигона
   */
  circleToPolygon(circleElement) {
    const cx = parseFloat(circleElement.getAttribute('cx') || 0);
    const cy = parseFloat(circleElement.getAttribute('cy') || 0);
    const r = parseFloat(circleElement.getAttribute('r') || 0);
    const sides = this.shapeResolution.circle;
    
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides;
      points.push({
        x: Math.round(cx + r * Math.cos(angle)),
        y: Math.round(cy + r * Math.sin(angle))
      });
    }
    
    return {
      shape: 'polygon',
      points: points,
      originalShape: 'circle',
      originalData: { cx, cy, r },
      resolution: sides
    };
  }

  /**
   * Конвертирует эллипс в полигон с 64 точками
   * @param {Element} ellipseElement - ellipse элемент
   * @returns {Object} объект с данными полигона
   */
  ellipseToPolygon(ellipseElement) {
    const cx = parseFloat(ellipseElement.getAttribute('cx') || 0);
    const cy = parseFloat(ellipseElement.getAttribute('cy') || 0);
    const rx = parseFloat(ellipseElement.getAttribute('rx') || 0);
    const ry = parseFloat(ellipseElement.getAttribute('ry') || 0);
    const sides = this.shapeResolution.ellipse;
    
    const points = [];
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides;
      points.push({
        x: Math.round(cx + rx * Math.cos(angle)),
        y: Math.round(cy + ry * Math.sin(angle))
      });
    }
    
    return {
      shape: 'polygon',
      points: points,
      originalShape: 'ellipse',
      originalData: { cx, cy, rx, ry },
      resolution: sides
    };
  }

  /**
   * Конвертирует path в полигон с высоким разрешением
   * @param {Element} pathElement - path элемент
   * @returns {Object} объект с данными полигона
   */
  pathToPolygon(pathElement) {
    const pathData = pathElement.getAttribute('d');
    if (!pathData) return null;

    // Для мест (обычно маленькие круглые фигуры) создаем идеальный круг
    const coords = this.getElementCoordinates(pathElement);
    if (coords && coords.width < 50 && coords.height < 50) {
      // Создаем идеальный круг на основе bounding box
      const centerX = coords.x + coords.width / 2;
      const centerY = coords.y + coords.height / 2;
      const radius = Math.min(coords.width, coords.height) / 2;
      const sides = this.shapeResolution.path; // 128 точек
      
      const points = [];
      for (let i = 0; i < sides; i++) {
        const angle = (2 * Math.PI * i) / sides;
        // Используем более точные координаты без округления для гладкости
        points.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        });
      }
      
      return {
        shape: 'polygon',
        points: points,
        originalShape: 'path',
        originalPath: pathData,
        resolution: sides,
        generatedAsCircle: true, // Помечаем что это сгенерированный круг
        centerX: centerX,
        centerY: centerY,
        radius: radius
      };
    }

    // Для больших сложных path используем старый алгоритм
    const points = this.samplePathWithHighResolution(pathData);
    
    return {
      shape: 'polygon',
      points: points,
      originalShape: 'path',
      originalPath: pathData,
      resolution: points.length
    };
  }

  /**
   * Создает высокое разрешение точек из path данных через интерполяцию
   * @param {string} pathData - строка с path данными
   * @returns {Array} массив точек с высоким разрешением
   */
  samplePathWithHighResolution(pathData) {
    const targetPoints = this.shapeResolution.path; // 64 точки
    const points = [];
    
    // Извлекаем все координаты из path
    const rawPoints = this.extractRawPointsFromPath(pathData);
    
    if (rawPoints.length < 2) {
      return [{x: 0, y: 0}];
    }
    
    // Если точек мало, интерполируем между ними
    if (rawPoints.length < targetPoints) {
      points.push(...this.interpolatePoints(rawPoints, targetPoints));
    } else {
      // Если точек много, берем равномерную выборку
      points.push(...this.samplePoints(rawPoints, targetPoints));
    }
    
    console.log(`🎨 Path → Polygon: ${rawPoints.length} исходных точек → ${points.length} точек полигона`);
    
    return points.length > 0 ? points : [{x: 0, y: 0}];
  }

  /**
   * Извлекает все координаты из path данных
   * @param {string} pathData - строка с path данными
   * @returns {Array} массив исходных точек
   */
  extractRawPointsFromPath(pathData) {
    const points = [];
    
    // Более точное извлечение всех числовых пар координат
    // Ищем паттерны: число пробел/запятая число
    const coordPattern = /(-?\d*\.?\d+)[\s,]+(-?\d*\.?\d+)/g;
    let match;
    
    while ((match = coordPattern.exec(pathData)) !== null) {
      const x = parseFloat(match[1]);
      const y = parseFloat(match[2]);
      
      if (!isNaN(x) && !isNaN(y)) {
        points.push({
          x: Math.round(x),
          y: Math.round(y)
        });
      }
    }
    
    // Убираем дублирующиеся соседние точки
    const uniquePoints = points.filter((point, index) => {
      if (index === 0) return true;
      const prev = points[index - 1];
      return Math.abs(prev.x - point.x) > 1 || Math.abs(prev.y - point.y) > 1;
    });
    
    return uniquePoints;
  }

  /**
   * Интерполирует между точками для создания нужного количества
   * @param {Array} points - исходные точки
   * @param {number} targetCount - желаемое количество точек
   * @returns {Array} интерполированные точки
   */
  interpolatePoints(points, targetCount) {
    if (points.length === 0) return [];
    if (points.length >= targetCount) return points.slice(0, targetCount);
    
    const result = [];
    const segmentCount = targetCount - 1;
    const totalLength = this.calculatePathLength(points);
    
    let currentLength = 0;
    let currentPointIndex = 0;
    
    for (let i = 0; i < targetCount; i++) {
      const targetLength = (i / segmentCount) * totalLength;
      
      // Найти сегмент, в котором находится целевая длина
      while (currentPointIndex < points.length - 1) {
        const segmentLength = this.distance(points[currentPointIndex], points[currentPointIndex + 1]);
        
        if (currentLength + segmentLength >= targetLength) {
          // Интерполируем внутри этого сегмента
          const t = (targetLength - currentLength) / segmentLength;
          const p1 = points[currentPointIndex];
          const p2 = points[currentPointIndex + 1];
          
          result.push({
            x: Math.round(p1.x + t * (p2.x - p1.x)),
            y: Math.round(p1.y + t * (p2.y - p1.y))
          });
        break;
        }
        
        currentLength += segmentLength;
        currentPointIndex++;
      }
      
      // Если дошли до конца, добавляем последнюю точку
      if (currentPointIndex >= points.length - 1) {
        result.push({...points[points.length - 1]});
      }
    }
    
    return result;
  }

  /**
   * Выбирает равномерную выборку точек
   * @param {Array} points - исходные точки
   * @param {number} targetCount - желаемое количество точек
   * @returns {Array} выбранные точки
   */
  samplePoints(points, targetCount) {
    if (points.length <= targetCount) return points;
    
    const result = [];
    const step = (points.length - 1) / (targetCount - 1);
    
    for (let i = 0; i < targetCount; i++) {
      const index = Math.round(i * step);
      result.push({...points[Math.min(index, points.length - 1)]});
    }
    
    return result;
  }

  /**
   * Вычисляет общую длину пути между точками
   * @param {Array} points - массив точек
   * @returns {number} общая длина
   */
  calculatePathLength(points) {
    let totalLength = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalLength += this.distance(points[i], points[i + 1]);
    }
    return totalLength;
  }

  /**
   * Вычисляет расстояние между двумя точками
   * @param {Object} p1 - первая точка {x, y}
   * @param {Object} p2 - вторая точка {x, y}
   * @returns {number} расстояние
   */
  distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  /**
   * Парсит существующий полигон
   * @param {Element} polygonElement - polygon элемент
   * @returns {Object} объект с данными полигона
   */
  parsePolygon(polygonElement) {
    const pointsStr = polygonElement.getAttribute('points') || '';
    const coords = pointsStr.trim().split(/[\s,]+/);
    const points = [];
    
    for (let i = 0; i < coords.length; i += 2) {
      if (coords[i] && coords[i + 1]) {
        points.push({
          x: Math.round(parseFloat(coords[i])),
          y: Math.round(parseFloat(coords[i + 1]))
        });
      }
    }
    
    return {
      shape: 'polygon',
      points: points.length > 0 ? points : [{x: 0, y: 0}],
      originalShape: 'polygon',
      originalPoints: pointsStr
    };
  }


  /**
   * Возвращает приоритет секции для сортировки
   */
  getSectionPriority(section) {
    const priorities = {
      'parterre': 1,
      'amphitheatre': 2,
      'balcony': 3
    };
    return priorities[section] || 4;
  }
}

module.exports = SVGParser;

