import { useState } from 'react';
import { Clock, Search, CheckCircle2, RotateCcw } from 'lucide-react';

interface HistoryViewProps {
  onRerunPrompt?: (prompt: string) => void;
}

export default function HistoryView({ onRerunPrompt }: HistoryViewProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const historyItems = [
    { id: 'TASK-1092', name: 'Pipe Spool E-101 Ultrasonic Thickness Inspection', workflow: 'Document Analysis', duration: '6.2s', tokens: '4.8k', date: 'Just now', status: 'Completed', prompt: 'Perform API 570 ultrasonic thickness inspection on line 10-HC-4001 tagged E-101 (Nominal 8.0mm, Measured 3.8mm, Corrosion Allowance 3.0mm).' },
    { id: 'TASK-1091', name: 'API 570 Piping Statutory Knowledge Retrieval', workflow: 'Knowledge Search', duration: '4.8s', tokens: '4.2k', date: '2 hours ago', status: 'Completed', prompt: 'What is the minimum retirement thickness equation under API 570?' },
    { id: 'TASK-1090', name: 'Centrifugal Booster Pump P-201A Vibration Check', workflow: 'Engineering Calculations', duration: '5.1s', tokens: '3.8k', date: '5 hours ago', status: 'Completed', prompt: 'Verify vibration velocity for crude booster pump P-201A against ISO 10816-3 limits (Measured: 7.8 mm/s RMS).' },
    { id: 'TASK-1089', name: 'Plant Safety Audit Inter-Office Note Generation', workflow: 'Report Generation', duration: '12.5s', tokens: '9.9k', date: '1 day ago', status: 'Completed', prompt: 'Generate MRPL Approval note for unit shutdown.' },
    { id: 'TASK-1088', name: 'Flash Drum V-301 Shell Thickness Verification', workflow: 'Document Analysis', duration: '7.4s', tokens: '5.1k', date: '2 days ago', status: 'Completed', prompt: 'Assess remaining life of sour crude flash drum V-301 shell thickness (Nominal 12.0mm, Measured 5.8mm, MAWP 25 bar).' },
  ];

  const filteredHistory = historyItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    item.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Execution History & Audit Log</h2>
          <p className="subpage-subtitle">Cryptographic audit trail of all executed AI agent workflows, execution runtimes, and deliverable notes.</p>
        </div>
      </header>

      {/* Search Row */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} style={{ color: '#64748B' }} />
          <input 
            type="text" 
            placeholder="Search by task ID or task description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* History Table */}
      <div className="subpage-card">
        <div className="subpage-table-header history-grid">
          <span>Task ID & Formulation</span>
          <span>Workflow</span>
          <span>Runtime</span>
          <span>Tokens</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        <div className="subpage-table-body">
          {filteredHistory.map((item) => (
            <div key={item.id} className="subpage-table-row history-grid">
              <div className="doc-name-cell">
                <Clock size={15} color="#38BDF8" />
                <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                  <span className="font-mono" style={{ fontSize: '0.72rem', color: '#6B7280' }}>{item.id}</span>
                  <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#FFF' }}>{item.name}</span>
                </div>
              </div>
              <span className="font-mono text-muted">{item.workflow}</span>
              <span className="font-mono text-muted">{item.duration}</span>
              <span className="font-mono text-muted">{item.tokens}</span>
              <div>
                <span className="status-badge-green"><CheckCircle2 size={12} /> {item.status}</span>
              </div>
              <div className="action-btn-cell">
                <button
                  type="button"
                  className="icon-sub-btn"
                  title="Rerun Task"
                  onClick={() => onRerunPrompt?.(item.prompt)}
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
