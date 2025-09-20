import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { apiClient } from '../../services/api';
import './MarketingPage.scss';

interface Session {
  id: string;
  eventId: string;
  hallId: string;
  date: string;
  time: string;
  isActive: boolean;
  totalTickets: number;
  ticketsSold: number;
  tickets?: any[];
  event?: {
    name: string;
  };
  hall?: {
    name: string;
  };
}

interface Order {
  _id: string;
  sessionId: string;
  status: string;
  ticketData?: any[];
  total: number;
  paidAt?: string;
}

interface FacebookConfig {
  _id?: string;
  pixelId: string;
  accessToken: string;
  testEventCode: string;
  isActive: boolean;
  events: {
    viewContent: boolean;
    addToCart: boolean;
    initiateCheckout: boolean;
    purchase: boolean;
  };
}

const MarketingPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'reports' | 'analytics' | 'settings'>('calculator');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Состояние для Facebook конфигурации
  const [facebookConfig, setFacebookConfig] = useState<FacebookConfig>({
    pixelId: '',
    accessToken: '',
    testEventCode: '',
    isActive: true,
    events: {
      viewContent: true,
      addToCart: true,
      initiateCheckout: true,
      purchase: true
    }
  });
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [facebookSaving, setFacebookSaving] = useState(false);
  const [facebookTesting, setFacebookTesting] = useState(false);
  const [facebookMessage, setFacebookMessage] = useState('');

  // Состояние для калькулятора
  const [calculatorData, setCalculatorData] = useState({
    sessionId: '',
    concertDate: '',
    remainingTickets: 0,
    avgTicketsPerSale: 1.5,
    averageCPA: 0,
    cpaCurrency: 'USD',
    displayCurrency: 'USD'
  });

  // Состояние для результатов калькулятора
  const [calculatorResults, setCalculatorResults] = useState<any>(null);

  // Состояние для сеансов
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Загрузка сеансов для калькулятора
  const loadSessions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.request('/sessions?includeTickets=true');
      if (response.success) {
        setSessions(response.sessions || []);
        console.log('Сеансы загружены:', response.sessions?.length || 0);
      }
    } catch (err) {
      console.error('Ошибка загрузки сеансов:', err);
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // Расчет дней до концерта
  const calculateDaysUntilConcert = useCallback((concertDate: string) => {
    if (!concertDate) return 0;
    
    const today = new Date();
    const concert = new Date(concertDate);
    
    // Сбрасываем время до начала дня для точного подсчета
    today.setHours(0, 0, 0, 0);
    concert.setHours(0, 0, 0, 0);
    
    const diffTime = concert.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return Math.max(0, diffDays); // Не может быть отрицательным
  }, []);

  // Загрузка статистики по сеансу для расчета среднего количества билетов
  const loadOrdersForSession = useCallback(async (sessionId: string) => {
    try {
      const response = await apiClient.request(`/statistics/session/${sessionId}`);
      if (response.success) {
        const stats = response.data.stats;
        
        console.log('Статистика сеанса:', stats);
        
        // Возвращаем среднее количество билетов на заказ
        return stats.avgTicketsPerOrder || 1.5;
      }
      return 1.5;
    } catch (err) {
      console.error('Ошибка загрузки статистики сеанса:', err);
      return 1.5;
    }
  }, []);

  // Обработка выбора сеанса
  const handleSessionSelect = useCallback(async (sessionId: string) => {
    if (!sessionId) {
      setSelectedSession(null);
      setCalculatorData(prev => ({
        ...prev,
        sessionId: '',
        concertDate: '',
        remainingTickets: 0,
        avgTicketsPerSale: 1.5
      }));
      return;
    }

    try {
      // Загружаем полную информацию о сеансе с билетами
      const response = await apiClient.request(`/sessions/${sessionId}`);
      if (!response.success) {
        console.error('Ошибка загрузки сеанса:', response.message);
        return;
      }

      const session = response.session;
      setSelectedSession(session);

      // Устанавливаем дату концерта
      const sessionDate = new Date(session.date);
      const formattedDate = sessionDate.toISOString().split('T')[0];

      // Считаем оставшиеся билеты (билеты со статусом available)
      const remainingTickets = session.tickets ? 
        session.tickets.filter(ticket => ticket.status === 'available').length : 
        (session.totalTickets - session.ticketsSold);

      // Загружаем заказы и считаем среднее количество билетов
      const avgTicketsPerSale = await loadOrdersForSession(sessionId);

      setCalculatorData(prev => ({
        ...prev,
        sessionId,
        concertDate: formattedDate,
        remainingTickets: Math.max(0, remainingTickets),
        avgTicketsPerSale: Math.round(avgTicketsPerSale * 10) / 10 // Округляем до 1 знака
      }));

      console.log('Сеанс выбран:', {
        sessionName: session.event?.name || 'Без названия',
        date: formattedDate,
        remainingTickets: Math.max(0, remainingTickets),
        avgTicketsPerSale: Math.round(avgTicketsPerSale * 10) / 10,
        totalTickets: session.tickets?.length || 0,
        availableTickets: session.tickets?.filter(ticket => ticket.status === 'available').length || 0
      });
    } catch (err) {
      console.error('Ошибка загрузки сеанса:', err);
    }
  }, [loadOrdersForSession]);

  // Конвертация валют (упрощенная версия)
  const convertToUSD = useCallback((amount: number, currency: string) => {
    const rates: { [key: string]: number } = {
      'USD': 1,
      'EUR': 1.1,
      'RUB': 0.01,
      'GBP': 1.25
    };
    return amount * (rates[currency] || 1);
  }, []);

  const convertFromUSD = useCallback((amount: number, currency: string) => {
    const rates: { [key: string]: number } = {
      'USD': 1,
      'EUR': 1.1,
      'RUB': 0.01,
      'GBP': 1.25
    };
    return amount / (rates[currency] || 1);
  }, []);

  // Форматирование валюты
  const formatCurrency = useCallback((amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'RUB': '₽',
      'GBP': '£'
    };
    return `${symbols[currency] || '$'}${amount.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, []);

  // Основные расчеты рекламных расходов
  const performMarketingCalculations = useCallback((data: typeof calculatorData) => {
    const results: any = {};
    
    // Базовые данные
    const remainingTickets = data.remainingTickets;
    const avgTicketsPerSale = data.avgTicketsPerSale;
    const averageCPA = data.averageCPA;
    const concertDate = data.concertDate;
    
    // Дни до концерта
    results.daysUntilConcert = calculateDaysUntilConcert(concertDate);
    
    if (results.daysUntilConcert <= 0) {
      results.error = 'Дата концерта должна быть в будущем';
      return results;
    }
    
    if (remainingTickets <= 0) {
      results.error = 'Количество билетов должно быть больше 0';
      return results;
    }
    
    if (avgTicketsPerSale <= 0) {
      results.error = 'Среднее количество билетов на покупку должно быть больше 0';
      return results;
    }
    
    // Конвертируем CPA в USD для расчетов
    const cpaUSD = convertToUSD(averageCPA, data.cpaCurrency);
    
    // Количество необходимых покупок
    results.requiredPurchases = Math.ceil(remainingTickets / avgTicketsPerSale);
    
    // Общая стоимость рекламной кампании
    results.totalCampaignCost = results.requiredPurchases * cpaUSD;
    
    // Дневной бюджет
    results.dailyBudget = results.totalCampaignCost / results.daysUntilConcert;
    
    // Дневная цель по покупкам
    results.dailyPurchasesTarget = results.requiredPurchases / results.daysUntilConcert;
    
    // Дневная цель по билетам
    results.dailyTicketsTarget = remainingTickets / results.daysUntilConcert;
    
    // Расчет интенсивности кампании по периодам
    results.campaignIntensity = {
      type: 'uniform',
      description: 'Равномерное распределение бюджета',
      periods: [
        { 
          name: 'Ежедневно', 
          budget: results.totalCampaignCost / results.daysUntilConcert, 
          percentage: Math.round((100 / results.daysUntilConcert) * 100) / 100,
          dailyBudget: results.totalCampaignCost / results.daysUntilConcert
        }
      ]
    };
    
    
    return results;
  }, [calculateDaysUntilConcert, convertToUSD]);

  // Функция для запуска расчетов маркетинга
  const calculateMarketingResults = useCallback(() => {
    try {
      const results = performMarketingCalculations(calculatorData);
      setCalculatorResults(results);
    } catch (error) {
      console.error('Marketing calculation error:', error);
      setError(error instanceof Error ? error.message : 'Ошибка при расчете');
    }
  }, [calculatorData, performMarketingCalculations]);

  // Загрузка конфигурации Facebook
  const loadFacebookConfig = useCallback(async () => {
    try {
      setFacebookLoading(true);
      const response = await apiClient.request('/facebook/config');
      if (response._id) {
        setFacebookConfig(response);
      }
    } catch (error) {
      console.error('Ошибка загрузки конфигурации Facebook:', error);
      setFacebookMessage('Ошибка загрузки конфигурации');
    } finally {
      setFacebookLoading(false);
    }
  }, []);

  // Сохранение конфигурации Facebook
  const handleFacebookSave = async () => {
    try {
      setFacebookSaving(true);
      setFacebookMessage('');
      
      const response = await apiClient.request('/facebook/config', {
        method: 'POST',
        body: JSON.stringify(facebookConfig)
      });
      
      setFacebookMessage('Конфигурация сохранена успешно');
      setFacebookConfig(response.config);
    } catch (error) {
      console.error('Ошибка сохранения конфигурации:', error);
      setFacebookMessage('Ошибка сохранения конфигурации');
    } finally {
      setFacebookSaving(false);
    }
  };

  // Тестирование события Facebook
  const handleFacebookTestEvent = async (eventName: string) => {
    try {
      setFacebookTesting(true);
      setFacebookMessage('');
      
      const response = await apiClient.request('/facebook/test-event', {
        method: 'POST',
        body: JSON.stringify({
          eventName,
          eventData: {
            value: 100,
            currency: 'USD'
          }
        })
      });
      
      setFacebookMessage(`Тестовое событие ${eventName} отправлено успешно`);
    } catch (error) {
      console.error('Ошибка тестирования события:', error);
      setFacebookMessage('Ошибка отправки тестового события');
    } finally {
      setFacebookTesting(false);
    }
  };

  // Автоматический пересчет при изменении данных
  useEffect(() => {
    if (calculatorData.concertDate && calculatorData.remainingTickets > 0) {
      calculateMarketingResults();
    }
  }, [calculatorData, calculateMarketingResults]);

  // Инициализация
  useEffect(() => {
    // Устанавливаем дату по умолчанию (сегодня + 30 дней)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setCalculatorData(prev => ({
      ...prev,
      concertDate: defaultDate.toISOString().split('T')[0]
    }));

    loadSessions();
    loadFacebookConfig();
  }, [loadSessions, loadFacebookConfig]);

  // Обработка изменения полей калькулятора
  const handleCalculatorChange = useCallback((field: string, value: any) => {
    if (field === 'sessionId') {
      handleSessionSelect(value);
    } else {
      setCalculatorData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }, [handleSessionSelect]);

  // Отображение результатов калькулятора
  const renderCalculatorResults = () => {
    if (!calculatorResults) return null;

    if (calculatorResults.error) {
      return (
        <div className="marketing-calculator__error">
          <div className="error-message">
            {calculatorResults.error}
          </div>
        </div>
      );
    }

    const formatAmount = (amount: number) => formatCurrency(convertFromUSD(amount, calculatorData.displayCurrency), calculatorData.displayCurrency);

    return (
      <div className="marketing-calculator__results">
        {/* Основные показатели */}
        <div className="results-card">
          <h4>Временные рамки</h4>
          <div className="results-grid">
            <div>
              Дней до концерта: 
              <span className={`highlight ${calculatorResults.daysUntilConcert <= 7 ? 'urgent' : calculatorResults.daysUntilConcert <= 14 ? 'warning' : 'normal'}`}>
                {calculatorResults.daysUntilConcert}
              </span>
            </div>
          </div>
        </div>

        {/* Цели */}
        <div className="results-card">
          <h4>Цели кампании</h4>
          <div className="results-list">
            <div className="result-item">
              <span>Необходимо покупок:</span>
              <span className="result-value">{Math.round(calculatorResults.requiredPurchases)}</span>
            </div>
            <div className="result-item">
              <span>Покупок в день:</span>
              <span className="result-value">{calculatorResults.dailyPurchasesTarget.toFixed(1)}</span>
            </div>
            <div className="result-item">
              <span>Билетов в день:</span>
              <span className="result-value">{calculatorResults.dailyTicketsTarget.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Бюджет */}
        <div className="results-card budget-card">
          <h4>Рекламный бюджет</h4>
          <div className="results-list">
            <div className="result-item">
              <span>Общий бюджет:</span>
              <span className="result-value budget-value">{formatAmount(calculatorResults.totalCampaignCost)}</span>
            </div>
            <div className="result-item">
              <span>Дневной бюджет:</span>
              <span className="result-value">{formatAmount(calculatorResults.dailyBudget)}</span>
            </div>
          </div>
        </div>

      </div>
    );
  };

  // Функция рендеринга настроек интеграций
  const renderIntegrationsSettings = () => (
    <div className="integrations-settings">
      <div className="settings-header">
        <h2>Настройки интеграций</h2>
        <p>Управление подключениями к аналитическим системам</p>
      </div>

      {facebookMessage && (
        <div className={`message ${facebookMessage.includes('Ошибка') ? 'error' : 'success'}`}>
          {facebookMessage}
        </div>
      )}

      {/* Facebook интеграция */}
      <div className="integration-card">
        <div className="integration-header">
          <div className="integration-title">
            <h3>Facebook Pixel</h3>
            <span className="integration-status">
              {facebookConfig.isActive ? 'Активна' : 'Неактивна'}
            </span>
          </div>
          <div className="integration-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={facebookConfig.isActive}
                onChange={(e) => setFacebookConfig({ ...facebookConfig, isActive: e.target.checked })}
              />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div className="integration-fields">
          <div className="field-group">
            <label htmlFor="pixelId">Pixel ID</label>
            <input
              type="text"
              id="pixelId"
              value={facebookConfig.pixelId}
              onChange={(e) => setFacebookConfig({ ...facebookConfig, pixelId: e.target.value })}
              placeholder="Введите Pixel ID"
              disabled={!facebookConfig.isActive}
            />
          </div>

          <div className="field-group">
            <label htmlFor="accessToken">Access Token</label>
            <input
              type="password"
              id="accessToken"
              value={facebookConfig.accessToken}
              onChange={(e) => setFacebookConfig({ ...facebookConfig, accessToken: e.target.value })}
              placeholder="Введите Access Token"
              disabled={!facebookConfig.isActive}
            />
          </div>
        </div>

        <div className="integration-actions">
          <button
            onClick={handleFacebookSave}
            disabled={facebookSaving || !facebookConfig.pixelId || !facebookConfig.accessToken}
            className="save-btn"
          >
            {facebookSaving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>

      {/* Google Analytics интеграция (заглушка) */}
      <div className="integration-card disabled">
        <div className="integration-header">
          <div className="integration-title">
            <h3>Google Analytics</h3>
            <span className="integration-status">Скоро</span>
          </div>
          <div className="integration-toggle">
            <label className="toggle-switch disabled">
              <input type="checkbox" disabled />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div className="integration-placeholder">
          <p>Интеграция с Google Analytics будет доступна в ближайшее время</p>
        </div>
      </div>

      {/* Яндекс.Метрика интеграция (заглушка) */}
      <div className="integration-card disabled">
        <div className="integration-header">
          <div className="integration-title">
            <h3>Яндекс.Метрика</h3>
            <span className="integration-status">Скоро</span>
          </div>
          <div className="integration-toggle">
            <label className="toggle-switch disabled">
              <input type="checkbox" disabled />
              <span className="toggle-slider"></span>
            </label>
          </div>
        </div>
        <div className="integration-placeholder">
          <p>Интеграция с Яндекс.Метрикой будет доступна в ближайшее время</p>
        </div>
      </div>
    </div>
  );

  return (
    <Layout currentPage="marketing">
      <div className="marketing-page">
        <div className="marketing-page__header">
          <h1>Реклама</h1>
          <p>Управление рекламными кампаниями и анализ эффективности</p>
        </div>

      <div className="marketing-page__tabs">
        <button
          className={`tab-button ${activeTab === 'calculator' ? 'active' : ''}`}
          onClick={() => setActiveTab('calculator')}
        >
          Калькулятор
        </button>
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          Отчеты
        </button>
        <button
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          Сквозная аналитика
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          Настройки
        </button>
      </div>

      <div className="marketing-page__content">
        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Загрузка...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Калькулятор */}
        {activeTab === 'calculator' && (
          <div className="marketing-calculator">
            <div className="marketing-calculator__form">
              <h3>Параметры кампании</h3>
              
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="sessionSelect">Сеанс</label>
                  <select
                    id="sessionSelect"
                    value={calculatorData.sessionId}
                    onChange={(e) => handleCalculatorChange('sessionId', e.target.value)}
                  >
                    <option value="">Выберите сеанс</option>
                    {sessions.map(session => (
                      <option key={session.id} value={session.id}>
                        {session.event?.name || 'Без названия'} - {new Date(session.date).toLocaleDateString('ru-RU')} {session.time}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="concertDate">Дата концерта</label>
                  <input
                    type="date"
                    id="concertDate"
                    value={calculatorData.concertDate}
                    onChange={(e) => handleCalculatorChange('concertDate', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="remainingTickets">Оставшиеся билеты</label>
                  <input
                    type="number"
                    id="remainingTickets"
                    min="0"
                    value={calculatorData.remainingTickets}
                    onChange={(e) => handleCalculatorChange('remainingTickets', parseInt(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="avgTicketsPerSale">Среднее количество билетов на покупку</label>
                  <input
                    type="number"
                    id="avgTicketsPerSale"
                    min="0.1"
                    step="0.1"
                    value={calculatorData.avgTicketsPerSale}
                    onChange={(e) => handleCalculatorChange('avgTicketsPerSale', parseFloat(e.target.value) || 1.5)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="averageCPA">Средний CPA</label>
                  <input
                    type="number"
                    id="averageCPA"
                    min="0"
                    step="0.01"
                    value={calculatorData.averageCPA}
                    onChange={(e) => handleCalculatorChange('averageCPA', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cpaCurrency">Валюта CPA</label>
                  <select
                    id="cpaCurrency"
                    value={calculatorData.cpaCurrency}
                    onChange={(e) => handleCalculatorChange('cpaCurrency', e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="displayCurrency">Валюта отображения</label>
                  <select
                    id="displayCurrency"
                    value={calculatorData.displayCurrency}
                    onChange={(e) => handleCalculatorChange('displayCurrency', e.target.value)}
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="RUB">RUB</option>
                    <option value="GBP">GBP</option>
                  </select>
                </div>
              </div>

              {/* Информация о выбранном сеансе */}
              {selectedSession && (
                <div className="session-info">
                  <h4>Информация о сеансе</h4>
                  <div className="session-details">
                    <div className="session-detail">
                      <span className="label">Мероприятие:</span>
                      <span className="value">{selectedSession.event?.name || 'Без названия'}</span>
                    </div>
                    <div className="session-detail">
                      <span className="label">Дата и время:</span>
                      <span className="value">
                        {new Date(selectedSession.date).toLocaleDateString('ru-RU')} в {selectedSession.time}
                      </span>
                    </div>
                    <div className="session-detail">
                      <span className="label">Зал:</span>
                      <span className="value">{selectedSession.hall?.name || 'Не указан'}</span>
                    </div>
                    <div className="session-detail">
                      <span className="label">Всего мест:</span>
                      <span className="value">
                        {selectedSession.tickets ? selectedSession.tickets.length : selectedSession.totalTickets}
                      </span>
                    </div>
                    <div className="session-detail">
                      <span className="label">Проданных билетов:</span>
                      <span className="value">
                        {selectedSession.tickets ? 
                          selectedSession.tickets.filter(ticket => ticket.status === 'sold').length : 
                          selectedSession.ticketsSold
                        }
                      </span>
                    </div>
                    <div className="session-detail">
                      <span className="label">Оставшихся билетов:</span>
                      <span className="value highlight">
                        {calculatorData.remainingTickets}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {renderCalculatorResults()}
          </div>
        )}

        {/* Отчеты */}
        {activeTab === 'reports' && (
          <div className="marketing-reports">
            <div className="coming-soon">
              <div className="coming-soon__icon">📊</div>
              <h3>В разработке</h3>
              <p>Раздел "Отчеты" находится в разработке и будет доступен в ближайшее время.</p>
            </div>
          </div>
        )}

        {/* Сквозная аналитика */}
        {activeTab === 'analytics' && (
          <div className="marketing-analytics">
            <div className="coming-soon">
              <div className="coming-soon__icon">🔍</div>
              <h3>В разработке</h3>
              <p>Раздел "Сквозная аналитика" находится в разработке и будет доступен в ближайшее время.</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && renderIntegrationsSettings()}
      </div>
      </div>
    </Layout>
  );
};

export default MarketingPage;
