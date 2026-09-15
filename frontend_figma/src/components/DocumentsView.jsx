import React, { useState } from 'react';
import { FileText, Download, Eye, Upload, Filter, Search, FileSpreadsheet, ImageIcon, CheckCircle2 } from 'lucide-react';

export default function DocumentsView() {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const documents = [
    { name: 'Inspection_Report_Site_A.pdf', type: 'PDF', size: '3.4 MB', date: '2 hours ago', status: 'Verified' },
    { name: 'Vendor_Compliance_Analysis.docx', type: 'DOCX', size: '1.8 MB', date: '1 day ago', status: 'Verified' },
    { name: 'Plant_Audit_Stress_Data.xlsx', type: 'Spreadsheet', size: '4.2 MB', date: '2 days ago', status: 'Verified' },
    { name: 'Safety_Protocol_Notes.pdf', type: 'PDF', size: '2.1 MB', date: '3 days ago', status: 'Verified' },
    { name: 'Telemetry_Log_Extract.csv', type: 'Data', size: '890 KB', date: '5 days ago', status: 'Verified' },
  ];

  const filteredDocs = documents.filter(doc => {
    const matchesFilter = activeFilter === 'All' || doc.type.toLowerCase().includes(activeFilter.toLowerCase());
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Documents</h2>
          <p className="subpage-subtitle">Repository of all analyzed reports, generated documentation, and uploaded files.</p>
        </div>
        <button className="primary-action-btn">
          <Upload size={15} />
          <span>Upload File</span>
        </button>
      </header>

      {/* Filter Row */}
      <div className="subpage-filter-row">
        <div className="filter-tabs">
          {['All', 'PDF', 'DOCX', 'Spreadsheet'].map((tab) => (
            <button
              key={tab}
              className={`filter-tab ${activeFilter === tab ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="subpage-search-box-compact">
          <Search size={14} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="subpage-card">
        <div className="subpage-table-header docs-grid">
          <span>File Name</span>
          <span>Type</span>
          <span>Size</span>
          <span>Analyzed</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        <div className="subpage-table-body">
          {filteredDocs.map((doc) => (
            <div key={doc.name} className="subpage-table-row docs-grid">
              <div className="doc-name-cell">
                <FileText size={16} color="#60A5FA" />
                <span>{doc.name}</span>
              </div>
              <span className="font-mono text-muted">{doc.type}</span>
              <span className="font-mono text-muted">{doc.size}</span>
              <span className="font-mono text-muted">{doc.date}</span>
              <div>
                <span className="status-badge-green"><CheckCircle2 size={12} /> {doc.status}</span>
              </div>
              <div className="action-btn-cell">
                <button className="icon-sub-btn" title="View"><Eye size={14} /></button>
                <button className="icon-sub-btn" title="Download"><Download size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
