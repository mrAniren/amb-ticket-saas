// API Response типы
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

// Типы для пользователей
export interface User {
  id: number;
  username: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// Типы для залов
export interface Hall {
  id: number;
  name: string;
  country: string; // Код страны (например, 'RU', 'US', 'DE')
  city: string; // Название города
  address?: string; // Адрес (опциональный)
  timezone: string; // Временная зона (например, 'Europe/Moscow', 'America/New_York')
  photo_url?: string;
  svg_file?: {
    id: number;
    filename: string;
    file_path: string;
  };
  seat_count: number;
  currency?: string; // Код валюты (например, 'RUB', 'USD', 'EUR')
  last_modified: string;
  created_at?: string;
  updated_at?: string;
  zones?: Zone[];
}

export interface HallsResponse {
  halls: Hall[];
  total: number;
}

export interface HallResponse {
  hall: Hall;
}

export interface HallCreateData {
  name: string;
  country: string; // Код страны (обязательный)
  city: string; // Название города (обязательный)
  address?: string; // Адрес (опциональный)
  timezone: string; // Временная зона (обязательная)
  capacity?: string; // Вместимость (опциональная, для редактирования)
  currency?: string;
  photo?: File;
  svg?: File;
}

export interface HallUpdateData extends Partial<HallCreateData> {
  id: number;
}

// Типы для файлов
export interface FileData {
  id: number;
  filename: string;
  original_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  file_type: 'svg' | 'photo';
  created_at: string;
}

export interface FileUploadResponse {
  file: FileData;
}

// Реэкспорт из существующих типов
export type { Zone } from './Seat.types';