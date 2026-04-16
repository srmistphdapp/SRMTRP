import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const SidebarLayout = ({ children, sidebarCollapsed }) => {
  return (
    <div className="sidebar-layout-container">
      <Sidebar />
      <main className={`main-content-area ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Header />
        <div className="content-wrapper">
          {children}
        </div>
      </main>
    </div>
  );
};

export default SidebarLayout;
