import { Shield } from 'lucide-react';

interface NavbarProps {
  onOpenSupport: () => void;
  networkAudit?: {
    egress_packets: number;
    wan_status: string;
    active_ip: string;
    host_ip: string;
    interface: string;
    timestamp: number;
  };
}

export default function Navbar({ onOpenSupport }: NavbarProps) {
  return (
    <header className="navbar">
      <div className="brand-section">
        <div className="brand-icon-box">
          <Shield size={18} strokeWidth={2.2} />
        </div>
        <span className="brand-title">Sovereign AI Workbench</span>
        <span className="version-pill">AIR-GAPPED v2.4</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div 
          className="air-gap-dot-pill" 
          title="Sovereign Air-Gap Active · 0 WAN Egress · Loopback Enclave (127.0.0.1)"
        >
          <span className="green-dot-pulse"></span>
          <span>Sovereign Air-Gap Active</span>
        </div>
        
        <button type="button" className="nav-link" onClick={onOpenSupport}>
          Support & Docs
        </button>
      </div>
    </header>
  );
}
