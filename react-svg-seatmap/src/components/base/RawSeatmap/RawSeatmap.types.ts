import { ReactNode } from "react";
import { SeatmapControl } from "../../../types/SeatmapControl.types";
import { ObjectType, Zone } from "../../../types/Seat.types";

export interface SeatDisplay {
  id: number | string;  // Обновлено для поддержки временных ID
  cssSelector: string; // How can we find the seat in the SVG?
  // Данные для tooltip
  objectType?: ObjectType;
  row?: string;
  place?: string;
  zone?: string;
  // Визуальные настройки
  color?: string;
  icon?: ReactNode;
  tooltipContent?: ReactNode;
}

export interface RawSeatmapProps {
  availableSeats: SeatDisplay[];
  selectedSeatIds?: (number | string)[]; // Array of selected seat IDs
  svg: string;
  zones?: Zone[]; // Для отображения названий зон в tooltip
  showZoomControls?: boolean;
  allowDragAndPan?: boolean;
  selectionMode?: 'drag' | 'click' | null; // Режим выделения
  leftControls?: SeatmapControl[];
  rightControls?: SeatmapControl[];
  onSeatSelect?: (selectedSeat: SeatDisplay) => void;
  onSeatDeselect?: (selectedSeat: SeatDisplay) => void;
  onSeatHover?: (hoveredSeat: SeatDisplay) => void;
  onSeatHoverEnd?: (hoveredSeat: SeatDisplay) => void;
}
