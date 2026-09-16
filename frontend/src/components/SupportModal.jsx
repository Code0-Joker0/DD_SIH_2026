import React from 'react';
import { ShieldAlert, X, BookOpen, Lock, Cpu } from 'lucide-react';

export default function SupportModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen size={20} style={{ color: 'var(--accent-blue)' }} />
            <span>Singularity Support & System Docs</span>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h4><Lock size={14} style={{ display: 'inline', marginRight: '6px' }} /> AIR-GAPPED ENVIRONMENT PROTOCOL</h4>
            <p>
              This appliance operates in total physical isolation. No external internet connectivity is required or permitted. All model parameters and SCADA telemetry remain strictly within on-premise hardware boundaries.
            </p>
          </div>

          <div className="modal-section">
            <h4><Cpu size={14} style={{ display: 'inline', marginRight: '6px' }} /> ENTERPRISE SSO & RBAC</h4>
            <p>
              Authentication is validated via strictly integrated internal SAML 2.0 / OIDC identity providers with zero external telemetry egress.
            </p>
          </div>

          <div className="modal-section">
            <h4><ShieldAlert size={14} style={{ display: 'inline', marginRight: '6px' }} /> COMPLIANCE ASSURANCE</h4>
            <p>
              Certified under SOC 2 Type II, ISO 27001, and FIPS 140-3 hardware security module standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
