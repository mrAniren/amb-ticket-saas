import { ReactNode } from "react";
import { SeatmapControl } from "../../../types/SeatmapControl.types";
import { Zone } from "../../../types/Seat.types";

export interface GroupedSeat {
  id: number | string;  // Обновлено для поддержки временных ID
  cssSelector: string;
  displayGroup?: string; // The group that controls the display of the seat
  selectionGroups?: Record<string, string | { value: string; parent: string }>; // The groups that control the selection of the seat
}

export interface GroupedSeatmapProps {
  svg: string;
  availableSeats: GroupedSeat[];
  selectedSeatIds?: (number | string)[]; // Array of selected seat IDs
  zones?: Zone[]; // Для передачи в tooltip
  displayGroupMapping?: Record<string, string | ReactNode>;
  onSeatSelect?: (selectedSeats: GroupedSeat[]) => void;
  onSeatDeselect?: (deselectedSeats: GroupedSeat[]) => void;
  leftControls?: SeatmapControl[];
  rightControls?: SeatmapControl[];
  withGroupSelection?: boolean; // Whether to enable group selection
  withDragSelection?: boolean; // Whether to enable drag selection
}
