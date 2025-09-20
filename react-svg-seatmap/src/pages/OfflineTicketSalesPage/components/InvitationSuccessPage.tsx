import React from 'react';
import './InvitationSuccessPage.scss';

interface InvitationSuccessPageProps {
  orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    ticketsCount: number;
    pdfPaths: string[]; // Массив ticketId для скачивания
  };
  onClose: () => void;
}

const InvitationSuccessPage: React.FC<InvitationSuccessPageProps> = ({
  orderData,
  onClose
}) => {
  const handleDownloadAll = () => {
    // Скачиваем все PDF файлы
    orderData.pdfPaths.forEach((ticketId, index) => {
      const link = document.createElement('a');
      link.href = `/api/tickets/${ticketId}/download`;
      link.download = `Приглашение_${orderData.orderNumber}_${index + 1}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleDownloadSingle = (ticketId: string, index: number) => {
    const link = document.createElement('a');
    link.href = `/api/tickets/${ticketId}/download`;
    link.download = `Приглашение_${orderData.orderNumber}_${index + 1}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="invitation-success-overlay">
      <div className="invitation-success-page">
        <div className="invitation-success-page__header">
          <div className="success-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="#2ECC71"/>
              <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1>🎫 Приглашения успешно созданы!</h1>
          <p className="success-message">
            Приглашения для <strong>{orderData.customerName}</strong> готовы к скачиванию
          </p>
        </div>

        <div className="invitation-success-page__content">
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
                <span className="label">Количество приглашений:</span>
                <span className="value">{orderData.ticketsCount}</span>
              </div>
              <div className="info-item">
                <span className="label">Сумма:</span>
                <span className="value">{orderData.totalAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
            </div>
          </div>

          {/* Список приглашений */}
          <div className="invitations-list">
            <h3>Созданные приглашения</h3>
            <div className="invitations-grid">
              {orderData.pdfPaths.length > 0 ? (
                orderData.pdfPaths.map((ticketId, index) => (
                  <div key={index} className="invitation-item">
                    <div className="invitation-icon">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#E67E22" strokeWidth="2"/>
                        <polyline points="14,2 14,8 20,8" stroke="#E67E22" strokeWidth="2"/>
                        <line x1="16" y1="13" x2="8" y2="13" stroke="#E67E22" strokeWidth="2"/>
                        <line x1="16" y1="17" x2="8" y2="17" stroke="#E67E22" strokeWidth="2"/>
                        <polyline points="10,9 9,9 8,9" stroke="#E67E22" strokeWidth="2"/>
                      </svg>
                    </div>
                    <div className="invitation-details">
                      <div className="invitation-name">Приглашение #{index + 1}</div>
                      <div className="invitation-status">Готово к скачиванию</div>
                    </div>
                    <button
                      className="download-btn"
                      onClick={() => handleDownloadSingle(ticketId, index)}
                      title="Скачать приглашение"
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
                <div className="no-invitations">
                  <div className="no-invitations-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#6C757D" strokeWidth="2"/>
                      <line x1="12" y1="8" x2="12" y2="12" stroke="#6C757D" strokeWidth="2"/>
                      <line x1="12" y1="16" x2="12.01" y2="16" stroke="#6C757D" strokeWidth="2"/>
                    </svg>
                  </div>
                  <div className="no-invitations-text">
                    <h4>PDF файлы еще генерируются</h4>
                    <p>Приглашения созданы, но PDF файлы еще не готовы. Попробуйте обновить страницу через несколько секунд.</p>
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
              {orderData.pdfPaths.length > 0 ? 'Скачать все приглашения' : 'PDF еще генерируются'}
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

export default InvitationSuccessPage;
