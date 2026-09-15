import React, { useState, useRef } from 'react';
import { 
  Shield, 
  Bell, 
  LayoutDashboard, 
  PlusSquare, 
  BookOpen, 
  FileText, 
  Briefcase, 
  Clock, 
  Settings, 
  Sparkles, 
  Cpu,
  Paperclip, 
  Image as ImageIcon, 
  Folder, 
  Send, 
  Calculator, 
  Code, 
  ArrowRight, 
  ChevronDown, 
  Database, 
  HardDrive,
  Upload,
  Search,
  FileCheck,
  FileSpreadsheet,
  Download,
  Loader2,
  Bot,
  User,
  Check
} from 'lucide-react';
import NewTaskView from './NewTaskView';
import KnowledgeBaseView from './KnowledgeBaseView';
import DocumentsView from './DocumentsView';
import ToolsView from './ToolsView';
import HistoryView from './HistoryView';
import SettingsView from './SettingsView';

export default function DashboardView({ onSignOut }) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [promptText, setPromptText] = useState('');
  const [sessionId] = useState(() => 'mrpl-session-' + Math.random().toString(36).substring(2, 9));
  const [selectedDocIds, setSelectedDocIds] = useState(['doc_api570_01', 'doc_plant2026_03']);
  
  // Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      id: 'msg-welcome',
      role: 'assistant',
      content: 'Hello! I am the MRPL Asset Integrity AI Copilot. Ask me questions, upload inspection scans, or click "Run Analysis" to calculate integrity metrics and generate an official Approval Note (.docx).',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  
  // Execution & Upload State
  const [isExecuting, setIsExecuting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [notification, setNotification] = useState(null);

  const fileInputRef = useRef(null);

  const showNotification = (msg, type = 'info') => {
    setNotification({ text: msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleToggleDocId = (id) => {
    setSelectedDocIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 1. Chat Submission -> POST http://localhost:3000/api/chat
  const handlePromptSubmit = async (e) => {
    e?.preventDefault();
    const text = promptText.trim();
    if (!text || isLoadingChat) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    setPromptText('');
    setIsLoadingChat(true);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          selected_doc_ids: selectedDocIds
        })
      });

      if (!response.ok) {
        throw new Error(`Chat request failed with status ${response.status}`);
      }

      const data = await response.json();
      const botReply = data.response || 'Analysis completed.';

      const assistantMsg = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: botReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setChatMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Error reaching local API gateway (http://localhost:3000/api/chat): ${err.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // 2. Wire "Upload File" -> POST http://localhost:3000/api/documents/upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    showNotification(`Uploading "${file.name}" to gateway...`, 'info');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('equipment_tag', 'E-101');
      formData.append('category', 'Inspection Report');

      const res = await fetch('http://localhost:3000/api/documents/upload', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        throw new Error(`Upload returned status ${res.status}`);
      }

      const data = await res.json();
      setUploadedFile(file);
      if (data.document_id) {
        setSelectedDocIds(prev => [...prev, data.document_id]);
      }

      showNotification(`✅ "${file.name}" uploaded & indexed successfully.`, 'success');

      // Add confirmation note in chat
      setChatMessages(prev => [
        ...prev,
        {
          id: `up-${Date.now()}`,
          role: 'assistant',
          content: `📄 Attached and indexed inspection document: **${file.name}** (${(file.size / 1024).toFixed(1)} KB). Ready for analysis or chat questions.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      showNotification(`Upload error: ${err.message}`, 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Wire "Run Analysis" -> POST http://localhost:3000/api/tasks/execute -> Download Approval_Note.docx
  const handleRunAnalysis = async (customPrompt) => {
    if (isExecuting) return;

    setIsExecuting(true);
    showNotification('⚡ Executing Single LangGraph Agent pipeline & generating Approval Note...', 'info');

    try {
      const formData = new FormData();
      if (uploadedFile) {
        formData.append('file', uploadedFile);
      }
      formData.append('task_prompt', customPrompt || promptText || 'Perform API 570 ultrasonic pipe wall thickness analysis and generate Approval Note');

      const response = await fetch('http://localhost:3000/api/tasks/execute', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Task execution failed with status ${response.status}`);
      }

      // Handle binary stream (.docx)
      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);

      const downloadLink = document.createElement('a');
      downloadLink.href = objectUrl;
      downloadLink.download = 'Approval_Note.docx';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();

      window.URL.revokeObjectURL(objectUrl);

      showNotification('✅ Approval_Note.docx generated and downloaded successfully!', 'success');

      setChatMessages(prev => [
        ...prev,
        {
          id: `task-${Date.now()}`,
          role: 'assistant',
          content: `🎉 **Task Execution Complete**\n\nSingle LangGraph agent evaluated statutory retirement thresholds and generated the official deliverable:\n- **Deliverable**: \`Approval_Note.docx\` (Downloaded)\n- **Compliance**: Verified against API 570 / OISD-STD-118 norms.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      showNotification(`Execution failed: ${err.message}`, 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'New Task', icon: PlusSquare },
    { name: 'Knowledge Base', icon: BookOpen },
    { name: 'Documents', icon: FileText },
    { name: 'Tools', icon: Briefcase },
    { name: 'History', icon: Clock },
    { name: 'Settings', icon: Settings },
  ];

  return (
    <div className="dashboard-container">
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.txt,.csv"
        onChange={handleFileUpload} 
      />

      {/* Top Header Bar */}
      <header className="dash-topbar">
        <div className="dash-brand-new">
          <div className="dash-brand-icon-new">
            <Shield size={18} strokeWidth={2.2} />
          </div>
          <div className="dash-brand-text">
            <span className="brand-primary">Sovereign AI</span>
            <span className="brand-secondary">WorkBench</span>
          </div>
        </div>

        <div className="dash-top-right-new">
          <div className="notification-bell-box" title="Notifications">
            <Bell size={17} />
            <span className="bell-red-dot"></span>
          </div>

          <div className="user-profile-badge-new" onClick={onSignOut} title="Click to Sign Out">
            <div className="avatar-circle-purple">RK</div>
            <div className="user-meta-info">
              <span className="user-full-name">Reva Kulkarni</span>
              <span className="user-role-sub">Engineer</span>
            </div>
            <ChevronDown size={14} className="user-dropdown-arrow" />
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <div className="dash-body">
        {/* Left Navigation Sidebar */}
        <aside className="dash-sidebar">
          <nav className="sidebar-nav">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.name)}
                >
                  <Icon size={17} />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Left Infrastructure Security Card */}
          <div className="sidebar-security-card">
            <div className="security-shield-badge">
              <Shield size={16} color="#10B981" />
            </div>
            <div className="security-title">
              Your data stays<br />within your infrastructure
            </div>
            <div className="security-sub font-mono">
              100% On-Premise | No External APIs
            </div>
            <div className="security-status-pill">
              <span className="green-dot"></span>
              <span>System Secure</span>
            </div>
          </div>
        </aside>

        {/* Center Content Column (Page Router) */}
        {activeTab === 'New Task' && (
          <main className="dash-center">
            <NewTaskView onTaskStarted={(task) => {
              setActiveTab('Dashboard');
              handleRunAnalysis(task?.query);
            }} />
          </main>
        )}

        {activeTab === 'Knowledge Base' && (
          <main className="dash-center">
            <KnowledgeBaseView 
              selectedDocIds={selectedDocIds}
              onToggleDocId={handleToggleDocId}
            />
          </main>
        )}

        {activeTab === 'Documents' && (
          <main className="dash-center">
            <DocumentsView onUploadClick={() => fileInputRef.current?.click()} />
          </main>
        )}

        {activeTab === 'Tools' && (
          <main className="dash-center">
            <ToolsView onRunTool={(toolName) => handleRunAnalysis(`Execute ${toolName} analysis`)} />
          </main>
        )}

        {activeTab === 'History' && (
          <main className="dash-center">
            <HistoryView />
          </main>
        )}

        {activeTab === 'Settings' && (
          <main className="dash-center">
            <SettingsView />
          </main>
        )}

        {activeTab === 'Dashboard' && (
          <main className="dash-center">
            {/* Notification Banner */}
            {notification && (
              <div style={{
                padding: '0.65rem 1.2rem',
                margin: '0 0 1rem 0',
                borderRadius: '8px',
                background: notification.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : notification.type === 'error' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(56, 189, 248, 0.15)',
                border: `1px solid ${notification.type === 'success' ? 'rgba(16, 185, 129, 0.4)' : notification.type === 'error' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(56, 189, 248, 0.4)'}`,
                color: notification.type === 'success' ? '#10B981' : notification.type === 'error' ? '#EF4444' : '#38BDF8',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <span>{notification.text}</span>
              </div>
            )}

            {/* Welcome Hero Section */}
            <section className="hero-banner-new">
              <div className="hero-heading-content">
                <h1 className="hero-heading-new">
                  Good Morning,<br />
                  How can I help you today?
                </h1>
                <p className="hero-subtitle-new">
                  Your on-premise AI assistant for secure, intelligent and automated industrial workflows.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.8rem' }}>
                <button
                  type="button"
                  className="primary-action-btn"
                  onClick={() => handleRunAnalysis()}
                  disabled={isExecuting}
                  style={{ background: 'linear-gradient(135deg, #7C3AED, #4F46E5)', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  {isExecuting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
                  <span>{isExecuting ? 'Running Analysis...' : 'Run Analysis (Download .docx)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#F1F5F9', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                >
                  {isUploading ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
                  <span>{uploadedFile ? uploadedFile.name : 'Upload File'}</span>
                </button>
              </div>
            </section>

            {/* Chat Conversation History Box */}
            <section style={{
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1rem',
              maxHeight: '340px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.8rem'
            }}>
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  style={{ 
                    display: 'flex', 
                    gap: '0.6rem', 
                    alignItems: 'flex-start',
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%'
                  }}
                >
                  {msg.role === 'assistant' && (
                    <div style={{ background: '#7C3AED', color: '#fff', padding: '5px', borderRadius: '50%', flexShrink: 0, marginTop: '2px' }}>
                      <Bot size={14} />
                    </div>
                  )}

                  <div style={{
                    background: msg.role === 'user' ? '#7C3AED' : 'rgba(30, 41, 59, 0.85)',
                    color: '#F8FAFC',
                    padding: '0.6rem 0.9rem',
                    borderRadius: '10px',
                    fontSize: '0.86rem',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                    <div style={{ fontSize: '0.68rem', color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : '#94A3B8', marginTop: '4px', textAlign: 'right' }}>
                      {msg.timestamp}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div style={{ background: '#38BDF8', color: '#0F172A', padding: '5px', borderRadius: '50%', flexShrink: 0, marginTop: '2px' }}>
                      <User size={14} />
                    </div>
                  )}
                </div>
              ))}

              {isLoadingChat && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94A3B8', fontSize: '0.82rem', padding: '0.4rem' }}>
                  <Loader2 size={15} className="spin" color="#7C3AED" />
                  <span>Copilot is reasoning on local engine...</span>
                </div>
              )}
            </section>

            {/* AI Prompt Input Box */}
            <section className="prompt-card-new">
              <form onSubmit={handlePromptSubmit}>
                <div className="prompt-input-row-new">
                  <Search size={18} className="prompt-search-icon" style={{ color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Ask anything or upload a file (Grounding in selected KB docs)..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                    disabled={isLoadingChat}
                  />
                </div>

                <div className="prompt-bottom-bar-new">
                  <div className="prompt-tools-group">
                    <button 
                      type="button" 
                      className="tool-btn" 
                      title="Attach file" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip size={16} />
                    </button>
                    <button 
                      type="button" 
                      className="tool-btn" 
                      title="Upload image" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <ImageIcon size={16} />
                    </button>
                    <button 
                      type="button" 
                      className="tool-btn" 
                      title="Document" 
                      onClick={() => setActiveTab('Documents')}
                    >
                      <FileText size={16} />
                    </button>
                    <button 
                      type="button" 
                      className="tool-btn" 
                      title="Knowledge Base" 
                      onClick={() => setActiveTab('Knowledge Base')}
                    >
                      <Folder size={16} />
                    </button>
                  </div>

                  <button 
                    type="submit" 
                    className="send-icon-btn"
                    disabled={!promptText.trim() || isLoadingChat}
                    title="Send message"
                  >
                    {isLoadingChat ? <Loader2 size={15} className="spin" /> : <Send size={15} />}
                  </button>
                </div>
              </form>
            </section>

            {/* 4 Feature Cards Grid */}
            <section className="feature-cards-grid">
              <div className="feature-card" onClick={() => handleRunAnalysis('Perform Document Analysis & Wall Loss check')}>
                <div className="feature-icon-box purple-bg">
                  <FileText size={20} color="#C084FC" />
                </div>
                <h3 className="feature-title">Document Analysis</h3>
                <p className="feature-desc">
                  Scan & extract insights from PDFs, images, reports
                </p>
              </div>

              <div className="feature-card" onClick={() => handleRunAnalysis('Perform Technical Engineering Calculations')}>
                <div className="feature-icon-box green-bg">
                  <Calculator size={20} color="#34D399" />
                </div>
                <h3 className="feature-title">Technical Calculations</h3>
                <p className="feature-desc">
                  Perform engineering & scientific calculations
                </p>
              </div>

              <div className="feature-card" onClick={() => handlePromptSubmit({ preventDefault: () => {}, target: { value: 'Review and verify engineering calculation code' } })}>
                <div className="feature-icon-box blue-bg">
                  <Code size={20} color="#60A5FA" />
                </div>
                <h3 className="feature-title">Code Assistance</h3>
                <p className="feature-desc">
                  Generate, review & verify code
                </p>
              </div>

              <div className="feature-card" onClick={() => handleRunAnalysis('Generate formal MRPL Approval Note deliverable')}>
                <div className="feature-icon-box amber-bg">
                  <FileCheck size={20} color="#FBBF24" />
                </div>
                <h3 className="feature-title">Report Generation</h3>
                <p className="feature-desc">
                  Create reports, PPTs & approval notes
                </p>
              </div>
            </section>

            {/* Recent Activity Table */}
            <section className="recent-activity-card">
              <div className="activity-header">
                <div className="act-header-title">
                  <Clock size={16} className="clock-icon" />
                  <span>Recent Activity</span>
                </div>
                <button className="view-all-link" onClick={() => setActiveTab('History')}>View All <ArrowRight size={13} /></button>
              </div>

              <div className="activity-rows-list">
                <div className="activity-item-row" onClick={() => handleRunAnalysis('Run P&ID Analysis')}>
                  <div className="act-icon-sq purple-icon"><FileText size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">P&ID Analysis</div>
                    <div className="act-details">Extracted components and generated summary report</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">2 hours ago</div>
                </div>

                <div className="activity-item-row" onClick={() => setActiveTab('Knowledge Base')}>
                  <div className="act-icon-sq blue-icon"><Search size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">SOP Search</div>
                    <div className="act-details">Retrieved relevant documents from knowledge base</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">4 hours ago</div>
                </div>

                <div className="activity-item-row" onClick={() => handleRunAnalysis('Run Material Stress Calculation')}>
                  <div className="act-icon-sq green-icon"><Calculator size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">Material Calculation</div>
                    <div className="act-details">Performed stress and load calculation</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">5 hours ago</div>
                </div>

                <div className="activity-item-row" onClick={() => handleRunAnalysis('Generate Approval Note Report')}>
                  <div className="act-icon-sq amber-icon"><FileCheck size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">Report Generation</div>
                    <div className="act-details">Created detailed analysis report (.docx)</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">6 hours ago</div>
                </div>
              </div>
            </section>
          </main>
        )}

        {/* Right Sidebar Widgets Panel */}
        <aside className="dash-right-panel">
          {/* Widget 1: System Status */}
          <div className="right-widget-box">
            <div className="widget-top-title">
              <h4>System Status</h4>
              <span className="online-tag-pill"><span className="green-dot"></span> Online</span>
            </div>

            <div className="widget-items-list">
              <div className="sys-status-item">
                <div className="sys-left"><Cpu size={15} color="#34D399" /> <span>Orchestration</span></div>
                <div className="sys-right font-mono green-text">Single Agent</div>
              </div>

              <div className="sys-status-item">
                <div className="sys-left"><Database size={15} color="#38BDF8" /> <span>RAG Sources</span></div>
                <div className="sys-right green-text">{selectedDocIds.length} Active</div>
              </div>

              <div className="sys-status-item">
                <div className="sys-left"><Briefcase size={15} color="#60A5FA" /> <span>Gateway</span></div>
                <div className="sys-right green-text">:3000 Ready</div>
              </div>

              <div className="sys-status-item">
                <div className="sys-left"><HardDrive size={15} color="#34D399" /> <span>FastAPI</span></div>
                <div className="sys-right green-text">:8000 Online</div>
              </div>
            </div>
          </div>

          {/* Widget 2: Quick Actions */}
          <div className="right-widget-box">
            <div className="widget-top-title">
              <h4>Quick Actions</h4>
            </div>

            <div className="quick-actions-column">
              <div className="quick-action-item" onClick={() => fileInputRef.current?.click()}>
                <div className="qa-left"><Upload size={15} /> <span>Upload File</span></div>
                <ArrowRight size={13} className="qa-arrow" />
              </div>

              <div className="quick-action-item" onClick={() => setActiveTab('Knowledge Base')}>
                <div className="qa-left"><Search size={15} /> <span>Search Knowledge</span></div>
                <ArrowRight size={13} className="qa-arrow" />
              </div>

              <div className="quick-action-item" onClick={() => handleRunAnalysis('Run Technical Integrity Calculation')}>
                <div className="qa-left"><Calculator size={15} /> <span>Run Calculation</span></div>
                <ArrowRight size={13} className="qa-arrow" />
              </div>

              <div className="quick-action-item" onClick={() => handleRunAnalysis('Generate Approval Note')}>
                <div className="qa-left"><FileText size={15} /> <span>Generate Report (.docx)</span></div>
                <ArrowRight size={13} className="qa-arrow" />
              </div>
            </div>
          </div>

          {/* Widget 3: Supported File Types */}
          <div className="right-widget-box">
            <div className="widget-top-title">
              <h4>Supported File Types</h4>
            </div>

            <div className="file-types-grid">
              <div className="file-type-card red-type">
                <FileText size={18} color="#EF4444" />
                <span className="file-type-name">PDF</span>
              </div>

              <div className="file-type-card purple-type">
                <ImageIcon size={18} color="#A855F7" />
                <span className="file-type-name">Images</span>
              </div>

              <div className="file-type-card darkblue-type">
                <FileText size={18} color="#2563EB" />
                <span className="file-type-name">DOCX</span>
              </div>

              <div className="file-type-card green-type">
                <FileSpreadsheet size={18} color="#10B981" />
                <span className="file-type-name">XLSX</span>
              </div>

              <div className="file-type-card orange-type">
                <FileText size={18} color="#F97316" />
                <span className="file-type-name">PPTX</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
