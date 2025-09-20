import { Seat } from '../types/Seat.types';
import { ExportConfig } from '../types/Editor.types';
import { getSeatStatistics } from '../utils/seatUtils';

export class ExportImportService {
  static exportConfiguration(seats: Seat[]): ExportConfig {
    const stats = getSeatStatistics(seats);
    
    return {
      seats: seats.map(seat => ({
        ...seat,
        tempId: undefined // Убираем временные поля при экспорте
      })),
      metadata: {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        totalSeats: stats.total,
        seatsByType: stats.byType
      }
    };
  }

  static downloadJSON(config: ExportConfig, filename: string = 'seatmap-config.json') {
    const dataStr = JSON.stringify(config, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = filename;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  static async importFromFile(file: File): Promise<ExportConfig> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const result = e.target?.result as string;
          const config = JSON.parse(result) as ExportConfig;
          
          // Валидация
          if (!config.seats || !Array.isArray(config.seats)) {
            throw new Error('Invalid configuration format');
          }
          
          resolve(config);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  static validateConfiguration(config: ExportConfig): boolean {
    try {
      // Проверяем обязательные поля
      if (!config.seats || !Array.isArray(config.seats)) {
        return false;
      }
      
      if (!config.metadata || !config.metadata.version) {
        return false;
      }
      
      // Проверяем структуру мест
      for (const seat of config.seats) {
        if (!seat.id || !seat.cssSelector) {
          return false;
        }
        
        if (seat.objectType && !['seat', 'scene', 'decoration', 'passage'].includes(seat.objectType)) {
          return false;
        }
      }
      
      return true;
    } catch {
      return false;
    }
  }
}