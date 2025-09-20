import { Seat, BulkEditData } from '../types/Seat.types';
import { sortSeatsByPosition, applyBulkEdit } from '../utils/seatUtils';

export class AutoAssignmentService {
  static assignRowAndPlace(
    seats: Seat[], 
    row: number, 
    startPlace: number = 1,
    direction: 'left-to-right' | 'right-to-left' = 'left-to-right'
  ): Seat[] {
    const sortedSeats = sortSeatsByPosition(seats, direction);
    
    return sortedSeats.map((seat, index) => ({
      ...seat,
      row,
      place: startPlace + index
    }));
  }

  static bulkAssign(seats: Seat[], bulkData: BulkEditData): Seat[] {
    return applyBulkEdit(seats, bulkData);
  }

  static autoDetectRows(seats: Seat[]): Seat[] {
    // Группируем места по Y координате (приблизительно)
    const tolerance = 20; // пикселей
    const groups: { y: number; seats: Seat[] }[] = [];
    
    seats.forEach(seat => {
      // Получаем позицию элемента
      const element = document.querySelector(seat.cssSelector || '');
      if (!element) return;
      
      const bbox = (element as SVGGraphicsElement).getBBox();
      const y = bbox.y + bbox.height / 2;
      
      // Ищем подходящую группу
      let group = groups.find(g => Math.abs(g.y - y) <= tolerance);
      if (!group) {
        group = { y, seats: [] };
        groups.push(group);
      }
      
      group.seats.push(seat);
    });
    
    // Сортируем группы по Y координате (сверху вниз)
    groups.sort((a, b) => a.y - b.y);
    
    // Назначаем номера рядов
    const result: Seat[] = [];
    groups.forEach((group, rowIndex) => {
      const sortedSeats = sortSeatsByPosition(group.seats, 'left-to-right');
      sortedSeats.forEach((seat, placeIndex) => {
        result.push({
          ...seat,
          row: rowIndex + 1,
          place: placeIndex + 1
        });
      });
    });
    
    return result;
  }
}