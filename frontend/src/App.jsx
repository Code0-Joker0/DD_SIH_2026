import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LeftPanel from './components/LeftPanel';
import LoginCard from './components/LoginCard';
import DashboardView from './components/DashboardView';
import AdminConsoleView from './components/admin/AdminConsoleView';
import SupportModal from './components/SupportModal';
import { ThemeProvider } from './context/ThemeContext';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <ThemeProvider>
      {isAuthenticated ? (
        user?.role === 'admin' ? (
          <AdminConsoleView onSignOut={handleSignOut} user={user} />
        ) : (
          <DashboardView onSignOut={handleSignOut} user={user} />
        )
      ) : (
        <div className="app-viewport">
          <div className="software-frame">
            <Navbar onOpenSupport={() => setIsSupportOpen(true)} />

            <main className="main-layout">
              <LeftPanel />
              <LoginCard onLoginSuccess={handleLoginSuccess} />
            </main>
          </div>

          <SupportModal 
            isOpen={isSupportOpen} 
            onClose={() => setIsSupportOpen(false)} 
          />
        </div>
      )}
    </ThemeProvider>
  );
}
