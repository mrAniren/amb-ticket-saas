const axios = require('axios');

class CurrencyService {
  constructor() {
    this.exchangeRates = new Map();
    this.lastUpdate = null;
    this.updateInterval = 60 * 60 * 1000; // 1 час
  }

  // Получаем курсы валют
  async fetchExchangeRates() {
    try {
      console.log('💱 Получение курсов валют...');
      
      // Используем бесплатный API exchangerate-api.com
      const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', {
        timeout: 10000
      });

      if (response.data && response.data.rates) {
        this.exchangeRates = new Map(Object.entries(response.data.rates));
        this.lastUpdate = new Date();
        
        console.log('✅ Курсы валют обновлены:', {
          base: response.data.base,
          date: response.data.date,
          currencies: Array.from(this.exchangeRates.keys()).slice(0, 10) // Показываем первые 10
        });
        
        return true;
      }
      
      throw new Error('Неверный формат ответа API');
    } catch (error) {
      console.error('❌ Ошибка получения курсов валют:', error.message);
      
      // Fallback курсы (примерные)
      this.setFallbackRates();
      return false;
    }
  }

  // Устанавливаем fallback курсы
  setFallbackRates() {
    console.log('⚠️ Используем fallback курсы валют');
    this.exchangeRates = new Map([
      ['USD', 1.0],
      ['RUB', 95.0],
      ['KGS', 89.0], // 1 USD = 89 KGS
      ['KZT', 450.0], // 1 USD = 450 KZT
      ['EUR', 0.92],
      ['GBP', 0.79]
    ]);
    this.lastUpdate = new Date();
  }

  // Проверяем, нужно ли обновить курсы
  needsUpdate() {
    if (!this.lastUpdate) return true;
    return (Date.now() - this.lastUpdate.getTime()) > this.updateInterval;
  }

  // Получаем курс валюты к USD
  getRateToUSD(currency) {
    if (!this.exchangeRates.has(currency)) {
      console.warn(`⚠️ Курс для валюты ${currency} не найден, используем 1.0`);
      return 1.0;
    }
    return this.exchangeRates.get(currency);
  }

  // Конвертируем из одной валюты в другую
  convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Конвертируем в USD, затем в целевую валюту
    const fromRate = this.getRateToUSD(fromCurrency);
    const toRate = this.getRateToUSD(toCurrency);
    
    const amountInUSD = amount / fromRate;
    const convertedAmount = amountInUSD * toRate;
    
    return Math.round(convertedAmount * 100) / 100; // Округляем до 2 знаков
  }

  // Инициализация сервиса
  async initialize() {
    if (this.needsUpdate()) {
      await this.fetchExchangeRates();
    }
  }

  // Получаем все доступные валюты
  getAvailableCurrencies() {
    return Array.from(this.exchangeRates.keys());
  }

  // Получаем информацию о курсах
  getRatesInfo() {
    return {
      lastUpdate: this.lastUpdate,
      currencies: this.getAvailableCurrencies(),
      rates: Object.fromEntries(this.exchangeRates)
    };
  }
}

// Создаем единственный экземпляр
const currencyService = new CurrencyService();

module.exports = currencyService;
