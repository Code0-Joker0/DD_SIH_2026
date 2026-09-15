import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LeftPanel from './components/LeftPanel';
import LoginCard from './components/LoginCard';
import DashboardView from './components/DashboardView';
import SupportModal from './components/SupportModal';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  return (
    <div className="app-viewport">
      <div className="software-frame">
        {isAuthenticated ? (
          <DashboardView onSignOut={() => setIsAuthenticated(false)} />
        ) : (
          <>
            <Navbar onOpenSupport={() => setIsSupportOpen(true)} />

            <main className="main-layout">
              <LeftPanel />
              <LoginCard onLoginSuccess={() => setIsAuthenticated(true)} />
            </main>
          </>
        )}
      </div>

      <SupportModal 
        isOpen={isSupportOpen} 
        onClose={() => setIsSupportOpen(false)} 
      />
    </div>
  );
}
