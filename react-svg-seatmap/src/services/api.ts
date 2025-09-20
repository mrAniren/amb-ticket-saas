import { 
  AuthResponse, 
  Hall, 
  HallsResponse, 
  HallResponse,
  FileUploadResponse,
  ApiResponse 
} from '../types/api.types';
import { Seat, Zone } from '../types/Seat.types';
import { 
  PriceScheme, 
  PriceSchemeCreateData, 
  Price 
} from '../types/PriceScheme.types';
import { Event, SessionWithDetails } from '../types/Event.types';
import { 
  PromoCode, 
  PromoCodeCreateRequest, 
  PromoCodeUpdateRequest,
  PromoCodesResponse,
  PromoCodeResponse,
  PromoCodeDeleteResponse,
  PromoCodeValidationResponse
} from '../types/PromoCode.types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const SERVER_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3001';

class ApiClient {
  private token: string | null = localStorage.getItem('auth_token');

  // Метод для получения полного URL для ресурсов (SVG, изображения и т.д.)
  getResourceUrl(path: string): string {
    if (path.startsWith('http')) {
      return path; // Уже абсолютный URL
    }
    return `${SERVER_BASE}${path}`;
  }

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
        ...options.headers,
      },
      ...options,
    };

    // Убираем Content-Type для FormData
    if (options.body instanceof FormData) {
      delete (config.headers as any)['Content-Type'];
    }

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }

    return response.json();
  }

  // Методы аутентификации
  async login(username: string, password: string): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    
    this.token = result.token;
    localStorage.setItem('auth_token', result.token);
    
    return result;
  }

  async verify(): Promise<{ user: any }> {
    return this.request('/auth/verify', { method: 'POST' });
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  // Методы для работы с залами
  async getHalls(): Promise<HallsResponse> {
    return this.request('/halls');
  }

  async getHall(id: string): Promise<HallResponse> {
    return this.request(`/halls/${id}`);
  }

  async createHall(data: FormData): Promise<HallResponse> {
    return this.request('/halls', {
      method: 'POST',
      body: data,
    });
  }

  async updateHall(id: string, data: FormData): Promise<HallResponse> {
    return this.request(`/halls/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async updateHallConfig(id: string, config: { seat_config?: string; zone_config?: string; capacity?: number; currency?: string }): Promise<HallResponse> {
    return this.request(`/halls/${id}/config`, {
      method: 'PUT',
      body: JSON.stringify(config),
    });
  }

  async deleteHall(id: string): Promise<{ message: string }> {
    return this.request(`/halls/${id}`, { method: 'DELETE' });
  }

  // Методы для работы с местами
  async getSeats(hallId: number): Promise<{ seats: Seat[] }> {
    return this.request(`/halls/${hallId}/seats`);
  }

  async saveSeats(hallId: number, seats: Seat[]): Promise<{ message: string; seats: Seat[] }> {
    return this.request(`/halls/${hallId}/seats/bulk`, {
      method: 'POST',
      body: JSON.stringify({ seats }),
    });
  }

  // Методы для работы с зонами
  async getZones(hallId: number): Promise<{ zones: Zone[] }> {
    return this.request(`/halls/${hallId}/zones`);
  }

  async createZone(hallId: number, zone: Omit<Zone, 'id'>): Promise<{ zone: Zone }> {
    return this.request(`/halls/${hallId}/zones`, {
      method: 'POST',
      body: JSON.stringify(zone),
    });
  }

  async updateZone(hallId: number, zoneId: string, zone: Partial<Zone>): Promise<{ zone: Zone }> {
    return this.request(`/halls/${hallId}/zones/${zoneId}`, {
      method: 'PUT',
      body: JSON.stringify(zone),
    });
  }

  async deleteZone(hallId: number, zoneId: string): Promise<{ message: string }> {
    return this.request(`/halls/${hallId}/zones/${zoneId}`, { method: 'DELETE' });
  }

  // Методы для работы с файлами
  async uploadFile(file: File, type: 'svg' | 'photo'): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return this.request('/files/upload', {
      method: 'POST',
      body: formData,
    });
  }

  async updateHallSvg(hallId: string, svgFile: File): Promise<{ message: string; svg_file: any }> {
    const formData = new FormData();
    formData.append('svg', svgFile);

    return this.request(`/halls/${hallId}/svg`, {
      method: 'PUT',
      body: formData,
    });
  }

  // Методы для работы с распаесовками
  async getPriceSchemes(): Promise<{ priceSchemes: PriceScheme[]; total: number }> {
    return this.request('/price-schemes');
  }

  async getPriceScheme(id: string): Promise<{ priceScheme: PriceScheme }> {
    return this.request(`/price-schemes/${id}`);
  }

  async createPriceScheme(data: PriceSchemeCreateData): Promise<{ priceScheme: PriceScheme }> {
    return this.request('/price-schemes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePriceScheme(id: string, data: { 
    name?: string; 
    prices?: Price[]; 
    seatPrices?: { seatId: string; priceId: string }[] 
  }): Promise<{ priceScheme: PriceScheme }> {
    return this.request(`/price-schemes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePriceScheme(id: string): Promise<{ message: string }> {
    return this.request(`/price-schemes/${id}`, { method: 'DELETE' });
  }

  // Методы для работы с ценами в распаесовке
  async addPrice(priceSchemeId: string, price: Omit<Price, 'id'>): Promise<{ price: Price; priceScheme: PriceScheme }> {
    return this.request(`/price-schemes/${priceSchemeId}/prices`, {
      method: 'POST',
      body: JSON.stringify(price),
    });
  }

  async updatePrice(priceSchemeId: string, priceId: string, price: Partial<Price>): Promise<{ price: Price; priceScheme: PriceScheme }> {
    return this.request(`/price-schemes/${priceSchemeId}/prices/${priceId}`, {
      method: 'PUT',
      body: JSON.stringify(price),
    });
  }

  async deletePrice(priceSchemeId: string, priceId: string): Promise<{ message: string; priceScheme: PriceScheme }> {
    return this.request(`/price-schemes/${priceSchemeId}/prices/${priceId}`, { method: 'DELETE' });
  }

  async applyPriceToSeats(priceSchemeId: string, seatIds: string[], priceId: string): Promise<{ message: string; priceScheme: PriceScheme }> {
    return this.request(`/price-schemes/${priceSchemeId}/apply-price`, {
      method: 'POST',
      body: JSON.stringify({ seatIds, priceId }),
    });
  }

  // Методы для работы с мероприятиями
  async getEvents(activeOnly: boolean = true): Promise<{ events: Event[] }> {
    const params = new URLSearchParams();
    if (!activeOnly) {
      params.append('active', 'false');
    }
    const queryString = params.toString();
    const url = queryString ? `/events?${queryString}` : '/events';
    console.log('🌐 apiClient: Запрос мероприятий, activeOnly:', activeOnly, 'URL:', url);
    return this.request(url);
  }

  async getEvent(id: string): Promise<{ event: Event }> {
    return this.request(`/events/${id}`);
  }

  async createEvent(eventData: { name: string; description: string; image: string }): Promise<{ event: Event }> {
    return this.request('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
  }

  async updateEvent(id: string, eventData: { name?: string; description?: string; image?: string }): Promise<{ event: Event }> {
    return this.request(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
  }

  async archiveEvent(id: string): Promise<{ message: string; event: Event }> {
    return this.request(`/events/${id}/archive`, { method: 'PATCH' });
  }

  async restoreEvent(id: string): Promise<{ message: string; event: Event }> {
    return this.request(`/events/${id}/restore`, { method: 'PATCH' });
  }

  async deleteEvent(id: string): Promise<{ message: string; event: Event }> {
    return this.request(`/events/${id}`, { method: 'DELETE' });
  }

  // Методы для работы с сеансами
  async getSessions(): Promise<{ sessions: SessionWithDetails[] }> {
    return this.request('/sessions');
  }

  async getEventSessions(eventId: string): Promise<{ sessions: SessionWithDetails[] }> {
    return this.request(`/sessions/event/${eventId}`);
  }

  async getActiveEventSessions(eventId: string): Promise<{ sessions: SessionWithDetails[] }> {
    return this.request(`/sessions/event/${eventId}/active`);
  }

  async getPastEventSessions(eventId: string): Promise<{ sessions: SessionWithDetails[] }> {
    return this.request(`/sessions/event/${eventId}/past`);
  }

  async getArchivedEventSessions(eventId: string): Promise<{ sessions: SessionWithDetails[] }> {
    return this.request(`/sessions/event/${eventId}/archived`);
  }


  async createSession(sessionData: { 
    eventId: string; 
    date: string; 
    time: string; 
    hallId: string; 
    priceSchemeId: string 
  }): Promise<{ session: SessionWithDetails }> {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    });
  }

  async updateSession(id: string, sessionData: { 
    eventId?: string; 
    date?: string; 
    time?: string; 
    hallId?: string; 
    priceSchemeId?: string 
  }): Promise<{ session: SessionWithDetails }> {
    return this.request(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
  }

  async deleteSession(id: string): Promise<{ message: string; session: SessionWithDetails }> {
    return this.request(`/sessions/${id}`, { method: 'DELETE' });
  }

  async archiveSession(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${id}/archive`, { method: 'PATCH' });
  }

  async unarchiveSession(id: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/sessions/${id}/unarchive`, { method: 'PATCH' });
  }

  // Методы для работы с промокодами
  async getPromoCodes(): Promise<PromoCodesResponse> {
    return this.request('/promo-codes');
  }

  async getPromoCode(id: string): Promise<PromoCodeResponse> {
    return this.request(`/promo-codes/${id}`);
  }

  async createPromoCode(data: PromoCodeCreateRequest): Promise<PromoCodeResponse> {
    return this.request('/promo-codes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePromoCode(id: string, data: PromoCodeUpdateRequest): Promise<PromoCodeResponse> {
    return this.request(`/promo-codes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePromoCode(id: string): Promise<PromoCodeDeleteResponse> {
    return this.request(`/promo-codes/${id}`, { method: 'DELETE' });
  }

  async validatePromoCode(code: string): Promise<PromoCodeValidationResponse> {
    return this.request(`/promo-codes/validate/${code}`, { method: 'POST' });
  }

  async validatePromoCodeWithAmount(code: string, orderAmount: number): Promise<PromoCodeValidationResponse> {
    return this.request('/promo-codes/validate', {
      method: 'POST',
      body: JSON.stringify({ code, orderAmount }),
    });
  }

  // Дополнительные методы
  async getHallPriceSchemes(hallId: string): Promise<{ priceSchemes: PriceScheme[] }> {
    return this.request(`/price-schemes/hall/${hallId}`);
  }

  // Методы для работы с билетами
  async getSessionTickets(sessionId: string): Promise<{ tickets: any[] }> {
    return this.request(`/tickets/session/${sessionId}`);
  }

  async reserveSeats(sessionId: string, seatIds: string[]): Promise<{ tickets: any[], reservedUntil: string }> {
    return this.request('/tickets/reserve', {
      method: 'POST',
      body: JSON.stringify({ sessionId, seatIds }),
    });
  }

  async cancelReservation(ticketId: string): Promise<{ success: boolean }> {
    return this.request(`/tickets/reserve/${ticketId}`, { method: 'DELETE' });
  }

  async updateTicketStatus(ticketId: string, status: string, orderId?: string): Promise<{ ticket: any }> {
    return this.request(`/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, orderId }),
    });
  }

  // Методы для работы с заказами
  async createOrder(orderData: {
    sessionId: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string;
    selectedSeatIds: string[]; // Изменено: теперь массив ID мест вместо ticketIds
    specialZoneData?: { [key: string]: number }; // Дополнительные данные для специальных зон
    promoCode?: string;
    attribution?: any; // UTM-метки для атрибуции
    widgetId?: string; // ID виджета
    isInvitation?: boolean; // Флаг для приглашений
    notes?: string; // Примечания для приглашений
  }): Promise<{ success: boolean; order: any; message?: string }> {
    return this.request('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }

  async getOrder(orderId: string): Promise<{ order: any }> {
    return this.request(`/orders/${orderId}`);
  }

  async updateOrder(orderId: string, updateData: any): Promise<{ success: boolean; order: any; message?: string }> {
    return this.request(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async updateOrderStatus(orderId: string, status: string): Promise<{ success: boolean }> {
    return this.request(`/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async payOrder(orderId: string, paymentMethod: string = 'cash'): Promise<{ order: any }> {
    return this.request(`/orders/${orderId}/pay`, {
      method: 'POST',
      body: JSON.stringify({ paymentMethod }),
    });
  }

  // Получение данных сеанса для продажи билетов
  async getSession(sessionId: string): Promise<{ success: boolean; session?: SessionWithDetails; message?: string }> {
    return this.request(`/sessions/${sessionId}`, { method: 'GET' });
  }

  // === API для работы с билетами ===

  // Генерация билетов для заказа
  async generateTickets(orderId: string): Promise<{ success: boolean; message: string; data?: any }> {
    return this.request('/tickets/generate', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }


  // Получение информации о билете
  async getTicket(ticketId: string): Promise<{ success: boolean; data?: { ticket: any } }> {
    return this.request(`/tickets/${ticketId}`, { method: 'GET' });
  }

  // Скачивание PDF билета
  async downloadTicket(ticketId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/tickets/${ticketId}/download`, {
      method: 'GET',
      headers: {
        'Authorization': this.token ? `Bearer ${this.token}` : '',
      },
    });

    if (!response.ok) {
      throw new Error(`Ошибка скачивания билета: ${response.statusText}`);
    }

    // Проверяем, что это действительно PDF файл
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/pdf')) {
      // Если это не PDF, читаем как текст для отладки
      const text = await response.text();
      console.error('Ожидался PDF, но получен:', contentType, text);
      throw new Error(`Сервер вернул не PDF файл. Content-Type: ${contentType}`);
    }

    return response.blob();
  }

  // Перегенерация PDF билета
  async regenerateTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/tickets/${ticketId}/regenerate`, {
      method: 'POST',
    });
  }

  // Удаление билета
  async deleteTicket(ticketId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/tickets/${ticketId}`, {
      method: 'DELETE',
    });
  }

  // Получение статистики билетов
  async getTicketStats(): Promise<{ success: boolean; data?: any }> {
    return this.request('/tickets/stats/overview', { method: 'GET' });
  }

  // Получение билетов заказа
  async getOrderTickets(orderId: string): Promise<{
    success: boolean;
    data?: {
      order: {
        _id: string;
        orderNumber: string;
        customerName: string;
        customerEmail: string;
        customerPhone: string;
        total: number;
        paidAt: string;
        sessionInfo: {
          id: string;
          date: string;
          time: string;
          eventTitle?: string;
          hallName?: string;
        };
      };
      tickets: Array<{
        _id: string;
        ticketId: string;
        seatRow: number;
        seatNumber: number;
        seatSection: string;
        price: number;
        currency: string;
        pdfGenerated: boolean;
      }>;
    };
  }> {
    return this.request(`/customers/${orderId}/tickets`, { method: 'GET' });
  }

  // Получить билеты заказа с информацией о PDF
  async getTicketsByOrderId(orderId: string): Promise<{ success: boolean; data: { tickets: any[] } }> {
    return this.request(`/tickets/order/${orderId}`);
  }

  // Универсальный GET метод
  async get(endpoint: string): Promise<any> {
    return this.request(endpoint, { method: 'GET' });
  }

  // Методы для работы с виджетами
  async getWidgets(): Promise<{ success: boolean; data: { widgets: any[] } }> {
    return this.request('/widgets');
  }

  async createWidget(data: { name: string; sessionId: string; displayMode: string }): Promise<{ success: boolean; data: { widget: any } }> {
    return this.request('/widgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteWidget(widgetId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/widgets/${widgetId}`, { method: 'DELETE' });
  }

  async getEvents(): Promise<{ success: boolean; events: any[] }> {
    return this.request('/events');
  }


  // Проверка авторизации
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiClient = new ApiClient();

// Утилита для получения ID (совместимость с MongoDB _id и обычным id)
export const getId = (item: any): string => {
  return item.id || item._id || '';
};