import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { apiClient } from '../../services/api';
import './CustomersPage.scss';

interface DateRange {
  startDate: string;
  endDate: string;
}

interface Customer {
  _id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  total: number;
  currency: string;
  paidAt: string;
  paymentMethod: string;
  supplier: string;
  ticketCount: number;
  orderNumber?: string;
  sessionInfo: {
    id: string;
    date: string;
    time: string;
    eventTitle?: string;
    hallName?: string;
  };
}

interface Ticket {
  _id: string;
  ticketId: string;
  seatRow: number;
  seatNumber: number;
  seatSection: string;
  price: number;
  currency: string;
  pdfGenerated: boolean;
}

interface CustomerStats {
  totalCustomers: number;
  totalRevenue: number;
  totalTickets: number;
  avgOrderValue: number;
  uniqueCustomersCount: number;
}

interface CustomersResponse {
  customers: Customer[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

const CustomersPage: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<CustomersResponse['pagination'] | null>(null);
  // Функция для получения даты последней недели
  const getLastWeekRange = (): DateRange => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 6); // 7 дней назад (включая сегодня)
    
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

  // Обработка изменения фильтра дат
  const handleDateRangeChange = useCallback((newRange: DateRange) => {
    setDateRange(newRange);
    setCurrentPage(1);
  }, []);

