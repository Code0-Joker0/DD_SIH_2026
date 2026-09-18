import React, { useState } from 'react';
import { 
  Clock, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  XCircle, 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  User, 
  Eye, 
  X 
} from 'lucide-react';

const mockAdminTasks = [
  { id: 'TASK-1092', user: 'Reva Kulkarni', name: 'P&ID Component & Safety Analysis', aiMode: 'Vision & P&ID Analysis', time: '10 mins ago', sources: '3 files', status: 'Completed' },
  { id: 'TASK-1091', user: 'Ananya Sharma', name: 'Refinery SOP Safety Rule Extraction', aiMode: 'General Analysis', time: '45 mins ago', sources: '2 files', status: 'Completed' },
  { id: 'TASK-1090', user: 'Vikram Mehta', name: 'Python SCADA Data Extraction Script', aiMode: 'Code Assistance', time: '2 hours ago', sources: 'Current files', status: 'Completed' },
  { id: 'TASK-1089', user: 'Siddharth Rao', name: 'Plant Safety Audit Report Generation', aiMode: 'General Analysis', time: '4 hours ago', sources: '4 files', status: 'Completed' },
  { id: 'TASK-1088', user: 'Priya Nair', name: 'Vendor Spec Sheet Load Comparison', aiMode: 'General Analysis', time: '6 hours ago', sources: '2 files', status: 'Partial' },
  { id: 'TASK-1087', user: 'Reva Kulkarni', name: 'Legacy Blueprint Image Vectorization', aiMode: 'Vision & P&ID Analysis', time: '1 day ago', sources: '1 file', status: 'Failed' },
];

export default function AdminTasksView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedTask, setSelectedTask] = useState(null);
  const [isTechDetailsOpen, setIsTechDetailsOpen] = useState(false);

  const filteredTasks = mockAdminTasks.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
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
          <h2 className="subpage-title">Tasks & Runs</h2>
          <p className="subpage-subtitle">Monitor organization-wide AI task executions, user runs, and output deliverables.</p>
        </div>
      </header>

      {/* Controls Row */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search by user, task name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pill-group font-mono">
          {['All', 'Completed', 'Processing', 'Partial', 'Failed'].map((st) => (
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

      {/* Tasks Table Card */}
      <div className="subpage-card">
        <div className="admin-table-header tasks-grid">
          <span>User</span>
          <span>Task ID & Name</span>
          <span>AI Mode</span>
          <span>Sources Scope</span>
          <span>Time</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        <div className="admin-table-body">
          {filteredTasks.length === 0 ? (
            <div className="empty-state-box">
              <Clock size={24} className="empty-icon" />
              <p className="empty-title">No task runs found</p>
              <p className="empty-sub font-mono">Try searching with a different prompt term</p>
            </div>
          ) : (
            filteredTasks.map((task) => (
              <div 
                key={task.id} 
                className="admin-table-row tasks-grid"
                onClick={() => setSelectedTask(task)}
              >
                <div className="col-user font-sans">
                  <User size={14} className="icon-blue" />
                  <span>{task.user}</span>
                </div>

                <div className="col-task">
                  <div className="task-title-block">
                    <span className="task-name-text font-sans">{task.name}</span>
                    <span className="task-id-sub font-mono">{task.id}</span>
                  </div>
                </div>

                <span className="font-mono text-secondary">{task.aiMode}</span>

                <span className="font-mono text-tertiary">{task.sources}</span>

                <span className="font-mono text-tertiary">{task.time}</span>

                <div>{getStatusBadge(task.status)}</div>

                <div className="col-actions font-mono" style={{ justifyContent: 'flex-end' }}>
                  <button 
                    className="history-action-btn font-mono"
                    onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                  >
                    <span>Details</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Execution Details Modal */}
      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title font-sans">
                <FileText size={18} className="icon-blue" />
                <span>Execution Details &mdash; {selectedTask.id}</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedTask(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body font-sans">
              <div className="tech-details-content font-mono">
                <div className="tech-detail-row">
                  <span className="tech-label">Executing User</span>
                  <span className="tech-value">{selectedTask.user}</span>
                </div>
                <div className="tech-detail-row">
                  <span className="tech-label">Task Name</span>
                  <span className="tech-value">{selectedTask.name}</span>
                </div>
                <div className="tech-detail-row">
                  <span className="tech-label">AI Mode</span>
                  <span className="tech-value">{selectedTask.aiMode}</span>
                </div>
                <div className="tech-detail-row">
                  <span className="tech-label">Execution Time</span>
                  <span className="tech-value">{selectedTask.time}</span>
                </div>
                <div className="tech-detail-row">
                  <span className="tech-label">Status</span>
                  <span className="tech-value">{selectedTask.status}</span>
                </div>
              </div>

              {/* Collapsible Secondary Technical Details Accordion */}
              <div className="technical-details-accordion">
                <button
                  type="button"
                  className="tech-accordion-trigger font-mono"
                  onClick={() => setIsTechDetailsOpen(!isTechDetailsOpen)}
                >
                  {isTechDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>Technical Details</span>
                </button>

                {isTechDetailsOpen && (
                  <div className="tech-details-content font-mono">
                    <div className="tech-detail-row">
                      <span className="tech-label">Pipeline Engine</span>
                      <span className="tech-value">Autonomous Execution Orchestrator</span>
                    </div>
                    <div className="tech-detail-row">
                      <span className="tech-label">OCR Status</span>
                      <span className="tech-value">Automatically invoked for attachment parsing</span>
                    </div>
                    <div className="tech-detail-row">
                      <span className="tech-label">Retrieval Scope</span>
                      <span className="tech-value">Filtered by selected document IDs</span>
                    </div>
                    <div className="tech-detail-row">
                      <span className="tech-label">Execution Latency</span>
                      <span className="tech-value">4.2 seconds</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-actions-row">
                <button type="button" className="primary-action-btn" onClick={() => setSelectedTask(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
