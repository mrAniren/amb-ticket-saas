import React, { useState, useEffect } from 'react';
import { getCitiesByCountry, getTimezoneByCity } from '../../data/cities';
import './CountryCitySelector.scss';

// Список стран СНГ на русском языке (отсортированы по алфавиту)
const countries = [
  { code: 'AZ', name: 'Азербайджан' },
  { code: 'AM', name: 'Армения' },
  { code: 'BY', name: 'Беларусь' },
  { code: 'GE', name: 'Грузия' },
  { code: 'KZ', name: 'Казахстан' },
  { code: 'KG', name: 'Кыргызстан' },
  { code: 'MD', name: 'Молдова' },
  { code: 'RU', name: 'Россия' },
  { code: 'TJ', name: 'Таджикистан' },
  { code: 'TM', name: 'Туркменистан' },
  { code: 'UZ', name: 'Узбекистан' },
  { code: 'UA', name: 'Украина' }
];

interface CountryCitySelectorProps {
  selectedCountry: string;
  selectedCity: string;
  onCountryChange: (country: string) => void;
  onCityChange: (city: string) => void;
  onTimezoneChange: (timezone: string) => void;
  disabled?: boolean;
  error?: string;
}

export const CountryCitySelector: React.FC<CountryCitySelectorProps> = ({
  selectedCountry,
  selectedCity,
  onCountryChange,
  onCityChange,
  onTimezoneChange,
  disabled = false,
  error
}) => {
  const [cityOptions, setCityOptions] = useState<string[]>([]);

  // Обновление списка городов при изменении страны
  useEffect(() => {
    if (selectedCountry) {
      const cities = getCitiesByCountry(selectedCountry);
      setCityOptions(cities.map(city => city.name));
      
      // Сбрасываем выбранный город при смене страны
      onCityChange('');
      onTimezoneChange('');
    } else {
      setCityOptions([]);
      onCityChange('');
      onTimezoneChange('');
    }
  }, [selectedCountry]); // Убираем функции из зависимостей

  // Обновление временной зоны при изменении города
  useEffect(() => {
    if (selectedCountry && selectedCity) {
      const timezone = getTimezoneByCity(selectedCountry, selectedCity);
      if (timezone) {
        onTimezoneChange(timezone);
      }
    }
  }, [selectedCountry, selectedCity]); // Убираем функцию из зависимостей

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCountryChange(e.target.value);
  };

  const handleCityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onCityChange(e.target.value);
  };

  return (
    <div className="country-city-selector">
      <div className="country-city-selector__field">
        <label htmlFor="country" className="country-city-selector__label">
          Страна *
        </label>
        <select
          id="country"
          value={selectedCountry}
          onChange={handleCountryChange}
          disabled={disabled}
          className={`country-city-selector__select ${error ? 'error' : ''}`}
          required
        >
          <option value="">Выберите страну</option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      <div className="country-city-selector__field">
        <label htmlFor="city" className="country-city-selector__label">
          Город *
        </label>
        <select
          id="city"
          value={selectedCity}
          onChange={handleCityChange}
          disabled={disabled || !selectedCountry}
          className={`country-city-selector__select ${error ? 'error' : ''}`}
          required
        >
          <option value="">Выберите город</option>
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {!selectedCountry && (
          <p className="country-city-selector__help">
            Сначала выберите страну
          </p>
        )}
      </div>

      {error && (
        <div className="country-city-selector__error">
          {error}
        </div>
      )}
    </div>
  );
};
