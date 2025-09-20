import React, { useState, useEffect } from 'react';
import './PhoneInput.scss';

interface Country {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
  mask: string;
}

const countries: Country[] = [
  // Все страны СНГ (полный список)
  { code: 'RU', name: 'Россия', flag: '🇷🇺', phoneCode: '+7', mask: '+7 (###) ###-##-##' },
  { code: 'BY', name: 'Беларусь', flag: '🇧🇾', phoneCode: '+375', mask: '+375 (##) ###-##-##' },
  { code: 'KZ', name: 'Казахстан', flag: '🇰🇿', phoneCode: '+7', mask: '+7 (###) ###-##-##' },
  { code: 'UA', name: 'Украина', flag: '🇺🇦', phoneCode: '+380', mask: '+380 (##) ###-##-##' },
  { code: 'UZ', name: 'Узбекистан', flag: '🇺🇿', phoneCode: '+998', mask: '+998 ## ### ## ##' },
  { code: 'KG', name: 'Кыргызстан', flag: '🇰🇬', phoneCode: '+996', mask: '+996 ### ### ###' },
  { code: 'TJ', name: 'Таджикистан', flag: '🇹🇯', phoneCode: '+992', mask: '+992 ## ### ####' },
  { code: 'TM', name: 'Туркменистан', flag: '🇹🇲', phoneCode: '+993', mask: '+993 ## ### ###' },
  { code: 'AM', name: 'Армения', flag: '🇦🇲', phoneCode: '+374', mask: '+374 ## ### ###' },
  { code: 'AZ', name: 'Азербайджан', flag: '🇦🇿', phoneCode: '+994', mask: '+994 ## ### ## ##' },
  { code: 'GE', name: 'Грузия', flag: '🇬🇪', phoneCode: '+995', mask: '+995 ### ### ###' },
  { code: 'MD', name: 'Молдова', flag: '🇲🇩', phoneCode: '+373', mask: '+373 ### #####' },
  
  // Другие постсоветские страны
  { code: 'LT', name: 'Литва', flag: '🇱🇹', phoneCode: '+370', mask: '+370 ### #####' },
  { code: 'LV', name: 'Латвия', flag: '🇱🇻', phoneCode: '+371', mask: '+371 #### ####' },
  { code: 'EE', name: 'Эстония', flag: '🇪🇪', phoneCode: '+372', mask: '+372 #### ####' },
  
  // Популярные европейские страны
  { code: 'DE', name: 'Германия', flag: '🇩🇪', phoneCode: '+49', mask: '+49 ### ########' },
  { code: 'FR', name: 'Франция', flag: '🇫🇷', phoneCode: '+33', mask: '+33 # ## ## ## ##' },
  { code: 'GB', name: 'Великобритания', flag: '🇬🇧', phoneCode: '+44', mask: '+44 #### ######' },
  { code: 'IT', name: 'Италия', flag: '🇮🇹', phoneCode: '+39', mask: '+39 ### ### ####' },
  { code: 'ES', name: 'Испания', flag: '🇪🇸', phoneCode: '+34', mask: '+34 ### ## ## ##' },
  { code: 'PL', name: 'Польша', flag: '🇵🇱', phoneCode: '+48', mask: '+48 ### ### ###' },
  { code: 'NL', name: 'Нидерланды', flag: '🇳🇱', phoneCode: '+31', mask: '+31 ## ### ####' },
  { code: 'BE', name: 'Бельгия', flag: '🇧🇪', phoneCode: '+32', mask: '+32 ### ## ## ##' },
  { code: 'AT', name: 'Австрия', flag: '🇦🇹', phoneCode: '+43', mask: '+43 ### ######' },
  { code: 'CH', name: 'Швейцария', flag: '🇨🇭', phoneCode: '+41', mask: '+41 ## ### ## ##' },
  { code: 'SE', name: 'Швеция', flag: '🇸🇪', phoneCode: '+46', mask: '+46 ## ### ## ##' },
  { code: 'NO', name: 'Норвегия', flag: '🇳🇴', phoneCode: '+47', mask: '+47 ### ## ###' },
  { code: 'DK', name: 'Дания', flag: '🇩🇰', phoneCode: '+45', mask: '+45 ## ## ## ##' },
  { code: 'FI', name: 'Финляндия', flag: '🇫🇮', phoneCode: '+358', mask: '+358 ## ### ####' },
  { code: 'CZ', name: 'Чехия', flag: '🇨🇿', phoneCode: '+420', mask: '+420 ### ### ###' },
  { code: 'HU', name: 'Венгрия', flag: '🇭🇺', phoneCode: '+36', mask: '+36 ## ### ####' },
  { code: 'RO', name: 'Румыния', flag: '🇷🇴', phoneCode: '+40', mask: '+40 ### ### ###' },
  { code: 'BG', name: 'Болгария', flag: '🇧🇬', phoneCode: '+359', mask: '+359 ## ### ####' },
  { code: 'HR', name: 'Хорватия', flag: '🇭🇷', phoneCode: '+385', mask: '+385 ## ### ####' },
  { code: 'RS', name: 'Сербия', flag: '🇷🇸', phoneCode: '+381', mask: '+381 ## ### ####' },
  { code: 'GR', name: 'Греция', flag: '🇬🇷', phoneCode: '+30', mask: '+30 ### ### ####' },
  { code: 'TR', name: 'Турция', flag: '🇹🇷', phoneCode: '+90', mask: '+90 ### ### ####' },
  
  // Популярные страны Америки
  { code: 'US', name: 'США', flag: '🇺🇸', phoneCode: '+1', mask: '+1 (###) ###-####' },
  { code: 'CA', name: 'Канада', flag: '🇨🇦', phoneCode: '+1', mask: '+1 (###) ###-####' },
  { code: 'BR', name: 'Бразилия', flag: '🇧🇷', phoneCode: '+55', mask: '+55 ## #####-####' },
  { code: 'AR', name: 'Аргентина', flag: '🇦🇷', phoneCode: '+54', mask: '+54 ## ####-####' },
  { code: 'MX', name: 'Мексика', flag: '🇲🇽', phoneCode: '+52', mask: '+52 ## #### ####' },
  
  // Популярные азиатские страны
  { code: 'CN', name: 'Китай', flag: '🇨🇳', phoneCode: '+86', mask: '+86 ### #### ####' },
  { code: 'JP', name: 'Япония', flag: '🇯🇵', phoneCode: '+81', mask: '+81 ##-####-####' },
  { code: 'KR', name: 'Южная Корея', flag: '🇰🇷', phoneCode: '+82', mask: '+82 ##-####-####' },
  { code: 'IN', name: 'Индия', flag: '🇮🇳', phoneCode: '+91', mask: '+91 ##### #####' },
  { code: 'TH', name: 'Таиланд', flag: '🇹🇭', phoneCode: '+66', mask: '+66 ## ### ####' },
  { code: 'SG', name: 'Сингапур', flag: '🇸🇬', phoneCode: '+65', mask: '+65 #### ####' },
  { code: 'MY', name: 'Малайзия', flag: '🇲🇾', phoneCode: '+60', mask: '+60 ##-### ####' },
  { code: 'ID', name: 'Индонезия', flag: '🇮🇩', phoneCode: '+62', mask: '+62 ###-###-####' },
  { code: 'PH', name: 'Филиппины', flag: '🇵🇭', phoneCode: '+63', mask: '+63 ### ### ####' },
  { code: 'VN', name: 'Вьетнам', flag: '🇻🇳', phoneCode: '+84', mask: '+84 ## #### ####' },
  
  // Популярные страны Ближнего Востока и Африки
  { code: 'AE', name: 'ОАЭ', flag: '🇦🇪', phoneCode: '+971', mask: '+971 ## ### ####' },
  { code: 'SA', name: 'Саудовская Аравия', flag: '🇸🇦', phoneCode: '+966', mask: '+966 ## ### ####' },
  { code: 'IL', name: 'Израиль', flag: '🇮🇱', phoneCode: '+972', mask: '+972 ##-###-####' },
  { code: 'EG', name: 'Египет', flag: '🇪🇬', phoneCode: '+20', mask: '+20 ## #### ####' },
  { code: 'ZA', name: 'ЮАР', flag: '🇿🇦', phoneCode: '+27', mask: '+27 ## ### ####' },
  { code: 'NG', name: 'Нигерия', flag: '🇳🇬', phoneCode: '+234', mask: '+234 ### ### ####' },
  
  // Популярные страны Океании
  { code: 'AU', name: 'Австралия', flag: '🇦🇺', phoneCode: '+61', mask: '+61 ### ### ###' },
  { code: 'NZ', name: 'Новая Зеландия', flag: '🇳🇿', phoneCode: '+64', mask: '+64 ## ### ####' },
];

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  error,
  disabled
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<Country[]>(countries);

  // Определяем страну по геолокации при загрузке
  useEffect(() => {
    const detectCountry = async () => {
      try {
        // Сначала пробуем определить по часовому поясу
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const countryByTimezone = getCountryByTimezone(timezone);
        
        if (countryByTimezone) {
          setSelectedCountry(countryByTimezone);
          return;
        }

        // Если не получилось по часовому поясу, пробуем геолокацию
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (position) => {
              const { latitude, longitude } = position.coords;
              const country = await getCountryByCoordinates(latitude, longitude);
              
              if (country) {
                setSelectedCountry(country);
              } else {
                // Fallback на определение по языку
                setCountryByLanguage();
              }
            },
            () => {
              // Если геолокация недоступна, используем язык
              setCountryByLanguage();
            },
            { timeout: 5000, enableHighAccuracy: false }
          );
        } else {
          // Если геолокация не поддерживается, используем язык
          setCountryByLanguage();
        }
      } catch (error) {
        // В случае ошибки используем язык
        setCountryByLanguage();
      }
    };

    const getCountryByTimezone = (timezone: string): Country | null => {
      const timezoneMap: { [key: string]: string } = {
        'Europe/Moscow': 'RU',
        'Europe/Minsk': 'BY',
        'Asia/Almaty': 'KZ',
        'Asia/Qyzylorda': 'KZ',
        'Asia/Aqtobe': 'KZ',
        'Asia/Aqtau': 'KZ',
        'Asia/Atyrau': 'KZ',
        'Asia/Oral': 'KZ',
        'Europe/Kiev': 'UA',
        'Europe/Zaporozhye': 'UA',
        'Europe/Uzhgorod': 'UA',
        'Asia/Tashkent': 'UZ',
        'Asia/Samarkand': 'UZ',
        'Asia/Bishkek': 'KG',
        'Asia/Dushanbe': 'TJ',
        'Asia/Ashgabat': 'TM',
        'Asia/Yerevan': 'AM',
        'Asia/Baku': 'AZ',
        'Asia/Tbilisi': 'GE',
        'Europe/Chisinau': 'MD',
        'Europe/Vilnius': 'LT',
        'Europe/Riga': 'LV',
        'Europe/Tallinn': 'EE'
      };
      
      const countryCode = timezoneMap[timezone];
      return countryCode ? countries.find(c => c.code === countryCode) || null : null;
    };

    const getCountryByCoordinates = async (lat: number, lng: number): Promise<Country | null> => {
      try {
        // Используем бесплатный API для определения страны по координатам
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=ru`);
        const data = await response.json();
        
        if (data.countryCode) {
          return countries.find(c => c.code === data.countryCode) || null;
        }
        return null;
      } catch (error) {
        console.log('Ошибка определения страны по координатам:', error);
        return null;
      }
    };

    const setCountryByLanguage = () => {
      const userLang = navigator.language || 'ru-RU';
      
      if (userLang.startsWith('ru')) {
        setSelectedCountry(countries[0]); // Россия
      } else if (userLang.startsWith('be')) {
        setSelectedCountry(countries[1]); // Беларусь
      } else if (userLang.startsWith('kk')) {
        setSelectedCountry(countries[2]); // Казахстан
      } else if (userLang.startsWith('uk')) {
        setSelectedCountry(countries[3]); // Украина
      } else if (userLang.startsWith('uz')) {
        setSelectedCountry(countries[4]); // Узбекистан
      } else if (userLang.startsWith('ky')) {
        setSelectedCountry(countries[5]); // Кыргызстан
      } else if (userLang.startsWith('tg')) {
        setSelectedCountry(countries[6]); // Таджикистан
      } else if (userLang.startsWith('tk')) {
        setSelectedCountry(countries[7]); // Туркменистан
      } else if (userLang.startsWith('hy')) {
        setSelectedCountry(countries[8]); // Армения
      } else if (userLang.startsWith('az')) {
        setSelectedCountry(countries[9]); // Азербайджан
      } else if (userLang.startsWith('ka')) {
        setSelectedCountry(countries[10]); // Грузия
      } else if (userLang.startsWith('mo')) {
        setSelectedCountry(countries[11]); // Молдова
      } else if (userLang.startsWith('lt')) {
        setSelectedCountry(countries[12]); // Литва
      } else if (userLang.startsWith('lv')) {
        setSelectedCountry(countries[13]); // Латвия
      } else if (userLang.startsWith('et')) {
        setSelectedCountry(countries[14]); // Эстония
      } else {
        // По умолчанию Россия для русскоязычных пользователей
        setSelectedCountry(countries[0]);
      }
    };

    detectCountry();
  }, []);

  // Фильтрация стран по поисковому запросу
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.phoneCode.includes(searchQuery) ||
        country.code.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredCountries(filtered);
    }
  }, [searchQuery]);

  // Применяем маску к номеру телефона
  const applyMask = (value: string, mask: string): string => {
    let result = '';
    let valueIndex = 0;
    
    for (let i = 0; i < mask.length && valueIndex < value.length; i++) {
      if (mask[i] === '#') {
        result += value[valueIndex];
        valueIndex++;
      } else {
        result += mask[i];
      }
    }
    
    return result;
  };

  // Извлекаем только цифры из номера
  const extractDigits = (value: string): string => {
    return value.replace(/\D/g, '');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    
    // Убираем код страны из введенного значения, если он есть
    const phoneCode = selectedCountry.phoneCode;
    let cleanValue = inputValue;
    
    // Если пользователь ввел код страны, убираем его
    if (inputValue.startsWith(phoneCode)) {
      cleanValue = inputValue.substring(phoneCode.length);
    }
    
    const digits = extractDigits(cleanValue);
    
    // Ограничиваем количество цифр в зависимости от страны
    const maxDigits = selectedCountry.code === 'RU' || selectedCountry.code === 'KZ' ? 10 : 12;
    const limitedDigits = digits.slice(0, maxDigits);
    
    // Применяем маску только к цифрам номера (без кода страны)
    const phoneMask = selectedCountry.mask.replace(phoneCode, '').trim();
    const maskedValue = applyMask(limitedDigits, phoneMask);
    
    setPhoneNumber(maskedValue);
    
    // Передаем полный номер с кодом страны
    const fullPhoneNumber = phoneCode + ' ' + maskedValue;
    onChange(fullPhoneNumber);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchQuery('');
    
    // Переформатируем номер под новую маску (только цифры номера, без кода страны)
    const digits = extractDigits(phoneNumber);
    const phoneMask = country.mask.replace(country.phoneCode, '').trim();
    const maskedValue = applyMask(digits, phoneMask);
    setPhoneNumber(maskedValue);
    
    // Передаем полный номер с кодом страны
    const fullPhoneNumber = country.phoneCode + ' ' + maskedValue;
    onChange(fullPhoneNumber);
  };

  const handleDropdownToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchQuery('');
      setFilteredCountries(countries);
    }
  };

  return (
    <div className="phone-input">
      <div className="phone-input__wrapper">
        <div className="phone-input__country">
          <button
            type="button"
            className={`phone-input__country-button ${isOpen ? 'open' : ''}`}
            onClick={handleDropdownToggle}
            disabled={disabled}
          >
            <span className="phone-input__flag">{selectedCountry.flag}</span>
            <span className="phone-input__code">{selectedCountry.phoneCode}</span>
            <svg className="phone-input__arrow" width="12" height="8" viewBox="0 0 12 8">
              <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="2" fill="none"/>
            </svg>
          </button>
          
          {isOpen && (
            <div className="phone-input__dropdown">
              <div className="phone-input__search">
                <input
                  type="text"
                  placeholder="Поиск страны..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="phone-input__search-input"
                  autoFocus
                />
              </div>
              <div className="phone-input__countries-list">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      className="phone-input__country-option"
                      onClick={() => handleCountrySelect(country)}
                    >
                      <span className="phone-input__flag">{country.flag}</span>
                      <span className="phone-input__name">{country.name}</span>
                      <span className="phone-input__code">{country.phoneCode}</span>
                    </button>
                  ))
                ) : (
                  <div className="phone-input__no-results">
                    Страна не найдена
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <input
          type="tel"
          className={`phone-input__field ${error ? 'error' : ''}`}
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={selectedCountry.mask.replace(selectedCountry.phoneCode, '').replace(/#/g, '0').trim()}
          disabled={disabled}
        />
      </div>
      
      {error && (
        <span className="phone-input__error">{error}</span>
      )}
    </div>
  );
};
