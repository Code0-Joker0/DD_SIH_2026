import { useState } from 'react';
import { FileText, Download, Upload, Search, CheckCircle2 } from 'lucide-react';

interface ArtifactDeliverable {
  filename: string;
  download_url: string;
  file_size?: number;
  extracted_metrics?: Record<string, string | undefined>;
}

interface DocumentsViewProps {
  activeArtifact?: ArtifactDeliverable | null;
  onNavigateNewTask?: () => void;
}

export default function DocumentsView({ activeArtifact, onNavigateNewTask }: DocumentsViewProps) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const baseDocuments = [
    { name: 'MRPL_Piping_E101_Scan.pdf', type: 'PDF', size: '2.4 MB', date: 'Just now', status: 'Verified', downloadUrl: 'http://127.0.0.1:5000/api/download/MRPL_Piping_E101_Scan.pdf' },
    { name: 'Inspection_Report_Site_A.pdf', type: 'PDF', size: '3.4 MB', date: '2 hours ago', status: 'Verified', downloadUrl: '#' },
    { name: 'Vendor_Compliance_Analysis.docx', type: 'DOCX', size: '1.8 MB', date: '1 day ago', status: 'Verified', downloadUrl: '#' },
    { name: 'Plant_Audit_Stress_Data.xlsx', type: 'Spreadsheet', size: '4.2 MB', date: '2 days ago', status: 'Verified', downloadUrl: '#' },
    { name: 'Safety_Protocol_Notes.pdf', type: 'PDF', size: '2.1 MB', date: '3 days ago', status: 'Verified', downloadUrl: '#' },
  ];

  const allDocuments = activeArtifact ? [
    {
      name: activeArtifact.filename,
      type: activeArtifact.filename.endsWith('.docx') ? 'DOCX' : 'PDF',
      size: activeArtifact.file_size ? `${(activeArtifact.file_size / 1024).toFixed(1)} KB` : '42.5 KB',
      date: 'Generated Deliverable',
      status: 'Verified',
      downloadUrl: activeArtifact.download_url
    },
    ...baseDocuments
  ] : baseDocuments;

  const filteredDocs = allDocuments.filter(doc => {
    const matchesFilter = activeFilter === 'All' || doc.type.toLowerCase().includes(activeFilter.toLowerCase());
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Documents Repository</h2>
          <p className="subpage-subtitle">Repository of all analyzed refinery reports, generated approval notes, and uploaded inspection files.</p>
        </div>
        <button type="button" className="primary-action-btn" onClick={onNavigateNewTask}>
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
              type="button"
              className={`filter-tab ${activeFilter === tab ? 'active' : ''}`}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="subpage-search-box-compact">
          <Search size={14} style={{ color: '#64748B' }} />
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
          {filteredDocs.map((doc, idx) => (
            <div key={`${doc.name}-${idx}`} className="subpage-table-row docs-grid">
              <div className="doc-name-cell">
                <FileText size={16} color={doc.type === 'DOCX' ? '#60A5FA' : '#34D399'} />
                <span>{doc.name}</span>
              </div>
              <span className="font-mono text-muted">{doc.type}</span>
              <span className="font-mono text-muted">{doc.size}</span>
              <span className="font-mono text-muted">{doc.date}</span>
              <div>
                <span className="status-badge-green"><CheckCircle2 size={12} /> {doc.status}</span>
              </div>
              <div className="action-btn-cell">
                <a
                  href={doc.downloadUrl}
                  download
                  className="icon-sub-btn"
                  title="Download File"
                >
                  <Download size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
