import React, { useState } from 'react';
import { Clock, Search, CheckCircle2, RotateCcw, FileText, ArrowRight } from 'lucide-react';

export default function HistoryView() {
  const [searchQuery, setSearchQuery] = useState('');

  const historyItems = [
    { id: 'TASK-1092', name: 'P&ID Analysis & Component Extraction', workflow: 'Document Analysis', duration: '14.2s', tokens: '12.4k', date: '2 hours ago', status: 'Completed' },
    { id: 'TASK-1091', name: 'SOP Document Knowledge Retrieval', workflow: 'Knowledge Search', duration: '4.8s', tokens: '4.2k', date: '4 hours ago', status: 'Completed' },
    { id: 'TASK-1090', name: 'Material Stress & Load Verification', workflow: 'Engineering Calculations', duration: '8.1s', tokens: '6.8k', date: '5 hours ago', status: 'Completed' },
    { id: 'TASK-1089', name: 'Plant Safety Audit Detailed PDF Report', workflow: 'Report Generation', duration: '22.5s', tokens: '18.9k', date: '6 hours ago', status: 'Completed' },
    { id: 'TASK-1088', name: 'Python SCADA Data Extraction Script', workflow: 'Code Assistance', duration: '6.4s', tokens: '5.1k', date: '8 hours ago', status: 'Completed' },
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
          <h2 className="subpage-title">Execution History</h2>
          <p className="subpage-subtitle">Audit log of all executed AI agent workflows, execution runtimes, and output reports.</p>
        </div>
      </header>

      {/* Search Row */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by task ID or task name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* History Table */}
      <div className="subpage-card">
        <div className="subpage-table-header history-grid">
          <span>Task ID & Name</span>
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
                <button className="icon-sub-btn" title="Rerun Task"><RotateCcw size={14} /></button>
                <button className="icon-sub-btn" title="View Output"><FileText size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
