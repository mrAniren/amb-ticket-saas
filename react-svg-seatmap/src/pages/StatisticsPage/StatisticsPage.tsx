import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '../../components/Layout/Layout';
import { apiClient } from '../../services/api';
import './StatisticsPage.scss';

interface TreeNode {
  id: string;
  name: string;
  level: number;
  isExpanded: boolean;
  hasChildren: boolean;
  children?: TreeNode[];
  icon?: string;
  tickets?: number;
  revenue?: number;
  currency?: string;
}

interface Event {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
}

interface Session {
  _id?: string;
  id?: string;
  eventId: string;
  hallId: string;
  date: string;
  time: string;
  event?: {
    _id: string;
    name: string;
  };
  hall?: {
    _id: string;
    name: string;
    city: string;
  };
}

interface Widget {
  _id: string;
  widgetId: string;
  name?: string;
  sessionId: string | {
    _id: string;
    date: string;
    time: string;
    eventId: string;
    hallId: string;
    event?: {
      _id: string;
      name: string;
    };
    hall?: {
      _id: string;
      name: string;
    };
  };
  isActive: boolean;
}

interface AttributionData {
  eventId: string;
  eventName: string;
  sessionId: string;
  sessionDate: string;
  sessionTime: string;
  hallName: string;
    widgetId: string;
  isInvitation: boolean;
  orderType: 'widget' | 'offline' | 'invitation';
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  utm_term: string;
    totalOrders: number;
    totalRevenue: number;
    totalTickets: number;
  currency: string;
}


