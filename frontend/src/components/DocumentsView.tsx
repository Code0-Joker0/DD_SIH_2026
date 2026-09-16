import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Upload, 
  Search, 
  CheckCircle2, 
  Trash2, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive, 
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  File
} from 'lucide-react';
import { 
  getCompanyFiles, 
  uploadCompanyFile, 
  downloadCompanyFile, 
  deleteCompanyFile, 
  getStorageStats,
  type CompanyFile,
  type StorageStats
} from '../utils/api';

interface StatusMessage {
  type: 'info' | 'success' | 'error';
  text: string;
}

interface DocumentsViewProps {
  onNavigateNewTask?: () => void;
}

export default function DocumentsView({ onNavigateNewTask: _onNavigateNewTask }: DocumentsViewProps) {
  const [files, setFiles] = useState<CompanyFile[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Load files and stats on mount
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [filesList, storageStats] = await Promise.all([
        getCompanyFiles({ category: activeFilter, search: searchQuery }),
        getStorageStats().catch(() => null)
      ]);
      setFiles(filesList);
      if (storageStats) setStats(storageStats);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Failed to load files:', msg);
      setStatusMessage({ type: 'error', text: msg || 'Failed to retrieve repository records' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeFilter]);

  // Debounced search
  useEffect(() => {
    const handler = setTimeout(() => {
      getCompanyFiles({ category: activeFilter, search: searchQuery })
        .then(setFiles)
        .catch(console.error);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Handle File Upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = event.target.files?.[0];
    if (!uploadedFile) return;

    setIsUploading(true);
    setStatusMessage({ type: 'info', text: `Uploading "${uploadedFile.name}" to Database...` });

    try {
      await uploadCompanyFile(uploadedFile);
      setStatusMessage({ type: 'success', text: `"${uploadedFile.name}" successfully uploaded to the database.` });
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMessage({ type: 'error', text: `Upload failed: ${msg}` });
    } finally {
      setIsUploading(false);
      event.target.value = '';
      setTimeout(() => setStatusMessage(null), 5000);
    }
  };

  // Handle File Download & Decryption
  const handleDownload = async (file: CompanyFile) => {
    setDownloadingId(file.id);
    try {
      await downloadCompanyFile(file.id, file.name);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Download failed: ${msg}`);
    } finally {
      setDownloadingId(null);
    }
  };

  // Handle File Deletion
  const handleDelete = async (file: CompanyFile) => {
    if (!window.confirm(`Are you sure you want to permanently purge "${file.name}" from database?`)) {
      return;
    }

    try {
      await deleteCompanyFile(file.id);
      setStatusMessage({ type: 'success', text: `File "${file.name}" purged.` });
      setFiles(prev => prev.filter(f => f.id !== file.id));
      getStorageStats().then(setStats).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`Failed to delete: ${msg}`);
    }
  };

  // Icon selector helper
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'PDF':
        return <FileText size={16} color="#34D399" />;
      case 'DOCX':
        return <FileText size={16} color="#60A5FA" />;
      case 'Spreadsheet':
      case 'Data':
        return <FileSpreadsheet size={16} color="#FBBF24" />;
      case 'Code':
        return <FileCode size={16} color="#A78BFA" />;
      default:
        return <File size={16} color="#94A3B8" />;
    }
  };

  return (
    <div className="subpage-container" style={{ padding: '1.5rem', width: '100%', boxSizing: 'border-box' }}>
      {/* Header */}
      <header className="subpage-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="subpage-title" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F8FAFC', margin: 0 }}>
            Documents Repository
          </h2>
          <p className="subpage-subtitle" style={{ fontSize: '0.88rem', color: '#94A3B8', marginTop: '0.25rem' }}>
            
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <label 
            className="primary-action-btn"
            style={{
              cursor: isUploading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1rem',
              background: '#2563EB',
              color: '#FFF',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '0.88rem'
            }}
          >
            <Upload size={15} />
            <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
            <input 
              type="file" 
              onChange={handleFileUpload} 
              disabled={isUploading} 
              style={{ display: 'none' }} 
            />
          </label>

          <button
            type="button"
            onClick={loadData}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '8px',
              padding: '0.6rem',
              color: '#E2E8F0',
              cursor: 'pointer'
            }}
            title="Refresh repository"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Storage Statistics Summary Banner */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
          padding: '1rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <HardDrive size={22} color="#38BDF8" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Total Repository Files</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC' }}>{stats.totalFiles} Files</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <ShieldCheck size={22} color="#34D399" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>Total Storage</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC' }}>{stats.totalEncryptedStorage}</div>
            </div>
          </div>

          {/* <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle2 size={22} color="#A78BFA" />
            <div>
              <div style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}></div>
              <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#F8FAFC' }}>{stats.securityProtocol}</div>
            </div>
          </div> */}
        </div>
      )}

      {/* Status Alert Banner */}
      {statusMessage && (
        <div style={{
          padding: '0.75rem 1rem',
          borderRadius: '8px',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.88rem',
          background: statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          color: statusMessage.type === 'error' ? '#F87171' : '#34D399',
          border: `1px solid ${statusMessage.type === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
        }}>
          {statusMessage.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Filter Row */}
      <div className="subpage-filter-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div className="filter-tabs" style={{ display: 'flex', gap: '0.5rem' }}>
          {['All', 'PDF', 'DOCX', 'Spreadsheet', 'Data'].map((tab) => (
            <button
              key={tab}
              type="button"
              className={`filter-tab ${activeFilter === tab ? 'active' : ''}`}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: activeFilter === tab ? '#3B82F6' : 'rgba(255, 255, 255, 0.05)',
                color: activeFilter === tab ? '#FFF' : '#94A3B8',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
              onClick={() => setActiveFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="subpage-search-box-compact" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(15, 23, 42, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '6px',
          padding: '0.4rem 0.75rem'
        }}>
          <Search size={14} style={{ color: '#64748B' }} />
          <input 
            type="text" 
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#F8FAFC',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Documents Table */}
      <div className="subpage-card" style={{
        background: 'rgba(15, 23, 42, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '10px',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '3fr 1fr 1fr 1fr 1.2fr 1fr',
          padding: '0.75rem 1rem',
          background: 'rgba(255, 255, 255, 0.03)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: '#94A3B8',
          textTransform: 'uppercase'
        }}>
          <span>File Name</span>
          <span>Category</span>
          <span>Plain Size</span>
          <span>Encrypted</span>
          <span>Security & Status</span>
          <span style={{ textAlign: 'right' }}>Actions</span>
        </div>

        <div className="subpage-table-body">
          {isLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
              Loading repository records...
            </div>
          ) : files.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94A3B8' }}>
              No files found matching criteria.
            </div>
          ) : (
            files.map((doc) => (
              <div 
                key={doc.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '3fr 1fr 1fr 1fr 1.2fr 1fr',
                  padding: '0.85rem 1rem',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '0.86rem',
                  color: '#E2E8F0'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {getFileIcon(doc.type)}
                  <div>
                    <span style={{ fontWeight: 500, color: '#F8FAFC' }}>{doc.name}</span>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      {doc.department} &middot; {doc.uploader}
                    </div>
                  </div>
                </div>

                <span style={{ color: '#94A3B8' }}>{doc.type}</span>
                <span style={{ fontFamily: 'monospace', color: '#CBD5E1' }}>{doc.size}</span>
                <span style={{ fontFamily: 'monospace', color: '#38BDF8' }}>{doc.encryptedSize}</span>

                <div>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    background: 'rgba(52, 211, 153, 0.15)',
                    color: '#34D399',
                    border: '1px solid rgba(52, 211, 153, 0.3)'
                  }}>
                    <CheckCircle2 size={11} /> {doc.encryption}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    title="Download File"
                    style={{
                      background: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      color: '#60A5FA',
                      borderRadius: '6px',
                      padding: '0.35rem 0.55rem',
                      cursor: downloadingId === doc.id ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}
                  >
                    <Download size={13} />
                    <span style={{ fontSize: '0.75rem' }}>{downloadingId === doc.id ? 'Downloading...' : 'Download'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(doc)}
                    title="Securely purge file from database"
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      color: '#F87171',
                      borderRadius: '6px',
                      padding: '0.35rem 0.45rem',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={13} />
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

