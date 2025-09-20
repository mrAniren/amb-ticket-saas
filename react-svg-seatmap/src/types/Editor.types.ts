import { Seat, ObjectType, BulkEditData, Zone } from './Seat.types';

export interface EditorState {
  mode: 'selection' | 'navigation';
  selectedSeats: Seat[];
  tempSeats: Map<string, Seat>;     // Временные места
  editingEnabled: boolean;
  zones: Zone[];                    // Зоны зала
  currentZone?: string;             // Текущая выбранная зона
}

export interface SeatStatistics {
  total: number;
  permanent: number;
  temp: number;
}

export interface SeatEditorProps {
  svg: string;
  initialSeats?: Seat[];
  initialZones?: Zone[];
  initialCurrency?: string; // Начальная валюта
  onSeatsChange?: (seats: Seat[]) => void;
  onStatsChange?: (stats: SeatStatistics) => void;
  onAvailableSeatsChange?: (availableSeats: Seat[]) => void; // Полный список для UI
  onZonesChange?: (zones: Zone[]) => void;
  onCurrencyChange?: (currency: string) => void; // Обработчик изменения валюты
  onExport?: (config: ExportConfig) => void;
  onSeatUpdate?: (seatId: string, updates: Partial<Seat>) => void;
}

export interface ExportConfig {
  seats: Seat[];
  metadata: {
    version: string;
    createdAt: string;
    totalSeats: number;
    seatsByType: Record<ObjectType, number>;
  };
}

export interface BulkEditWidgetProps {
  selectedSeats: Seat[];
  zones: Zone[];                    // Доступные зоны
  onApply: (data: BulkEditData) => void;
  onClear: () => void;
  onCancel: () => void;
  position: { x: number; y: number };
  onPositionChange?: (position: { x: number; y: number }) => void;
}

// Новые типы для управления зонами
export interface ZoneManagerProps {
  zones: Zone[];
  currentZone?: string;
  currency?: string; // Текущая валюта зала
  onZoneCreate: (zone: Omit<Zone, 'id'>) => void;
  onZoneUpdate: (id: string, zone: Partial<Zone>) => void;
  onZoneDelete: (id: string) => void;
  onZoneSelect: (id: string) => void;
  onCurrencyChange?: (currency: string) => void; // Обработчик изменения валюты
}

export interface ZoneDialogProps {
  isOpen: boolean;
  zone?: Zone;
  onSave: (zone: Omit<Zone, 'id'>) => void;
  onCancel: () => void;
}