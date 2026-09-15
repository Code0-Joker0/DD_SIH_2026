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

const mockAuditLogs = [
  { id: 'aud_1', time: 'Today 00:28', user: 'Reva Kulkarni', event: 'SAML 2.0 Login', resource: 'Identity Provider', status: 'Success' },
  { id: 'aud_2', time: 'Today 00:15', user: 'Ananya Sharma', event: 'Document Upload', resource: 'Refinery_Safety_SOP_v3.pdf', status: 'Success' },
  { id: 'aud_3', time: 'Yesterday 23:40', user: 'Reva Kulkarni', event: 'Permission Change', resource: 'SOP_Inspection.pdf', status: 'Success' },
  { id: 'aud_4', time: 'Yesterday 22:15', user: 'Vikram Mehta', event: 'Knowledge Search', resource: 'Qdrant Vector Retrieval', status: 'Success' },
  { id: 'aud_5', time: 'Yesterday 20:30', user: 'Unknown IP (10.0.4.12)', event: 'Failed Authentication', resource: 'Admin Gateway', status: 'Failed' },
  { id: 'aud_6', time: 'Sep 10, 18:45', user: 'Siddharth Rao', event: 'Task Execution', resource: 'Plant Safety Audit Report', status: 'Success' },
  { id: 'aud_7', time: 'Sep 10, 15:20', user: 'Priya Nair', event: 'Document Download', resource: 'Action_Items_Summary.xlsx', status: 'Success' },
];

export default function AdminAuditView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const filteredLogs = mockAuditLogs.filter(log => {
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
