import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Upload, 
  Shield, 
  RotateCcw, 
  Archive, 
  Trash2, 
  CheckSquare, 
  Square, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Check, 
  FileSpreadsheet, 
  Image as ImageIcon 
} from 'lucide-react';

const mockAdminDocs = [
  { id: 'doc_001', name: 'SOP_Inspection.pdf', type: 'SOP', version: 'v2.4', department: 'Operations', status: 'Indexed', access: 'Engineering, Operations', updated: '2 days ago' },
  { id: 'doc_002', name: 'Plant_Safety_Manual.pdf', type: 'Manual', version: 'v1.8', department: 'Engineering', status: 'Indexed', access: 'All Departments', updated: 'Aug 28, 2026' },
  { id: 'doc_003', name: 'Inspection_Report_Q3.pdf', type: 'Report', version: 'v1.0', department: 'Operations', status: 'Indexed', access: 'Engineering, Reviewers', updated: 'Aug 24, 2026' },
  { id: 'doc_004', name: 'Maintenance_Guidelines_2026.pdf', type: 'Guidelines', version: 'v3.1', department: 'Engineering', status: 'Indexed', access: 'Engineering', updated: 'Aug 18, 2026' },
  { id: 'doc_005', name: 'P&ID_Diagram_Compressor_Unit.pdf', type: 'Diagram', version: 'v4.0', department: 'Engineering', status: 'Indexed', access: 'Engineering', updated: 'Aug 12, 2026' },
  { id: 'doc_006', name: 'Engineering_Standards_v4.xlsx', type: 'Standard', version: 'v4.2', department: 'Engineering', status: 'Re-indexing', access: 'Engineering', updated: 'Jul 30, 2026' },
];

