import React from 'react';
import './OfflineSalesSuccessPage.scss';

interface OfflineSalesSuccessPageProps {
  orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    totalAmount: number;
    ticketsCount: number;
    paymentMethod: 'cash' | 'card' | 'transfer';
    paymentStatus: 'paid' | 'pending';
    pdfPaths: string[]; // Массив ticketId для скачивания
  };
  onClose: () => void;
}

const OfflineSalesSuccessPage: React.FC<OfflineSalesSuccessPageProps> = ({
  orderData,
  onClose
}) => {
  const handleDownloadAll = () => {
    // Скачиваем все PDF файлы
    orderData.pdfPaths.forEach((ticketId, index) => {
      const link = document.createElement('a');
      link.href = `/api/tickets/${ticketId}/download`;
      link.download = `Билет_${orderData.orderNumber}_${index + 1}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleDownloadSingle = (ticketId: string, index: number) => {
    const link = document.createElement('a');
    link.href = `/api/tickets/${ticketId}/download`;
    link.download = `Билет_${orderData.orderNumber}_${index + 1}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Наличные';
      case 'card': return 'Банковская карта';
      case 'transfer': return 'Банковский перевод';
      default: return method;
    }
  };

  const getPaymentStatusText = (status: string) => {
    return status === 'paid' ? 'Оплачено' : 'Ожидает оплаты';
  };

  const getPaymentStatusIcon = (status: string) => {
    return status === 'paid' ? '✅' : '⏳';
  };

  return (
    <div className="offline-sales-success-overlay">
      <div className="offline-sales-success-page">
        <div className="offline-sales-success-page__header">
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#2ECC71"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1>🎫 Заказ успешно оформлен!</h1>
          <p className="success-message">
            Билеты для <strong>{orderData.customerName}</strong> готовы к скачиванию
          </p>
        </div>

        <div className="offline-sales-success-page__content">
          {/* Информация о заказе */}
          <div className="order-info">
            <h3>Информация о заказе</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="label">Номер заказа:</span>
                <span className="value">{orderData.orderNumber}</span>
              </div>
              <div className="info-item">
                <span className="label">Клиент:</span>
                <span className="value">{orderData.customerName}</span>
              </div>
              <div className="info-item">
                <span className="label">Email:</span>
                <span className="value">{orderData.customerEmail}</span>
              </div>
              <div className="info-item">
                <span className="label">Телефон:</span>
                <span className="value">{orderData.customerPhone}</span>
              </div>
              <div className="info-item">
                <span className="label">Сумма:</span>
                <span className="value">{orderData.totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="info-item">
                <span className="label">Способ оплаты:</span>
                <span className="value">{getPaymentMethodText(orderData.paymentMethod)}</span>
              </div>
              <div className="info-item">
                <span className="label">Статус оплаты:</span>
                <span className="value">
                  {getPaymentStatusIcon(orderData.paymentStatus)} {getPaymentStatusText(orderData.paymentStatus)}
                </span>
              </div>
            </div>
          </div>

          {/* Список билетов */}
          <div className="tickets-list">
            <h3>Созданные билеты</h3>
            <div className="tickets-grid">
              {orderData.pdfPaths.length > 0 ? (
                orderData.pdfPaths.map((ticketId, index) => (
                  <div key={index} className="ticket-item">
                    <div className="ticket-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2Z" stroke="#3498DB" strokeWidth="2"/>
                        <path d="M9 12l2 2 4-4" stroke="#3498DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    <div className="ticket-details">
                      <div className="ticket-name">Билет #{index + 1}</div>
                      <div className="ticket-status">Готов к скачиванию</div>
                    </div>
                    <button
                      className="download-btn"
                      onClick={() => handleDownloadSingle(ticketId, index)}
                      title="Скачать билет"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
                        <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
                        <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
                      </svg>
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-tickets">
                  <div className="no-tickets-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#6C757D" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="12" stroke="#6C757D" strokeWidth="2"/>
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="#6C757D" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="no-tickets-text">
                    <h4>PDF файлы еще генерируются</h4>
                    <p>Билеты созданы, но PDF файлы еще не готовы. Попробуйте обновить страницу через несколько секунд.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Действия */}
          <div className="actions">
            <button
              className="btn-download-all"
              onClick={handleDownloadAll}
              disabled={orderData.pdfPaths.length === 0}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke="currentColor" strokeWidth="2"/>
                <polyline points="7,10 12,15 17,10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="15" x2="12" y2="3" stroke="currentColor" strokeWidth="2"/>
              </svg>
              {orderData.pdfPaths.length > 0 ? 'Скачать все билеты' : 'PDF еще генерируются'}
            </button>
            
            <button
              className="btn-close"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfflineSalesSuccessPage;