  // Функции для быстрых периодов
  const setToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    handleDateRangeChange({ startDate: today, endDate: today });
  }, [handleDateRangeChange]);

  const setYesterday = useCallback(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    handleDateRangeChange({ startDate: yesterdayStr, endDate: yesterdayStr });
  }, [handleDateRangeChange]);

  const setWeek = useCallback(() => {
    const weekRange = getLastWeekRange();
    handleDateRangeChange(weekRange);
  }, [handleDateRangeChange]);

  const setMonth = useCallback(() => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    handleDateRangeChange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  }, [handleDateRangeChange]);

  const resetDateFilters = useCallback(() => {
    handleDateRangeChange({ startDate: '', endDate: '' });
  }, [handleDateRangeChange]);

  const [dateRange, setDateRange] = useState<DateRange>(getLastWeekRange());
  const [sortBy, setSortBy] = useState<'paidAt' | 'customerName' | 'total'>('paidAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchOrderNumber, setSearchOrderNumber] = useState('');
  const [searchTicketNumber, setSearchTicketNumber] = useState('');
  const [tempSearchOrderNumber, setTempSearchOrderNumber] = useState('');
  const [tempSearchTicketNumber, setTempSearchTicketNumber] = useState('');
  
  // Состояние для аккордеона
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [orderTickets, setOrderTickets] = useState<Record<string, Ticket[]>>({});
  const [loadingTickets, setLoadingTickets] = useState<Set<string>>(new Set());

  // Загрузка данных клиентов
  const loadCustomers = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        sortBy,
        sortOrder
      });

      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      if (searchOrderNumber.trim()) {
        params.append('orderNumber', searchOrderNumber.trim());
      }
      if (searchTicketNumber.trim()) {
        params.append('ticketNumber', searchTicketNumber.trim());
      }


      const response = await apiClient.request(`/customers?${params.toString()}`);
      
      if (response.success) {
        setCustomers(response.data.customers);
        setPagination(response.data.pagination);
        setCurrentPage(page);
      } else {
        throw new Error(response.message || 'Ошибка загрузки клиентов');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, [dateRange, sortBy, sortOrder, searchOrderNumber, searchTicketNumber]);

  // Функция для переключения аккордеона
  const toggleOrderExpansion = useCallback(async (orderId: string) => {
    const isExpanded = expandedOrders.has(orderId);
    
    if (isExpanded) {
      // Сворачиваем
      setExpandedOrders(prev => {
        const newSet = new Set(prev);
        newSet.delete(orderId);
        return newSet;
      });
    } else {
      // Разворачиваем и загружаем билеты
      setExpandedOrders(prev => new Set(prev).add(orderId));
      
      // Если билеты еще не загружены, загружаем их
      if (!orderTickets[orderId]) {
        setLoadingTickets(prev => new Set(prev).add(orderId));
        
        try {
          const response = await apiClient.getOrderTickets(orderId);
          if (response.success && response.data) {
            setOrderTickets(prev => ({
              ...prev,
              [orderId]: response.data!.tickets
            }));
          }
        } catch (error) {
          // Ошибка загрузки билетов
        } finally {
          setLoadingTickets(prev => {
            const newSet = new Set(prev);
            newSet.delete(orderId);
            return newSet;
          });
        }
      }
    }
  }, [expandedOrders, orderTickets]);

  // Функция для скачивания билета
  const downloadTicket = useCallback(async (ticketId: string) => {
    try {
      const blob = await apiClient.downloadTicket(ticketId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ticket_${ticketId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Ошибка при скачивании билета');
    }
  }, []);

  // Загрузка статистики клиентов
  const loadStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }

      const response = await apiClient.request(`/customers/stats?${params.toString()}`);
      
      if (response.success) {
        setStats(response.data);
      }
    } catch (err) {
      // Ошибка загрузки статистики
    }
  }, [dateRange]);

  // Загрузка данных при изменении параметров
  useEffect(() => {
    loadCustomers(1);
    loadStats();
  }, [loadCustomers, loadStats]);

  // Обработка поиска по номеру заказа
  const handleOrderNumberInput = useCallback((value: string) => {
    setTempSearchOrderNumber(value);
  }, []);

  // Обработка поиска по номеру билета
  const handleTicketNumberInput = useCallback((value: string) => {
    setTempSearchTicketNumber(value);
  }, []);

  // Выполнение поиска
  const handleSearch = useCallback(() => {
    setSearchOrderNumber(tempSearchOrderNumber);
    setSearchTicketNumber(tempSearchTicketNumber);
    setCurrentPage(1);
  }, [tempSearchOrderNumber, tempSearchTicketNumber]);

  // Очистка поиска
  const handleClearSearch = useCallback(() => {
    setTempSearchOrderNumber('');
    setTempSearchTicketNumber('');
    setSearchOrderNumber('');
    setSearchTicketNumber('');
    setCurrentPage(1);
  }, []);

  // Обработка изменения сортировки
  const handleSortChange = useCallback((newSortBy: typeof sortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  }, [sortBy, sortOrder]);

  // Обработка смены страницы
  const handlePageChange = useCallback((page: number) => {
    loadCustomers(page);
  }, [loadCustomers]);

  // Форматирование даты
  const formatDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  // Форматирование даты сессии
  const formatSessionDate = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }, []);

  // Форматирование суммы
  const formatAmount = useCallback((amount: number) => {
    return amount.toLocaleString('ru-RU');
  }, []);

  // Мемоизированные данные для отображения
  const displayData = useMemo(() => {
    return {
      customers,
      stats,
      pagination,
      loading,
      error
    };
  }, [customers, stats, pagination, loading, error]);

  if (loading && customers.length === 0) {
    return (
      <Layout currentPage="customers">
        <div className="customers-page">
          <div className="customers-page__loading">
            <div className="spinner"></div>
            <p>Загрузка клиентов...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="customers">
      <div className="customers-page">
        <div className="customers-page__header">
          <h1>Клиенты</h1>
        </div>

        {/* Фильтры */}
        <div className="customers-page__filters">
          <div className="date-filter">
            <div className="date-filter__header">
              <h3>Фильтр по датам</h3>
            </div>
            
            <div className="date-filter__quick-buttons">
              <button 
                className="quick-btn" 
                onClick={setToday}
                title="Сегодня"
              >
                Сегодня
              </button>
              <button 
                className="quick-btn" 
                onClick={setYesterday}
                title="Вчера"
              >
                Вчера
              </button>
              <button 
                className="quick-btn" 
                onClick={setWeek}
                title="Неделя"
              >
                Неделя
              </button>
              <button 
                className="quick-btn" 
                onClick={setMonth}
                title="Месяц"
              >
                Месяц
              </button>
              <button 
                className="quick-btn reset-btn" 
                onClick={resetDateFilters}
                title="Сбросить"
              >
                Сбросить
              </button>
            </div>
            
            <div className="date-filter__inputs">
              <div className="date-input-group">
                <label>От:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange({ ...dateRange, startDate: e.target.value })}
                  className="date-input"
                />
              </div>
              <div className="date-input-group">
                <label>До:</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange({ ...dateRange, endDate: e.target.value })}
                  className="date-input"
                />
              </div>
            </div>
            
            {(dateRange.startDate || dateRange.endDate) && (
              <div className="date-filter__info">
                <span className="filter-info">
                  Показаны данные
                  {dateRange.startDate && ` с ${new Date(dateRange.startDate).toLocaleDateString('ru-RU')}`}
                  {dateRange.endDate && ` по ${new Date(dateRange.endDate).toLocaleDateString('ru-RU')}`}
                </span>
              </div>
            )}
          </div>
          
          <div className="filters-row">
            <div className="filter-group">
              <label>Номер заказа</label>
              <input
                type="text"
                placeholder="Введите номер заказа"
                value={tempSearchOrderNumber}
                onChange={(e) => handleOrderNumberInput(e.target.value)}
                className="search-input"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <div className="filter-group">
              <label>Номер билета</label>
              <input
                type="text"
                placeholder="Введите номер билета"
                value={tempSearchTicketNumber}
                onChange={(e) => handleTicketNumberInput(e.target.value)}
                className="search-input"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            <div className="filter-group">
              <label>Действия</label>
              <div className="search-actions">
                <button
                  type="button"
                  onClick={handleSearch}
                  className="search-btn"
                >
                  Поиск
                </button>
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="clear-btn"
                >
                  Очистить
                </button>
              </div>
            </div>
            
            <div className="filter-group">
              <label>Сортировка</label>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-');
                  handleSortChange(newSortBy as typeof sortBy);
                  setSortOrder(newSortOrder as 'asc' | 'desc');
                }}
                className="sort-select"
              >
                <option value="paidAt-desc">Дата оплаты (новые)</option>
                <option value="paidAt-asc">Дата оплаты (старые)</option>
                <option value="customerName-asc">Имя (А-Я)</option>
                <option value="customerName-desc">Имя (Я-А)</option>
                <option value="total-desc">Сумма (больше)</option>
                <option value="total-asc">Сумма (меньше)</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="customers-page__error">
            <p>{error}</p>
            <button onClick={() => loadCustomers(currentPage)}>
              Попробовать снова
            </button>
          </div>
        )}

        {/* Карточки заказов */}
        <div className="customers-page__orders-container">
          {displayData.customers.map((customer) => (
            <div key={customer._id} className="order-card">
              {/* Основная информация о заказе */}
              <div 
                className="order-card__header"
                onClick={() => toggleOrderExpansion(customer._id)}
              >
                <div className="order-card__main-info">
                  <div className="order-card__customer">
                    <h3>{customer.customerName}</h3>
                    <div className="order-card__contacts">
                      <span>{customer.customerEmail}</span>
                      <span>{customer.customerPhone}</span>
                      {customer.orderNumber && (
                        <span className="order-card__order-number">
                          Заказ № {customer.orderNumber}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="order-card__event">
                    <h4>{customer.sessionInfo.eventTitle || 'Без названия'}</h4>
                    <div className="order-card__session">
                      {formatSessionDate(customer.sessionInfo.date)} {customer.sessionInfo.time}
                      {customer.sessionInfo.hallName && (
                        <span> • {customer.sessionInfo.hallName}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="order-card__details">
                    <div className="order-card__tickets">
                      {customer.ticketCount} билет{customer.ticketCount === 1 ? '' : customer.ticketCount < 5 ? 'а' : 'ов'}
                    </div>
                    <div className="order-card__total">
                      {formatAmount(customer.total)} {customer.currency === 'MIXED' ? 'разные валюты' : customer.currency || 'RUB'}
                    </div>
                    <div className="order-card__date">
                      {formatDate(customer.paidAt)}
                    </div>
                  </div>
                </div>
                
                <div className="order-card__expand">
                  {expandedOrders.has(customer._id) ? '−' : '+'}
                </div>
              </div>
              
              {/* Аккордеон с билетами */}
              {expandedOrders.has(customer._id) && (
                <div className="order-card__tickets">
                  {loadingTickets.has(customer._id) ? (
                    <div className="tickets-loading">
                      <div className="spinner"></div>
                      <span>Загрузка билетов...</span>
                    </div>
                  ) : (
                    <div className="tickets-list">
                      {orderTickets[customer._id]?.map((ticket) => (
                        <div key={ticket._id} className="ticket-item">
                          <div className="ticket-info">
                            <div className="ticket-number">
                              Билет № {ticket.ticketId}
                            </div>
                            <div className="ticket-seat">
                              Ряд {ticket.seatRow}, Место {ticket.seatNumber}
                              {ticket.seatSection && (
                                <span> • {ticket.seatSection}</span>
                              )}
                            </div>
                            <div className="ticket-price">
                              {formatAmount(ticket.price)} {ticket.currency}
                            </div>
                          </div>
                          <button
                            className="ticket-download-btn"
                            onClick={() => downloadTicket(ticket.ticketId)}
                            disabled={!ticket.pdfGenerated}
                          >
                            Скачать
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {displayData.customers.length === 0 && !loading && (
            <div className="customers-page__empty">
              <p>Клиенты не найдены</p>
              {(dateRange.startDate || dateRange.endDate) && (
                <p>Попробуйте изменить период или очистить фильтр</p>
              )}
            </div>
          )}
        </div>

        {/* Пагинация */}
        {pagination && pagination.totalPages > 1 && (
          <div className="customers-page__pagination">
            <button
              disabled={!pagination.hasPrev}
              onClick={() => handlePageChange(currentPage - 1)}
              className="pagination-btn"
            >
              ← Назад
            </button>
            
            <span className="pagination-info">
              Страница {pagination.currentPage} из {pagination.totalPages}
              {' '}({pagination.totalCount} записей)
            </span>
            
            <button
              disabled={!pagination.hasNext}
              onClick={() => handlePageChange(currentPage + 1)}
              className="pagination-btn"
            >
              Вперед →
            </button>
          </div>
        )}

        {loading && customers.length > 0 && (
          <div className="customers-page__loading-overlay">
            <div className="spinner"></div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CustomersPage;

