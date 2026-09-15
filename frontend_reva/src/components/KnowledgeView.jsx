import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  FileText, 
  CheckCircle2, 
  CheckSquare,
  Square,
  FileSpreadsheet,
  Image as ImageIcon,
  Upload,
  Shield,
  History,
  Archive,
  ArrowUpRight,
  X,
  Lock,
  MessageSquare,
  Filter,
  Check
} from 'lucide-react';
import { INITIAL_CHAT_UPLOADS, INITIAL_SOURCE_FILES } from '../data/chatStore';

export default function KnowledgeView({ onSelectForTask }) {
  const [activeTab, setActiveTab] = useState('source'); // 'chat' | 'source'
  
  // Data states
  const [chatUploads, setChatUploads] = useState(INITIAL_CHAT_UPLOADS);
  const [sourceFiles, setSourceFiles] = useState(INITIAL_SOURCE_FILES);
  
  // Filters & selection
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [selectedSourceIds, setSelectedSourceIds] = useState([]);
  
  // Modals state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState(false);
  const [activeDocForModal, setActiveDocForModal] = useState(null);
  
  // Toast notification
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // --- Handlers for "Uploaded in Chat" ---
  const handleSaveToSourceFiles = (chatFile) => {
    const newSourceFile = {
      id: `doc_promoted_${Date.now()}`,
      name: chatFile.name,
      department: 'General Operations',
      version: 'v1.0',
      accessPermissions: 'All Engineering',
      status: 'Indexed',
      indexedStatus: 'Indexed in Qdrant',
      lastUpdated: 'Just now',
      fileSize: chatFile.fileSize,
      category: 'Chat Import'
    };

    setSourceFiles(prev => [newSourceFile, ...prev]);
    setChatUploads(prev => prev.map(f => f.id === chatFile.id ? { ...f, accessScope: 'Saved to Source Files' } : f));
    showToast(`Saved '${chatFile.name}' to organizational Source Files!`);
  };

  // --- Handlers for "Source Files" ---
  const filteredSourceFiles = sourceFiles.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          doc.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'All' || doc.department.includes(departmentFilter);
    return matchesSearch && matchesDept;
  });

  const filteredChatUploads = chatUploads.filter(doc => {
    return doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           doc.chatTitle.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isAllSourceSelected = filteredSourceFiles.length > 0 && filteredSourceFiles.every(d => selectedSourceIds.includes(d.id));

  const toggleSelectAllSources = () => {
    if (isAllSourceSelected) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(filteredSourceFiles.map(d => d.id));
    }
  };

  const toggleSelectSourceDoc = (id) => {
    setSelectedSourceIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleArchiveSelected = () => {
    if (selectedSourceIds.length === 0) return;
    setSourceFiles(prev => prev.filter(d => !selectedSourceIds.includes(d.id)));
    showToast(`Archived ${selectedSourceIds.length} source file(s)`);
    setSelectedSourceIds([]);
  };

  const getFileIcon = (filename) => {
    if (filename.endsWith('.xlsx')) return <FileSpreadsheet size={16} className="doc-icon-emerald" />;
    if (filename.endsWith('.png') || filename.endsWith('.jpg')) return <ImageIcon size={16} className="doc-icon-purple" />;
    return <FileText size={16} className="doc-icon-blue" />;
  };

  return (
    <div className="subpage-container">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="toast-notification-banner font-mono animate-fade-in">
          <CheckCircle2 size={15} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Knowledge</h2>
        </div>
        
        <div className="header-actions-row">
          {activeTab === 'source' && selectedSourceIds.length > 0 && onSelectForTask && (
            <button 
              className="primary-action-btn font-mono"
              onClick={() => onSelectForTask(selectedSourceIds)}
            >
              <span>Use Selected ({selectedSourceIds.length})</span>
            </button>
          )}

          {activeTab === 'source' && (
            <button 
              className="secondary-btn font-mono"
              onClick={() => setIsUploadModalOpen(true)}
            >
              <Upload size={14} />
              <span>Add Files</span>
            </button>
          )}
        </div>
      </header>

      {/* Primary Knowledge Navigation Tabs */}
      <div className="knowledge-tabs-bar">
        <button 
          className={`knowledge-tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare size={16} />
          <span>Uploaded in Chat</span>
          <span className="tab-count-badge font-mono">{chatUploads.length}</span>
        </button>

        <button 
          className={`knowledge-tab-btn ${activeTab === 'source' ? 'active' : ''}`}
          onClick={() => setActiveTab('source')}
        >
          <BookOpen size={16} />
          <span>Source Files</span>
          <span className="tab-count-badge font-mono">{sourceFiles.length}</span>
        </button>
      </div>

      {/* Controls Bar */}
      <div className="subpage-search-row">
        <div className="subpage-search-box">
          <Search size={15} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {activeTab === 'source' && (
          <div className="dept-filter-dropdown font-mono">
            <Filter size={13} />
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)}>
              <option value="All">All Departments</option>
              <option value="Operations">Operations</option>
              <option value="Maintenance">Maintenance</option>
              <option value="HSE">HSE (Safety)</option>
              <option value="Process Design">Process Design</option>
              <option value="Procurement">Procurement</option>
            </select>
          </div>
        )}

        {activeTab === 'source' && selectedSourceIds.length > 0 && (
          <div className="bulk-actions-group">
            <button className="icon-btn-text danger font-mono" onClick={handleArchiveSelected}>
              <Archive size={13} />
              <span>Archive ({selectedSourceIds.length})</span>
            </button>
          </div>
        )}

        <div className="doc-count-badge font-mono">
          {activeTab === 'source' ? `${selectedSourceIds.length} of ${filteredSourceFiles.length} selected` : `${filteredChatUploads.length} chat files`}
        </div>
      </div>

      {/* TAB 1: UPLOADED IN CHAT */}
      {activeTab === 'chat' && (
        <div className="subpage-card">
          <div className="doc-list-table-header chat-uploads-header">
            <span className="col-file-name">File Name</span>
            <span className="col-type">Type</span>
            <span className="col-chat-origin">Chat / Task Origin</span>
            <span className="col-date">Uploaded Date</span>
            <span className="col-status">Status</span>
            <span className="col-scope">Access Scope</span>
            <span className="col-actions">Actions</span>
          </div>

          <div className="doc-list-table-body">
            {filteredChatUploads.length === 0 ? (
              <div className="empty-state-box">
                <MessageSquare size={24} className="empty-icon" />
                <p className="empty-title">No chat attachments found</p>
                <p className="empty-sub">Files uploaded directly in conversations will appear here.</p>
              </div>
            ) : (
              filteredChatUploads.map((file) => (
                <div key={file.id} className="doc-list-table-row chat-upload-row">
                  <div className="col-file-name doc-main-col">
                    {getFileIcon(file.name)}
                    <div className="doc-name-block">
                      <span className="doc-title-text">{file.name}</span>
                      <span className="doc-size-sub font-mono">{file.fileSize}</span>
                    </div>
                  </div>

                  <span className="col-type doc-category-tag font-mono">{file.type}</span>

                  <div className="col-chat-origin">
                    <span className="chat-origin-pill font-mono">
                      <MessageSquare size={12} />
                      {file.chatTitle}
                    </span>
                  </div>

                  <span className="col-date font-mono">{file.uploadDate}</span>

                  <div className="col-status">
                    <span className="status-badge-green font-mono">
                      <CheckCircle2 size={12} /> {file.status}
                    </span>
                  </div>

                  <span className="col-scope font-mono text-muted">{file.accessScope}</span>

                  <div className="col-actions">
                    {file.accessScope === 'Saved to Source Files' ? (
                      <span className="saved-badge font-mono">
                        <Check size={12} /> Saved to Sources
                      </span>
                    ) : (
                      <button 
                        className="save-source-btn font-mono"
                        onClick={() => handleSaveToSourceFiles(file)}
                        title="Promote this file to reusable organizational source files"
                      >
                        <ArrowUpRight size={13} />
                        <span>Save to Source Files</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: SOURCE FILES */}
      {activeTab === 'source' && (
        <div className="subpage-card">
          <div className="doc-list-table-header source-files-header">
            <div className="checkbox-cell" onClick={toggleSelectAllSources}>
              {isAllSourceSelected ? (
                <CheckSquare size={16} className="checkbox-icon checked" />
              ) : (
                <Square size={16} className="checkbox-icon" />
              )}
            </div>
            <span className="col-doc-name">Document Name</span>
            <span className="col-dept">Department</span>
            <span className="col-version">Version</span>
            <span className="col-perms">Access Permissions</span>
            <span className="col-status">Processing</span>
            <span className="col-updated">Last Updated</span>
            <span className="col-actions">Actions</span>
          </div>

          <div className="doc-list-table-body">
            {filteredSourceFiles.length === 0 ? (
              <div className="empty-state-box">
                <BookOpen size={24} className="empty-icon" />
                <p className="empty-title">No source files found</p>
                <p className="empty-sub">Try adjusting search or department filters.</p>
              </div>
            ) : (
              filteredSourceFiles.map((doc) => {
                const isSelected = selectedSourceIds.includes(doc.id);
                return (
                  <div 
                    key={doc.id} 
                    className={`doc-list-table-row source-file-row ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleSelectSourceDoc(doc.id)}
                  >
                    <div className="checkbox-cell" onClick={(e) => { e.stopPropagation(); toggleSelectSourceDoc(doc.id); }}>
                      {isSelected ? (
                        <CheckSquare size={16} className="checkbox-icon checked" />
                      ) : (
                        <Square size={16} className="checkbox-icon" />
                      )}
                    </div>

                    <div className="col-doc-name doc-main-col">
                      {getFileIcon(doc.name)}
                      <div className="doc-name-block">
                        <span className="doc-title-text">{doc.name}</span>
                        <span className="doc-size-sub font-mono">{doc.fileSize} &middot; {doc.category}</span>
                      </div>
                    </div>

                    <span className="col-dept doc-category-tag font-mono">{doc.department}</span>

                    <div className="col-version">
                      <span className="version-pill font-mono" onClick={(e) => {
                        e.stopPropagation();
                        setActiveDocForModal(doc);
                        setIsVersionsModalOpen(true);
                      }}>
                        <History size={11} /> {doc.version}
                      </span>
                    </div>

                    <div className="col-perms">
                      <button 
                        className="perms-btn font-mono"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDocForModal(doc);
                          setIsPermissionsModalOpen(true);
                        }}
                      >
                        <Shield size={12} />
                        <span>{doc.accessPermissions}</span>
                      </button>
                    </div>

                    <div className="col-status">
                      <span className="status-badge-green font-mono">
                        <CheckCircle2 size={12} /> {doc.status}
                      </span>
                    </div>

                    <span className="col-updated font-mono">{doc.lastUpdated}</span>

                    <div className="col-actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="icon-action-btn font-mono"
                        onClick={() => {
                          setActiveDocForModal(doc);
                          setIsPermissionsModalOpen(true);
                        }}
                        title="View & Edit Access Permissions"
                      >
                        <Lock size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: UPLOAD SOURCE FILE */}
      {isUploadModalOpen && (
        <div className="admin-modal-overlay font-sans" onClick={() => setIsUploadModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Upload size={18} />
                <h3 className="modal-title font-sans">Upload Organizational Source File</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsUploadModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const name = formData.get('docName') || 'New_SOP_Document.pdf';
              const dept = formData.get('department') || 'Operations';
              const newDoc = {
                id: `doc_${Date.now()}`,
                name,
                department: dept,
                version: 'v1.0',
                accessPermissions: formData.get('accessScope') || 'All Engineering',
                status: 'Indexed',
                indexedStatus: 'Ready in Qdrant',
                lastUpdated: 'Just now',
                fileSize: '3.5 MB',
                category: formData.get('category') || 'Standard Operating Procedure'
              };
              setSourceFiles(prev => [newDoc, ...prev]);
              setIsUploadModalOpen(false);
              showToast(`Source file '${name}' uploaded and indexed in Qdrant.`);
            }}>
              <div className="modal-body-form">
                <div className="form-group">
                  <label className="form-label font-mono">Document File Name</label>
                  <input type="text" name="docName" defaultValue="Refinery_Safety_SOP_2026.pdf" className="form-input" required />
                </div>

                <div className="form-row-2col">
                  <div className="form-group">
                    <label className="form-label font-mono">Department</label>
                    <select name="department" className="form-select">
                      <option value="Operations">Operations</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="HSE (Health & Safety)">HSE (Safety)</option>
                      <option value="Process Design">Process Design</option>
                      <option value="Procurement">Procurement</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-mono">Category</label>
                    <input type="text" name="category" defaultValue="Standard Operating Procedure" className="form-input" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label font-mono">Access Scope</label>
                  <select name="accessScope" className="form-select">
                    <option value="Organization Wide">Organization Wide</option>
                    <option value="All Engineering">All Engineering</option>
                    <option value="Maintenance Leads">Maintenance Leads</option>
                    <option value="Process Leads Only">Process Leads Only</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer font-mono">
                <button type="button" className="secondary-btn" onClick={() => setIsUploadModalOpen(false)}>Cancel</button>
                <button type="submit" className="primary-action-btn">Upload & Index in Qdrant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ACCESS PERMISSIONS */}
      {isPermissionsModalOpen && activeDocForModal && (
        <div className="admin-modal-overlay font-sans" onClick={() => setIsPermissionsModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <Shield size={18} />
                <h3 className="modal-title font-sans">Document Access Permissions</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsPermissionsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body-form font-sans">
              <div className="doc-modal-summary">
                <FileText size={20} className="icon-blue" />
                <div>
                  <span className="doc-modal-title">{activeDocForModal.name}</span>
                  <span className="doc-modal-sub font-mono">{activeDocForModal.department} &middot; Version {activeDocForModal.version}</span>
                </div>
              </div>

              <div className="permissions-settings-list font-mono">
                <div className="perm-setting-item">
                  <span>Current Policy:</span>
                  <span className="perm-value-tag">{activeDocForModal.accessPermissions}</span>
                </div>
                <div className="perm-setting-item">
                  <span>Qdrant Security Filter:</span>
                  <span className="perm-value-tag green">Metadata Tag Enforcement Active</span>
                </div>
              </div>
            </div>

            <div className="modal-footer font-mono">
              <button className="primary-action-btn" onClick={() => setIsPermissionsModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: VERSION HISTORY */}
      {isVersionsModalOpen && activeDocForModal && (
        <div className="admin-modal-overlay font-sans" onClick={() => setIsVersionsModalOpen(false)}>
          <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <History size={18} />
                <h3 className="modal-title font-sans">Version History</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsVersionsModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body-form font-sans">
              <div className="versions-timeline font-mono">
                <div className="version-history-item active">
                  <span className="ver-tag">{activeDocForModal.version} (Current)</span>
                  <span className="ver-date">{activeDocForModal.lastUpdated}</span>
                  <p className="ver-note font-sans">Latest verified revision with metadata indexing in vector store.</p>
                </div>
                <div className="version-history-item">
                  <span className="ver-tag">v1.0</span>
                  <span className="ver-date">Jul 10, 2026</span>
                  <p className="ver-note font-sans">Initial document upload.</p>
                </div>
              </div>
            </div>

            <div className="modal-footer font-mono">
              <button className="primary-action-btn" onClick={() => setIsVersionsModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
