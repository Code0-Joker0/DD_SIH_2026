import React, { useState, useRef, useEffect } from 'react';
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
  Cpu,
  Paperclip, 
  Image as ImageIcon, 
  Folder, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Loader2, 
  Terminal, 
  Download, 
  Bot, 
  X, 
  User, 
  Copy, 
  CheckCheck, 
  Trash2, 
  ShieldCheck, 
  HelpCircle, 
  Plus,
  MessageSquare,
  Sparkles,
  Layers,
  Search,
  AlertTriangle
} from 'lucide-react';
import NewTaskView from './NewTaskView';
import KnowledgeBaseView, { type KBSource } from './KnowledgeBaseView';
import DocumentsView from './DocumentsView';
import ToolsView from './ToolsView';
import HistoryView from './HistoryView';
import SettingsView from './SettingsView';

export interface TaskStep {
  id: string;
  name: string;
  model: string;
  desc: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'rejected';
  detail?: string;
}

export interface NetworkMetrics {
  egress_packets: number;
  wan_status: string;
  active_ip: string;
  host_ip: string;
  interface: string;
  timestamp: number;
}

export interface ArtifactDeliverable {
  filename: string;
  download_url: string;
  file_size?: number;
  extracted_metrics?: {
    equipment_tag?: string;
    nominal_thickness?: string;
    measured_thickness?: string;
    corrosion_allowance?: string;
    service_line?: string;
    material?: string;
    design_pressure?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  groundedDoc?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  date: string;
  messages: ChatMessage[];
  groundedStandard?: string;
}

interface DashboardViewProps {
  onSignOut: () => void;
  // Execution & Pipeline state
  prompt: string;
  setPrompt: (v: string) => void;
  file: File | null;
  filePreview: string | null;
  onFileSelect: (f: File) => void;
  onClearFile: () => void;
  isRunning: boolean;
  onRun: () => void;
  steps: TaskStep[];
  logs: string[];
  onClearLogs: () => void;
  artifact: ArtifactDeliverable | null;
  validationAlert: string | null;
  onDismissAlert: () => void;
  networkAudit: NetworkMetrics;
  // Copilot Chat state
  chatMessages: ChatMessage[];
  chatInput: string;
  setChatInput: (v: string) => void;
  isChatLoading: boolean;
  onSendMessage: (msg?: string, customContext?: string) => void;
  onClearChat: () => void;
  activeDocSummary: string;
  useActiveDocInChat: boolean;
  setUseActiveDocInChat: (v: boolean) => void;
  // Knowledge Base Multi-Source state
  kbSources: KBSource[];
  onToggleSource: (id: string) => void;
  onToggleAllSources: (selectAll: boolean) => void;
  onDeleteSource: (id: string) => void;
  onUploadSource: (file: File) => void;
}

interface StatutoryStandard {
  id: string;
  code: string;
  title: string;
  domain: string;
  description: string;
  keyEquations: string;
}

export default function DashboardView({
  onSignOut,
  prompt,
  setPrompt,
  file,
  filePreview,
  onFileSelect,
  onClearFile,
  isRunning,
  onRun,
  steps,
  logs,
  onClearLogs,
  artifact,
  validationAlert,
  onDismissAlert,
  networkAudit,
  chatMessages,
  chatInput,
  setChatInput,
  isChatLoading,
  onSendMessage,
  onClearChat,
  activeDocSummary,
  useActiveDocInChat,
  setUseActiveDocInChat,
  kbSources,
  onToggleSource,
  onToggleAllSources,
  onDeleteSource,
  onUploadSource
}: DashboardViewProps) {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [isStandardsModalOpen, setIsStandardsModalOpen] = useState(false);
  const [standardsSearchQuery, setStandardsSearchQuery] = useState('');
  const [kbInitialSearch, setKbInitialSearch] = useState('');
  const [uploadStatusNotice, setUploadStatusNotice] = useState<string | null>(null);

  // Saved Chat Sessions for Left Sidebar
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([
    {
      id: 'session-1',
      title: 'Line 10-HC-4001 UT Audit',
      date: 'Today',
      messages: [
        {
          id: 's1-m1',
          role: 'user',
          content: 'Run API 570 ultrasonic thickness assessment on Line 10-HC-4001 sour hydrocarbon line. Nominal thickness is 12.7 mm, measured wall is 4.8 mm.',
          timestamp: '10:14 AM'
        },
        {
          id: 's1-m2',
          role: 'assistant',
          content: '### 🔍 API 570 Ultrasonic Thickness Assessment: Line 10-HC-4001\n\n- **Service**: Heavy Sour Hydrocarbon (Sulfidic service)\n- **Nominal Wall Thickness ($t_{nom}$)**: 12.7 mm\n- **Measured Minimum Thickness ($t_{actual}$)**: 4.8 mm\n- **Corrosion Allowance ($CA$)**: 3.0 mm\n- **Minimum Required Thickness ($t_{min}$)**: 6.35 mm\n\n⚠️ **Integrity Status: CRITICAL RETIREMENT LIMIT EXCEEDED**\nThe measured thickness (4.8 mm) is **below $t_{min}$ (6.35 mm)**. Metal loss is 62.2% of original nominal thickness.\n\n**Mandatory Statutory Actions**:\n1. Immediate operational derating / isolation of spool section 10-HC-4001.\n2. Schedule spool replacement during upcoming turnaround under API 570 Section 7.\n3. File formal MRPL Inter-Office Safety Approval Note.',
          timestamp: '10:15 AM',
          groundedDoc: 'API 570 Piping Inspection Code'
        }
      ]
    },
    {
      id: 'session-2',
      title: 'E-101 Heat Exchanger RAG',
      date: 'Yesterday',
      messages: [
        {
          id: 's2-m1',
          role: 'user',
          content: 'Query ASME Section VIII Div 1 rules for allowable working pressure (MAWP) on E-101 shell.',
          timestamp: '03:45 PM'
        },
        {
          id: 's2-m2',
          role: 'assistant',
          content: '### 📋 ASME Section VIII Div 1 — E-101 Shell MAWP Analysis\n\nBased on indexed statutory standard UG-27:\n\n$$MAWP = \\frac{S \\cdot E \\cdot t}{R + 0.6 \\cdot t}$$\n\n- **Allowable Stress ($S$)**: 138 MPa (SA-516 Gr 70)\n- **Joint Efficiency ($E$)**: 1.0 (Full Radiography)\n- **Effective Shell Thickness ($t$)**: 14.2 mm\n- **Inside Radius ($R$)**: 600 mm\n\n**Calculated MAWP**: 3.22 MPa (32.2 bar).\nVerified compliant for operating design pressure of 24.5 bar with a 1.31 safety margin.',
          timestamp: '03:46 PM',
          groundedDoc: 'ASME Sec VIII Div 1'
        }
      ]
    },
    {
      id: 'session-3',
      title: 'API 570 Thickness Verification',
      date: '3 days ago',
      messages: [
        {
          id: 's3-m1',
          role: 'user',
          content: 'What is the statutory calculation for remaining life and corrosion rate under API 570?',
          timestamp: '11:30 AM'
        },
        {
          id: 's3-m2',
          role: 'assistant',
          content: '### 📐 API 570 Statutory Formulas\n\n1. **Corrosion Rate**:\n$$C_{rate} = \\frac{t_{\\text{previous}} - t_{\\text{actual}}}{\\Delta \\text{Years}}$$\n\n2. **Remaining Service Life**:\n$$\\text{Remaining Life (years)} = \\frac{t_{\\text{actual}} - t_{\\text{required}}}{C_{rate}}$$\n\n*Mandate*: Per API 570 clause 7.1.2, if remaining life is under 2 years, inspection intervals must be halved and an engineering mitigation notice dispatched.',
          timestamp: '11:31 AM',
          groundedDoc: 'API 570 Section 7.1'
        }
      ]
    },
    {
      id: 'session-4',
      title: 'Crude Unit P-201A Vibration',
      date: 'Last week',
      messages: [
        {
          id: 's3-m1',
          role: 'user',
          content: 'Evaluate pump P-201A vibration velocity RMS of 3.8 mm/s against ISO 10816-3.',
          timestamp: '02:15 PM'
        },
        {
          id: 's3-m2',
          role: 'assistant',
          content: '### ⚙️ ISO 10816-3 Machinery Vibration Evaluation: P-201A\n\n- **Asset**: Crude Booster Pump P-201A (Group 1 Rigid Foundation)\n- **Measured Velocity RMS**: 3.8 mm/s\n\n**Evaluation**:\n- **Zone A (< 1.4 mm/s)**: Good (New equipment)\n- **Zone B (1.4 – 2.8 mm/s)**: Acceptable\n- **Zone C (2.8 – 4.5 mm/s)**: ⚠️ **Alert / Restricted Operation** (Defects developing)\n- **Zone D (> 4.5 mm/s)**: Critical Danger / Immediate Trip\n\n**Verdict**: Pump P-201A is in **Zone C (Alert)**. Schedule bearing alignment check.',
          timestamp: '02:16 PM',
          groundedDoc: 'ISO 10816-3'
        }
      ]
    }
  ]);

  const [activeSessionId, setActiveSessionId] = useState<string>('current');

  // Hidden File Inputs Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Scroll & Terminal Refs
  const logContainerRef = useRef<HTMLDivElement>(null);
  const chatStreamRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLTextAreaElement>(null);

  const checkedSources = kbSources.filter(s => s.checked);

  const statutoryStandards: StatutoryStandard[] = [
    {
      id: 'api-570',
      code: 'API 570',
      title: 'Piping Inspection Code',
      domain: 'In-Service Piping Systems',
      description: 'Inspection, repair, alteration, and rerating of in-service metallic piping systems. Defines corrosion rate calculation and minimum retirement wall thickness.',
      keyEquations: 't_min = (P * D) / (2 * S * E + 2 * Y * P); Corrosion Rate = (t_previous - t_actual) / Years'
    },
    {
      id: 'api-510',
      code: 'API 510',
      title: 'Pressure Vessel Inspection Code',
      domain: 'Pressure Vessels & Reactors',
      description: 'Maintenance inspection, rating, repair, and alteration of pressure vessels in petroleum and chemical processing facilities.',
      keyEquations: 'MAWP = (S * E * t) / (R + 0.6 * t); Remaining Life = (t_actual - t_required) / Corrosion Rate'
    },
    {
      id: 'asme-sec-viii',
      code: 'ASME Sec VIII Div 1',
      title: 'Rules for Construction of Pressure Vessels',
      domain: 'Pressure Containment & Design',
      description: 'Mandatory statutory calculations for cylindrical shell thickness, circumferential stress, and allowable joint efficiency under design pressure.',
      keyEquations: 't = (P * R) / (S * E - 0.6 * P); Joint Efficiency E = 0.85 to 1.0'
    },
    {
      id: 'oisd-118',
      code: 'OISD-STD-118',
      title: 'Layouts and Safety for Petroleum Refineries',
      domain: 'Refinery Process Safety & Shutdowns',
      description: 'Oil Industry Safety Directorate mandates for emergency isolation valves, safety distances, shutdown limits, and asset containment.',
      keyEquations: 'Minimum spacing >= 15m; Critical Wall Loss Shutdown Threshold = 0.5 * CA'
    },
    {
      id: 'iso-10816',
      code: 'ISO 10816-3',
      title: 'Mechanical Vibration Evaluation',
      domain: 'Rotating Machinery & Pumps',
      description: 'Measurement and evaluation of machine vibration on non-rotating parts for refinery pumps, compressors, and blowers.',
      keyEquations: 'Velocity RMS (mm/s): Zone A < 1.4, Zone B 1.4-2.8, Zone C 2.8-4.5, Zone D > 4.5'
    }
  ];

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Auto-scroll chat
  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading]);

  // Handle Copy Message
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMsgId(id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  // Button 1: Upload File (.pdf, .docx, .txt, .csv) Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    onFileSelect(selected);
    setUploadStatusNotice(`📄 File "${selected.name}" uploaded. Synced to Knowledge Base & active grounding.`);
    setTimeout(() => setUploadStatusNotice(null), 4000);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Button 2: Upload Image (.png, .jpg, .jpeg, .webp) Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    onFileSelect(selected);
    setUploadStatusNotice(`🖼️ Visual scan "${selected.name}" uploaded. Vision extraction agent (qwen2.5vl:3b) activated.`);
    setTimeout(() => setUploadStatusNotice(null), 4000);

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  // Button 3: Statutory Knowledge Actions
  const handleGroundStandard = (standard: StatutoryStandard) => {
    const groundingContext = `[GROUNDED STATUTORY STANDARD: ${standard.code} - ${standard.title}]\nDomain: ${standard.domain}\nDescription: ${standard.description}\nKey Formulas / Equations: ${standard.keyEquations}`;
    setUseActiveDocInChat(true);
    onSendMessage(`Attach and apply statutory standard ${standard.code} (${standard.title}) to my active inspection assessment.`, groundingContext);
    setIsStandardsModalOpen(false);
  };

  const handleNavigateToKbWithStandard = (standardCode: string) => {
    setKbInitialSearch(standardCode);
    setActiveTab('Knowledge Base');
    setIsStandardsModalOpen(false);
  };

  // Button 4: Navigate to Documents Repository
  const handleNavigateToDocuments = () => {
    setActiveTab('Documents');
  };

  // Chat Submission
  const handleChatSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;
    onSendMessage(chatInput.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleChatSubmit();
    }
  };

  // Start a new inspection chat session
  const handleNewInspectionChat = () => {
    setActiveTab('Dashboard');
    setActiveSessionId('session-' + Date.now());
    onClearChat();
    onClearFile();
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  // Restore a saved session thread
  const handleSelectSession = (session: ChatSession) => {
    setActiveTab('Dashboard');
    setActiveSessionId(session.id);
    // Replace current active chat messages with session messages
    onClearChat();
    session.messages.forEach(msg => {
      onSendMessage(msg.content, msg.groundedDoc);
    });
  };

  // Delete a session thread
  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChatSessions(prev => prev.filter(s => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      handleNewInspectionChat();
    }
  };

  const quickPromptChips = [
    { label: '⚡ API 570 Retirement Thickness', query: 'Calculate minimum retirement wall thickness for piping spool E-101 under API 570 Section 7.' },
    { label: '🔍 Inspect Ultrasonic Thickness', query: 'Analyze the measured wall thickness points and highlight any location below corrosion allowance.' },
    { label: '📊 ASME Sec VIII MAWP', query: 'Calculate maximum allowable working pressure (MAWP) according to ASME Section VIII Div 1.' },
    { label: '📄 Draft MRPL Approval Note', query: 'Draft a formal MRPL Inter-Office Approval Note (.docx) summarizing the mechanical integrity verdict.' }
  ];

  const navItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'New Task', icon: PlusSquare },
    { name: 'Knowledge Base', icon: BookOpen },
    { name: 'Documents', icon: FileText },
    { name: 'Tools', icon: Briefcase },
    { name: 'History', icon: Clock },
    { name: 'Settings', icon: Settings },
  ];

  const filteredStandards = statutoryStandards.filter(s => 
    s.code.toLowerCase().includes(standardsSearchQuery.toLowerCase()) ||
    s.title.toLowerCase().includes(standardsSearchQuery.toLowerCase()) ||
    s.domain.toLowerCase().includes(standardsSearchQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(standardsSearchQuery.toLowerCase())
  );

  const hasActiveExecution = isRunning || logs.length > 0 || artifact !== null || validationAlert !== null;

  return (
    <div className="dashboard-container">
      {/* Hidden File Inputs */}
      <input 
        type="file" 
        ref={fileInputRef} 
        style={{ display: 'none' }} 
        accept=".pdf,.docx,.txt,.csv" 
        onChange={handleFileChange} 
      />
      <input 
        type="file" 
        ref={imageInputRef} 
        style={{ display: 'none' }} 
        accept=".png,.jpg,.jpeg,.webp" 
        onChange={handleImageChange} 
      />

      {/* Top Header Bar - Minimalist with single unobtrusive status dot */}
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
          <div 
            className="air-gap-dot-pill" 
            title="Sovereign Air-Gap Active · 0 WAN Egress · Loopback Enclave (127.0.0.1)"
          >
            <span className="green-dot-pulse"></span>
            <span>Sovereign Air-Gap Active</span>
          </div>

          <div className="notification-bell-box" title="Air-Gapped Telemetry: All Systems Nominal">
            <Bell size={17} />
          </div>

          <div className="user-profile-badge-new" onClick={onSignOut} title="Click to Sign Out">
            <div className="avatar-circle-purple">RK</div>
            <div className="user-meta-info">
              <span className="user-full-name">Reva Kulkarni</span>
              <span className="user-role-sub">Integrity Engineer</span>
            </div>
            <ChevronDown size={14} className="user-dropdown-arrow" />
          </div>
        </div>
      </header>

      {/* Main 2-Column ChatGPT/Claude Layout */}
      <div className="dash-body">
        {/* Left Sidebar with Sessions Drawer & Nav */}
        <aside className="dash-sidebar">
          {/* Top: + New Inspection Chat Button */}
          <div className="sidebar-top-action">
            <button 
              type="button" 
              className="new-chat-btn"
              onClick={handleNewInspectionChat}
            >
              <Plus size={16} />
              <span>New Inspection Chat</span>
            </button>
          </div>

          {/* Chat History Drawer (Recent Sessions) */}
          <div className="sidebar-sessions-section">
            <div className="sidebar-section-label">
              <Clock size={12} />
              <span>Recent Sessions</span>
            </div>

            <div className="recent-sessions-list">
              {chatSessions.map((session) => {
                const isActive = activeTab === 'Dashboard' && activeSessionId === session.id;
                return (
                  <div
                    key={session.id}
                    className={`session-item-row ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectSession(session)}
                    title={session.title}
                  >
                    <div className="session-left-meta">
                      <MessageSquare size={14} className="session-icon" />
                      <span className="session-title-text">{session.title}</span>
                    </div>

                    <button
                      type="button"
                      className="session-delete-btn"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      title="Delete Session"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="sidebar-nav-section">
            <div className="sidebar-section-label">
              <span>Workspace</span>
            </div>
            <nav className="sidebar-nav">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.name;
                return (
                  <button
                    key={item.name}
                    type="button"
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveTab(item.name)}
                  >
                    <Icon size={16} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Bottom Security Footer Badge */}
          <div className="sidebar-footer-badge">
            <ShieldCheck size={14} color="#059669" />
            <span>100% Air-Gapped Loopback</span>
          </div>
        </aside>

        {/* Center Content Column (Page Router) */}
        {activeTab === 'New Task' && (
          <main className="dash-center">
            <NewTaskView 
              prompt={prompt}
              setPrompt={setPrompt}
              file={file}
              filePreview={filePreview}
              onFileSelect={onFileSelect}
              onClearFile={onClearFile}
              isRunning={isRunning}
              onRun={onRun}
              onTaskStarted={() => setActiveTab('Dashboard')}
            />
          </main>
        )}

        {activeTab === 'Knowledge Base' && (
          <main className="dash-center">
            <KnowledgeBaseView 
              initialSearch={kbInitialSearch}
              sources={kbSources}
              onToggleSource={onToggleSource}
              onToggleAllSources={onToggleAllSources}
              onDeleteSource={onDeleteSource}
              onUploadSource={onUploadSource}
              onGroundSourceInChat={(sourceName, summary) => {
                setActiveTab('Dashboard');
                onSendMessage(`Explain key compliance requirements and formulas from ${sourceName}.`, summary);
              }}
            />
          </main>
        )}

        {activeTab === 'Documents' && (
          <main className="dash-center">
            <DocumentsView 
              activeArtifact={artifact}
              onNavigateNewTask={() => setActiveTab('New Task')}
            />
          </main>
        )}

        {activeTab === 'Tools' && (
          <main className="dash-center">
            <ToolsView onSelectTool={(toolName) => {
              setPrompt(`Execute ${toolName} analysis on active refinery dataset.`);
              setActiveTab('New Task');
            }} />
          </main>
        )}

        {activeTab === 'History' && (
          <main className="dash-center">
            <HistoryView onRerunPrompt={(p) => {
              setPrompt(p);
              setActiveTab('New Task');
            }} />
          </main>
        )}

        {activeTab === 'Settings' && (
          <main className="dash-center">
            <SettingsView networkAudit={networkAudit} />
          </main>
        )}

        {/* Minimalist Centered ChatGPT/Claude Dashboard */}
        {activeTab === 'Dashboard' && (
          <main className="dash-center-chat-canvas">
            {/* Top Hero Branding Header */}
            <div className="chat-canvas-hero">
              <div className="canvas-hero-title">
                <Sparkles size={20} color="#7C3AED" />
                <h1>Asset Integrity Copilot</h1>
              </div>
              <div className="canvas-model-badge">
                <Cpu size={12} color="#7C3AED" />
                <span>llama3.2:3b &middot; Air-Gapped Reasoning</span>
              </div>
            </div>

            {/* Dynamic Grounding Notice / Source Pill */}
            <div className="canvas-grounding-bar">
              {checkedSources.length > 0 ? (
                <div 
                  className="grounding-info-chip active"
                  onClick={() => setActiveTab('Knowledge Base')}
                  title={activeDocSummary ? `Grounding Context:\n${activeDocSummary}` : "Click to manage active RAG sources in Knowledge Base"}
                >
                  <Layers size={13} color="#7C3AED" />
                  <span>
                    <strong>{checkedSources.length} Source{checkedSources.length > 1 ? 's' : ''} Grounded:</strong>{' '}
                    {checkedSources.slice(0, 3).map(s => s.name.split('_')[0]).join(', ')}
                    {checkedSources.length > 3 ? ` +${checkedSources.length - 3} more` : ''}
                  </span>
                </div>
              ) : (
                <div 
                  className="grounding-info-chip fallback"
                  onClick={() => setActiveTab('Knowledge Base')}
                  title="Click to select sources in Knowledge Base"
                >
                  <AlertTriangle size={13} color="#D97706" />
                  <span>No specific sources selected &middot; Grounded in global refinery standards</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <label 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#64748B', cursor: 'pointer' }}
                  title="Enable/disable active context grounding for next prompt"
                >
                  <input 
                    type="checkbox" 
                    checked={useActiveDocInChat} 
                    onChange={(e) => setUseActiveDocInChat(e.target.checked)} 
                  />
                  <span>RAG Active</span>
                </label>

                <button 
                  type="button" 
                  className="grounding-manage-link"
                  onClick={() => setActiveTab('Knowledge Base')}
                >
                  Manage Sources &rarr;
                </button>
              </div>
            </div>

            {/* Status Toast Notice if file uploaded */}
            {uploadStatusNotice && (
              <div className="upload-toast-notice">
                <Check size={14} />
                <span>{uploadStatusNotice}</span>
              </div>
            )}

            {/* Active File / Image Attachment Chip */}
            {file && (
              <div className="canvas-active-attachment">
                <div className="active-file-chip">
                  {filePreview ? (
                    <img src={filePreview} alt="Inspection Thumbnail" className="active-file-thumb" />
                  ) : (
                    <FileText size={16} color="#7C3AED" />
                  )}
                  <div className="active-file-meta">
                    <span className="active-file-title">{file.name}</span>
                    <span className="active-file-size">({(file.size / 1024).toFixed(1)} KB)</span>
                    {filePreview ? (
                      <span className="active-file-tag-pill vision">VISION AGENT</span>
                    ) : (
                      <span className="active-file-tag-pill">GROUNDED &amp; SYNCED</span>
                    )}
                  </div>
                </div>

                <button 
                  type="button" 
                  className="active-file-remove-btn" 
                  onClick={onClearFile} 
                  title="Detach File"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Centered Conversation Stream */}
            <div className="chat-messages-container" ref={chatStreamRef}>
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-message-row ${msg.role}`}>
                  {msg.role === 'assistant' && (
                    <div className="chat-bot-icon" style={{ marginTop: '2px', flexShrink: 0 }}>
                      <Bot size={15} />
                    </div>
                  )}

                  <div className={`chat-bubble ${msg.role}`}>
                    {msg.role === 'assistant' && msg.groundedDoc && (
                      <div className="grounded-badge-inline">
                        <Check size={10} />
                        <span>Grounded in: {msg.groundedDoc}</span>
                      </div>
                    )}

                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                      {msg.content}
                    </div>

                    <div className="chat-msg-footer">
                      <span>{msg.timestamp}</span>
                      {msg.role === 'assistant' && (
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Copy Response"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <CheckCheck size={11} color="#059669" />
                              <span style={{ color: '#059669' }}>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="avatar-circle-purple" style={{ width: '26px', height: '26px', fontSize: '0.7rem', flexShrink: 0 }}>
                      <User size={14} />
                    </div>
                  )}
                </div>
              ))}

              {isChatLoading && (
                <div className="chat-message-row assistant">
                  <div className="chat-bot-icon" style={{ marginTop: '2px', flexShrink: 0 }}>
                    <Bot size={15} />
                  </div>
                  <div className="chat-bubble assistant" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#7C3AED' }}>
                    <Loader2 size={15} className="animate-spin" />
                    <span className="font-mono" style={{ fontSize: '0.78rem' }}>
                      Reasoning locally with LLaMA-3.2 &amp; statutory standards...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Active Execution Pipeline Section (If active task started) */}
            {hasActiveExecution && (
              <div className="canvas-active-execution-dock">
                {validationAlert && (
                  <div className="validation-alert-banner">
                    <div className="alert-left-content">
                      <div className="alert-icon-box">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <div className="alert-title-row">
                          <span className="alert-title-text">Domain Validation Rejection</span>
                          <span className="alert-badge-tag">REJECTED</span>
                        </div>
                        <p className="alert-message-text">{validationAlert}</p>
                      </div>
                    </div>
                    <button type="button" className="alert-close-btn" onClick={onDismissAlert}>
                      <X size={16} />
                    </button>
                  </div>
                )}

                {/* Swarm Pipeline Checklist */}
                <div className="pipeline-card-box">
                  <div className="pipeline-header">
                    <div className="pipeline-title">
                      <ShieldCheck size={16} color="#7C3AED" />
                      <span>7-Agent Sovereign Swarm Contract</span>
                    </div>
                    <span className="pipeline-counter">
                      {steps.filter(s => s.status === 'completed').length} / {steps.length} Steps
                    </span>
                  </div>

                  <div className="pipeline-steps-list">
                    {steps.map((step, idx) => (
                      <div key={step.id} className={`pipeline-step-item ${step.status}`}>
                        <div className="step-left-info">
                          <div className={`step-index-circle ${step.status}`}>
                            {step.status === 'completed' ? (
                              <Check size={13} strokeWidth={3} />
                            ) : (step.status === 'rejected' || step.status === 'failed') ? (
                              <AlertTriangle size={12} />
                            ) : step.status === 'running' ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              idx + 1
                            )}
                          </div>

                          <div className="step-text-block">
                            <span className="step-title-text">{step.name}</span>
                            <span className="step-desc-text">{step.desc}</span>
                            <span className="step-model-tag">{step.model}</span>
                          </div>
                        </div>

                        <span className={`step-status-pill ${step.status}`}>
                          {step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* SSE Reasoning Terminal */}
                <div className="reasoning-terminal-box">
                  <div className="terminal-header">
                    <div className="terminal-title">
                      <Terminal size={14} color="#7C3AED" />
                      <span>Live SSE Agent Reasoning Terminal</span>
                    </div>

                    <div className="terminal-actions">
                      {logs.length > 0 && (
                        <button type="button" className="terminal-clear-btn" onClick={onClearLogs}>
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        className="terminal-toggle-btn"
                        onClick={() => setTerminalCollapsed(!terminalCollapsed)}
                      >
                        {terminalCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                      </button>
                    </div>
                  </div>

                  {!terminalCollapsed && (
                    <div ref={logContainerRef} className="terminal-stream-body">
                      {logs.length === 0 ? (
                        <span className="terminal-empty-text">
                          Awaiting execution stream...
                        </span>
                      ) : (
                        logs.map((log, i) => (
                          <div key={i} className="log-line-entry">
                            {log}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Deliverable result */}
                {artifact && (
                  <div className="deliverable-result-card">
                    <div className="deliverable-left">
                      <div className="deliverable-icon-box">
                        <FileText size={22} />
                      </div>
                      <div className="deliverable-meta-block">
                        <div className="deliverable-heading-row">
                          <span className="deliverable-title">MRPL Inter-Office Approval Note</span>
                          <span className="deliverable-verified-pill">VERIFIED DELIVERABLE</span>
                        </div>
                        <span className="deliverable-filename">{artifact.filename}</span>
                      </div>
                    </div>

                    <a href={artifact.download_url} download className="download-action-btn">
                      <Download size={14} />
                      <span>Download Note (.docx)</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Quick Suggestion Chips */}
            <div className="chat-suggestions-bar">
              <span className="font-mono text-muted" style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <HelpCircle size={12} /> Prompts:
              </span>
              {quickPromptChips.map((chip, i) => (
                <button
                  key={i}
                  type="button"
                  className="suggestion-chip"
                  disabled={isChatLoading}
                  onClick={() => onSendMessage(chip.query)}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            {/* Floating Sleek Bottom Chat Input Bar with 4 Functional Buttons */}
            <div className="floating-chat-input-bar">
              <form onSubmit={handleChatSubmit} className="floating-input-card">
                <div className="floating-textarea-row">
                  <textarea
                    ref={chatInputRef}
                    rows={1}
                    className="floating-chat-textarea"
                    placeholder="Ask anything, formulate an inspection query, or calculate statutory wall loss... (Enter to send)"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isChatLoading}
                  />
                  <button 
                    type="submit" 
                    className="send-icon-btn"
                    disabled={!chatInput.trim() || isChatLoading}
                    title="Send to Local Copilot"
                  >
                    <Send size={15} />
                  </button>
                </div>

                {/* The 4 Sleek Functional Icon Buttons */}
                <div className="floating-tools-dock">
                  <div className="tools-dock-left">
                    {/* BUTTON 1: Upload File */}
                    <button 
                      type="button" 
                      className={`dock-tool-btn ${file && !filePreview ? 'active' : ''}`}
                      onClick={() => fileInputRef.current?.click()}
                      title="Upload File (.pdf, .docx, .txt, .csv)"
                    >
                      <Paperclip size={14} />
                      <span>Upload File</span>
                    </button>

                    {/* BUTTON 2: Upload Images */}
                    <button 
                      type="button" 
                      className={`dock-tool-btn ${filePreview ? 'active' : ''}`}
                      onClick={() => imageInputRef.current?.click()}
                      title="Upload Images (.png, .jpg, .jpeg, .webp)"
                    >
                      <ImageIcon size={14} />
                      <span>Upload Images</span>
                    </button>

                    {/* BUTTON 3: Statutory Knowledge */}
                    <button 
                      type="button" 
                      className="dock-tool-btn"
                      onClick={() => setIsStandardsModalOpen(true)}
                      title="Browse Statutory Knowledge Standards (API 570, ASME, OISD)"
                    >
                      <ShieldCheck size={14} color="#059669" />
                      <span>Statutory Knowledge</span>
                    </button>

                    {/* BUTTON 4: Documents Repository */}
                    <button 
                      type="button" 
                      className="dock-tool-btn"
                      onClick={handleNavigateToDocuments}
                      title="Open Documents Repository"
                    >
                      <Folder size={14} color="#7C3AED" />
                      <span>Documents Repository</span>
                    </button>
                  </div>

                  <div className="tools-dock-right">
                    <span className="font-mono text-muted" style={{ fontSize: '0.68rem' }}>
                      Shift + Enter for new line
                    </span>
                  </div>
                </div>
              </form>
            </div>
          </main>
        )}
      </div>

      {/* STATUTORY STANDARDS MODAL */}
      {isStandardsModalOpen && (
        <div className="modal-overlay" onClick={() => setIsStandardsModalOpen(false)}>
          <div className="modal-card statutory-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">
                <ShieldCheck size={18} color="#059669" />
                <span>Statutory Engineering Standards Library</span>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setIsStandardsModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="subpage-search-box" style={{ width: '100%' }}>
                <Search size={15} style={{ color: '#64748B' }} />
                <input 
                  type="text" 
                  placeholder="Filter standards (e.g., API 570, API 510, ASME, OISD)..."
                  value={standardsSearchQuery}
                  onChange={(e) => setStandardsSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="standards-grid-modal">
                {filteredStandards.map((std) => (
                  <div key={std.id} className="standard-card-row">
                    <div className="std-card-left">
                      <div className="std-card-title-row">
                        <span className="std-tag-code">{std.code}</span>
                        <span className="std-tag-domain">{std.domain}</span>
                      </div>
                      <span style={{ fontSize: '0.835rem', fontWeight: 600, color: '#0F172A' }}>{std.title}</span>
                      <p className="std-card-desc">{std.description}</p>
                      <div className="font-mono text-muted" style={{ fontSize: '0.68rem', color: '#7C3AED', marginTop: '3px' }}>
                        Eq: {std.keyEquations}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                      <button
                        type="button"
                        className="std-ground-btn"
                        onClick={() => handleGroundStandard(std)}
                        title="Ground Copilot in this standard and ask question"
                      >
                        <ShieldCheck size={13} color="#059669" />
                        <span>Ground in Chat</span>
                      </button>

                      <button
                        type="button"
                        style={{
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          color: '#334155',
                          fontSize: '0.7rem',
                          padding: '0.35rem 0.65rem',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontWeight: 500
                        }}
                        onClick={() => handleNavigateToKbWithStandard(std.code)}
                      >
                        View in KB &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="std-modal-footer">
                <span className="font-mono text-muted" style={{ fontSize: '0.72rem' }}>
                  {checkedSources.length} of {kbSources.length} Sources Currently Active in RAG Prompt
                </span>
                <button
                  type="button"
                  className="primary-action-btn"
                  style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}
                  onClick={() => {
                    setActiveTab('Knowledge Base');
                    setIsStandardsModalOpen(false);
                  }}
                >
                  <BookOpen size={13} />
                  <span>Open Multi-Source Manager</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
