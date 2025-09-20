import React, { useState, useCallback } from 'react';
import { HallCreateData } from '../../../types/api.types';
import { FileUpload } from './FileUpload';
import { CountryCitySelector } from '../../../components/CountryCitySelector/CountryCitySelector';

interface HallFormProps {
  initialData?: Partial<HallCreateData>;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
  loading?: boolean;
  submitText?: string;
  hideFileUpload?: boolean;
  hideSvgUpload?: boolean;
}

export const HallForm: React.FC<HallFormProps> = ({
  initialData = {},
  onSubmit,
  onCancel,
  loading = false,
  submitText = 'Сохранить',
  hideFileUpload = false,
  hideSvgUpload = false
}) => {
  const [formData, setFormData] = useState<HallCreateData>({
    name: initialData.name || '',
    country: initialData.country || '',
    city: initialData.city || '',
    address: initialData.address || '',
    timezone: initialData.timezone || '',
    capacity: initialData.capacity || '',
    photo: undefined,
    svg: undefined,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((field: keyof HallCreateData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const handleFileChange = useCallback((field: 'photo' | 'svg', file: File | null) => {
    setFormData(prev => ({ ...prev, [field]: file || undefined }));
    // Очищаем ошибку при выборе файла
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Название зала обязательно';
    }

    if (!formData.country) {
      newErrors.country = 'Страна обязательна';
    }

    if (!formData.city) {
      newErrors.city = 'Город обязателен';
    }

    if (!formData.timezone) {
      newErrors.timezone = 'Временная зона обязательна';
    }

    if (!hideSvgUpload && !formData.svg) {
      newErrors.svg = 'SVG файл схемы зала обязателен';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData as any);
    }
  };

  return (
    <div className="hall-form">
      <form onSubmit={handleSubmit} className="hall-form__form">
        <div className="hall-form__section">
          <h3>Основная информация</h3>
          
          <div className="form-field">
            <label htmlFor="name">Название зала *</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Введите название зала"
              disabled={loading}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <div className="error">{errors.name}</div>}
          </div>

          <CountryCitySelector
            selectedCountry={formData.country}
            selectedCity={formData.city}
            onCountryChange={(country) => handleChange('country', country)}
            onCityChange={(city) => handleChange('city', city)}
            onTimezoneChange={(timezone) => handleChange('timezone', timezone)}
            disabled={loading}
            error={errors.country || errors.city || errors.timezone}
          />

          <div className="form-field">
            <label htmlFor="address">Адрес</label>
            <textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleChange('address', e.target.value)}
              placeholder="Введите полный адрес зала"
              disabled={loading}
              rows={3}
            />
          </div>
        </div>

        {!hideFileUpload && (
          <div className="hall-form__section">
            <h3>Файлы</h3>
            
            <div className="hall-form__files">
              <div className="hall-form__file-group">
                <label>Фото зала</label>
                <FileUpload
                  accept="image/*"
                  onFileSelect={(file) => handleFileChange('photo', file)}
                  disabled={loading}
                  placeholder="Выберите фото зала"
                  helpText="Поддерживаются форматы: JPG, PNG, GIF (макс. 10 МБ)"
                />
              </div>

              {!hideSvgUpload && (
                <div className="hall-form__file-group">
                  <label>SVG схема зала *</label>
                  <FileUpload
                    accept=".svg,image/svg+xml"
                    onFileSelect={(file) => handleFileChange('svg', file)}
                    disabled={loading}
                    placeholder="Выберите SVG файл"
                    helpText="Файл схемы зала в формате SVG (макс. 10 МБ)"
                  />
                  {errors.svg && <div className="error">{errors.svg}</div>}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="hall-form__actions">
          <button
            type="button"
            onClick={onCancel}
            className="btn btn--secondary"
            disabled={loading}
          >
            Отмена
          </button>
          
          <button
            type="submit"
            className="btn btn--primary"
            disabled={loading}
          >
            {loading ? 'Сохранение...' : submitText}
          </button>
        </div>
      </form>
    </div>
  );
};