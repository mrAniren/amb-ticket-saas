import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { PriceCanvas } from '../../components/PriceCanvas/PriceCanvas';
import { ImprovedPaymentForm } from '../../components/ImprovedPaymentForm/ImprovedPaymentForm';
import ThankYouPage from '../../components/ThankYouPage/ThankYouPage';
import { apiClient } from '../../services/api';
import { InteractionMode } from '../../types/PriceScheme.types';
import type { SessionWithDetails } from '../../types/Event.types';
import type { Seat } from '../../types/Seat.types';
import { getUTMParameters, saveAttributionToStorage, getAttributionFromStorage, type AttributionData } from '../../utils/attribution';
import { formatCurrency, getPrimaryCurrency, convertToUSD } from '../../utils/currency';
import './EmbedTicketSalesPage.scss';

// Функция для получения Facebook куки
const getCookie = (name: string): string => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || '';
  }
  return '';
};

// Facebook Events API
const sendFacebookEvent = async (eventName: string, eventData: any, userData?: any, attribution?: any) => {
  try {
    const response = await fetch('/api/facebook/test-event', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventName,
        eventData,
        userData: userData || {},
        attribution: attribution || {}
      }),
    });
    
    if (response.ok) {
      await response.json();
    } else {
      const errorText = await response.text();
      console.error(`❌ Ошибка отправки Facebook события ${eventName}:`, response.status, errorText);
    }
  } catch (error) {
    console.error(`❌ Ошибка отправки Facebook события ${eventName}:`, error);
  }
};

interface SelectedSeat {
  seatId: string;
  row: number;
  place: number;
  zone?: string;
  price: number;
  priceColor?: string;
  currency?: string;
  // Дополнительные поля для специальных зон
  virtualSeatsCount?: number;
  virtualSeatIds?: string[];
}



const EmbedTicketSalesPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [searchParams] = useSearchParams();
  const widgetId = searchParams.get('widgetId');

  // Состояние данных
  const [sessionData, setSessionData] = useState<SessionWithDetails | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [transformedHallSeats, setTransformedHallSeats] = useState<any[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [virtualTickets, setVirtualTickets] = useState<any[]>([]);
  const [attribution, setAttribution] = useState<AttributionData>({});
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('RUB');
  
  // Состояние UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showThankYouPage, setShowThankYouPage] = useState(false);
  const [tempOrderId, setTempOrderId] = useState<string | null>(null);
  const [orderExpiresAt, setOrderExpiresAt] = useState<Date | null>(null);
  const [completedOrderData, setCompletedOrderData] = useState<any>(null);
  
  // Флаг для отслеживания отправки AddToCart
  const [addToCartSent, setAddToCartSent] = useState(false);

  // Создание временного заказа (бронирование)
  const createTempOrder = useCallback(async () => {
    if (!sessionId || selectedSeats.length === 0) {
      console.error('❌ Недостаточно данных для создания временного заказа');
      return null;
    }

    try {
      // Логирование убрано для чистоты консоли
      
      // Подготавливаем данные для заказа
      const selectedSeatIds: string[] = [];
      const specialZoneData: { [key: string]: number } = {}; // seatId -> количество мест
      
      selectedSeats.forEach(seat => {
        if (seat.seatId.includes('-virtual-')) {
          // Виртуальное место из специальной зоны
          // Извлекаем реальный ID специальной зоны из виртуального ID
          const realSpecialZoneId = seat.seatId.split('-virtual-')[0];
          
          // Если это первое виртуальное место из этой зоны, инициализируем счетчик
          if (!specialZoneData[realSpecialZoneId]) {
            specialZoneData[realSpecialZoneId] = 0;
          }
          specialZoneData[realSpecialZoneId]++;
          
          // Отправляем реальный ID специальной зоны
          if (!selectedSeatIds.includes(realSpecialZoneId)) {
            selectedSeatIds.push(realSpecialZoneId);
          }
        } else {
          // Обычное место
          selectedSeatIds.push(seat.seatId);
        }
      });
      
      const tempOrderData = {
        sessionId,
        customerName: 'Временный заказ',
        customerPhone: '+0000000000',
        customerEmail: 'temp@temp.com',
        selectedSeatIds,
        specialZoneData, // Дополнительные данные для специальных зон
        attribution, // UTM-метки для атрибуции
        widgetId: widgetId || undefined, // ID виджета
        status: 'temporary' // Явно указываем статус temporary
      };

      console.log('🎯 Отправляем данные на сервер:', tempOrderData);

      const response = await apiClient.createOrder(tempOrderData);
      
      if (response.success) {
        // Логирование убрано для чистоты консоли
        setTempOrderId(response.order.id);
        setOrderExpiresAt(new Date(response.order.expiresAt));
        return response.order.id;
      } else {
        throw new Error(response.message || 'Ошибка создания временного заказа');
      }
    } catch (error) {
      console.error('❌ Ошибка создания временного заказа:', error);
      return null;
    }
  }, [sessionId, selectedSeats]);

  // Загрузка данных сеанса
  const loadSessionData = useCallback(async () => {
    if (!sessionId) {
      setError('ID сеанса не указан');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.getSession(sessionId);

      if (response.session) {
        // Логирование убрано для чистоты консоли
        setSessionData(response.session);
        
        // Определяем основную валюту из билетов
        if (response.session.tickets && response.session.tickets.length > 0) {
          console.log('🔍 Анализируем валюты в билетах:', {
            totalTickets: response.session.tickets.length,
            sampleTickets: response.session.tickets.slice(0, 3).map((t: any) => ({
              seatId: t.seatId,
              price: t.price,
              currency: t.currency
            })),
            allCurrencies: [...new Set(response.session.tickets.map((t: any) => t.currency))]
          });
          
          const currency = getPrimaryCurrency(response.session.tickets);
          console.log('🎯 Определена основная валюта:', currency);
          setPrimaryCurrency(currency);
        }
        
        // Отправляем Facebook событие ViewContent
        sendFacebookEvent('ViewContent', {
          // Обязательные параметры события
          event_id: `ViewContent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          event_source_url: window.location.href,
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'website',
          event_name: 'ViewContent',
          
          // Facebook куки
          fbp: getCookie('_fbp'),
          fbc: getCookie('_fbc'),
          client_user_agent: navigator.userAgent,
          
          // UTM параметры из attribution
          utm_source: attribution.utm_source,
          utm_medium: attribution.utm_medium,
          utm_campaign: attribution.utm_campaign,
          utm_term: attribution.utm_term,
          utm_content: attribution.utm_content,
          
          // Данные контента (реальные из БД)
          content_ids: [response.session.id], // Реальный ID сессии
          content_type: 'event_session',
          content_name: response.session.event?.name || 'Мероприятие', // Реальное название события
          content_category: 'tickets'
        }, {}, attribution);

        // Преобразуем билеты сессии в нужный формат (используем данные из билетов, а не из зала)
        if (response.session.tickets && response.session.tickets.length > 0) {
          // Логирование убрано для чистоты консоли
          
          // Используем данные из билетов сессии, где section уже содержит название зоны
          const transformedHallSeats = response.session.tickets.map((ticket: any) => ({
            seatId: ticket.seatId, 
            row: ticket.row,
            seatNumber: ticket.place, 
            section: ticket.section, // Уже содержит название зоны (например "Лево")
            price: ticket.price, // Цена из билета
            x: ticket.x,
            y: ticket.y,
            width: ticket.width,
            height: ticket.height,
            objectType: 'seat', // Билеты всегда для мест
            svgElementId: ticket.seatId,
            svgTagName: 'path',
            // svgData больше не используется (легаси код)
          }));
          
          setTransformedHallSeats(transformedHallSeats);
          
          // Логирование убрано для чистоты консоли
        }

        // Добавляем сцену и декорации из данных зала
        if (response.session.hall?.seats) {
          try {
            const hallSeatsData = Array.isArray(response.session.hall.seats) 
              ? response.session.hall.seats 
              : JSON.parse(response.session.hall.seats);
            
            // Фильтруем сцену, декорации и специальные зоны (не места)
            // Специальные зоны могут иметь objectType: 'seat', но мы их определяем по другим признакам
            const sceneAndDecorations = hallSeatsData.filter((seat: any) => {
              // Обычные места с objectType: 'seat' и capacity
              if (seat.objectType === 'seat' && seat.capacity && seat.capacity > 1) {
                return true; // Это специальная зона
              }
              // Сцена, декорации и специальные зоны
              return seat.objectType === 'scene' || seat.objectType === 'decoration' || seat.objectType === 'special_zone';
            });
            
            if (sceneAndDecorations.length > 0) {
              // Логируем специальные зоны для отладки
              const specialZones = sceneAndDecorations.filter((item: any) => 
                item.objectType === 'special_zone' || (item.objectType === 'seat' && item.capacity && item.capacity > 1)
              );
              if (specialZones.length > 0) {
                console.log('🎪 Специальные зоны найдены в hall.seats:', {
                  count: specialZones.length,
                  firstSpecialZone: specialZones[0],
                  allSpecialZones: specialZones.map((sz: any) => ({ 
                    id: sz.id, 
                    objectType: sz.objectType, 
                    zone: sz.zone,
                    capacity: sz.capacity,
                    isSpecialZone: sz.objectType === 'special_zone' || (sz.objectType === 'seat' && sz.capacity && sz.capacity > 1)
                  }))
                });
              }
              
              const transformedSceneAndDecorations = sceneAndDecorations.map((seat: any) => {
                // Определяем правильный objectType для специальных зон
                let objectType = seat.objectType;
                if (seat.objectType === 'seat' && seat.capacity && seat.capacity > 1) {
                  objectType = 'special_zone'; // Это специальная зона
                }
                
                return {
                  seatId: seat.id || seat.seatId,
                  row: seat.row || 0,
                  seatNumber: seat.place || seat.seatNumber || 0,
                  section: seat.zone || seat.section || '',
                  x: seat.x,
                  y: seat.y,
                  width: seat.width,
                  height: seat.height,
                  objectType: objectType, // Используем исправленный тип
                  capacity: seat.capacity, // Добавляем capacity для специальных зон
                  svgElementId: seat.svgElementId || seat.id || seat.seatId,
                  svgTagName: seat.svgTagName || 'path',
                  // svgData больше не используется (легаси код)
                };
              });
              
              // Объединяем билеты с сценой и декорациями
              setTransformedHallSeats(prev => [...prev, ...transformedSceneAndDecorations]);
              
              // Логируем трансформированные специальные зоны
              const transformedSpecialZones = transformedSceneAndDecorations.filter((item: any) => item.objectType === 'special_zone');
              if (transformedSpecialZones.length > 0) {
                console.log('🎪 Трансформированные специальные зоны:', {
                  count: transformedSpecialZones.length,
                  firstTransformed: transformedSpecialZones[0],
                  allTransformed: transformedSpecialZones.map((sz: any) => ({ 
                    seatId: sz.seatId, 
                    objectType: sz.objectType, 
                    section: sz.section,
                    capacity: sz.capacity
                  }))
                });
              }
            }
          } catch (error) {
            console.error('Ошибка парсинга сцены и декораций:', error);
          }
        }

        // Парсим конфигурацию мест с полигонами
        if (response.session.hall?.seats) {
          try {
            const seatConfig = Array.isArray(response.session.hall.seats) 
              ? response.session.hall.seats 
              : JSON.parse(response.session.hall.seats);
            const seatsArray = Array.isArray(seatConfig) ? seatConfig : (seatConfig.seats || []);
            setSeats(seatsArray);
          } catch (error) {
            console.error('Ошибка парсинга seats:', error);
          }
        }
        
        // Сохраняем виртуальные билеты для подсчета доступных мест
        if (response.session.tickets) {
          console.log('🔍 Все билеты в сессии:', {
            totalTickets: response.session.tickets.length,
            sampleTickets: response.session.tickets.slice(0, 5).map((t: any) => ({
              seatId: t.seatId,
              status: t.status,
              objectType: t.objectType,
              id: t.id
            }))
          });
          
          // Ищем виртуальные билеты с разными фильтрами
          const virtualTickets1 = response.session.tickets.filter((ticket: any) => 
            ticket.objectType === 'virtual_seat'
          );
          const virtualTickets2 = response.session.tickets.filter((ticket: any) => 
            ticket.seatId && ticket.seatId.includes('_seat_')
          );
          const virtualTickets3 = response.session.tickets.filter((ticket: any) => 
            ticket.seatId && ticket.seatId.startsWith('temp-element-2_seat_')
          );
          
          console.log('🔍 Поиск виртуальных билетов:', {
            byObjectType: virtualTickets1.length,
            bySeatIdContains: virtualTickets2.length,
            bySeatIdStartsWith: virtualTickets3.length,
            sampleByObjectType: virtualTickets1.slice(0, 3).map((t: any) => ({
              seatId: t.seatId,
              objectType: t.objectType,
              status: t.status
            })),
            sampleBySeatIdContains: virtualTickets2.slice(0, 3).map((t: any) => ({
              seatId: t.seatId,
              objectType: t.objectType,
              status: t.status
            }))
          });
          
          const virtualTickets = response.session.tickets.filter((ticket: any) => 
            ticket.seatId && ticket.seatId.includes('_seat_')
          );
          
          console.log('🎫 Виртуальные билеты для подсчета:', {
            totalVirtualTickets: virtualTickets.length,
            availableVirtualTickets: virtualTickets.filter((t: any) => t.status === 'available').length,
            reservedVirtualTickets: virtualTickets.filter((t: any) => t.status === 'reserved').length,
            sampleTickets: virtualTickets.slice(0, 3).map((t: any) => ({
              seatId: t.seatId,
              status: t.status,
              objectType: t.objectType
            }))
          });
          
          setVirtualTickets(virtualTickets);
        }

        // Логирование убрано для чистоты консоли
      } else {
        setError('Сеанс не найден');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки сеанса:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  // Инициализация UTM данных при первом посещении
  useEffect(() => {
    // Получаем UTM из URL
    const urlUTM = getUTMParameters();
    
    // Получаем сохраненные UTM из localStorage
    const storedUTM = getAttributionFromStorage();
    
    // Приоритет: URL > localStorage (только при первом посещении)
    const finalAttribution = Object.keys(urlUTM).length > 0 ? urlUTM : storedUTM;
    
    setAttribution(finalAttribution);
    
    // Сохраняем новые UTM в localStorage только при первом посещении
    if (Object.keys(urlUTM).length > 0) {
      saveAttributionToStorage(urlUTM);
    }
  }, []);

  useEffect(() => {
    // Логирование убрано для чистоты консоли
    loadSessionData();
  }, [loadSessionData]);

  // Функция для определения цвета по цене
  const getPriceColor = useCallback((price: number) => {
    const colors = [
      '#2ECC71', // Изумрудно-зеленый (0-100)
      '#3498DB', // Синий (100-200)
      '#9B59B6', // Фиолетовый (200-300)
      '#E67E22', // Оранжевый (300-400)
      '#E74C3C', // Красный (400-500)
      '#F39C12', // Янтарный (500-600)
      '#1ABC9C', // Бирюзовый (600-700)
      '#34495E', // Темно-серый (700-800)
      '#E91E63', // Розовый (800-900)
      '#795548', // Коричневый (900-1000)
      '#607D8B', // Сине-серый (1000-1100)
      '#FF5722', // Глубокий оранжевый (1100-1200)
      '#3F51B5', // Индиго (1200-1300)
      '#009688', // Теал (1300-1400)
      '#FF9800', // Янтарный (1400-1500)
      '#4CAF50', // Зеленый (1500-1600)
      '#2196F3', // Синий (1600-1700)
      '#9C27B0', // Фиолетовый (1700-1800)
      '#FFC107', // Желтый (1800-1900)
      '#F44336', // Красный (1900-2000)
      '#8BC34A', // Светло-зеленый (2000-2100)
      '#00BCD4', // Циан (2100-2200)
      '#FFEB3B', // Ярко-желтый (2200-2300)
      '#FF9800', // Оранжевый (2300-2400)
      '#673AB7', // Глубокий фиолетовый (2400-2500)
      '#CDDC39', // Лайм (2500-2600)
      '#FF5722', // Глубокий оранжевый (2600-2700)
      '#795548', // Коричневый (2700-2800)
      '#607D8B', // Сине-серый (2800-2900)
      '#E91E63', // Розовый (2900-3000)
      '#3F51B5', // Индиго (3000-3100)
      '#009688', // Теал (3100-3200)
      '#FFC107', // Янтарный (3200-3300)
      '#4CAF50', // Зеленый (3300-3400)
      '#2196F3', // Синий (3400-3500)
      '#9C27B0', // Фиолетовый (3500-3600)
      '#FF9800', // Оранжевый (3600-3700)
      '#F44336', // Красный (3700-3800)
      '#2ECC71', // Изумрудно-зеленый (3800-3900)
      '#3498DB', // Синий (3900-4000)
      '#9B59B6', // Фиолетовый (4000-4100)
      '#E67E22', // Оранжевый (4100-4200)
      '#E74C3C', // Красный (4200-4300)
      '#F39C12', // Янтарный (4300-4400)
      '#1ABC9C', // Бирюзовый (4400-4500)
      '#34495E', // Темно-серый (4500-4600)
      '#E91E63', // Розовый (4600-4700)
      '#795548', // Коричневый (4700-4800)
      '#607D8B', // Сине-серый (4800-4900)
      '#FF5722', // Глубокий оранжевый (4900-5000)
      '#3F51B5', // Индиго (5000-5100)
      '#009688', // Теал (5100-5200)
      '#FF9800', // Янтарный (5200-5300)
      '#4CAF50', // Зеленый (5300-5400)
      '#2196F3', // Синий (5400-5500)
      '#9C27B0', // Фиолетовый (5500-5600)
      '#FFC107', // Желтый (5600-5700)
      '#F44336', // Красный (5700-5800)
      '#8BC34A', // Светло-зеленый (5800-5900)
      '#00BCD4', // Циан (5900-6000)
      '#FFEB3B', // Ярко-желтый (6000-6100)
      '#FF9800', // Оранжевый (6100-6200)
      '#673AB7', // Глубокий фиолетовый (6200-6300)
      '#CDDC39', // Лайм (6300-6400)
      '#FF5722', // Глубокий оранжевый (6400-6500)
      '#795548', // Коричневый (6500-6600)
      '#607D8B', // Сине-серый (6600-6700)
      '#E91E63', // Розовый (6700-6800)
      '#3F51B5', // Индиго (6800-6900)
      '#009688', // Теал (6900-7000)
      '#FFC107', // Янтарный (7000-7100)
      '#4CAF50', // Зеленый (7100-7200)
      '#2196F3', // Синий (7200-7300)
      '#9C27B0', // Фиолетовый (7300-7400)
      '#FF9800', // Оранжевый (7400-7500)
      '#F44336', // Красный (7500-7600)
      '#2ECC71', // Изумрудно-зеленый (7600-7700)
      '#3498DB', // Синий (7700-7800)
      '#9B59B6', // Фиолетовый (7800-7900)
      '#E67E22', // Оранжевый (7900-8000)
      '#E74C3C', // Красный (8000-8100)
      '#F39C12', // Янтарный (8100-8200)
      '#1ABC9C', // Бирюзовый (8200-8300)
      '#34495E', // Темно-серый (8300-8400)
      '#E91E63', // Розовый (8400-8500)
      '#795548', // Коричневый (8500-8600)
      '#607D8B', // Сине-серый (8600-8700)
      '#FF5722', // Глубокий оранжевый (8700-8800)
      '#3F51B5', // Индиго (8800-8900)
      '#009688', // Теал (8900-9000)
      '#FF9800', // Янтарный (9000-9100)
      '#4CAF50', // Зеленый (9100-9200)
      '#2196F3', // Синий (9200-9300)
      '#9C27B0', // Фиолетовый (9300-9400)
      '#FFC107', // Желтый (9400-9500)
      '#F44336', // Красный (9500-9600)
      '#8BC34A', // Светло-зеленый (9600-9700)
      '#00BCD4', // Циан (9700-9800)
      '#FFEB3B', // Ярко-желтый (9800-9900)
      '#FF9800', // Оранжевый (9900-10000)
      '#673AB7', // Глубокий фиолетовый (10000-10100)
      '#CDDC39', // Лайм (10100-10200)
      '#FF5722', // Глубокий оранжевый (10200-10300)
      '#795548', // Коричневый (10300-10400)
      '#607D8B', // Сине-серый (10400-10500)
      '#E91E63', // Розовый (10500-10600)
      '#3F51B5', // Индиго (10600-10700)
      '#009688', // Теал (10700-10800)
      '#FFC107', // Янтарный (10800-10900)
      '#4CAF50', // Зеленый (10900-11000)
      '#2196F3', // Синий (11000-11100)
      '#9C27B0', // Фиолетовый (11100-11200)
      '#FF9800', // Оранжевый (11200-11300)
      '#F44336', // Красный (11300-11400)
      '#2ECC71', // Изумрудно-зеленый (11400-11500)
      '#3498DB', // Синий (11500-11600)
      '#9B59B6', // Фиолетовый (11600-11700)
      '#E67E22', // Оранжевый (11700-11800)
      '#E74C3C', // Красный (11800-11900)
      '#F39C12', // Янтарный (11900-12000)
      '#1ABC9C', // Бирюзовый (12000-12100)
      '#34495E', // Темно-серый (12100-12200)
      '#E91E63', // Розовый (12200-12300)
      '#795548', // Коричневый (12300-12400)
      '#607D8B', // Сине-серый (12400-12500)
      '#FF5722', // Глубокий оранжевый (12500-12600)
      '#3F51B5', // Индиго (12600-12700)
      '#009688', // Теал (12700-12800)
      '#FF9800', // Янтарный (12800-12900)
      '#4CAF50', // Зеленый (12900-13000)
      '#2196F3', // Синий (13000-13100)
      '#9C27B0', // Фиолетовый (13100-13200)
      '#FFC107', // Желтый (13200-13300)
      '#F44336', // Красный (13300-13400)
      '#8BC34A', // Светло-зеленый (13400-13500)
      '#00BCD4', // Циан (13500-13600)
      '#FFEB3B', // Ярко-желтый (13600-13700)
      '#FF9800', // Оранжевый (13700-13800)
      '#673AB7', // Глубокий фиолетовый (13800-13900)
      '#CDDC39', // Лайм (13900-14000)
      '#FF5722', // Глубокий оранжевый (14000-14100)
      '#795548', // Коричневый (14100-14200)
      '#607D8B', // Сине-серый (14200-14300)
      '#E91E63', // Розовый (14300-14400)
      '#3F51B5', // Индиго (14400-14500)
      '#009688', // Теал (14500-14600)
      '#FFC107', // Янтарный (14600-14700)
      '#4CAF50', // Зеленый (14700-14800)
      '#2196F3', // Синий (14800-14900)
      '#9C27B0', // Фиолетовый (14900-15000)
    ];
    
    const priceIndex = Math.floor(price / 100);
    return colors[priceIndex] || '#95A5A6'; // Серый по умолчанию
  }, []);

  // Обогащаем места статусами
  const seatsWithStatus = useMemo((): Seat[] => {
    if (!seats.length) {
      return seats;
    }

    return seats.map((seat) => {
      const isSelected = selectedSeats.some(s => s.seatId === seat.id);
      
      // Ищем билет для этого места
      const ticket = sessionData?.tickets?.find((t: any) => t.seatId === seat.id);
      
      let status: 'available' | 'reserved' | 'sold' | 'locked' | 'unavailable' = 'available';
      let price = 1000; // Цена по умолчанию
      
      if (ticket) {
        // Есть билет - определяем статус
        if (ticket.status === 'sold') {
          status = 'sold';
        } else if (ticket.status === 'reserved') {
          status = 'reserved';
        } else if (ticket.status === 'locked') {
          status = 'locked';
        } else {
          status = 'available';
        }
        price = ticket.price || 1000;
      } else {
        // Нет билета - место доступно
        status = 'available';
      }

      return {
        ...seat,
        isSelected,
        isClickable: status === 'available' && !isSelected,
        status,
        price,
        priceColor: getPriceColor(price)
      };
    });
  }, [seats, sessionData, selectedSeats, getPriceColor]);

  // Создаем данные для PriceCanvas из сессии
  const priceCanvasData = useMemo(() => {
    if (!sessionData) return { seatPrices: [], prices: [], zones: [] };

    // Создаем seatPrices из билетов сессии
    const seatPrices = sessionData.tickets?.map((ticket: any) => ({
      seatId: ticket.seatId,
      priceId: ticket.priceId || ticket.price || 1000 // Используем цену как ID если нет priceId
    })) || [];

    // Создаем уникальные цены из билетов
    const uniquePrices = new Map();
    sessionData.tickets?.forEach((ticket: any) => {
      const price = ticket.price || 1000;
      const currency = ticket.currency || primaryCurrency;
      if (!uniquePrices.has(price)) {
        uniquePrices.set(price, {
          id: price,
          name: formatCurrency(price, currency),
          value: price,
          currency: currency,
          color: getPriceColor(price)
        });
      }
    });

    const prices = Array.from(uniquePrices.values());

    // Создаем зоны из hall.seats и zone_config
    const zones = [];
    
    // Сначала добавляем зоны из zone_config зала
    if (sessionData.hall?.zone_config) {
      try {
        const zoneConfig = JSON.parse(sessionData.hall.zone_config);
        if (zoneConfig.zones && Array.isArray(zoneConfig.zones)) {
          zoneConfig.zones.forEach((zone: any) => {
            if (zone.id && zone.name) {
              zones.push({
                id: zone.id,
                name: zone.name
              });
            }
          });
        }
      } catch (error) {
        console.error('Ошибка парсинга zone_config:', error);
      }
    }
    
    // Затем добавляем зоны из hall.seats (если их еще нет)
    if (sessionData.hall?.seats) {
      try {
        const hallSeatsData = Array.isArray(sessionData.hall.seats) 
          ? sessionData.hall.seats 
          : JSON.parse(sessionData.hall.seats);
        
        const existingZoneIds = new Set(zones.map(z => z.id));
        const uniqueZones = new Map();
        
        hallSeatsData.forEach((seat: any) => {
          // Используем section из билета, если есть, иначе zone
          const zoneId = seat.section || seat.zone;
          if (zoneId && !existingZoneIds.has(zoneId) && !uniqueZones.has(zoneId)) {
            uniqueZones.set(zoneId, {
              id: zoneId,
              name: zoneId
            });
          }
        });
        
        zones.push(...Array.from(uniqueZones.values()));
      } catch (error) {
        console.error('Ошибка парсинга зон:', error);
      }
    }

    // Логируем созданные данные для отладки
    console.log('🎯 Созданные данные для PriceCanvas:', {
      seatPrices: seatPrices.length,
      prices: prices.length,
      zones: zones.length,
      firstSeatPrice: seatPrices[0],
      firstPrice: prices[0],
      firstZone: zones[0],
      allPrices: prices.map(p => ({ id: p.id, name: p.name, value: p.value }))
    });

    return { seatPrices, prices, zones };
  }, [sessionData, getPriceColor]);

  // Обработка выбора места
  const handleSeatClick = useCallback((seat: Seat) => {
    // Проверяем, можно ли выбрать это место
    if (seat.status === 'sold' || seat.status === 'reserved' || seat.status === 'locked') {
      // Логирование убрано для чистоты консоли
      return;
    }
    
    // Логирование убрано для чистоты консоли
    
    const isSelected = selectedSeats.some(s => s.seatId === seat.id);

    if (isSelected) {
      // Убираем место из выбранных
      setSelectedSeats(prev => prev.filter(s => s.seatId !== seat.id));
    } else {
      // Находим билет для этого места, чтобы получить валюту
      const ticket = sessionData?.tickets?.find((t: any) => t.seatId === seat.id);
      const currency = ticket?.currency || (seat as any).currency || primaryCurrency;
      
      // Добавляем место в выбранные
      const newSeat: SelectedSeat = {
        seatId: seat.id as string,
        row: seat.row || 0,
        place: seat.place || 0,
        zone: seat.zone,
        price: seat.price || 1000,
        priceColor: seat.priceColor || '#667eea',
        currency: currency
      };
      setSelectedSeats(prev => [...prev, newSeat]);
      
      // Отправляем Facebook событие AddToCart только при первом добавлении
      if (!addToCartSent) {
        // Логирование убрано для чистоты консоли
        sendFacebookEvent('AddToCart', {
          value: convertToUSD(seat.price || 1000, seat.currency || primaryCurrency),
          currency: 'USD',
          contentIds: [seat.id],
          contentType: 'ticket'
        });
        setAddToCartSent(true);
      }
    }
  }, [selectedSeats, sessionData, addToCartSent]);

  // Обработка выбора мест (включая виртуальные места из специальных зон)
  const handleSeatsSelected = useCallback((seatIds: string[]) => {
    console.log('🎯 Обработка выбранных мест:', seatIds);
    
    // Фильтруем виртуальные места (содержат -virtual-)
    const virtualSeats = seatIds.filter(id => id.includes('-virtual-'));
    const regularSeats = seatIds.filter(id => !id.includes('-virtual-'));
    
    console.log('🎯 Виртуальные места:', virtualSeats);
    console.log('🎯 Обычные места:', regularSeats);
    
    // Обрабатываем виртуальные места
    if (virtualSeats.length > 0) {
      // Получаем информацию о специальной зоне из первого виртуального места
      const firstVirtualSeat = virtualSeats[0];
      const specialZoneId = firstVirtualSeat.split('-virtual-')[0];
      
      // Находим информацию о специальной зоне
      const specialZoneSeat = seats.find(s => s.id === specialZoneId);
      const specialZoneHallSeat = transformedHallSeats.find(hs => hs.seatId === specialZoneId);
      
      if (specialZoneSeat && specialZoneHallSeat) {
        // Получаем цену для специальной зоны
        const seatPrice = priceCanvasData.seatPrices.find(sp => sp.seatId === specialZoneId);
        const price = priceCanvasData.prices.find(p => p.id === seatPrice?.priceId);
        const priceValue = price?.value || 1000;
        
        // Для специальных зон создаем отдельные места для каждого виртуального билета
        const specialZoneSeatsForCart: SelectedSeat[] = virtualSeats.map((virtualSeatId, index) => ({
          seatId: virtualSeatId, // Используем виртуальный ID
          row: 0, // Для специальных зон ряд = 0
          place: index + 1, // Номер места в специальной зоне
          zone: specialZoneHallSeat.section, // Section на месте где у обычных билетов ряд и место
          price: priceValue, // Цена за одно место
          priceColor: price?.color || '#667eea',
          currency: price?.currency || primaryCurrency,
          // Убираем метаданные - теперь каждое место отдельное
        }));
        
        console.log('🎯 Добавляем специальную зону в корзину:', {
          seatsCount: specialZoneSeatsForCart.length,
          seats: specialZoneSeatsForCart
        });
        
        // Добавляем специальные зоны к выбранным
        setSelectedSeats(prev => {
          // Убираем старые места из этой зоны
          const filteredPrev = prev.filter(seat => 
            !seat.seatId.includes('-virtual-') && 
            !seat.seatId.startsWith(specialZoneId) &&
            seat.seatId !== specialZoneId
          );
          return [...filteredPrev, ...specialZoneSeatsForCart];
        });
        
        // Отправляем Facebook событие AddToCart для виртуальных мест
        if (!addToCartSent) {
          sendFacebookEvent('AddToCart', {
            value: convertToUSD(priceValue * virtualSeats.length, price?.currency || primaryCurrency),
            currency: 'USD',
            contentIds: virtualSeats,
            contentType: 'ticket'
          });
          setAddToCartSent(true);
        }
      }
    }
    
    // Обрабатываем обычные места (если есть)
    if (regularSeats.length > 0) {
      // Обновляем выбранные обычные места
      const regularSeatsForCart: SelectedSeat[] = regularSeats.map(seatId => {
        const seat = seats.find(s => s.id === seatId);
        const hallSeat = transformedHallSeats.find(hs => hs.seatId === seatId);
        const seatPrice = priceCanvasData.seatPrices.find(sp => sp.seatId === seatId);
        const price = priceCanvasData.prices.find(p => p.id === seatPrice?.priceId);
        
        return {
          seatId,
          row: hallSeat?.row || seat?.row || 0,
          place: hallSeat?.seatNumber || seat?.place || 0,
          zone: hallSeat?.section || seat?.zone,
          price: price?.value || seat?.price || 1000,
          priceColor: price?.color || seat?.priceColor || '#667eea',
          currency: price?.currency || (seat as any).currency || primaryCurrency
        };
      });
      
      setSelectedSeats(prev => {
        // Убираем старые обычные места
        const filteredPrev = prev.filter(seat => !regularSeats.includes(seat.seatId));
        return [...filteredPrev, ...regularSeatsForCart];
      });
    }
  }, [seats, transformedHallSeats, priceCanvasData, addToCartSent]);

  // Расчет общей суммы
  const totalAmount = useMemo(() => 
    selectedSeats.reduce((sum, seat) => sum + seat.price, 0), 
    [selectedSeats]
  );

  // Итоговая сумма (без промокодов)
  const finalAmount = totalAmount;

  // Очистка выбранных мест
  const clearSelection = useCallback(() => {
    setSelectedSeats([]);
    setAddToCartSent(false); // Сбрасываем флаг AddToCart
  }, []);

  // Переход к оплате
  const proceedToPayment = useCallback(() => {
    if (selectedSeats.length > 0) {
      setShowPaymentForm(true);
      
      // Отправляем Facebook событие InitiateCheckout
      sendFacebookEvent('InitiateCheckout', {
        // Обязательные параметры события
        event_id: `InitiateCheckout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_source_url: window.location.href,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_name: 'InitiateCheckout',
        
        // Facebook куки
        fbp: getCookie('_fbp'),
        fbc: getCookie('_fbc'),
        client_user_agent: navigator.userAgent,
        
        // UTM параметры из attribution
        utm_source: attribution.utm_source,
        utm_medium: attribution.utm_medium,
        utm_campaign: attribution.utm_campaign,
        utm_term: attribution.utm_term,
        utm_content: attribution.utm_content,
        
        // Данные корзины (реальные из выбранных мест)
        content_ids: selectedSeats.map(s => s.seatId), // Реальные ID мест
        content_type: 'ticket',
        content_name: session?.event?.name || 'Мероприятие', // Реальное название события
        content_category: 'tickets',
        num_items: selectedSeats.length // Количество выбранных мест
      }, {}, attribution);
    }
  }, [selectedSeats, totalAmount, session, attribution]);



  if (loading) {
    return (
      <div className="embed-ticket-sales-page embed-ticket-sales-page--loading">
        <div className="loading-spinner">
          <div className="logo-spinner">
            <img src="/logo.png" alt="Загрузка..." className="spinning-logo" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="embed-ticket-sales-page embed-ticket-sales-page--error">
        <div className="error-message">
          <h2>Ошибка</h2>
          <p>{error}</p>
          <button onClick={loadSessionData} className="retry-button">
            Повторить попытку
          </button>
        </div>
      </div>
    );
  }

  if (!sessionData) {
    return (
      <div className="embed-ticket-sales-page embed-ticket-sales-page--error">
        <div className="error-message">
          <h2>Сеанс не найден</h2>
          <p>Проверьте корректность ссылки</p>
        </div>
      </div>
    );
  }

  return (
    <div className="embed-ticket-sales-page">
      {/* Заголовок */}
      <div className="embed-ticket-sales-page__header">
        <div className="event-title">
          <h1>{sessionData.event?.name || 'Мероприятие'}</h1>
          <div className="event-details">
            <span className="date">
              {new Date(sessionData.date).toLocaleDateString('ru-RU')} в {sessionData.time}
            </span>
            {sessionData.hall && (
              <span className="venue">• Зал: {sessionData.hall.name}</span>
            )}
          </div>
        </div>
      </div>

      {!showPaymentForm ? (
        <>
          <div className="embed-ticket-sales-page__fullscreen">
            <PriceCanvas
              seats={seatsWithStatus}
              zones={priceCanvasData.zones}
              seatPrices={priceCanvasData.seatPrices}
              prices={priceCanvasData.prices}
              selectedSeats={selectedSeats.map(s => s.seatId)}
              interactionMode={InteractionMode.ZOOM_PAN}
              onSeatClick={handleSeatClick}
              onSeatsSelected={handleSeatsSelected}
              hallSeats={transformedHallSeats}
              virtualTickets={virtualTickets}
            />
          </div>

          {/* Плавающая корзина */}
          <div className={`floating-cart ${showCart ? 'floating-cart--open' : ''}`}>
            <div className="floating-cart__toggle" onClick={() => setShowCart(!showCart)}>
              <div className="cart-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M7 18c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12L8.1 13h7.45c.75 0 1.41-.41 1.75-1.03L21.7 4H5.21l-.94-2H1zm16 16c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor"/>
                </svg>
                {selectedSeats.length > 0 && (
                  <span className="cart-badge">{selectedSeats.length}</span>
                )}
              </div>
              <div className="cart-total">
                {formatCurrency(finalAmount, primaryCurrency)}
              </div>
              {selectedSeats.length > 0 && (
                <button 
                  className="buy-button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const orderId = await createTempOrder();
                    if (orderId) {
                      setShowPaymentForm(true);
                    } else {
                      alert('Ошибка при бронировании мест. Попробуйте еще раз.');
                    }
                  }}
                >
                  Купить
                </button>
              )}
            </div>

            <div className="floating-cart__content">
              <div className="cart-header">
                <h3>Выбранные места</h3>
                <button 
                  className="cart-close"
                  onClick={() => setShowCart(false)}
                >
                  ×
                </button>
              </div>

              <div className="cart-items">
                {selectedSeats.map((seat, index) => (
                  <div key={index} className="cart-item">
                    <div className="seat-info">
                      {seat.seatId.includes('-virtual-') ? (
                        // Специальная зона - отображаем как обычное место
                        <>
                          <div className="seat-number">{seat.zone || 'Специальная зона'}</div>
                          <div className="seat-zone"></div>
                        </>
                      ) : (
                        // Обычное место
                        <>
                          <div className="seat-number">{seat.place} место, {seat.row} ряд</div>
                          <div className="seat-zone">{seat.zone || 'Партер'}</div>
                        </>
                      )}
                    </div>
                    <div className="seat-price">
                      {formatCurrency(seat.price, seat.currency || primaryCurrency)}
                    </div>
                  </div>
                ))}
              </div>


              <div className="cart-summary">
                <div className="summary-row">
                  <span>
                    {selectedSeats.reduce((total, seat) => 
                      total + (seat.virtualSeatsCount || 1), 0
                    )} билета
                  </span>
                  <span>{formatCurrency(totalAmount, primaryCurrency)}</span>
                </div>
                <div className="summary-row">
                  <span>Комиссия 0%</span>
                  <span>{formatCurrency(0, primaryCurrency)}</span>
                </div>
                <div className="summary-row summary-row--total">
                  <span>Итого</span>
                  <span>{formatCurrency(finalAmount, primaryCurrency)}</span>
                </div>
              </div>

              <div className="cart-actions">
                <button 
                  className="btn-clear"
                  onClick={clearSelection}
                  disabled={selectedSeats.length === 0}
                >
                  Очистить
                </button>
                <button 
                  className="btn-buy"
                  onClick={proceedToPayment}
                  disabled={selectedSeats.length === 0}
                >
                  Купить
                </button>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Улучшенная форма оплаты */
        <ImprovedPaymentForm
          selectedSeats={selectedSeats}
          sessionId={sessionId || ''}
          totalAmount={finalAmount}
          tempOrderId={tempOrderId}
          attribution={attribution}
          widgetId={widgetId || undefined}
          orderExpiresAt={orderExpiresAt || undefined}
          onCancel={() => {
            setShowPaymentForm(false);
            setTempOrderId(null);
            setOrderExpiresAt(null);
          }}
          onPaymentSuccess={async (orderData: any) => {
            try {
              // Получаем полные данные заказа из БД
              const orderResponse = await apiClient.getOrder(orderData.orderId);
              const fullOrderData = orderResponse.order;
              
              // Получаем данные зала из сессии
              const sessionResponse = await apiClient.getSession(fullOrderData.sessionId);
              const hallData = sessionResponse.session?.hall;
              
              // Определяем реальную валюту
              const realCurrency = hallData?.currency || fullOrderData.ticketData[0]?.currency || 'RUB';
              
              // Отправляем Facebook событие Purchase с реальными данными
              sendFacebookEvent('Purchase', {
                // Обязательные параметры события
                event_id: `Purchase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                event_source_url: window.location.href,
                event_time: Math.floor(Date.now() / 1000),
                action_source: 'website',
                event_name: 'Purchase',
                
                // Facebook куки
                fbp: getCookie('_fbp'),
                fbc: getCookie('_fbc'),
                client_user_agent: navigator.userAgent,
                
                // UTM параметры из заказа (реальные из БД)
                utm_source: fullOrderData.attribution?.utm_source,
                utm_medium: fullOrderData.attribution?.utm_medium,
                utm_campaign: fullOrderData.attribution?.utm_campaign,
                utm_term: fullOrderData.attribution?.utm_term,
                utm_content: fullOrderData.attribution?.utm_content,
                
                // Сумма и валюта (реальные из БД)
                value: convertToUSD(fullOrderData.total, realCurrency), // Конвертируем в USD
                currency: realCurrency, // Отправляем реальную валюту зала
                
                // Данные заказа (реальные из БД)
                content_ids: fullOrderData.ticketData.map((ticket: any) => ticket.seatId), // Реальные ID мест
                content_type: 'ticket',
                content_name: sessionResponse.session?.event?.name || 'Мероприятие', // Реальное название события
                content_category: 'tickets',
                num_items: fullOrderData.ticketData.length, // Количество билетов
                order_id: fullOrderData._id // Реальный ID заказа
              }, {
                // Данные пользователя (реальные из заказа)
                email: fullOrderData.email,
                phone: fullOrderData.phone,
                first_name: fullOrderData.firstName,
                last_name: fullOrderData.lastName,
                city: hallData?.city,
                country: hallData?.country
              }, fullOrderData.attribution);
              
            } catch (error) {
              console.error('❌ Ошибка при отправке Facebook Purchase события:', error);
            }
            
            // После успешной оплаты показываем страницу благодарности
            setCompletedOrderData(orderData);
            setShowThankYouPage(true);
            setShowPaymentForm(false);
            setSelectedSeats([]);
            setTempOrderId(null);
            setOrderExpiresAt(null);
            setAddToCartSent(false); // Сбрасываем флаг AddToCart
            loadSessionData(); // Обновляем данные
          }}
        />
      )}

      {/* Страница благодарности */}
      {showThankYouPage && (
        <ThankYouPage
          orderId={completedOrderData?.orderId}
          customerName={completedOrderData?.customerInfo?.name}
          totalAmount={completedOrderData?.totalAmount || 0}
          currency={primaryCurrency}
          onClose={() => {
            setShowThankYouPage(false);
            setCompletedOrderData(null);
          }}
        />
      )}
    </div>
  );
};

export default EmbedTicketSalesPage;
