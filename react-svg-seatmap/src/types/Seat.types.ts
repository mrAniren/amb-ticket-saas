import { SvgElementData } from '../utils/svgDataExtractor';

export interface Seat {
  id: number | string;              // Поддержка временных UUID
  cssSelector: string;
  displayGroup?: string;
  selectionGroups?: Record<string, string | { value: string; parent: string }>;
  
  // НОВЫЕ ПОЛЯ:
  row?: number;                     // Номер ряда
  place?: number;                   // Номер места в ряду
  objectType?: ObjectType;          // Тип объекта
  tempId?: string;                  // Временный ID
  originalId?: string;              // Оригинальный ID из SVG
  zone?: string;                    // Зона зала (например, "Партер", "Балкон")
  
  // SVG данные для точного рендеринга
  svgData?: SvgElementData;         // Полные данные из SVG
  x?: number;                       // Позиция X (для совместимости)
  y?: number;                       // Позиция Y (для совместимости)
  width?: number;                   // Ширина (для совместимости)
  height?: number;                  // Высота (для совместимости)
  
  // Статус и интерактивность
  isSelected?: boolean;             // Выбрано пользователем
  isClickable?: boolean;            // Можно ли кликнуть
  status?: 'available' | 'reserved' | 'sold' | 'locked' | 'unavailable'; // Статус билета
  price?: number;                   // Цена билета
  priceColor?: string;              // Цвет цены
  currency?: string;                // Валюта билета
  
  // Поля для спец. зон
  capacity?: number;                // Количество мест в спец. зоне
}

export type ObjectType = 'seat' | 'scene' | 'decoration' | 'passage' | 'special_zone';

// Новые типы для зон
export interface Zone {
  id: string;
  name: string;
  color: string;
  isDefault?: boolean;              // Для зоны "Партер"
  description?: string;
}

export interface SeatPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BulkEditData {
  row?: number;
  startPlace?: number;
  direction?: 'left-to-right' | 'right-to-left';
  objectType?: ObjectType;
  zone?: string;                    // Зона зала
  capacity?: number;                // Количество мест (для спец. зон)
}
