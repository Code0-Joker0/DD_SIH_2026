import { ShieldAlert, X, BookOpen, Lock, Cpu } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SupportModal({ isOpen, onClose }: SupportModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <BookOpen size={20} color="#38BDF8" />
            <span>Sovereign AI Workbench &middot; System Documentation</span>
          </div>
          <button type="button" className="close-btn" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="modal-section">
            <h4><Lock size={14} style={{ display: 'inline', marginRight: '6px' }} /> AIR-GAPPED ISOLATION PROTOCOL</h4>
            <p>
              This appliance operates in total physical isolation. No external internet connectivity is permitted. All model parameters (LLaMA-3.2, Qwen2.5-VL, Qwen2.5-Coder) and plant telemetry remain strictly within on-premise hardware boundaries.
            </p>
          </div>

          <div className="modal-section">
            <h4><Cpu size={14} style={{ display: 'inline', marginRight: '6px' }} /> 7-AGENT STATUTORY SWARM PIPELINE</h4>
            <p>
              Orchestrates deterministic sandboxed parsing, ChromaDB statutory standards retrieval (API 570, API 510, ASME Sec VIII, OISD-118), and verified Word (.docx) approval note deliverable compilation.
            </p>
          </div>

          <div className="modal-section">
            <h4><ShieldAlert size={14} style={{ display: 'inline', marginRight: '6px' }} /> COMPLIANCE & SECURITY AUDIT</h4>
            <p>
              Audited under SOC 2 Type II, ISO 27001, and FIPS 140-3 hardware security module standards with continuous 0-egress socket verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