const StatisticsPage: React.FC = () => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['root']));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hierarchyData, setHierarchyData] = useState<TreeNode[]>([]);
  const [baseCurrency, setBaseCurrency] = useState('KGS');
  const [availableCurrencies] = useState<string[]>(['KGS', 'KZT', 'RUB', 'USD']);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');



  // Функции для работы с фильтрами дат
  const resetDateFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  const setDateRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const setToday = () => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  };

  const setYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    setStartDate(yesterdayStr);
    setEndDate(yesterdayStr);
  };

  // Функция для получения символа валюты
  const getCurrencySymbol = (currency: string): string => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'RUB': 'Р',
      'KZT': '₸',
      'KGS': 'с',
      'EUR': '€'
    };
    return symbols[currency] || currency;
  };

  // Загрузка всех данных для построения иерархии
  const loadAllData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      

      // Загружаем все данные параллельно
      const [eventsResponse, sessionsResponse, widgetsResponse, attributionResponse] = await Promise.allSettled([
        apiClient.request('/events') as any,
        apiClient.request('/sessions') as any,
        apiClient.request('/widgets') as any,
        apiClient.request('/statistics/attribution') as any
      ]);

      // Обрабатываем результаты
      const events = eventsResponse.status === 'fulfilled' && eventsResponse.value.success 
        ? eventsResponse.value.events 
        : [];
      const sessions = sessionsResponse.status === 'fulfilled' && sessionsResponse.value.success 
        ? sessionsResponse.value.sessions 
        : [];
      const widgets = widgetsResponse.status === 'fulfilled' && widgetsResponse.value.success 
        ? widgetsResponse.value.data?.widgets || [] 
        : [];
      const attributionData = attributionResponse.status === 'fulfilled' && attributionResponse.value.success 
        ? attributionResponse.value.data.attribution 
        : [];


      

      // Строим иерархию
      const hierarchy = buildHierarchy(events, sessions, widgets, attributionData);
      setHierarchyData(hierarchy);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка');
    } finally {
      setLoading(false);
    }
  }, []);

  // Построение иерархии данных
  // Вспомогательная функция для построения UTM иерархии
  const buildUTMHierarchy = (attributionData: AttributionData[], parentId: string, level: number): TreeNode[] => {
    if (attributionData.length === 0) return [];

    // Проверяем, есть ли хотя бы один реальный UTM параметр
    const hasRealUTM = attributionData.some(attr => 
      attr.utm_source !== 'без атрибуции' || 
      attr.utm_medium !== 'без атрибуции' || 
      attr.utm_campaign !== 'без атрибуции' || 
      attr.utm_content !== 'без атрибуции' || 
      attr.utm_term !== 'без атрибуции'
    );

    // Если все UTM параметры равны "без атрибуции", показываем один узел
    if (!hasRealUTM) {
      const totalRevenue = attributionData.reduce((sum, attr) => sum + attr.totalRevenue, 0);
      const totalTickets = attributionData.reduce((sum, attr) => sum + attr.totalTickets, 0);

      return [{
        id: `${parentId}-no-attribution`,
        name: 'без атрибуции',
        level: level,
        isExpanded: false,
        hasChildren: false,
        icon: '',
        tickets: totalTickets,
        revenue: totalRevenue,
        currency: (() => {
          const currency = attributionData[0]?.currency || 'RUB';
          return currency;
        })()
      }];
    }

    // Группируем по utm_source
    const utmSourceGroups = attributionData.reduce((acc, attr) => {
      const source = attr.utm_source;
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(attr);
      return acc;
    }, {} as Record<string, AttributionData[]>);

    const nodes: TreeNode[] = [];

    Object.entries(utmSourceGroups).forEach(([source, sourceData]) => {
      // Проверяем, есть ли данные для следующих уровней
      const hasMedium = sourceData.some(attr => attr.utm_medium !== 'без атрибуции');
      const hasCampaign = hasMedium && sourceData.some(attr => attr.utm_campaign !== 'без атрибуции');
      const hasContent = hasCampaign && sourceData.some(attr => attr.utm_content !== 'без атрибуции');
      const hasTerm = hasContent && sourceData.some(attr => attr.utm_term !== 'без атрибуции');

      const sourceNode: TreeNode = {
        id: `${parentId}-utm-source-${source}`,
        name: `utm_source: ${source}`,
        level: level,
        isExpanded: false,
        hasChildren: hasMedium,
        icon: '',
        children: [],
        currency: sourceData[0]?.currency || 'RUB'
      };

      // Если нет utm_medium, показываем статистику на уровне utm_source
      if (!hasMedium) {
        const totalRevenue = sourceData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
        const totalTickets = sourceData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
        
        sourceNode.tickets = totalTickets;
        sourceNode.revenue = totalRevenue;
        const sourceCurrency = sourceData[0]?.currency || 'RUB';
        sourceNode.currency = sourceCurrency;
        sourceNode.hasChildren = false;
      } else {
        // Группируем по utm_medium
        const utmMediumGroups = sourceData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
          const medium = attr.utm_medium;
          if (!acc[medium]) {
            acc[medium] = [];
          }
          acc[medium].push(attr);
          return acc;
        }, {} as Record<string, AttributionData[]>);

        Object.entries(utmMediumGroups).forEach(([medium, mediumData]: [string, AttributionData[]]) => {
          const mediumNode: TreeNode = {
            id: `${parentId}-utm-medium-${source}-${medium}`,
            name: `utm_medium: ${medium}`,
            level: level + 1,
            isExpanded: false,
            hasChildren: hasCampaign,
            icon: '',
            children: [],
            currency: mediumData[0]?.currency || 'RUB'
          };

          // Если нет utm_campaign, показываем статистику на уровне utm_medium
          if (!hasCampaign) {
            const totalRevenue = mediumData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
            const totalTickets = mediumData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
            
            mediumNode.tickets = totalTickets;
            mediumNode.revenue = totalRevenue;
            const mediumCurrency = mediumData[0]?.currency || 'RUB';
            mediumNode.currency = mediumCurrency;
            mediumNode.hasChildren = false;
          } else {
            // Продолжаем иерархию для utm_campaign, utm_content, utm_term
            const campaignGroups = mediumData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
              const campaign = attr.utm_campaign;
              if (!acc[campaign]) {
                acc[campaign] = [];
              }
              acc[campaign].push(attr);
              return acc;
            }, {} as Record<string, AttributionData[]>);

            Object.entries(campaignGroups).forEach(([campaign, campaignData]: [string, AttributionData[]]) => {
              const campaignNode: TreeNode = {
                id: `${parentId}-utm-campaign-${source}-${medium}-${campaign}`,
                name: `utm_campaign: ${campaign}`,
                level: level + 2,
                isExpanded: false,
                hasChildren: hasContent,
                icon: '',
                children: [],
                currency: campaignData[0]?.currency || 'RUB'
              };

              if (!hasContent) {
                const totalRevenue = campaignData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
                const totalTickets = campaignData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
                
                campaignNode.tickets = totalTickets;
                campaignNode.revenue = totalRevenue;
                const campaignCurrency = campaignData[0]?.currency || 'RUB';
                campaignNode.currency = campaignCurrency;
                campaignNode.hasChildren = false;
              } else {
                // utm_content и utm_term
                const contentGroups = campaignData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
                  const content = attr.utm_content;
                  if (!acc[content]) {
                    acc[content] = [];
                  }
                  acc[content].push(attr);
                  return acc;
                }, {} as Record<string, AttributionData[]>);

                Object.entries(contentGroups).forEach(([content, contentData]: [string, AttributionData[]]) => {
                  const contentNode: TreeNode = {
                    id: `${parentId}-utm-content-${source}-${medium}-${campaign}-${content}`,
                    name: `utm_content: ${content}`,
                    level: level + 3,
                    isExpanded: false,
                    hasChildren: hasTerm,
                    icon: '',
                    children: [],
                    currency: contentData[0]?.currency || 'RUB'
                  };

                  if (!hasTerm) {
                    const totalRevenue = contentData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
                    const totalTickets = contentData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
                    
                    contentNode.tickets = totalTickets;
                    contentNode.revenue = totalRevenue;
                    contentNode.currency = contentData[0]?.currency || 'RUB';
                    contentNode.hasChildren = false;
                  } else {
                    // utm_term - финальный уровень
                    const termGroups = contentData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
                      const term = attr.utm_term;
                      if (!acc[term]) {
                        acc[term] = [];
                      }
                      acc[term].push(attr);
                      return acc;
                    }, {} as Record<string, AttributionData[]>);

                    Object.entries(termGroups).forEach(([term, termData]: [string, AttributionData[]]) => {
                      const totalRevenue = termData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
                      const totalTickets = termData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);

                      const termNode: TreeNode = {
                        id: `${parentId}-utm-term-${source}-${medium}-${campaign}-${content}-${term}`,
                        name: `utm_term: ${term}`,
                        level: level + 4,
                        isExpanded: false,
                        hasChildren: false,
                        icon: '',
                        tickets: totalTickets,
                        revenue: totalRevenue,
                        currency: termData[0]?.currency || 'RUB'
                      };

                      contentNode.children!.push(termNode);
                    });
                  }

                  campaignNode.children!.push(contentNode);
                });
              }

              mediumNode.children!.push(campaignNode);
            });
          }

          sourceNode.children!.push(mediumNode);
        });
      }

      nodes.push(sourceNode);
    });

    return nodes;
  };

  // Новая функция для построения UTM иерархии с конвертированными данными
  const buildUTMHierarchyWithConversion = (attributionData: AttributionData[], level: number, baseCurrency: string): TreeNode[] => {
    if (attributionData.length === 0) return [];

    // Проверяем, есть ли хотя бы один реальный UTM параметр
    const hasRealUTM = attributionData.some(attr => 
      attr.utm_source !== 'без атрибуции' || 
      attr.utm_medium !== 'без атрибуции' || 
      attr.utm_campaign !== 'без атрибуции' || 
      attr.utm_content !== 'без атрибуции' || 
      attr.utm_term !== 'без атрибуции'
    );

    // Если все UTM параметры равны "без атрибуции", показываем один узел
    if (!hasRealUTM) {
      const totalRevenue = attributionData.reduce((sum, attr) => sum + attr.totalRevenue, 0);
      const totalTickets = attributionData.reduce((sum, attr) => sum + attr.totalTickets, 0);

      return [{
        id: `no-attribution-${Date.now()}`,
        name: 'без атрибуции',
        level: level,
        isExpanded: false,
        hasChildren: false,
        icon: '',
        tickets: totalTickets,
        revenue: totalRevenue,
        currency: baseCurrency
      }];
    }

    // Группируем по utm_source
    const utmSourceGroups = attributionData.reduce((acc, attr) => {
      const source = attr.utm_source;
      if (!acc[source]) {
        acc[source] = [];
      }
      acc[source].push(attr);
      return acc;
    }, {} as Record<string, any[]>);

    const nodes: TreeNode[] = [];

    Object.entries(utmSourceGroups).forEach(([source, sourceData]) => {
      // Проверяем, есть ли данные для следующих уровней
      const hasMedium = sourceData.some(attr => attr.utm_medium !== 'без атрибуции');
      const hasCampaign = hasMedium && sourceData.some(attr => attr.utm_campaign !== 'без атрибуции');
      const hasContent = hasCampaign && sourceData.some(attr => attr.utm_content !== 'без атрибуции');
      const hasTerm = hasContent && sourceData.some(attr => attr.utm_term !== 'без атрибуции');

      const sourceNode: TreeNode = {
        id: `utm-source-${source}-${Date.now()}`,
        name: `utm_source: ${source}`,
        level: level,
        isExpanded: false,
        hasChildren: hasMedium,
        icon: '',
        children: [],
        currency: baseCurrency
      };

      // Если нет utm_medium, показываем статистику на уровне utm_source
      if (!hasMedium) {
        const totalRevenue = sourceData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
        const totalTickets = sourceData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
        
        sourceNode.tickets = totalTickets;
        sourceNode.revenue = totalRevenue;
        sourceNode.hasChildren = false;
      } else {
        // Группируем по utm_medium
        const utmMediumGroups = sourceData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
          const medium = attr.utm_medium;
          if (!acc[medium]) {
            acc[medium] = [];
          }
          acc[medium].push(attr);
          return acc;
        }, {} as Record<string, AttributionData[]>);

        Object.entries(utmMediumGroups).forEach(([medium, mediumData]) => {
          const typedMediumData = mediumData as AttributionData[];
          const mediumNode: TreeNode = {
            id: `utm-medium-${source}-${medium}-${Date.now()}`,
            name: `utm_medium: ${medium}`,
            level: level + 1,
            isExpanded: false,
            hasChildren: hasCampaign,
            icon: '',
            children: [],
            currency: baseCurrency
          };

          // Если нет utm_campaign, показываем статистику на уровне utm_medium
          if (!hasCampaign) {
            const totalRevenue = typedMediumData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
            const totalTickets = typedMediumData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
            
            mediumNode.tickets = totalTickets;
            mediumNode.revenue = totalRevenue;
            mediumNode.hasChildren = false;
          } else {
            // Группируем по utm_campaign
            const utmCampaignGroups = typedMediumData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
              const campaign = attr.utm_campaign;
              if (!acc[campaign]) {
                acc[campaign] = [];
              }
              acc[campaign].push(attr);
              return acc;
            }, {} as Record<string, AttributionData[]>);

            Object.entries(utmCampaignGroups).forEach(([campaign, campaignData]: [string, AttributionData[]]) => {
              const campaignNode: TreeNode = {
                id: `utm-campaign-${source}-${medium}-${campaign}-${Date.now()}`,
                name: `utm_campaign: ${campaign}`,
                level: level + 2,
                isExpanded: false,
                hasChildren: hasContent,
                icon: '',
                children: [],
                currency: baseCurrency
              };

              // Если нет utm_content, показываем статистику на уровне utm_campaign
              if (!hasContent) {
                const totalRevenue = campaignData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
                const totalTickets = campaignData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
                
                campaignNode.tickets = totalTickets;
                campaignNode.revenue = totalRevenue;
                campaignNode.hasChildren = false;
              } else {
                // Группируем по utm_content
                const utmContentGroups = campaignData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
                  const content = attr.utm_content;
                  if (!acc[content]) {
                    acc[content] = [];
                  }
                  acc[content].push(attr);
                  return acc;
                }, {} as Record<string, AttributionData[]>);

                Object.entries(utmContentGroups).forEach(([content, contentData]: [string, AttributionData[]]) => {
                  const contentNode: TreeNode = {
                    id: `utm-content-${source}-${medium}-${campaign}-${content}-${Date.now()}`,
                    name: `utm_content: ${content}`,
                    level: level + 3,
                    isExpanded: false,
                    hasChildren: hasTerm,
                    icon: '',
                    children: [],
                    currency: baseCurrency
                  };

                  // Если нет utm_term, показываем статистику на уровне utm_content
                  if (!hasTerm) {
                    const totalRevenue = contentData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0);
                    const totalTickets = contentData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0);
                    
                    contentNode.tickets = totalTickets;
                    contentNode.revenue = totalRevenue;
                    contentNode.hasChildren = false;
                  } else {
                    // Группируем по utm_term
                    const utmTermGroups = contentData.reduce((acc: Record<string, AttributionData[]>, attr: AttributionData) => {
                      const term = attr.utm_term;
                      if (!acc[term]) {
                        acc[term] = [];
                      }
                      acc[term].push(attr);
                      return acc;
                    }, {} as Record<string, AttributionData[]>);

                    Object.entries(utmTermGroups).forEach(([term, termData]: [string, AttributionData[]]) => {
                      const termNode: TreeNode = {
                        id: `utm-term-${source}-${medium}-${campaign}-${content}-${term}-${Date.now()}`,
                        name: `utm_term: ${term}`,
                        level: level + 4,
                        isExpanded: false,
                        hasChildren: false,
                        icon: '',
                        children: [],
                        tickets: termData.reduce((sum: number, attr: AttributionData) => sum + attr.totalTickets, 0),
                        revenue: termData.reduce((sum: number, attr: AttributionData) => sum + attr.totalRevenue, 0),
                        currency: baseCurrency
                      };

                      contentNode.children!.push(termNode);
                    });
                  }

                  campaignNode.children!.push(contentNode);
                });
              }

              mediumNode.children!.push(campaignNode);
            });
          }

          sourceNode.children!.push(mediumNode);
        });
      }

      nodes.push(sourceNode);
    });

    return nodes;
  };

  // Новая функция для агрегации статистики с конвертированными данными
  const aggregateStatsWithConversion = (node: TreeNode): { tickets: number; revenue: number } => {
    let totalTickets = node.tickets || 0;
    let totalRevenue = node.revenue || 0;

    if (node.children && node.children.length > 0) {
      node.children.forEach(child => {
        const childStats = aggregateStatsWithConversion(child);
        totalTickets += childStats.tickets;
        totalRevenue += childStats.revenue;
      });
    }

    // Обновляем статистику узла
    node.tickets = totalTickets;
    node.revenue = totalRevenue;

    return { tickets: totalTickets, revenue: totalRevenue };
  };

  // Вспомогательная функция для агрегации статистики
  const aggregateStats = (node: TreeNode): { tickets: number; revenue: number } => {
    let totalTickets = node.tickets || 0;
    let totalRevenue = node.revenue || 0;

    if (node.children) {
      node.children.forEach(child => {
        const childStats = aggregateStats(child);
        totalTickets += childStats.tickets;
        totalRevenue += childStats.revenue;
      });
    }

    // Обновляем статистику узла
    node.tickets = totalTickets;
    node.revenue = totalRevenue;

    return { tickets: totalTickets, revenue: totalRevenue };
  };

  // Новая функция для загрузки данных с конвертацией валют
  const loadDataWithCurrencyConversion = async () => {
    try {
      setLoading(true);
      setError(null);
      

      // Формируем параметры запроса для фильтрации по датам
      const queryParams = new URLSearchParams();
      queryParams.append('baseCurrency', baseCurrency);
      if (startDate) {
        queryParams.append('startDate', startDate);
      }
      if (endDate) {
        queryParams.append('endDate', endDate);
      }

      // Загружаем данные параллельно
      const [eventsResponse, sessionsResponse, widgetsResponse, attributionResponse] = await Promise.allSettled([
        apiClient.get('/events') as any,
        apiClient.get('/sessions') as any,
        apiClient.get('/widgets') as any,
        apiClient.get(`/statistics/attribution-with-conversion?${queryParams.toString()}`) as any
      ]);

      // Обрабатываем результаты
      const eventsData = eventsResponse.status === 'fulfilled' ? eventsResponse.value : null;
      const sessionsData = sessionsResponse.status === 'fulfilled' ? sessionsResponse.value : null;
      const widgetsData = widgetsResponse.status === 'fulfilled' ? widgetsResponse.value : null;
      const attributionData = attributionResponse.status === 'fulfilled' ? attributionResponse.value : null;


      const attributionStats = attributionData?.data?.stats || attributionData?.stats || [];

      const events = eventsData?.events || eventsData?.data?.events || [];
      const sessions = sessionsData?.sessions || sessionsData?.data?.sessions || [];
      const widgets = widgetsData?.data?.widgets || widgetsData?.widgets || [];


      // Строим иерархию с конвертированными данными
      const hierarchy = buildHierarchyWithConversion(events, sessions, widgets, attributionStats);
      setHierarchyData(hierarchy);

    } catch (err) {
      // Fallback на старую функцию загрузки данных
      try {
        await loadAllData();
      } catch (fallbackErr) {
        setError('Ошибка загрузки данных');
      }
    } finally {
      setLoading(false);
    }
  };

  // Функция для форматирования даты в формат DD.MM.YYYY
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    } catch (error) {
      return dateString; // Возвращаем исходную строку в случае ошибки
    }
  };

  // Новая функция для построения иерархии с конвертированными данными
  const buildHierarchyWithConversion = (events: Event[], sessions: Session[], widgets: Widget[], attributionData: any[]): TreeNode[] => {

    // Группируем сеансы по мероприятиям
    const sessionsByEvent = sessions.reduce((acc, session) => {
      const eventId = session.eventId;
      if (!acc[eventId]) {
        acc[eventId] = [];
      }
      acc[eventId].push(session);
      return acc;
    }, {} as Record<string, Session[]>);

    // Группируем виджеты по сеансам
    const widgetsBySession = widgets.reduce((acc, widget) => {
      const sessionId = typeof widget.sessionId === 'object' && widget.sessionId?._id 
        ? widget.sessionId._id 
        : String(widget.sessionId);
      
      if (!acc[sessionId]) {
        acc[sessionId] = [];
      }
      acc[sessionId].push(widget);
      return acc;
    }, {} as Record<string, Widget[]>);

    // Группируем данные атрибуции по сеансам и типам заказов
    const attributionBySession = attributionData.reduce((acc, attr) => {
      const sessionId = attr.sessionId;
      
      if (!acc[sessionId]) {
        acc[sessionId] = {
          widgets: {} as Record<string, any[]>,
          offline: [] as any[],
          invitations: [] as any[]
        };
      }

      if (attr.orderType === 'widget') {
        if (!acc[sessionId].widgets[attr.widgetId]) {
          acc[sessionId].widgets[attr.widgetId] = [];
        }
        acc[sessionId].widgets[attr.widgetId].push(attr);
      } else if (attr.orderType === 'offline') {
        acc[sessionId].offline.push(attr);
      } else if (attr.orderType === 'invitation') {
        acc[sessionId].invitations.push(attr);
      }

      return acc;
    }, {} as Record<string, any>);
    

    // Строим иерархию
    const hierarchy: TreeNode[] = events.map(event => {
      const eventSessions = sessionsByEvent[event._id] || [];
      
      const eventNode: TreeNode = {
        id: `event-${event._id}`,
        name: event.name,
        level: 0,
        isExpanded: expandedNodes.has(`event-${event._id}`),
        hasChildren: eventSessions.length > 0,
        icon: '',
        children: [],
        tickets: 0,
        revenue: 0,
        currency: baseCurrency
      };

      // Добавляем сеансы
      eventNode.children = eventSessions.map(session => {
        const sessionId = session._id || session.id;
        const sessionWidgets = widgetsBySession[sessionId || ''] || [];
        const sessionAttribution = attributionBySession[sessionId || ''] || { widgets: {}, offline: [], invitations: [] };

        const sessionNode: TreeNode = {
          id: `session-${sessionId}`,
          name: `${formatDate(session.date)} • ${session.hall?.city || 'Unknown'}`,
          level: 1,
          isExpanded: expandedNodes.has(`session-${sessionId}`),
          hasChildren: true,
          icon: '',
          children: [],
          tickets: 0,
          revenue: 0,
          currency: baseCurrency
        };

        // Добавляем виджеты
        const widgetNodes: TreeNode[] = sessionWidgets.map((widget: Widget) => {
          // Ищем атрибуцию по widgetId, а не по _id
          const widgetAttribution = sessionAttribution.widgets[widget.widgetId] || [];
          
          
          const widgetNode: TreeNode = {
            id: `widget-${widget._id}`,
            name: `Виджет: ${widget.name || widget.widgetId}`,
            level: 2,
            isExpanded: expandedNodes.has(`widget-${widget._id}`),
            hasChildren: widgetAttribution.length > 0,
            icon: '',
            children: [],
            tickets: 0,
            revenue: 0,
            currency: baseCurrency
          };

          // Добавляем UTM иерархию для виджета
          if (widgetAttribution.length > 0) {
            widgetNode.children = buildUTMHierarchyWithConversion(widgetAttribution, 3, baseCurrency);
            
            // Агрегируем статистику для виджета
            if (widgetNode.children) {
              let totalTickets = 0;
              let totalRevenue = 0;
              widgetNode.children.forEach(child => {
                const childStats = aggregateStatsWithConversion(child);
                totalTickets += childStats.tickets;
                totalRevenue += childStats.revenue;
              });
              widgetNode.tickets = totalTickets;
              widgetNode.revenue = totalRevenue;
            }
            
          }

          return widgetNode;
        });

        // Добавляем офлайн продажи
        if (sessionAttribution.offline.length > 0) {
          const offlineNode: TreeNode = {
            id: `offline-${sessionId}`,
            name: 'Офлайн продажи',
            level: 2,
            isExpanded: expandedNodes.has(`offline-${sessionId}`),
            hasChildren: sessionAttribution.offline.length > 0,
            icon: '',
            children: [],
            tickets: 0,
            revenue: 0,
            currency: baseCurrency
          };

          offlineNode.children = buildUTMHierarchyWithConversion(sessionAttribution.offline, 3, baseCurrency);
          widgetNodes.push(offlineNode);
        }

        // Добавляем приглашения
        if (sessionAttribution.invitations.length > 0) {
          const invitationNode: TreeNode = {
            id: `invitation-${sessionId}`,
            name: 'Приглашения',
            level: 2,
            isExpanded: expandedNodes.has(`invitation-${sessionId}`),
            hasChildren: sessionAttribution.invitations.length > 0,
            icon: '',
            children: [],
            tickets: 0,
            revenue: 0,
            currency: baseCurrency
          };

          invitationNode.children = buildUTMHierarchyWithConversion(sessionAttribution.invitations, 3, baseCurrency);
          widgetNodes.push(invitationNode);
        }

        sessionNode.children = widgetNodes;
        return sessionNode;
      });

      return eventNode;
    });

    // Агрегируем статистику
    hierarchy.forEach(eventNode => {
      aggregateStatsWithConversion(eventNode);
    });

    return hierarchy;
  };

  const buildHierarchy = (events: Event[], sessions: Session[], widgets: Widget[], attributionData: AttributionData[]): TreeNode[] => {

    // Группируем сеансы по мероприятиям
    const sessionsByEvent = sessions.reduce((acc, session) => {
      const eventId = session.eventId;
      if (!acc[eventId]) {
        acc[eventId] = [];
      }
      acc[eventId].push(session);
      return acc;
    }, {} as Record<string, Session[]>);

    // Группируем виджеты по сеансам
    const widgetsBySession = widgets.reduce((acc, widget) => {
      // sessionId может быть объектом или строкой, извлекаем ID
      const sessionId = typeof widget.sessionId === 'object' && widget.sessionId?._id 
        ? widget.sessionId._id 
        : String(widget.sessionId);
      
      
      if (!acc[sessionId]) {
        acc[sessionId] = [];
      }
      acc[sessionId].push(widget);
      return acc;
    }, {} as Record<string, Widget[]>);

    // Группируем данные атрибуции по сеансам и типам заказов
    const attributionBySession = attributionData.reduce((acc, attr) => {
      const sessionId = attr.sessionId;
      if (!acc[sessionId]) {
        acc[sessionId] = {
          widgets: {} as Record<string, AttributionData[]>,
          offline: [] as AttributionData[],
          invitations: [] as AttributionData[]
        };
      }
      
      if (attr.orderType === 'widget') {
        const widgetId = attr.widgetId;
        if (!acc[sessionId].widgets[widgetId]) {
          acc[sessionId].widgets[widgetId] = [];
        }
        acc[sessionId].widgets[widgetId].push(attr);
      } else if (attr.orderType === 'offline') {
        acc[sessionId].offline.push(attr);
      } else if (attr.orderType === 'invitation') {
        acc[sessionId].invitations.push(attr);
      }
      
      return acc;
    }, {} as Record<string, {
      widgets: Record<string, AttributionData[]>;
      offline: AttributionData[];
      invitations: AttributionData[];
    }>);


    // Создаем иерархию
    const hierarchy: TreeNode[] = [];

    // Для каждого мероприятия создаем узел
    events.forEach(event => {
      const eventSessions = sessionsByEvent[event._id] || [];
      
      const eventCurrency = (() => {
        // Ищем валюту в любых данных атрибуции для этого мероприятия
        const allAttributionData = Object.values(attributionBySession).flatMap(sessionData => [
          ...Object.values(sessionData.widgets).flat(),
          ...sessionData.offline,
          ...sessionData.invitations
        ]);
        const foundCurrency = allAttributionData.find(attr => attr.eventId === event._id)?.currency || 'RUB';
        return foundCurrency;
      })();

      const eventNode: TreeNode = {
        id: `event-${event._id}`,
        name: event.name,
        level: 0,
        isExpanded: false,
        hasChildren: eventSessions.length > 0,
        icon: '',
        children: [],
        currency: eventCurrency
      };

      // Добавляем сеансы для мероприятия
      if (eventSessions.length > 0) {
        eventSessions.forEach(session => {
        const sessionId = session._id || session.id;
        const sessionWidgets = sessionId ? (widgetsBySession[sessionId] || []) : [];
        const sessionAttribution = sessionId ? (attributionBySession[sessionId] || { widgets: {}, offline: [], invitations: [] }) : { widgets: {}, offline: [], invitations: [] };
        
        // Определяем, есть ли дочерние элементы
        const hasWidgets = sessionWidgets.length > 0;
        const hasOfflineOrders = sessionAttribution.offline.length > 0;
        const hasInvitations = sessionAttribution.invitations.length > 0;
        const hasChildren = hasWidgets || hasOfflineOrders || hasInvitations;
        
        // Получаем валюту для сеанса
        const sessionCurrency = (() => {
          const allSessionAttribution = [
            ...Object.values(sessionAttribution.widgets).flat(),
            ...sessionAttribution.offline,
            ...sessionAttribution.invitations
          ];
          const foundCurrency = allSessionAttribution[0]?.currency || 'RUB';
          return foundCurrency;
        })();

        const sessionNode: TreeNode = {
          id: `session-${sessionId}`,
          name: `${formatDate(session.date)}${session.hall ? ` • ${session.hall.city}` : ''}`,
          level: 1,
          isExpanded: false,
          hasChildren: hasChildren,
          icon: '',
          children: [],
          currency: sessionCurrency
        };

        // Добавляем виджеты для сеанса
        if (sessionWidgets.length > 0) {
          sessionWidgets.forEach((widget: Widget) => {
            // Получаем данные атрибуции для этого виджета
            const widgetAttribution = sessionAttribution.widgets[widget.widgetId] || [];
            
            const widgetNode: TreeNode = {
              id: `widget-${widget._id}`,
              name: `Виджет: ${widget.name || widget.widgetId}`,
              level: 2,
              isExpanded: false,
              hasChildren: widgetAttribution.length > 0,
              icon: '🔧',
              children: [],
              currency: widgetAttribution[0]?.currency || sessionCurrency
            };

            // Используем новую функцию для построения UTM иерархии
            const utmNodes = buildUTMHierarchy(widgetAttribution, `widget-${widget._id}`, 3);
            widgetNode.children!.push(...utmNodes);

            sessionNode.children!.push(widgetNode);
          });
        }

        // Добавляем офлайн продажи
        if (sessionAttribution.offline.length > 0) {
          const offlineNode: TreeNode = {
            id: `offline-${sessionId}`,
            name: 'Офлайн продажи',
            level: 2,
            isExpanded: false,
            hasChildren: true,
            icon: '',
            children: [],
            currency: sessionAttribution.offline[0]?.currency || sessionCurrency
          };

          // Используем новую функцию для построения UTM иерархии
          const offlineUTMNodes = buildUTMHierarchy(sessionAttribution.offline, `offline-${sessionId}`, 3);
          offlineNode.children!.push(...offlineUTMNodes);

          sessionNode.children!.push(offlineNode);
        }

        // Добавляем приглашения
        if (sessionAttribution.invitations.length > 0) {
          const invitationsNode: TreeNode = {
            id: `invitations-${sessionId}`,
            name: 'Приглашения',
            level: 2,
            isExpanded: false,
            hasChildren: false,
            icon: '',
            tickets: sessionAttribution.invitations.reduce((sum, attr) => sum + attr.totalTickets, 0),
            currency: sessionAttribution.invitations[0]?.currency || 'RUB'
          };

          sessionNode.children!.push(invitationsNode);
        }

        eventNode.children!.push(sessionNode);
        });
      } else {
        // Если сеансов нет, добавляем заглушку
        const noSessionsNode: TreeNode = {
          id: `no-sessions-${event._id}`,
          name: 'Нет сеансов',
          level: 1,
          isExpanded: false,
          hasChildren: false,
          icon: ''
        };
        eventNode.children!.push(noSessionsNode);
      }

      hierarchy.push(eventNode);
    });

    // Агрегируем статистику для всех узлов рекурсивно
    hierarchy.forEach(eventNode => {
      aggregateStats(eventNode);
    });

    return hierarchy;
  };

  // Загружаем данные при монтировании компонента
  useEffect(() => {
    loadDataWithCurrencyConversion();
  }, [baseCurrency, startDate, endDate]);


  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };


  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);

    return (
      <React.Fragment key={node.id}>
        <div 
          className={`statistics-table__row statistics-table__row--level-${node.level}`}
          style={{ paddingLeft: `${node.level * 20}px` }}
        >
          <div className="statistics-table__cell statistics-table__cell--toggle">
            {node.hasChildren && (
              <button
                onClick={() => toggleExpanded(node.id)}
                className={`statistics-table__toggle ${isExpanded ? 'expanded' : 'collapsed'}`}
              >
                {isExpanded ? '▼' : '▶'}
              </button>
            )}
                        </div>
                      
          <div className="statistics-table__cell statistics-table__cell--icon">
            {node.icon}
                      </div>
                      
          <div className="statistics-table__cell statistics-table__cell--name">
            {node.name}
                    </div>
                    
          <div className="statistics-table__cell statistics-table__cell--tickets">
            {node.tickets !== undefined ? node.tickets : '—'}
                    </div>
          <div className="statistics-table__cell statistics-table__cell--revenue">
            {node.revenue !== undefined ? (() => {
              const currency = node.currency || baseCurrency;
              const symbol = getCurrencySymbol(currency);
              const amount = node.revenue.toLocaleString();
              
              return `${amount} ${symbol}`;
            })() : '—'}
                              </div>
                                </div>
        
        {node.hasChildren && isExpanded && node.children && (
          <>{node.children.map(child => renderTreeNode(child))}</>
        )}
      </React.Fragment>
    );
  };

  return (
    <Layout currentPage="statistics">
      <div className="statistics-page">
        <div className="statistics-page__header">
          <h1>Статистика</h1>
          <div className="statistics-page__controls">
            <div className="currency-selector">
              <label>
                Базовая валюта:
                <select 
                  value={baseCurrency} 
                  onChange={(e) => setBaseCurrency(e.target.value)}
                  className="currency-select"
                >
                  {availableCurrencies.map(currency => (
                    <option key={currency} value={currency}>
                      {currency} ({getCurrencySymbol(currency)})
                    </option>
                  ))}
                </select>
              </label>
              <span className="currency-info">
                Все суммы конвертированы в {baseCurrency} ({getCurrencySymbol(baseCurrency)})
              </span>
                      </div>
                    </div>
                </div>

        {/* Фильтр по датам */}
        <div className="statistics-page__filters">
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
                onClick={() => setDateRange(7)}
                title="Последние 7 дней"
              >
                Неделя
              </button>
              <button 
                className="quick-btn" 
                onClick={() => setDateRange(30)}
                title="Последние 30 дней"
              >
                Месяц
              </button>
              <button 
                className="quick-btn reset-btn" 
                onClick={resetDateFilters}
                title="Сбросить фильтры"
              >
                Сбросить
              </button>
                      </div>
                      
            <div className="date-filter__inputs">
              <div className="date-input-group">
                <label htmlFor="startDate">От:</label>
                <input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="date-input"
                  placeholder="Выберите дату начала"
                />
                    </div>
                    
              <div className="date-input-group">
                <label htmlFor="endDate">До:</label>
                <input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="date-input"
                  placeholder="Выберите дату окончания"
                />
                    </div>
                  </div>
                  
            {(startDate || endDate) && (
              <div className="date-filter__info">
                <span className="filter-info">
                  Показаны данные
                  {startDate && ` с ${new Date(startDate).toLocaleDateString('ru-RU')}`}
                  {endDate && ` по ${new Date(endDate).toLocaleDateString('ru-RU')}`}
                </span>
                            </div>
                          )}
                            </div>
                            </div>
                      
        <div className="statistics-page__content">
          <div className="statistics-table">
            <div className="statistics-table__header">
              <div className="statistics-table__row">
                <div className="statistics-table__cell statistics-table__cell--toggle"></div>
                <div className="statistics-table__cell statistics-table__cell--icon"></div>
                <div className="statistics-table__cell statistics-table__cell--name">
                  Итого/среднее
                            </div>
                <div className="statistics-table__cell statistics-table__cell--tickets">
                  Билеты
                            </div>
                <div className="statistics-table__cell statistics-table__cell--revenue">
                  Сумма (в {baseCurrency} {getCurrencySymbol(baseCurrency)})
                        </div>
                          </div>
                          </div>
            
            <div className="statistics-table__body">
              {loading ? (
                <div className="statistics-table__loading">
                  <div className="spinner"></div>
                  <span>Загрузка данных...</span>
                          </div>
              ) : error ? (
                <div className="statistics-table__error">
                  <p>{error}</p>
                  <button onClick={loadAllData}>Попробовать снова</button>
                        </div>
              ) : hierarchyData.length === 0 ? (
                <div className="statistics-table__empty">
                  <p>Данные не найдены</p>
                  <p>Создайте мероприятия, сеансы и виджеты для отображения статистики</p>
                      </div>
              ) : (
                hierarchyData.map(node => renderTreeNode(node))
                  )}
                </div>
                </div>
            </div>
      </div>
    </Layout>
  );
};

export default StatisticsPage;
