const express = require('express');
const router = express.Router();
const currencyService = require('../services/currencyService');

// Инициализируем сервис валют при запуске
currencyService.initialize();

// GET /api/currency/rates - получить курсы валют
router.get('/rates', async (req, res) => {
  try {
    // Обновляем курсы если нужно
    if (currencyService.needsUpdate()) {
      await currencyService.fetchExchangeRates();
    }

    const ratesInfo = currencyService.getRatesInfo();
    
    res.json({
      success: true,
      data: ratesInfo
    });
  } catch (error) {
    console.error('❌ Ошибка получения курсов валют:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения курсов валют'
    });
  }
});

// POST /api/currency/convert - конвертировать валюту
router.post('/convert', async (req, res) => {
  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Необходимы параметры: amount, fromCurrency, toCurrency'
      });
    }

    // Обновляем курсы если нужно
    if (currencyService.needsUpdate()) {
      await currencyService.fetchExchangeRates();
    }

    const convertedAmount = currencyService.convertCurrency(
      parseFloat(amount), 
      fromCurrency, 
      toCurrency
    );

    res.json({
      success: true,
      data: {
        originalAmount: parseFloat(amount),
        fromCurrency,
        toCurrency,
        convertedAmount,
        rate: currencyService.getRateToUSD(fromCurrency) / currencyService.getRateToUSD(toCurrency)
      }
    });
  } catch (error) {
    console.error('❌ Ошибка конвертации валюты:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка конвертации валюты'
    });
  }
});

// POST /api/currency/convert-multiple - конвертировать массив сумм в одну валюту
router.post('/convert-multiple', async (req, res) => {
  try {
    const { amounts, toCurrency } = req.body;

    if (!amounts || !Array.isArray(amounts) || !toCurrency) {
      return res.status(400).json({
        success: false,
        error: 'Необходимы параметры: amounts (массив), toCurrency'
      });
    }

    // Обновляем курсы если нужно
    if (currencyService.needsUpdate()) {
      await currencyService.fetchExchangeRates();
    }

    const convertedAmounts = amounts.map(item => {
      const convertedAmount = currencyService.convertCurrency(
        parseFloat(item.amount), 
        item.currency, 
        toCurrency
      );
      
      return {
        ...item,
        convertedAmount,
        originalAmount: parseFloat(item.amount),
        originalCurrency: item.currency
      };
    });

    const totalConverted = convertedAmounts.reduce((sum, item) => sum + item.convertedAmount, 0);

    res.json({
      success: true,
      data: {
        amounts: convertedAmounts,
        totalConverted,
        toCurrency
      }
    });
  } catch (error) {
    console.error('❌ Ошибка конвертации множественных валют:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка конвертации валют'
    });
  }
});

module.exports = router;
