import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ChevronRight,
  Loader2,
  XCircle
} from 'lucide-react';

const mockHistoryItems = [
  { id: 'TASK-1092', name: 'P&ID Component & Safety Analysis', aiMode: 'Vision & P&ID Analysis', date: 'Completed · 2 hours ago', status: 'Completed' },
  { id: 'TASK-1091', name: 'SOP Safety Standard Summary', aiMode: 'General Analysis', date: 'Completed · Yesterday', status: 'Completed' },
  { id: 'TASK-1090', name: 'Python SCADA Automation Script Verification', aiMode: 'Code Assistance', date: 'Completed · Sep 10, 2026', status: 'Completed' },
  { id: 'TASK-1089', name: 'Plant Safety Audit Report Generation', aiMode: 'General Analysis', date: 'Completed · Sep 8, 2026', status: 'Completed' },
  { id: 'TASK-1088', name: 'Vendor Specification Sheet Comparison', aiMode: 'General Analysis', date: 'Partial · Sep 5, 2026', status: 'Partial' },
  { id: 'TASK-1087', name: 'Legacy Blueprint Vectorization', aiMode: 'Vision & P&ID Analysis', date: 'Failed · Sep 2, 2026', status: 'Failed' },
];

export default function HistoryView({ onViewResult }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredHistory = mockHistoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return <span className="status-badge-green"><CheckCircle2 size={12} /> Completed</span>;
      case 'Processing':
        return <span className="status-badge-blue"><Loader2 size={12} className="animate-spin" /> Processing</span>;
      case 'Partial':
        return <span className="status-badge-amber"><AlertCircle size={12} /> Partial</span>;
      case 'Failed':
        return <span className="status-badge-red"><XCircle size={12} /> Failed</span>;
      default:
        return null;
    }
  };

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">History</h2>
        </div>
      </header>

      {/* Controls Row */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pill-group font-mono">
          {['All', 'Completed', 'Partial', 'Failed'].map((st) => (
            <button
              key={st}
              className={`filter-pill-btn ${statusFilter === st ? 'active' : ''}`}
              onClick={() => setStatusFilter(st)}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* History Table Card */}
      <div className="subpage-card">
        <div className="history-table-header">
          <span className="col-task">Task Name</span>
          <span className="col-mode">AI Mode</span>
          <span className="col-date">Date & Time</span>
          <span className="col-status">Status</span>
          <span className="col-actions">Actions</span>
        </div>

        <div className="history-table-body">
          {filteredHistory.length === 0 ? (
            <div className="empty-state-box">
              <Clock size={24} className="empty-icon" />
              <p className="empty-title">No history records found</p>
              <p className="empty-sub">Try searching for another task name</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div 
                key={item.id} 
                className="history-table-row"
                onClick={() => onViewResult && onViewResult(item)}
              >
                <div className="col-task">
                  <FileText size={16} className="task-row-icon" />
                  <div className="task-title-block">
                    <span className="task-name-text font-sans">{item.name}</span>
                    <span className="task-id-sub font-mono">{item.id}</span>
                  </div>
                </div>

                <span className="col-mode font-mono">{item.aiMode}</span>

                <span className="col-date font-mono">{item.date}</span>

                <div className="col-status">
                  {getStatusBadge(item.status)}
                </div>

                <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                  <button 
                    className="history-action-btn font-mono"
                    onClick={() => onViewResult && onViewResult(item)}
                    title="View task output"
                  >
                    <span>View</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
