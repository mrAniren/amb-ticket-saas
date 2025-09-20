import { Seat, BulkEditData, ObjectType } from '../types/Seat.types';
import { getSVGElementPosition } from './svgUtils';

export const sortSeatsByPosition = (
  seats: Seat[], 
  direction: 'left-to-right' | 'right-to-left' = 'left-to-right'
): Seat[] => {
  // TODO: Получить позиции элементов из DOM
  const seatsWithPositions = seats.map(seat => {
    // Нужно найти элемент по cssSelector и получить его позицию
    const element = document.querySelector(seat.cssSelector || '');
    if (element) {
      const position = getSVGElementPosition(element as SVGElement);
      return { seat, position };
    }
    return { seat, position: { x: 0, y: 0 } };
  });
  
  // Сортируем по X координате
  seatsWithPositions.sort((a, b) => {
    return direction === 'left-to-right' 
      ? a.position.x - b.position.x 
      : b.position.x - a.position.x;
  });
  
  return seatsWithPositions.map(item => item.seat);
};

export const applyBulkEdit = (seats: Seat[], bulkData: BulkEditData): Seat[] => {
  const { row, startPlace, direction, objectType, zone, capacity } = bulkData;
  
  let updatedSeats = [...seats];
  
  // Применяем тип объекта ко всем местам
  if (objectType) {
    updatedSeats = updatedSeats.map(seat => ({
      ...seat,
      objectType
    }));
    // console.log('applyBulkEdit: Applied objectType');
  }

  // Применяем зону ко всем местам
  if (zone) {
    updatedSeats = updatedSeats.map(seat => ({
      ...seat,
      zone
    }));
    // console.log('applyBulkEdit: Applied zone');
  }

  // Применяем поля для спец. зон
  if (capacity !== undefined) {
    updatedSeats = updatedSeats.map(seat => ({
      ...seat,
      capacity
    }));
  }

  
  // Применяем ряд и места
  if (row !== undefined && startPlace !== undefined) {
    // Applying bulk edit to seats
    // Сортируем места по позиции
    const sortedSeats = sortSeatsByPosition(updatedSeats, direction);
    
    updatedSeats = sortedSeats.map((seat, index) => ({
      ...seat,
      row,
      place: startPlace + index
    }));
    // Bulk edit applied successfully
  } else {
    
  }
  

  return updatedSeats;
};

export const clearSeatAssignments = (seats: Seat[]): Seat[] => {
  return seats.map(seat => ({
    ...seat,
    row: undefined,
    place: undefined,
    objectType: 'seat',
    capacity: undefined
  }));
};

export const getSeatStatistics = (seats: Seat[]) => {
  const stats = {
    total: seats.length,
    byType: {} as Record<ObjectType, number>,
    withAssignments: 0,
    withoutAssignments: 0
  };
  
  seats.forEach(seat => {
    const type = seat.objectType || 'seat';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    
    if (seat.row !== undefined && seat.place !== undefined) {
      stats.withAssignments++;
    } else {
      stats.withoutAssignments++;
    }
  });
  
  return stats;
};