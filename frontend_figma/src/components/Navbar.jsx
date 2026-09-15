import React from 'react';
import { Shield } from 'lucide-react';

export default function Navbar({ onOpenSupport }) {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon-box">
          <Shield size={18} strokeWidth={2.2} />
        </div>
        <span className="brand-title">Sovereign AI Workbench</span>
        <span className="version-pill">AIR-GAPPED v2.4</span>
      </div>
      
      <button className="nav-link" onClick={onOpenSupport}>
        Support & Docs
      </button>
    </header>
  );
}
