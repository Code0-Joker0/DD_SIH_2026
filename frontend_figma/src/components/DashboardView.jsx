import React, { useState } from 'react';
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
  FileSpreadsheet
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

  const handlePromptSubmit = (e) => {
    e?.preventDefault();
    if (!promptText.trim()) return;
    setPromptText('');
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
            <NewTaskView onTaskStarted={() => setActiveTab('Dashboard')} />
          </main>
        )}

        {activeTab === 'Knowledge Base' && (
          <main className="dash-center">
            <KnowledgeBaseView />
          </main>
        )}

        {activeTab === 'Documents' && (
          <main className="dash-center">
            <DocumentsView />
          </main>
        )}

        {activeTab === 'Tools' && (
          <main className="dash-center">
            <ToolsView />
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
            </section>

            {/* AI Prompt Input Box (Slightly Curved) */}
            <section className="prompt-card-new">
              <form onSubmit={handlePromptSubmit}>
                <div className="prompt-input-row-new">
                  <Search size={18} className="prompt-search-icon" style={{ color: '#64748B' }} />
                  <input
                    type="text"
                    placeholder="Ask anything or upload a file..."
                    value={promptText}
                    onChange={(e) => setPromptText(e.target.value)}
                  />
                </div>

                <div className="prompt-bottom-bar-new">
                  <div className="prompt-tools-group">
                    <button type="button" className="tool-btn" title="Attach file"><Paperclip size={16} /></button>
                    <button type="button" className="tool-btn" title="Upload image"><ImageIcon size={16} /></button>
                    <button type="button" className="tool-btn" title="Document"><FileText size={16} /></button>
                    <button type="button" className="tool-btn" title="Folder"><Folder size={16} /></button>
                  </div>

                  <button 
                    type="submit" 
                    className="send-icon-btn"
                    disabled={!promptText.trim()}
                    title="Send message"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </form>
            </section>

            {/* 4 Feature Cards Grid */}
            <section className="feature-cards-grid">
              <div className="feature-card">
                <div className="feature-icon-box purple-bg">
                  <FileText size={20} color="#C084FC" />
                </div>
                <h3 className="feature-title">Document Analysis</h3>
                <p className="feature-desc">
                  Scan & extract insights from PDFs, images, reports
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box green-bg">
                  <Calculator size={20} color="#34D399" />
                </div>
                <h3 className="feature-title">Technical Calculations</h3>
                <p className="feature-desc">
                  Perform engineering & scientific calculations
                </p>
              </div>

              <div className="feature-card">
                <div className="feature-icon-box blue-bg">
                  <Code size={20} color="#60A5FA" />
                </div>
                <h3 className="feature-title">Code Assistance</h3>
                <p className="feature-desc">
                  Generate, review & verify code
                </p>
              </div>

              <div className="feature-card">
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
                <div className="activity-item-row">
                  <div className="act-icon-sq purple-icon"><FileText size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">P&ID Analysis</div>
                    <div className="act-details">Extracted components and generated summary report</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">2 hours ago</div>
                </div>

                <div className="activity-item-row">
                  <div className="act-icon-sq blue-icon"><Search size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">SOP Search</div>
                    <div className="act-details">Retrieved relevant documents from knowledge base</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">4 hours ago</div>
                </div>

                <div className="activity-item-row">
                  <div className="act-icon-sq green-icon"><Calculator size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">Material Calculation</div>
                    <div className="act-details">Performed stress and load calculation</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">5 hours ago</div>
                </div>

                <div className="activity-item-row">
                  <div className="act-icon-sq amber-icon"><FileCheck size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">Report Generation</div>
                    <div className="act-details">Created detailed analysis report (PDF)</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">6 hours ago</div>
                </div>

                <div className="activity-item-row">
                  <div className="act-icon-sq blue-icon"><Code size={16} /></div>
                  <div className="act-main-info">
                    <div className="act-name">Code Execution</div>
                    <div className="act-details">Ran and verified Python script</div>
                  </div>
                  <div className="act-status-badge"><span className="green-dot-mini"></span> Completed</div>
                  <div className="act-timestamp font-mono">8 hours ago</div>
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
                <div className="sys-left"><Cpu size={15} color="#34D399" /> <span>Models</span></div>
                <div className="sys-right font-mono green-text">4 / 4 Ready</div>
              </div>

              <div className="sys-status-item">
                <div className="sys-left"><Database size={15} color="#38BDF8" /> <span>RAG Index</span></div>
                <div className="sys-right green-text">Connected</div>
              </div>

              <div className="sys-status-item">
                <div className="sys-left"><Briefcase size={15} color="#60A5FA" /> <span>Tools</span></div>
                <div className="sys-right green-text">Available</div>
              </div>

              <div className="sys-status-item">
                <div className="sys-left"><HardDrive size={15} color="#34D399" /> <span>Storage</span></div>
                <div className="sys-right green-text">Healthy</div>
              </div>
            </div>
          </div>

          {/* Widget 2: Quick Actions */}
          <div className="right-widget-box">
            <div className="widget-top-title">
              <h4>Quick Actions</h4>
            </div>

            <div className="quick-actions-column">
              <div className="quick-action-item" onClick={() => setActiveTab('Documents')}>
                <div className="qa-left"><Upload size={15} /> <span>Upload File</span></div>
                <ArrowRight size={13} className="qa-arrow" />
              </div>

              <div className="quick-action-item" onClick={() => setActiveTab('Knowledge Base')}>
                <div className="qa-left"><Search size={15} /> <span>Search Knowledge</span></div>
                <ArrowRight size={13} className="qa-arrow" />
              </div>

              <div className="quick-action-item" onClick={() => setActiveTab('Tools')}>
                <div className="qa-left"><Calculator size={15} /> <span>Run Calculation</span></div>
                <ArrowRight size={13} className="qa-arrow" />
              </div>

              <div className="quick-action-item" onClick={() => setActiveTab('New Task')}>
                <div className="qa-left"><FileText size={15} /> <span>Generate Report</span></div>
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
