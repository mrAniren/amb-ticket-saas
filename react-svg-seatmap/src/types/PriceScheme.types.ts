/**
 * Типы данных для системы распаесовок
 */

export interface Price {
  id: string;
  name: string;
  value: number;
  currency: string;
  color: string; // HEX цвет
}

export interface SeatPrice {
  seatId: string;
  priceId: string;
}

export interface PriceScheme {
  id: string;
  name: string;
  hallId: string;
  hallName: string;
  createdAt: string;
  updatedAt: string;
  prices: Price[];
  seatPrices: SeatPrice[];
}

export interface PriceSchemeCreateData {
  name: string;
  hallId: string;
}

export interface PriceSchemeUpdateData {
  name?: string;
  prices?: Price[];
  seatPrices?: SeatPrice[];
}

// Перечисление валют
export enum Currency {
  RUB = 'RUB',
  USD = 'USD',
  EUR = 'EUR'
}

// Режимы взаимодействия в канбане
export enum InteractionMode {
  ZOOM_PAN = 'zoom_pan',      // Зум/пан (по умолчанию)
  SELECTION = 'selection',     // Выделение рамкой
  CLICK_SELECT = 'click'       // Клик по местам
}

// Данные для выделения мест
export interface SeatSelection {
  selectedSeats: string[];
  selectionRect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}
