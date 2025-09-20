import React from 'react';
import { Sidebar } from '../Sidebar';
import './Layout.scss';

interface LayoutProps {
  currentPage: 'halls' | 'price-schemes' | 'events' | 'promo-codes' | 'ticket-sales' | 'customers' | 'statistics' | 'widgets' | 'marketing' | 'finance';
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ currentPage, children }) => {
  return (
    <div className="layout">
      <Sidebar currentPage={currentPage} />
      <main className="layout__content">
        {children}
      </main>
    </div>
  );
};
