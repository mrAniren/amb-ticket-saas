import { v4 as uuidv4 } from 'uuid';
import { Seat } from '../types/Seat.types';

export const generateTempId = (): string => {
  return `temp-${uuidv4()}`;
};

export const isTempId = (id: string | number): boolean => {
  return typeof id === 'string' && id.startsWith('temp-');
};

export const createTempSeat = (element: SVGElement, cssSelector: string): Seat => {
  const tempId = generateTempId();
  const originalId = element.id || undefined;
  
  return {
    id: tempId,
    cssSelector,
    tempId,
    originalId,
    objectType: 'seat' // по умолчанию
  };
};

export const convertTempIdToPermanent = (seat: Seat, newId: string | number): Seat => {
  if (!isTempId(seat.id)) {
    return seat;
  }
  
  return {
    ...seat,
    id: newId,
    tempId: undefined
  };
};