import React, { useState } from 'react';
import Navbar from './components/Navbar';
import LeftPanel from './components/LeftPanel';
import LoginCard from './components/LoginCard';
import DashboardView from './components/DashboardView';
import SupportModal from './components/SupportModal';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';

function MainApp() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  // 1. Session restoration check
  if (isLoading) {
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
          fontFamily: 'monospace',
          letterSpacing: '0.08em'
        }}
      >
        Initializing Sovereign Workbench...
      </div>
    );
  }

  // 2. Authenticated: Render Enterprise Dashboard
  if (isAuthenticated) {
    return (
      <DashboardView
        user={user}
        onSignOut={logout}
      />
    );
  }

  // 3. Unauthenticated: Render Two-Panel Landing Frame
  return (
    <div className="app-viewport">
      <div className="software-frame">
        <Navbar onOpenSupport={() => setIsSupportOpen(true)} />

        <main className="main-layout">
          <LeftPanel />
          <LoginCard />
        </main>
      </div>

      <SupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}