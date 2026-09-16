import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LeftPanel from './components/LeftPanel';
import LoginCard from './components/LoginCard';
import DashboardView from './components/DashboardView';
import SupportModal from './components/SupportModal';
import { ThemeProvider } from './context/ThemeContext';
import { getCurrentUser, logoutUser } from './utils/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Validate existing session on mount
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (isMounted && currentUser) {
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.warn('Session expired or offline:', err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = (authenticatedUser) => {
    setUser(authenticatedUser);
    setIsAuthenticated(true);
  };

  const handleSignOut = () => {
    logoutUser();
    setUser(null);
    setIsAuthenticated(false);
  };

  if (isInitializing) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0B0F19',
          color: '#94A3B8',
          fontSize: '0.9rem',
          fontFamily: 'system-ui, sans-serif'
        }}
      >
        Initializing Singularity...
      </div>
    );
  }

  return (
    <ThemeProvider>
      {isAuthenticated ? (
        <DashboardView
          user={user}
          onSignOut={handleSignOut}
        />
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