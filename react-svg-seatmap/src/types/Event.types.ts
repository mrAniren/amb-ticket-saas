// Базовые типы для системы мероприятий

export interface Event {
  id: string;
  name: string;
  description: string;
  image: string; // URL или base64
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  eventId: string;
  date: string; // ISO date format (YYYY-MM-DD)
  time: string; // Time format (HH:MM)
  hallId: string;
  priceSchemeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface HallSeat {
  seatId: string;
  row: number;
  seatNumber: number;
  section: string;
  zoneName?: string; // Название зоны (добавлено при создании билетов)
  price?: number; // Цена билета (добавлено из данных сессии)
  x: number;
  y: number;
  svgElementId: string;
  svgTagName: string;
  isAvailable: boolean;
  metadata?: {
    originalIndex: number;
    svgAttributes: Record<string, string>;
  };
}

export interface SessionWithDetails extends Session {
  event: Event | null;
  tickets?: Array<{
    seatId: string;
    status: 'available' | 'reserved' | 'sold' | 'locked';
    price: number;
    currency?: string;
  }>;
  hall: {
    id: string;
    name: string;
    description?: string;
    city?: string;
    capacity?: number;
    svg_file?: string;
    svg_url?: string;
    seats?: HallSeat[];
    createdAt: string;
    updatedAt: string;
  } | null;
  priceScheme: {
    id: string;
    name: string;
    hallId: string;
    prices: Array<{
      id: string;
      name: string;
      value: number;
      currency: string;
      color: string;
    }>;
    seatPrices: Array<{
      seatId: string;
      priceId: string;
    }>;
    createdAt: string;
    updatedAt: string;
  } | null;
}

// API Response типы
export interface EventsResponse {
  success: boolean;
  events: Event[];
}

export interface EventResponse {
  success: boolean;
  event: Event;
}

export interface SessionsResponse {
  success: boolean;
  sessions: SessionWithDetails[];
}

export interface SessionResponse {
  success: boolean;
  session: SessionWithDetails;
}

export interface CreateEventRequest {
  name: string;
  description: string;
  image: string;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  image?: string;
}

export interface CreateSessionRequest {
  eventId: string;
  date: string;
  time: string;
  hallId: string;
  priceSchemeId: string;
}

export interface UpdateSessionRequest {
  eventId?: string;
  date?: string;
  time?: string;
  hallId?: string;
  priceSchemeId?: string;
}

// Utility типы
export type EventFormData = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
export type SessionFormData = Omit<Session, 'id' | 'createdAt' | 'updatedAt'>;

export interface CreateSessionRequest {
  eventId: string;
  date: string;
  time: string;
  hallId: string;
  priceSchemeId: string;
}

export interface UpdateSessionRequest {
  eventId?: string;
  date?: string;
  time?: string;
  hallId?: string;
  priceSchemeId?: string;
}

// Utility типы
export type EventFormData = Omit<Event, 'id' | 'createdAt' | 'updatedAt'>;
export type SessionFormData = Omit<Session, 'id' | 'createdAt' | 'updatedAt'>;
