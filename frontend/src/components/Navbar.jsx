import React from 'react';
import { Shield, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/useTheme';

export default function Navbar({ onOpenSupport }) {
  const { effectiveTheme, toggleQuickTheme } = useTheme();

  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon-box">
          <img src="/assets/singularity_logo.png" alt="Singularity AI" className="brand-logo-img" />
        </div>
        <span className="brand-title">Singularity AI Workbench</span>
        <span className="version-pill">AIR-GAPPED v2.4</span>
      </div>
      
      <div className="nav-right-group">
        <button 
          type="button"
          className="icon-btn-box" 
          onClick={toggleQuickTheme}
          title={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} theme`}
        >
          {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <button className="nav-link" onClick={onOpenSupport}>
          Support & Docs
        </button>
      </div>
    </header>
  );
}
