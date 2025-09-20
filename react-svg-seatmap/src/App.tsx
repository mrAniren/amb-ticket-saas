import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { LoginPage } from './pages/LoginPage/LoginPage';
import { HallListPage } from './pages/HallListPage/HallListPage';
import { HallCreatePage } from './pages/HallCreatePage/HallCreatePage';
import { HallEditPage } from './pages/HallEditPage/HallEditPage';
import { HallEditFormPage } from './pages/HallEditFormPage/HallEditFormPage';
import { PriceSchemeListPage } from './pages/PriceSchemeListPage/PriceSchemeListPage';
import { PriceSchemeCreatePage } from './pages/PriceSchemeCreatePage/PriceSchemeCreatePage';
import { PriceSchemeEditPage } from './pages/PriceSchemeEditPage/PriceSchemeEditPage';
import { EventListPage } from './pages/EventListPage/EventListPage';
import { EventCreatePage } from './pages/EventCreatePage/EventCreatePage';
import { EventEditPage } from './pages/EventEditPage/EventEditPage';
import { EventDetailPage } from './pages/EventDetailPage/EventDetailPage';
import { SessionCreatePage } from './pages/SessionCreatePage/SessionCreatePage';
import { PromoCodesPage } from './pages/PromoCodesPage/PromoCodesPage';
import EmbedTicketSalesPage from './pages/EmbedTicketSalesPage';
import { OfflineTicketSalesPage } from './pages/OfflineTicketSalesPage';
import { CustomersPage } from './pages/CustomersPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { WidgetsPage } from './pages/WidgetsPage';
import MarketingPage from './pages/MarketingPage/MarketingPage';
import './App.scss';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner"></div>
        <p>Загрузка...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <Routes>
      {/* Главная страница - перенаправляем на события */}
      <Route path="/" element={<Navigate to="/events" replace />} />
      
      {/* Мероприятия */}
      <Route path="/events" element={<EventListPage />} />
      <Route path="/events/create" element={<EventCreatePage />} />
      <Route path="/events/:eventId/edit" element={<EventEditPage />} />
      <Route path="/events/:eventId" element={<EventDetailPage />} />
      
      {/* Сеансы */}
      <Route path="/sessions/create" element={<SessionCreatePage />} />
      <Route path="/sessions/:sessionId/sales" element={<EmbedTicketSalesPage />} />
      <Route path="/sessions/:sessionId/offline-sales" element={<OfflineTicketSalesPage />} />
      
      {/* Распоясовки */}
      <Route path="/price-schemes" element={<PriceSchemeListPage />} />
      <Route path="/price-schemes/create" element={<PriceSchemeCreatePage />} />
      <Route path="/price-schemes/:priceSchemeId/edit" element={<PriceSchemeEditPage />} />
      
      {/* Залы */}
      <Route path="/halls" element={<HallListPage />} />
      <Route path="/halls/create" element={<HallCreatePage />} />
      <Route path="/halls/:hallId/edit" element={<HallEditPage />} />
      <Route path="/halls/:hallId/details" element={<HallEditFormPage />} />
      <Route path="/halls/:hallId/schema" element={<HallEditPage />} />
      
      {/* Промокоды */}
      <Route path="/promo-codes" element={<PromoCodesPage />} />
      
      {/* Клиенты */}
      <Route path="/customers" element={<CustomersPage />} />
      
      {/* Статистика */}
      <Route path="/statistics" element={<StatisticsPage />} />
      
      {/* Виджеты */}
      <Route path="/widgets" element={<WidgetsPage />} />
      
      {/* Реклама */}
      <Route path="/marketing" element={<MarketingPage />} />
      
      
      {/* 404 - перенаправляем на события */}
      <Route path="*" element={<Navigate to="/events" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Встраиваемая страница продажи билетов - без авторизации */}
        <Route path="/embed/tickets/:sessionId" element={<EmbedTicketSalesPage />} />
        
        {/* Основное приложение с авторизацией */}
        <Route path="/*" element={
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        } />
      </Routes>
    </Router>
  );
};

export default App;