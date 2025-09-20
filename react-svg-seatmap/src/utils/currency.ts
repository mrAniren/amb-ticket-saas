// Утилиты для работы с валютами

export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
  locale: string;
}

// Поддерживаемые валюты
export const SUPPORTED_CURRENCIES: Record<string, CurrencyInfo> = {
  // Основные валюты
  'RUB': {
    code: 'RUB',
    symbol: '₽',
    name: 'Российский рубль',
    locale: 'ru-RU'
  },
  'USD': {
    code: 'USD',
    symbol: '$',
    name: 'Доллар США',
    locale: 'en-US'
  },
  'EUR': {
    code: 'EUR',
    symbol: '€',
    name: 'Евро',
    locale: 'de-DE'
  },
  'GBP': {
    code: 'GBP',
    symbol: '£',
    name: 'Британский фунт',
    locale: 'en-GB'
  },
  
  // Валюты стран СНГ
  'UAH': {
    code: 'UAH',
    symbol: '₴',
    name: 'Украинская гривна',
    locale: 'uk-UA'
  },
  'BYN': {
    code: 'BYN',
    symbol: 'Br',
    name: 'Белорусский рубль',
    locale: 'be-BY'
  },
  'KZT': {
    code: 'KZT',
    symbol: '₸',
    name: 'Казахстанский тенге',
    locale: 'kk-KZ'
  },
  'KGS': {
    code: 'KGS',
    symbol: 'сом',
    name: 'Киргизский сом',
    locale: 'ky-KG'
  },
  'AMD': {
    code: 'AMD',
    symbol: '֏',
    name: 'Армянский драм',
    locale: 'hy-AM'
  },
  'AZN': {
    code: 'AZN',
    symbol: '₼',
    name: 'Азербайджанский манат',
    locale: 'az-AZ'
  },
  'GEL': {
    code: 'GEL',
    symbol: '₾',
    name: 'Грузинский лари',
    locale: 'ka-GE'
  },
  'MDL': {
    code: 'MDL',
    symbol: 'L',
    name: 'Молдавский лей',
    locale: 'ro-MD'
  },
  'TJS': {
    code: 'TJS',
    symbol: 'SM',
    name: 'Таджикский сомони',
    locale: 'tg-TJ'
  },
  'TMT': {
    code: 'TMT',
    symbol: 'T',
    name: 'Туркменский манат',
    locale: 'tk-TM'
  },
  'UZS': {
    code: 'UZS',
    symbol: 'сўм',
    name: 'Узбекский сум',
    locale: 'uz-UZ'
  }
};

/**
 * Форматирует сумму с валютой
 * @param amount - сумма для форматирования
 * @param currency - код валюты (по умолчанию RUB)
 * @returns отформатированная строка с валютой
 */
export const formatCurrency = (amount: number, currency: string = 'RUB'): string => {
  const currencyInfo = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES['RUB'];
  
  // Форматируем число с учетом локали
  const formattedAmount = amount.toLocaleString(currencyInfo.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return `${formattedAmount} ${currencyInfo.symbol}`;
};

/**
 * Получает символ валюты
 * @param currency - код валюты
 * @returns символ валюты
 */
export const getCurrencySymbol = (currency: string = 'RUB'): string => {
  const currencyInfo = SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES['RUB'];
  return currencyInfo.symbol;
};

/**
 * Получает информацию о валюте
 * @param currency - код валюты
 * @returns информация о валюте
 */
export const getCurrencyInfo = (currency: string = 'RUB'): CurrencyInfo => {
  return SUPPORTED_CURRENCIES[currency] || SUPPORTED_CURRENCIES['RUB'];
};

/**
 * Определяет основную валюту из списка билетов
 * @param tickets - массив билетов с полем currency
 * @returns код основной валюты
 */
export const getPrimaryCurrency = (tickets: Array<{ currency?: string }>): string => {
  if (!tickets || tickets.length === 0) {
    return 'RUB';
  }
  
  // Подсчитываем частоту валют
  const currencyCount: Record<string, number> = {};
  tickets.forEach(ticket => {
    const currency = ticket.currency || 'RUB';
    currencyCount[currency] = (currencyCount[currency] || 0) + 1;
  });
  
  // Возвращаем валюту с наибольшей частотой
  const primaryCurrency = Object.entries(currencyCount)
    .sort(([, a], [, b]) => b - a)[0]?.[0];
  
  return primaryCurrency || 'RUB';
};

/**
 * Конвертирует сумму в USD для Facebook Events API
 * @param amount - сумма в исходной валюте
 * @param fromCurrency - исходная валюта
 * @returns сумма в USD (упрощенная конвертация)
 */
export const convertToUSD = (amount: number, fromCurrency: string = 'RUB'): number => {
  // Упрощенные курсы валют (в реальном проекте лучше использовать API курсов)
  const rates: Record<string, number> = {
    // Основные валюты
    'RUB': 0.01,  // 1 RUB = 0.01 USD
    'USD': 1.0,   // 1 USD = 1 USD
    'EUR': 1.1,   // 1 EUR = 1.1 USD
    'GBP': 1.25,  // 1 GBP = 1.25 USD
    
    // Валюты стран СНГ
    'UAH': 0.025, // 1 UAH = 0.025 USD
    'BYN': 0.3,   // 1 BYN = 0.3 USD
    'KZT': 0.002, // 1 KZT = 0.002 USD
    'KGS': 0.011, // 1 KGS = 0.011 USD
    'AMD': 0.0025, // 1 AMD = 0.0025 USD
    'AZN': 0.59,  // 1 AZN = 0.59 USD
    'GEL': 0.37,  // 1 GEL = 0.37 USD
    'MDL': 0.055, // 1 MDL = 0.055 USD
    'TJS': 0.092, // 1 TJS = 0.092 USD
    'TMT': 0.29,  // 1 TMT = 0.29 USD
    'UZS': 0.00008 // 1 UZS = 0.00008 USD
  };
  
  const rate = rates[fromCurrency] || rates['RUB'];
  return Math.round(amount * rate * 100) / 100; // Округляем до 2 знаков
};

/**
 * Проверяет, поддерживается ли валюта
 * @param currency - код валюты
 * @returns true, если валюта поддерживается
 */
export const isCurrencySupported = (currency: string): boolean => {
  return currency in SUPPORTED_CURRENCIES;
};