export default function AdminKnowledgeView() {
  const [docs, setDocs] = useState(mockAdminDocs);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedDocIds, setSelectedDocIds] = useState(['doc_001', 'doc_002', 'doc_003']);

  // Access Control Modal State
  const [permissionModalDoc, setPermissionModalDoc] = useState(null);
  const [accessDepts, setAccessDepts] = useState({ Engineering: true, Operations: true, Finance: false, Management: false });
  const [accessRoles, setAccessRoles] = useState({ Admin: true, Engineer: true, Reviewer: true, Viewer: false });

  // Upload Modal State
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const filteredDocs = docs.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isAllSelected = filteredDocs.length > 0 && filteredDocs.every(d => selectedDocIds.includes(d.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(filteredDocs.map(d => d.id));
    }
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleOpenPermissions = (doc) => {
    setPermissionModalDoc(doc);
  };

  const handleReindex = (docId) => {
    setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'Re-indexing' } : d));
    setTimeout(() => {
      setDocs(prev => prev.map(d => d.id === docId ? { ...d, status: 'Indexed' } : d));
    }, 1800);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Indexed':
        return <span className="status-badge-green"><CheckCircle2 size={12} /> Indexed</span>;
      case 'Re-indexing':
      case 'Processing':
        return <span className="status-badge-blue"><Loader2 size={12} className="animate-spin" /> {status}</span>;
      case 'Failed':
        return <span className="status-badge-red"><AlertCircle size={12} /> Failed</span>;
      case 'Archived':
        return <span className="status-badge-amber"><Archive size={12} /> Archived</span>;
      default:
        return <span className="status-badge-blue">{status}</span>;
    }
  };

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Knowledge Administration</h2>
          <p className="subpage-subtitle">Govern internal knowledge documents, index status, and access policies.</p>
        </div>
        <button className="primary-action-btn" onClick={() => setIsUploadOpen(true)}>
          <Upload size={15} />
          <span>Upload Document</span>
        </button>
      </header>

      {/* Controls Row */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search documents by title or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="doc-count-badge font-mono">
          {selectedDocIds.length} of {docs.length} sources selected
        </div>

        <div className="filter-pill-group font-mono">
          {['All', 'Indexed', 'Re-indexing', 'Failed', 'Archived'].map((st) => (
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

      {/* Document Table Card */}
      <div className="subpage-card">
        <div className="admin-table-header docs-grid">
          <div className="checkbox-cell" onClick={toggleSelectAll}>
            {isAllSelected ? (
              <CheckSquare size={16} className="checkbox-icon checked" />
            ) : (
              <Square size={16} className="checkbox-icon" />
            )}
            <span className="select-all-label">Select all</span>
          </div>
          <span>Document</span>
          <span>Version</span>
          <span>Department</span>
          <span>Access Control</span>
          <span>Processing Status</span>
          <span>Actions</span>
        </div>

        <div className="admin-table-body">
          {filteredDocs.length === 0 ? (
            <div className="empty-state-box">
              <BookOpen size={24} className="empty-icon" />
              <p className="empty-title">No documents found</p>
              <p className="empty-sub font-mono">Try adjusting search or status filters</p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDocIds.includes(doc.id);
              return (
                <div key={doc.id} className={`admin-table-row docs-grid ${isSelected ? 'selected' : ''}`}>
                  <div className="checkbox-cell" onClick={() => toggleSelectDoc(doc.id)}>
                    {isSelected ? (
                      <CheckSquare size={16} className="checkbox-icon checked" />
                    ) : (
                      <Square size={16} className="checkbox-icon" />
                    )}
                  </div>

                  <div className="doc-main-col">
                    <FileText size={16} className="doc-icon-blue" />
                    <div className="doc-name-block">
                      <span className="doc-title-text font-sans">{doc.name}</span>
                      <span className="doc-size-sub font-mono">{doc.updated}</span>
                    </div>
                  </div>

                  <span className="font-mono text-secondary">{doc.version}</span>

                  <span className="font-sans text-secondary">{doc.department}</span>

                  <span className="font-mono text-tertiary">{doc.access}</span>

                  <div>{getStatusBadge(doc.status)}</div>

                  <div className="col-actions font-mono">
                    <button 
                      className="icon-sub-btn" 
                      title="Manage Access Permissions"
                      onClick={() => handleOpenPermissions(doc)}
                    >
                      <Shield size={14} />
                    </button>
                    <button 
                      className="icon-sub-btn" 
                      title="Re-index document"
                      onClick={() => handleReindex(doc.id)}
                    >
                      <RotateCcw size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Document Access Control Modal */}
      {permissionModalDoc && (
        <div className="modal-overlay" onClick={() => setPermissionModalDoc(null)}>
          <div className="modal-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title font-sans">
                <Shield size={18} className="icon-blue" />
                <span>Document Access Control &mdash; {permissionModalDoc.name}</span>
              </div>
              <button className="close-btn" onClick={() => setPermissionModalDoc(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body font-sans">
              <div className="setting-field">
                <label className="setting-label">Authorized Departments</label>
                <div className="sources-checklist">
                  {Object.keys(accessDepts).map((dept) => (
                    <label key={dept} className="checkbox-label-row">
                      <input 
                        type="checkbox" 
                        checked={accessDepts[dept]} 
                        onChange={(e) => setAccessDepts({ ...accessDepts, [dept]: e.target.checked })} 
                      />
                      <span>{dept}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="setting-field">
                <label className="setting-label">Authorized Roles</label>
                <div className="sources-checklist">
                  {Object.keys(accessRoles).map((role) => (
                    <label key={role} className="checkbox-label-row">
                      <input 
                        type="checkbox" 
                        checked={accessRoles[role]} 
                        onChange={(e) => setAccessRoles({ ...accessRoles, [role]: e.target.checked })} 
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="secondary-cancel-btn" onClick={() => setPermissionModalDoc(null)}>
                  Cancel
                </button>
                <button type="button" className="primary-action-btn" onClick={() => setPermissionModalDoc(null)}>
                  <Check size={14} />
                  <span>Save Permissions</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      {isUploadOpen && (
        <div className="modal-overlay" onClick={() => setIsUploadOpen(false)}>
          <div className="modal-card admin-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title font-sans">
                <Upload size={18} className="icon-blue" />
                <span>Upload Document to Knowledge Base</span>
              </div>
              <button className="close-btn" onClick={() => setIsUploadOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body font-sans">
              <div className="file-dropzone">
                <Upload size={24} className="dropzone-icon" />
                <div className="dropzone-text">
                  <span className="dropzone-primary">Drop organization documents here</span>
                  <span className="dropzone-sub font-mono">PDF &middot; DOCX &middot; XLSX &middot; PPTX &middot; Images</span>
                </div>
              </div>

              <div className="modal-actions-row">
                <button type="button" className="secondary-cancel-btn" onClick={() => setIsUploadOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="primary-action-btn" onClick={() => setIsUploadOpen(false)}>
                  <Check size={14} />
                  <span>Upload & Index</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
