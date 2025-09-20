import React, { useState, useEffect } from 'react';
import { apiClient } from '../../services/api';
import { saveAs } from 'file-saver';
import './TicketDownload.scss';

interface Ticket {
  id: string;
  ticketId: string;
  seatSection: string;
  seatRow: number;
  seatNumber: number;
  price: number;
  currency: string;
  eventName: string;
  eventDate: string;
  eventTime: string;
  hallName: string;
  buyerName: string;
  pdfGenerated: boolean;
  status: string;
  createdAt: string;
}

interface TicketDownloadProps {
  orderId: string;
  onError?: (error: string) => void;
}

const TicketDownload: React.FC<TicketDownloadProps> = ({ orderId, onError }) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Загружаем билеты заказа
  useEffect(() => {
    if (orderId) {
      loadTickets();
    }
  }, [orderId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getOrderTickets(orderId);
      
      if (response.success && response.data?.tickets) {
        setTickets(response.data.tickets);
      } else {
        setError('Билеты не найдены');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка загрузки билетов';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Генерируем билеты если их нет
  const generateTickets = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const response = await apiClient.generateTickets(orderId);
      
      if (response.success) {
        // Перезагружаем билеты
        await loadTickets();
      } else {
        setError(response.message || 'Ошибка генерации билетов');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка генерации билетов';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  // Скачиваем билет
  const downloadTicket = async (ticketId: string, ticketNumber: number) => {
    try {
      setDownloading(ticketId);
      
      const blob = await apiClient.downloadTicket(ticketId);
      const filename = `ticket_${ticketNumber}.pdf`;
      
      saveAs(blob, filename);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ошибка скачивания билета';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setDownloading(null);
    }
  };

  // Скачиваем все билеты
  const downloadAllTickets = async () => {
    const generatedTickets = tickets.filter(ticket => ticket.pdfGenerated);
    
    for (const ticket of generatedTickets) {
      try {
        setDownloading(ticket.ticketId);
        
        const blob = await apiClient.downloadTicket(ticket.ticketId);
        const filename = `ticket_${ticket.seatRow}_${ticket.seatNumber}.pdf`;
        
        saveAs(blob, filename);
        
        // Небольшая задержка между скачиваниями
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.error(`Ошибка скачивания билета ${ticket.ticketId}:`, err);
      } finally {
        setDownloading(null);
      }
    }
  };

  // Форматируем дату
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматируем дату мероприятия
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  if (!orderId) {
    return (
      <div className="ticket-download">
        <div className="ticket-download__error">
          <div className="error-icon">⚠️</div>
          <p>Ошибка: ID заказа не найден</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="ticket-download">
        <div className="ticket-download__loading">
          <div className="spinner"></div>
          <p>Загрузка билетов...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ticket-download">
        <div className="ticket-download__error">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
          <button 
            className="btn btn--primary" 
            onClick={loadTickets}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="ticket-download">
        <div className="ticket-download__empty">
          <div className="empty-icon">🎫</div>
          <h3>Билеты не найдены</h3>
          <p>Билеты для этого заказа еще не сгенерированы</p>
          <button 
            className="btn btn--primary" 
            onClick={generateTickets}
            disabled={generating}
          >
            {generating ? 'Генерация...' : 'Сгенерировать билеты'}
          </button>
        </div>
      </div>
    );
  }

  const generatedTickets = tickets.filter(ticket => ticket.pdfGenerated);
  const pendingTickets = tickets.filter(ticket => !ticket.pdfGenerated);

  return (
    <div className="ticket-download">
      <div className="ticket-download__header">
        <h2>Ваши билеты</h2>
        <p className="ticket-count">
          Всего билетов: {tickets.length}
          {generatedTickets.length > 0 && (
            <span className="generated-count">
              (готово к скачиванию: {generatedTickets.length})
            </span>
          )}
        </p>
      </div>

      {generatedTickets.length > 0 && (
        <div className="ticket-download__actions">
          <button 
            className="btn btn--primary btn--large"
            onClick={downloadAllTickets}
            disabled={downloading !== null}
          >
            📥 Скачать все билеты
          </button>
        </div>
      )}

      <div className="ticket-download__list">
        {tickets.map((ticket, index) => (
          <div key={ticket.id} className="ticket-item">
            <div className="ticket-item__info">
              <div className="ticket-item__header">
                <h3>Билет #{index + 1}</h3>
                <span className={`ticket-status ticket-status--${ticket.status}`}>
                  {ticket.status === 'active' ? 'Активен' : ticket.status}
                </span>
              </div>
              
              <div className="ticket-item__details">
                <div className="detail-row">
                  <span className="detail-label">Мероприятие:</span>
                  <span className="detail-value">{ticket.eventName}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Дата:</span>
                  <span className="detail-value">{formatEventDate(ticket.eventDate)} в {ticket.eventTime}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Зал:</span>
                  <span className="detail-value">{ticket.hallName}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Место:</span>
                  <span className="detail-value">
                    {ticket.seatSection}, ряд {ticket.seatRow}, место {ticket.seatNumber}
                  </span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Цена:</span>
                  <span className="detail-value">{ticket.price} {ticket.currency}</span>
                </div>
                
                <div className="detail-row">
                  <span className="detail-label">Покупатель:</span>
                  <span className="detail-value">{ticket.buyerName}</span>
                </div>
              </div>
            </div>
            
            <div className="ticket-item__actions">
              {ticket.pdfGenerated ? (
                <button 
                  className="btn btn--primary"
                  onClick={() => downloadTicket(ticket.ticketId, index + 1)}
                  disabled={downloading === ticket.ticketId}
                >
                  {downloading === ticket.ticketId ? (
                    <>
                      <div className="spinner spinner--small"></div>
                      Скачивание...
                    </>
                  ) : (
                    <>
                      📄 Скачать PDF
                    </>
                  )}
                </button>
              ) : (
                <div className="ticket-item__pending">
                  <span className="pending-text">PDF генерируется...</span>
                  <button 
                    className="btn btn--secondary btn--small"
                    onClick={loadTickets}
                  >
                    Обновить
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {pendingTickets.length > 0 && (
        <div className="ticket-download__pending">
          <p>
            {pendingTickets.length} билет(ов) еще генерируются. 
            Обновите страницу через несколько минут.
          </p>
          <button 
            className="btn btn--secondary"
            onClick={loadTickets}
          >
            Обновить статус
          </button>
        </div>
      )}
    </div>
  );
};

export default TicketDownload;
