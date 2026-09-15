import React, { useState } from 'react';
import { BookOpen, Search, Plus, FileText, Database, CheckCircle2, RefreshCw, Trash2, ArrowRight } from 'lucide-react';

export default function KnowledgeBaseView() {
  const [searchQuery, setSearchQuery] = useState('');

  const documents = [
    { name: 'SCADA_Telemetry_Manual_v4.pdf', size: '14.2 MB', embeddings: '1,240', status: 'Indexed', date: '2h ago' },
    { name: 'ISO_27001_Security_Policy.docx', size: '4.8 MB', embeddings: '480', status: 'Indexed', date: '1d ago' },
    { name: 'Plant_Audit_Procedure_2026.pdf', size: '8.5 MB', embeddings: '720', status: 'Indexed', date: '3d ago' },
    { name: 'Engineering_Calculation_Standards.xlsx', size: '2.1 MB', embeddings: '310', status: 'Indexed', date: '5d ago' },
  ];

  const filteredDocs = documents.filter(doc => doc.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Knowledge Base</h2>
          <p className="subpage-subtitle">Manage internal vector embeddings and RAG search sources for local AI agents.</p>
        </div>
        <button className="primary-action-btn">
          <Plus size={15} />
          <span>Add Source</span>
        </button>
      </header>

      {/* RAG Stats */}
      <div className="subpage-stats-grid">
        <div className="stat-card">
          <div className="stat-label"><Database size={14} color="#38BDF8" /> RAG Index Status</div>
          <div className="stat-value text-green">Connected</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><FileText size={14} color="#9CA3AF" /> Total Documents</div>
          <div className="stat-value font-mono">24 Files</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><BookOpen size={14} color="#C084FC" /> Vector Embeddings</div>
          <div className="stat-value font-mono">18,450 Vectors</div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search indexed knowledge documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Document List */}
      <div className="subpage-card">
        <div className="subpage-table-header">
          <span>Document Name</span>
          <span>Size</span>
          <span>Vectors</span>
          <span>Status</span>
          <span>Last Synced</span>
        </div>

        <div className="subpage-table-body">
          {filteredDocs.map((doc) => (
            <div key={doc.name} className="subpage-table-row">
              <div className="doc-name-cell">
                <FileText size={16} color="#38BDF8" />
                <span>{doc.name}</span>
              </div>
              <span className="font-mono text-muted">{doc.size}</span>
              <span className="font-mono text-muted">{doc.embeddings}</span>
              <div>
                <span className="status-badge-green"><CheckCircle2 size={12} /> {doc.status}</span>
              </div>
              <span className="font-mono text-muted">{doc.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
