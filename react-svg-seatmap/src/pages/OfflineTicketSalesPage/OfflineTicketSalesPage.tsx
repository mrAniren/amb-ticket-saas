import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { OfflinePriceCanvas } from '../../components/OfflinePriceCanvas/OfflinePriceCanvas';
import { Layout } from '../../components/Layout';
import { apiClient } from '../../services/api';
import { InteractionMode } from '../../types/PriceScheme.types';
import type { SessionWithDetails } from '../../types/Event.types';
import type { Seat } from '../../types/Seat.types';
import { formatCurrency, getPrimaryCurrency, convertToUSD } from '../../utils/currency';
import InvitationForm from './components/InvitationForm';
import OfflinePaymentForm from './components/OfflinePaymentForm';
import InvitationSuccessPage from './components/InvitationSuccessPage';
import OfflineSalesSuccessPage from './components/OfflineSalesSuccessPage';
import './OfflineTicketSalesPage.scss';

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

type Mode = 'sales' | 'invitations';

const OfflineTicketSalesPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // Состояние данных
  const [sessionData, setSessionData] = useState<SessionWithDetails | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<SelectedSeat[]>([]);
  const [transformedHallSeats, setTransformedHallSeats] = useState<any[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [virtualTickets, setVirtualTickets] = useState<any[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState<string>('RUB');
  
  // Состояние UI
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('sales');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showInvitationForm, setShowInvitationForm] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [showInvitationSuccess, setShowInvitationSuccess] = useState(false);
  const [invitationOrderData, setInvitationOrderData] = useState<any>(null);
  const [showOfflineSalesSuccess, setShowOfflineSalesSuccess] = useState(false);
  const [offlineSalesOrderData, setOfflineSalesOrderData] = useState<any>(null);
  const [tempOrderId, setTempOrderId] = useState<string | null>(null);

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
        setSessionData(response.session);
        
        // Определяем основную валюту из билетов
        if (response.session.tickets && response.session.tickets.length > 0) {
          const currency = getPrimaryCurrency(response.session.tickets);
          setPrimaryCurrency(currency);
        }
        
        // Преобразуем билеты сессии в нужный формат
        if (response.session.tickets && response.session.tickets.length > 0) {
          const transformedHallSeats = response.session.tickets.map((ticket: any) => ({
            seatId: ticket.seatId, 
            row: ticket.row,
            seatNumber: ticket.place, 
            section: ticket.section,
            price: ticket.price,
            x: ticket.x,
            y: ticket.y,
            width: ticket.width,
            height: ticket.height,
            objectType: 'seat',
            svgElementId: ticket.seatId,
            svgTagName: 'path',
          }));
          
          setTransformedHallSeats(transformedHallSeats);
        }

        // Добавляем сцену и декорации из данных зала
        if (response.session.hall?.seats) {
          try {
            const hallSeatsData = Array.isArray(response.session.hall.seats) 
              ? response.session.hall.seats 
              : JSON.parse(response.session.hall.seats);
            
            const sceneAndDecorations = hallSeatsData.filter((seat: any) => {
              if (seat.objectType === 'seat' && seat.capacity && seat.capacity > 1) {
                return true; // Это специальная зона
              }
              return seat.objectType === 'scene' || seat.objectType === 'decoration' || seat.objectType === 'special_zone';
            });
            
            if (sceneAndDecorations.length > 0) {
              const transformedSceneAndDecorations = sceneAndDecorations.map((seat: any) => {
                let objectType = seat.objectType;
                if (seat.objectType === 'seat' && seat.capacity && seat.capacity > 1) {
                  objectType = 'special_zone';
                }
                
                // Для специальных зон ищем соответствующий билет в session.tickets
                let sectionFromTicket = seat.section || seat.zone || '';
                if (objectType === 'special_zone') {
                  const correspondingTicket = response.session.tickets?.find((ticket: any) => 
                    ticket.seatId === (seat.id || seat.seatId)
                  );
                  if (correspondingTicket) {
                    sectionFromTicket = correspondingTicket.section || sectionFromTicket;
                  }
                }
                
                return {
                  seatId: seat.id || seat.seatId,
                  row: seat.row || 0,
                  seatNumber: seat.place || seat.seatNumber || 0,
                  section: sectionFromTicket,
                  x: seat.x,
                  y: seat.y,
                  width: seat.width,
                  height: seat.height,
                  objectType: objectType,
                  capacity: seat.capacity,
                  svgElementId: seat.svgElementId || seat.id || seat.seatId,
                  svgTagName: seat.svgTagName || 'path',
                };
              });
              
              setTransformedHallSeats(prev => [...prev, ...transformedSceneAndDecorations]);
            }
          } catch (error) {
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
          }
        }
        
        // Сохраняем виртуальные билеты для подсчета доступных мест
        if (response.session.tickets) {
          const virtualTickets = response.session.tickets.filter((ticket: any) => 
            ticket.seatId && ticket.seatId.includes('_seat_')
          );
          setVirtualTickets(virtualTickets);
        }
      } else {
        setError('Сеанс не найден');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  // Функция для определения цвета по цене (полная палитра)
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
    
    // Для цен выше 15,000 используем циклический алгоритм
    if (price >= 15000) {
      const baseIndex = Math.floor((price - 15000) / 100) % colors.length;
      return colors[baseIndex];
    }
    
    // Для цен до 15,000 используем прямое соответствие
    const priceIndex = Math.floor(price / 100);
    return colors[priceIndex] || '#95A5A6';
  }, []);

  // Обогащаем места статусами
  const seatsWithStatus = useMemo((): Seat[] => {
    if (!seats.length) {
      return seats;
    }

    return seats.map((seat) => {
      const isSelected = selectedSeats.some(s => s.seatId === seat.id);
      
      const ticket = sessionData?.tickets?.find((t: any) => t.seatId === seat.id);
      
      let status: 'available' | 'reserved' | 'sold' | 'locked' | 'unavailable' = 'available';
      let price = 1000;
      
      if (ticket) {
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

  // Создаем данные для OfflinePriceCanvas из сессии
  const priceCanvasData = useMemo(() => {
    if (!sessionData) return { seatPrices: [], prices: [], zones: [] };

    const seatPrices = sessionData.tickets?.map((ticket: any) => ({
      seatId: ticket.seatId,
      priceId: ticket.priceId || ticket.price || 1000
    })) || [];

    const uniquePrices = new Map();
    sessionData.tickets?.forEach((ticket: any) => {
      const price = ticket.price || 1000;
      if (!uniquePrices.has(price)) {
        uniquePrices.set(price, {
          id: price,
          name: formatCurrency(price, primaryCurrency),
          value: price,
          currency: primaryCurrency,
          color: getPriceColor(price)
        });
      }
    });

    const prices = Array.from(uniquePrices.values());

    const zones = [];
    if (sessionData.hall?.seats) {
      try {
        const hallSeatsData = Array.isArray(sessionData.hall.seats) 
          ? sessionData.hall.seats 
          : JSON.parse(sessionData.hall.seats);
        
        const uniqueZones = new Map();
        hallSeatsData.forEach((seat: any) => {
          if (seat.zone && !uniqueZones.has(seat.zone)) {
            uniqueZones.set(seat.zone, {
              id: seat.zone,
              name: seat.zone
            });
          }
        });
        
        zones.push(...Array.from(uniqueZones.values()));
      } catch (error) {
      }
    }

    return { seatPrices, prices, zones };
  }, [sessionData, getPriceColor]);

  // Обработка выбора места
  const handleSeatClick = useCallback((seat: Seat) => {
    if (seat.status === 'sold' || seat.status === 'reserved' || seat.status === 'locked') {
      return;
    }
    
    const isSelected = selectedSeats.some(s => s.seatId === seat.id);

    if (isSelected) {
      setSelectedSeats(prev => prev.filter(s => s.seatId !== seat.id));
    } else {
      const newSeat: SelectedSeat = {
        seatId: seat.id as string,
        row: seat.row || 0,
        place: seat.place || 0,
        zone: seat.zone,
        price: seat.price || 1000,
        priceColor: seat.priceColor || '#667eea',
        currency: (seat as any).currency || primaryCurrency
      };
      setSelectedSeats(prev => [...prev, newSeat]);
    }
  }, [selectedSeats]);

  // Обработка выбора мест (включая виртуальные места из специальных зон)
  const handleSeatsSelected = useCallback((seatIds: string[]) => {
    // Обертываем в setTimeout, чтобы избежать вызова setState во время рендеринга
    setTimeout(() => {
      const virtualSeats = seatIds.filter(id => id.includes('-virtual-'));
      const regularSeats = seatIds.filter(id => !id.includes('-virtual-'));
      
      // Обрабатываем виртуальные места
      if (virtualSeats.length > 0) {
        const firstVirtualSeat = virtualSeats[0];
        const specialZoneId = firstVirtualSeat.split('-virtual-')[0];
        
        const specialZoneSeat = seats.find(s => s.id === specialZoneId);
        const specialZoneHallSeat = transformedHallSeats.find(hs => hs.seatId === specialZoneId);
        
        if (specialZoneSeat && specialZoneHallSeat) {
          const seatPrice = priceCanvasData.seatPrices.find(sp => sp.seatId === specialZoneId);
          const price = priceCanvasData.prices.find(p => p.id === seatPrice?.priceId);
          const priceValue = price?.value || 1000;
          
          const specialZoneSeatsForCart: SelectedSeat[] = virtualSeats.map((virtualSeatId, index) => ({
            seatId: virtualSeatId,
            row: 0,
            place: index + 1,
            zone: specialZoneHallSeat.section,
            price: priceValue,
            priceColor: price?.color || '#667eea',
          }));
          
          setSelectedSeats(prev => {
            const filteredPrev = prev.filter(seat => 
              !seat.seatId.includes('-virtual-') && 
              !seat.seatId.startsWith(specialZoneId) &&
              seat.seatId !== specialZoneId
            );
            return [...filteredPrev, ...specialZoneSeatsForCart];
          });
        }
      }
      
      // Обрабатываем обычные места
      if (regularSeats.length > 0) {
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
            priceColor: price?.color || seat?.priceColor || '#667eea'
          };
        });
        
        setSelectedSeats(prev => {
          const filteredPrev = prev.filter(seat => !regularSeats.includes(seat.seatId));
          return [...filteredPrev, ...regularSeatsForCart];
        });
      }
    }, 0);
  }, [seats, transformedHallSeats, priceCanvasData]);

  // Расчет общей суммы
  const totalAmount = useMemo(() => 
    selectedSeats.reduce((sum, seat) => sum + seat.price, 0), 
    [selectedSeats]
  );

  // Очистка выбранных мест
  const clearSelection = useCallback(() => {
    setSelectedSeats([]);
  }, []);

  // Переход к оплате
  const proceedToPayment = useCallback(async () => {
    if (selectedSeats.length === 0) return;
    
    try {
      
      // Подготавливаем данные для создания временного заказа
      const selectedSeatIds = selectedSeats.map(seat => seat.seatId);
      
      // Обрабатываем специальные зоны
      const specialZoneData: { [key: string]: number } = {};
      selectedSeats.forEach(seat => {
        if (seat.seatId.includes('-virtual-')) {
          const specialZoneId = seat.seatId.split('-virtual-')[0];
          specialZoneData[specialZoneId] = (specialZoneData[specialZoneId] || 0) + 1;
        }
      });

      const tempOrderData = {
        sessionId,
        customerName: 'Временный заказ',
        customerPhone: '+0000000000',
        customerEmail: 'temp@temp.com',
        selectedSeatIds,
        specialZoneData,
        isInvitation: false,
        status: 'temporary'
      };

      // Создаем временный заказ
      const response = await apiClient.createOrder(tempOrderData);
      
      if (response.success) {
        setTempOrderId(response.order.id);
        setShowPaymentForm(true);
      } else {
        throw new Error('Ошибка создания временного заказа');
      }
    } catch (error) {
      alert(`Ошибка создания заказа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }, [selectedSeats, sessionId]);

  // Переход к созданию приглашений
  const proceedToInvitations = useCallback(async () => {
    if (selectedSeats.length === 0) return;
    
    try {
      
      // Подготавливаем данные для создания временного заказа
      const selectedSeatIds = selectedSeats.map(seat => seat.seatId);
      
      // Обрабатываем специальные зоны
      const specialZoneData: { [key: string]: number } = {};
      selectedSeats.forEach(seat => {
        if (seat.seatId.includes('-virtual-')) {
          const specialZoneId = seat.seatId.split('-virtual-')[0];
          specialZoneData[specialZoneId] = (specialZoneData[specialZoneId] || 0) + 1;
        }
      });

      const tempOrderData = {
        sessionId,
        customerName: 'Временный заказ',
        customerPhone: '+0000000000',
        customerEmail: 'temp@temp.com',
        selectedSeatIds,
        specialZoneData,
        isInvitation: true,
        status: 'temporary'
      };

      // Создаем временный заказ
      const response = await apiClient.createOrder(tempOrderData);
      
      if (response.success) {
        setTempOrderId(response.order.id);
        setShowInvitationForm(true);
      } else {
        throw new Error('Ошибка создания временного заказа');
      }
    } catch (error) {
      alert(`Ошибка создания заказа: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }, [selectedSeats, sessionId]);

  // Обработчики для переключения режимов
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    setSelectedSeats([]); // Очищаем выбор при смене режима
  };

  // Обработчики для форм
  const handleInvitationSubmit = useCallback(async (invitationData: any) => {
    try {
      
      if (!invitationData.tempOrderId) {
        throw new Error('ID временного заказа не найден. Попробуйте выбрать места заново и нажать "Создать приглашения".');
      }

      // Обновляем заказ с данными покупателя на 'pending'
      const updateData = {
        customerName: invitationData.customerName,
        customerPhone: invitationData.customerPhone,
        customerEmail: invitationData.customerEmail,
        notes: invitationData.notes,
        status: 'pending'
      };
      
      const response = await apiClient.updateOrder(invitationData.tempOrderId, updateData);
      
      if (response.success) {
        
        // Оплачиваем заказ-приглашение
        try {
          const payResponse = await apiClient.payOrder(invitationData.tempOrderId, 'invitation');
        } catch (payError) {
          throw new Error('Ошибка при оплате заказа-приглашения');
        }
        
        // Функция для получения билетов с повторными попытками
        const fetchTicketsWithRetry = async (retryCount = 0) => {
          try {
            const ticketsResponse = await apiClient.getTicketsByOrderId(invitationData.tempOrderId);
            
            if (ticketsResponse.success && ticketsResponse.data.tickets.length > 0) {
              const pdfPaths = ticketsResponse.data.tickets.map((ticket: any) => ticket.ticketId);
              
              // Подготавливаем данные для страницы успеха
              const successData = {
                orderId: tempOrderId,
                orderNumber: response.order.orderNumber || tempOrderId,
                customerName: invitationData.customerName,
                totalAmount: invitationData.totalAmount,
                ticketsCount: selectedSeats.length,
                pdfPaths: pdfPaths
              };
              
              // Сохраняем данные и показываем страницу успеха
              setInvitationOrderData(successData);
              setShowInvitationForm(false);
              setShowInvitationSuccess(true);
              setSelectedSeats([]);
            } else if (retryCount < 3) {
              // Если билеты не найдены, пробуем еще раз через 1 секунду
              setTimeout(() => fetchTicketsWithRetry(retryCount + 1), 1000);
            } else {
              // Если после 3 попыток билеты не найдены, показываем страницу без PDF
              const successData = {
                orderId: response.order.id,
                orderNumber: response.order.orderNumber || response.order.id,
                customerName: invitationData.customerName,
                totalAmount: invitationData.totalAmount,
                ticketsCount: selectedSeats.length,
                pdfPaths: []
              };
              
              setInvitationOrderData(successData);
              setShowInvitationForm(false);
              setShowInvitationSuccess(true);
              setSelectedSeats([]);
            }
          } catch (error) {
            
            if (retryCount < 3) {
              // Повторяем попытку через 1 секунду
              setTimeout(() => fetchTicketsWithRetry(retryCount + 1), 1000);
            } else {
              // Если после 3 попыток все еще ошибка, показываем страницу без PDF
              const successData = {
                orderId: response.order.id,
                orderNumber: response.order.orderNumber || response.order.id,
                customerName: invitationData.customerName,
                totalAmount: invitationData.totalAmount,
                ticketsCount: selectedSeats.length,
                pdfPaths: []
              };
              
              setInvitationOrderData(successData);
              setShowInvitationForm(false);
              setShowInvitationSuccess(true);
              setSelectedSeats([]);
            }
          }
        };

        // Начинаем получение билетов
        fetchTicketsWithRetry();
        
        // Обновляем данные сеанса
        loadSessionData();
      } else {
        throw new Error(response.message || 'Ошибка создания приглашений');
      }
    } catch (error) {
      alert(`Ошибка создания приглашения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }, [sessionId, loadSessionData]);

  const handlePaymentSubmit = useCallback(async (paymentData: any) => {
    try {
      
      if (!paymentData.tempOrderId) {
        throw new Error('ID временного заказа не найден. Попробуйте выбрать места заново и нажать "Оплатить".');
      }

      // Обновляем заказ с данными покупателя на 'pending'
      const updateData = {
        customerName: paymentData.customerName,
        customerPhone: paymentData.customerPhone,
        customerEmail: paymentData.customerEmail,
        notes: paymentData.notes,
        status: 'pending' // Всегда устанавливаем pending для оплаты
      };
      
      const response = await apiClient.updateOrder(paymentData.tempOrderId, updateData);
      
      if (response.success) {
        
        // Если заказ должен быть оплачен, используем payOrder
        if (paymentData.paymentStatus === 'paid') {
          try {
            const payResponse = await apiClient.payOrder(paymentData.tempOrderId, paymentData.paymentMethod || 'cash');
          } catch (payError) {
            throw new Error('Ошибка при оплате заказа');
          }
        } else {
        }
        
        // Если заказ оплачен, генерируем билеты и показываем страницу благодарности
        if (paymentData.paymentStatus === 'paid') {
          // Сохраняем количество билетов до очистки selectedSeats
          const ticketsCount = selectedSeats.length;
          
          // Функция для получения билетов с повторными попытками
          const fetchTicketsWithRetry = async (retryCount = 0) => {
            try {
              const ticketsResponse = await apiClient.getTicketsByOrderId(paymentData.tempOrderId);
              
              if (ticketsResponse.success && ticketsResponse.data.tickets.length > 0) {
                const pdfPaths = ticketsResponse.data.tickets.map((ticket: any) => ticket.ticketId);
                
                // Подготавливаем данные для страницы успеха
                const successData = {
                  orderId: paymentData.tempOrderId,
                  orderNumber: response.order.orderNumber || paymentData.tempOrderId,
                  customerName: paymentData.customerName,
                  customerEmail: paymentData.customerEmail,
                  customerPhone: paymentData.customerPhone,
                  totalAmount: paymentData.totalAmount,
                  ticketsCount: ticketsCount,
                  paymentMethod: paymentData.paymentMethod,
                  paymentStatus: paymentData.paymentStatus,
                  pdfPaths: pdfPaths
                };
                
                // Сохраняем данные и показываем страницу успеха
                setOfflineSalesOrderData(successData);
                setShowPaymentForm(false);
                setShowOfflineSalesSuccess(true);
                setSelectedSeats([]);
              } else if (retryCount < 3) {
                // Если билеты не найдены, пробуем еще раз через 1 секунду
                setTimeout(() => fetchTicketsWithRetry(retryCount + 1), 1000);
              } else {
                // Если билеты так и не найдены, показываем страницу без PDF
                const successData = {
                  orderId: paymentData.tempOrderId,
                  orderNumber: response.order.orderNumber || paymentData.tempOrderId,
                  customerName: paymentData.customerName,
                  customerEmail: paymentData.customerEmail,
                  customerPhone: paymentData.customerPhone,
                  totalAmount: paymentData.totalAmount,
                  ticketsCount: ticketsCount,
                  paymentMethod: paymentData.paymentMethod,
                  paymentStatus: paymentData.paymentStatus,
                  pdfPaths: []
                };
                
                setOfflineSalesOrderData(successData);
                setShowPaymentForm(false);
                setShowOfflineSalesSuccess(true);
                setSelectedSeats([]);
              }
            } catch (error) {
              console.error('Ошибка при получении билетов:', error);
              if (retryCount < 3) {
                setTimeout(() => fetchTicketsWithRetry(retryCount + 1), 1000);
              } else {
                // Показываем страницу без PDF в случае ошибки
                const successData = {
                  orderId: paymentData.tempOrderId,
                  orderNumber: response.order.orderNumber || paymentData.tempOrderId,
                  customerName: paymentData.customerName,
                  customerEmail: paymentData.customerEmail,
                  customerPhone: paymentData.customerPhone,
                  totalAmount: paymentData.totalAmount,
                  ticketsCount: ticketsCount,
                  paymentMethod: paymentData.paymentMethod,
                  paymentStatus: paymentData.paymentStatus,
                  pdfPaths: []
                };
                
                setOfflineSalesOrderData(successData);
                setShowPaymentForm(false);
                setShowOfflineSalesSuccess(true);
                setSelectedSeats([]);
              }
            }
          };
          
          // Запускаем получение билетов
          fetchTicketsWithRetry();
        } else {
          // Если заказ не оплачен, просто показываем уведомление
          alert(`Заказ успешно оформлен! Номер заказа: ${response.order.orderNumber || response.order.id}. Статус: ожидает оплаты.`);
          
          // Закрываем форму и очищаем выбор
          setShowPaymentForm(false);
          setSelectedSeats([]);
          
          // Обновляем данные сеанса
          loadSessionData();
        }
      } else {
        throw new Error(response.message || 'Ошибка создания офлайн заказа');
      }
    } catch (error) {
      alert(`Ошибка обработки оплаты: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }, [sessionId, loadSessionData]);

  // Обработчик закрытия страницы успеха
  const handleInvitationSuccessClose = useCallback(() => {
    setShowInvitationSuccess(false);
    setInvitationOrderData(null);
  }, []);

  // Обработчик закрытия страницы успеха офлайн продаж
  const handleOfflineSalesSuccessClose = useCallback(() => {
    setShowOfflineSalesSuccess(false);
    setOfflineSalesOrderData(null);
    loadSessionData(); // Обновляем данные сеанса
  }, [loadSessionData]);

  if (loading) {
    return (
      <Layout currentPage="events">
        <div className="offline-ticket-sales-page offline-ticket-sales-page--loading">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Загрузка данных сеанса...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout currentPage="events">
        <div className="offline-ticket-sales-page offline-ticket-sales-page--error">
          <div className="error-message">
            <h2>Ошибка</h2>
            <p>{error}</p>
            <button onClick={loadSessionData} className="retry-button">
              Повторить попытку
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!sessionData) {
    return (
      <Layout currentPage="events">
        <div className="offline-ticket-sales-page offline-ticket-sales-page--error">
          <div className="error-message">
            <h2>Сеанс не найден</h2>
            <p>Проверьте корректность ссылки</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout currentPage="events">
      <div className="offline-ticket-sales-page">
        {/* Заголовок */}
        <div className="offline-ticket-sales-page__header">
          <div className="header-content">
            <button 
              onClick={() => navigate(-1)}
              className="back-button"
              title="Назад"
            >
              ← Назад
            </button>
            <div className="event-info">
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
        </div>

        {/* Переключатель режимов */}
        <div className="mode-selector">
          <button 
            className={`mode-button ${mode === 'sales' ? 'active' : ''}`}
            onClick={() => handleModeChange('sales')}
          >
            Продажа билетов
          </button>
          <button 
            className={`mode-button ${mode === 'invitations' ? 'active' : ''}`}
            onClick={() => handleModeChange('invitations')}
          >
            Создание приглашений
          </button>
        </div>

        {/* Основной контент */}
        <div className="offline-ticket-sales-page__content">
          <div className="canvas-container">
            <OfflinePriceCanvas
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
                {formatCurrency(totalAmount, primaryCurrency)}
              </div>
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
                        <>
                          <div className="seat-number">{seat.zone || 'Специальная зона'}</div>
                          <div className="seat-zone"></div>
                        </>
                      ) : (
                        <>
                          <div className="seat-number">{seat.place} место, {seat.row} ряд</div>
                          <div className="seat-zone">{seat.zone || 'Партер'}</div>
                        </>
                      )}
                    </div>
                    <div className="seat-price">
                      {formatCurrency(seat.price, primaryCurrency)}
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
                <div className="summary-row summary-row--total">
                  <span>Итого</span>
                  <span>{formatCurrency(totalAmount, primaryCurrency)}</span>
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
                {mode === 'sales' ? (
                  <button 
                    className="btn-buy"
                    onClick={proceedToPayment}
                    disabled={selectedSeats.length === 0}
                  >
                    Оплатить
                  </button>
                ) : (
                  <button 
                    className="btn-invite"
                    onClick={proceedToInvitations}
                    disabled={selectedSeats.length === 0}
                  >
                    Создать приглашения
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Форма приглашений */}
        {showInvitationForm && (
          <InvitationForm
            selectedSeats={selectedSeats}
            totalAmount={totalAmount}
            tempOrderId={tempOrderId}
            onClose={() => setShowInvitationForm(false)}
            onSubmit={handleInvitationSubmit}
          />
        )}

        {/* Форма офлайн оплаты */}
        {showPaymentForm && (
          <OfflinePaymentForm
            selectedSeats={selectedSeats}
            totalAmount={totalAmount}
            tempOrderId={tempOrderId}
            onClose={() => setShowPaymentForm(false)}
            onSubmit={handlePaymentSubmit}
          />
        )}

        {/* Страница успешного создания приглашений */}
        {showInvitationSuccess && invitationOrderData && (
          <InvitationSuccessPage
            orderData={invitationOrderData}
            onClose={handleInvitationSuccessClose}
          />
        )}

        {/* Страница успешной офлайн продажи */}
        {showOfflineSalesSuccess && offlineSalesOrderData && (
          <OfflineSalesSuccessPage
            orderData={offlineSalesOrderData}
            onClose={handleOfflineSalesSuccessClose}
          />
        )}
      </div>
    </Layout>
  );
};

export default OfflineTicketSalesPage;
