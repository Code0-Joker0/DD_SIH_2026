import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Lock, 
  FileText, 
  User, 
  Filter 
} from 'lucide-react';

export default function AdminAuditView() {
  const [logs, setLogs] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  React.useEffect(() => {
    const fetchLogs = async () => {
      try {
        const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:9000';
        const res = await fetch(`${API_BASE}/auth/logs`);
        const data = await res.json();
        if (data.logs) {
          const mapped = data.logs.map(l => ({
            id: l.log_id,
            time: new Date(l.timestamp).toLocaleString(),
            user: l.username,
            event: l.action,
            resource: l.details,
            status: l.action.includes('FAILED') ? 'Failed' : 'Success'
          }));
          setLogs(mapped);
        }
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.event.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          log.resource.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    if (status === 'Success') {
      return <span className="status-badge-green"><CheckCircle2 size={12} /> Success</span>;
    }
    return <span className="status-badge-red"><XCircle size={12} /> Failed</span>;
  };

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Security & Audit</h2>
          <p className="subpage-subtitle">Immutable audit trail of user authentications, document access, and security events.</p>
        </div>
      </header>

      {/* Controls Bar */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by user, event, or resource..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pill-group font-mono">
          {['All', 'Success', 'Failed'].map((st) => (
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

      {/* Audit Log Table Card */}
      <div className="subpage-card">
        <div className="admin-table-header audit-grid">
          <span>Time</span>
          <span>User</span>
          <span>Event Type</span>
          <span>Resource</span>
          <span>Status</span>
        </div>

        <div className="admin-table-body">
          {filteredLogs.length === 0 ? (
            <div className="empty-state-box">
              <ShieldCheck size={24} className="empty-icon" />
              <p className="empty-title">No audit records found</p>
              <p className="empty-sub font-mono">Try searching with a different term</p>
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className="admin-table-row audit-grid font-sans">
                <span className="font-mono text-tertiary">{log.time}</span>

                <div className="col-user">
                  <User size={14} className="icon-blue" />
                  <span className="font-semibold">{log.user}</span>
                </div>

                <span className="font-mono text-secondary">{log.event}</span>

                <span className="font-mono text-tertiary">{log.resource}</span>

                <div>{getStatusBadge(log.status)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
