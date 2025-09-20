import React, { useState, useCallback } from 'react';
import './DateRangeFilter.scss';

export interface DateRange {
  startDate: string;
  endDate: string;
}

interface DateRangeFilterProps {
  onDateChange: (range: DateRange) => void;
  initialStartDate?: string;
  initialEndDate?: string;
  className?: string;
}

// Предустановленные периоды
const PRESET_RANGES = [
  {
    label: 'Сегодня',
    getValue: () => {
      const today = new Date().toISOString().split('T')[0];
      return { startDate: today, endDate: today };
    }
  },
  {
    label: 'Вчера',
    getValue: () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      return { startDate: dateStr, endDate: dateStr };
    }
  },
  {
    label: 'Последние 7 дней',
    getValue: () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      return { startDate: startDate.toISOString().split('T')[0], endDate };
    }
  },
  {
    label: 'Последние 30 дней',
    getValue: () => {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      return { startDate: startDate.toISOString().split('T')[0], endDate };
    }
  },
  {
    label: 'Этот месяц',
    getValue: () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      return { startDate, endDate };
    }
  },
  {
    label: 'Прошлый месяц',
    getValue: () => {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      return { startDate, endDate };
    }
  }
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  onDateChange,
  initialStartDate = '',
  initialEndDate = '',
  className = ''
}) => {
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleStartDateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newStartDate = event.target.value;
    setStartDate(newStartDate);
    onDateChange({ startDate: newStartDate, endDate });
  }, [endDate, onDateChange]);

  const handleEndDateChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newEndDate = event.target.value;
    setEndDate(newEndDate);
    onDateChange({ startDate, endDate: newEndDate });
  }, [startDate, onDateChange]);

  const handlePresetClick = useCallback((preset: typeof PRESET_RANGES[0]) => {
    const range = preset.getValue();
    setStartDate(range.startDate);
    setEndDate(range.endDate);
    onDateChange(range);
    setIsExpanded(false);
  }, [onDateChange]);

  const handleClear = useCallback(() => {
    setStartDate('');
    setEndDate('');
    onDateChange({ startDate: '', endDate: '' });
  }, [onDateChange]);

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const formatDateRange = () => {
    if (!startDate && !endDate) return 'Выберите период';
    if (startDate === endDate && startDate) return startDate;
    if (startDate && endDate) return `${startDate} - ${endDate}`;
    if (startDate) return `с ${startDate}`;
    if (endDate) return `до ${endDate}`;
    return 'Выберите период';
  };

  return (
    <div className={`date-range-filter ${className}`}>
      <div className="date-range-filter__header">
        <button 
          className="date-range-filter__toggle"
          onClick={toggleExpanded}
          type="button"
        >
          <span className="date-range-filter__label">
            📅 {formatDateRange()}
          </span>
          <span className={`date-range-filter__arrow ${isExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </button>
        
        {(startDate || endDate) && (
          <button
            className="date-range-filter__clear"
            onClick={handleClear}
            type="button"
            title="Очистить фильтр"
          >
            ✕
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="date-range-filter__dropdown">
          <div className="date-range-filter__presets">
            <h4>Быстрый выбор:</h4>
            <div className="date-range-filter__preset-buttons">
              {PRESET_RANGES.map((preset, index) => (
                <button
                  key={index}
                  className="date-range-filter__preset-button"
                  onClick={() => handlePresetClick(preset)}
                  type="button"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="date-range-filter__custom">
            <h4>Произвольный период:</h4>
            <div className="date-range-filter__inputs">
              <div className="date-range-filter__input-group">
                <label htmlFor="start-date">С:</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={handleStartDateChange}
                  className="date-range-filter__input"
                />
              </div>
              
              <div className="date-range-filter__input-group">
                <label htmlFor="end-date">По:</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={handleEndDateChange}
                  className="date-range-filter__input"
                  min={startDate || undefined}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
