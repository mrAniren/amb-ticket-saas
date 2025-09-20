import React from 'react';
import './Sidebar.scss';
import { useAuth } from '../../hooks/useAuth';

interface SidebarProps {
  currentPage: 'halls' | 'price-schemes' | 'events' | 'promo-codes' | 'ticket-sales' | 'customers' | 'statistics' | 'widgets' | 'marketing' | 'finance';
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage }) => {
  const { logout } = useAuth();
  const handleNavigateToHalls = () => {
    window.location.href = '/halls';
  };

  const handleNavigateToPriceSchemes = () => {
    window.location.href = '/price-schemes';
  };

  const handleNavigateToEvents = () => {
    window.location.href = '/events';
  };

  const handleNavigateToPromoCodes = () => {
    window.location.href = '/promo-codes';
  };

  const handleNavigateToCustomers = () => {
    window.location.href = '/customers';
  };

  const handleNavigateToStatistics = () => {
    window.location.href = '/statistics';
  };

  const handleNavigateToWidgets = () => {
    window.location.href = '/widgets';
  };

  const handleNavigateToMarketing = () => {
    window.location.href = '/marketing';
  };


  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <img src="/лого чб 1 1.png" alt="Логотип" className="sidebar__logo" />
      </div>

      <nav className="sidebar__nav">
        <button
          onClick={handleNavigateToHalls}
          className={`sidebar__nav-item ${currentPage === 'halls' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Залы</span>
        </button>

        <button
          onClick={handleNavigateToPriceSchemes}
          className={`sidebar__nav-item ${currentPage === 'price-schemes' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Распоясовки</span>
        </button>

        <button
          onClick={handleNavigateToEvents}
          className={`sidebar__nav-item ${currentPage === 'events' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Мероприятия</span>
        </button>

        <button
          onClick={handleNavigateToPromoCodes}
          className={`sidebar__nav-item ${currentPage === 'promo-codes' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Промокоды</span>
        </button>

        <button
          onClick={handleNavigateToCustomers}
          className={`sidebar__nav-item ${currentPage === 'customers' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Клиенты</span>
        </button>

        <button
          onClick={handleNavigateToStatistics}
          className={`sidebar__nav-item ${currentPage === 'statistics' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Статистика</span>
        </button>

        <button
          onClick={handleNavigateToWidgets}
          className={`sidebar__nav-item ${currentPage === 'widgets' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Виджеты</span>
        </button>

        <button
          onClick={handleNavigateToMarketing}
          className={`sidebar__nav-item ${currentPage === 'marketing' ? 'sidebar__nav-item--active' : ''}`}
        >
          <span className="sidebar__nav-text">Реклама</span>
        </button>

      </nav>

      <div className="sidebar__footer">
        <button onClick={logout} className="sidebar__logout-btn">
          Выйти
        </button>
      </div>
    </aside>
  );
};
