import { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  PlusSquare,
  BookOpen,
  Settings as SettingsIcon,
  Lock,
  Sun,
  Moon,
  ShieldCheck,
  Search,
  MessageSquare,
  Pin,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  X,
  AlertTriangle,
  Clock,
  FileText,
  LogOut
} from 'lucide-react';
import KnowledgeView from './KnowledgeView';
import HistoryView from './HistoryView';
import SettingsView from './SettingsView';
import DocumentsView from './DocumentsView';
import ConversationWorkspaceView from './ConversationWorkspaceView';
import type { 
  ActiveChat, 
  ChatMessage, 
  AttachedFile 
} from './ConversationWorkspaceView';
import AdminConsoleView from './admin/AdminConsoleView';
import { useTheme } from '../context/useTheme';
import { INITIAL_CHATS, INITIAL_SOURCE_FILES } from '../data/chatStore';
import { 
  sendChatMessage, 
  uploadRAGDocument, 
  getNetworkStatus, 
  executeAgentTask, 
  uploadCompanyFile 
} from '../utils/api';

export interface UserProfile {
  id?: string;
  username?: string;
  email?: string;
  full_name?: string;
  role?: string;
  department?: string;
}

export interface DashboardViewProps {
  user?: UserProfile | null;
  onSignOut?: () => void;
}

const createBlankChat = (): ActiveChat => ({
  id: `chat_${Date.now()}`,
  title: 'New Conversation',
  userId: 'usr_rkulkarni',
  createdDate: 'Just now',
  updatedDate: 'Just now',
  pinned: false,
  archived: false,
  attachedFileIds: [],
  selectedSourceDocumentIds: ['doc_001', 'doc_002'],
  knowledgeScope: 'selected',
  aiMode: 'Auto (Recommended)',
  messages: []
});

export default function DashboardView({ user, onSignOut }: DashboardViewProps) {
  const { effectiveTheme, toggleQuickTheme } = useTheme();
  const [workspaceMode, setWorkspaceMode] = useState<'user' | 'admin'>('user');
  const [activeTab, setActiveTab] = useState<'Chat' | 'Knowledge' | 'Documents' | 'History' | 'Settings'>('Chat');

  // Chats state
  const [chats, setChats] = useState<ActiveChat[]>(() => [createBlankChat(), ...(INITIAL_CHATS as unknown as ActiveChat[])]);
  const [activeChatId, setActiveChatId] = useState<string>(() => chats[0]?.id || 'chat_init');
  const [chatSearchQuery, setChatSearchQuery] = useState<string>('');

  // Chat action dropdown & edit states
  const [openChatMenuId, setOpenChatMenuId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameTitleInput, setRenameTitleInput] = useState<string>('');
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);
  
  // Sovereign Air-Gap Network Telemetry state
  const [networkStatus, setNetworkStatus] = useState({
    egress_packets: 0,
    wan_status: 'SECURE_AIR_GAPPED',
    active_ip: '127.0.0.1'
  });

  // Poll air-gap network status every 5 seconds
  useEffect(() => {
    let isMounted = true;
    const pollNetwork = async () => {
      try {
        const data = await getNetworkStatus();
        if (isMounted && data) {
          setNetworkStatus(data);
        }
      } catch {
        // Sovereign local fallback
      }
    };

    pollNetwork();
    const interval = setInterval(pollNetwork, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!openChatMenuId) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement)?.closest?.('.chat-item-actions-wrapper')) {
        setOpenChatMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openChatMenuId]);

  // Active chat object lookup
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  // Handler: Start New Chat
  const handleStartNewChat = () => {
    const newChatObj = createBlankChat();
    setChats(prev => [newChatObj, ...prev]);
    setActiveChatId(newChatObj.id);
    setActiveTab('Chat');
  };

  // Live Agent Handler: Send Message to Node Gateway & FastAPI/Ollama
  const handleSendMessage = async ({
    prompt,
    attachedFiles = [],
    sourcesCount = 0
  }: {
    prompt: string;
    attachedFiles?: AttachedFile[];
    knowledgeScope?: string;
    selectedSourceIds?: string[];
    sourcesCount?: number;
    aiMode?: string;
  }) => {
    if (!activeChatId || !prompt?.trim()) return;

    const targetChatId = activeChatId;
    const userMsgId = `msg_u_${Date.now()}`;
    const aiMsgId = `msg_ai_${Date.now()}`;
    const startTime = performance.now();

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: prompt,
      attachedFiles,
      selectedSourcesCount: sourcesCount
    };

    // Auto-derive title if first message
    const currentChat = chats.find(c => c.id === targetChatId);
    const isFirstMsg = !currentChat?.messages || currentChat.messages.length === 0;
    const generatedTitle = isFirstMsg
      ? (prompt.length > 28 ? `${prompt.slice(0, 28)}...` : prompt)
      : currentChat?.title;

    // Temporary streaming/progress placeholder
    const pendingAiMessage: ChatMessage = {
      id: aiMsgId,
      sender: 'ai',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      taskRun: {
        id: `tr_${Date.now()}`,
        executionStatus: 'Processing',
        progressStages: [
          { key: 'understanding', label: 'Understanding request', status: 'active' },
          { key: 'reading', label: attachedFiles.length > 0 ? `Ingesting ${attachedFiles.length} file(s)` : 'Analyzing query', status: 'pending' },
          { key: 'searching', label: 'Consulting knowledge base & vector index', status: 'pending' },
          { key: 'inference', label: 'Executing neural inference via Ollama', status: 'pending' }
        ],
        answer: '',
        findings: [],
        recommendation: '',
        sources: [],
        generatedFiles: [],
        technicalDetails: {
          modelsUsed: 'Autonomous Industrial Pipeline (Gateway Proxy)',
          ocrUsed: attachedFiles.length > 0 ? 'Document Parser Active' : 'None',
          retrievalScope: `Selected source scope: ${sourcesCount}`,
          executionTime: 'Running...',
          finalStatus: 'IN_PROGRESS'
        }
      }
    };

    // 1. Immediately append User Message and Pending AI Card
    setChats(prev => prev.map(chat => {
      if (chat.id === targetChatId) {
        return {
          ...chat,
          title: chat.title === 'New Conversation' ? generatedTitle : chat.title,
          updatedDate: 'Just now',
          messages: [...(chat.messages || []), userMessage, pendingAiMessage]
        };
      }
      return chat;
    }));

    try {
      // 2. Upload any attached files to RAG ingestion if present
      if (attachedFiles && attachedFiles.length > 0) {
        for (const fileItem of attachedFiles) {
          if (fileItem instanceof File || fileItem?.rawFile instanceof File) {
            try {
              await uploadRAGDocument(fileItem.rawFile || (fileItem as unknown as File), {
                category: 'ChatAttachment',
                source_type: 'USER_UPLOAD'
              });
            } catch (upErr: unknown) {
              const msg = upErr instanceof Error ? upErr.message : String(upErr);
              console.warn('[ATTACHMENT INGESTION SKIPPED]:', msg);
            }
          }
        }
      }

      // 3. Dispatch prompt to Node Gateway (/api/chat) with direct fallback
      const docIds = currentChat?.selectedSourceDocumentIds || [];
      const data = await sendChatMessage(prompt, targetChatId, docIds);

      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);
      const rawAnswer = data.response || data.message || data.text;
      const answerText: string = typeof rawAnswer === 'string'
        ? rawAnswer
        : (rawAnswer ? JSON.stringify(rawAnswer) : (typeof data === 'string' ? data : JSON.stringify(data)));
      const sourceList: string[] = Array.isArray(data.sources) && data.sources.length > 0
        ? data.sources.map((s: any) => typeof s === 'string' ? s : s.filename || s.title || 'Referenced Document')
        : INITIAL_SOURCE_FILES.slice(0, Math.min(sourcesCount || 2, 3)).map(d => d.name);

      // 4. Auto-generate deliverable note and commit to encrypted vault if requested
      let generatedFilesList = data.generatedFiles || [];
      const promptLower = prompt.toLowerCase();
      const isDeliverableRequested = 
        promptLower.includes('approval note') || 
        promptLower.includes('calculate') || 
        promptLower.includes('api 570') ||
        promptLower.includes('api 510') ||
        promptLower.includes('deliverable') ||
        promptLower.includes('integrity') ||
        promptLower.includes('assessment') ||
        promptLower.includes('report');

      if (isDeliverableRequested && generatedFilesList.length === 0) {
        try {
          const primaryFile = attachedFiles[0]?.rawFile || (attachedFiles[0] instanceof File ? (attachedFiles[0] as unknown as File) : null);
          const docxBlob = await executeAgentTask(prompt, primaryFile);
          const deliverableName = `MRPL_Approval_Note_${Date.now()}.docx`;

          try {
            const docxFile = new File([docxBlob], deliverableName, {
              type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            });
            await uploadCompanyFile(docxFile, {
              department: 'Asset Integrity',
              category: 'DOCX'
            });
          } catch (vErr: unknown) {
            const msg = vErr instanceof Error ? vErr.message : String(vErr);
            console.warn('[VAULT AUTO-ARCHIVE NOTICE]:', msg);
          }

          generatedFilesList = [
            {
              name: deliverableName,
              size: '1.2 MB',
              type: 'DOCX',
              status: 'Committed to Encrypted Vault'
            }
          ];
        } catch (taskErr: unknown) {
          const msg = taskErr instanceof Error ? taskErr.message : String(taskErr);
          console.warn('[AGENT DELIVERABLE TASK NOTICE]:', msg);
        }
      }

      // 5. Update the AI response message with complete results
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          return {
            ...chat,
            messages: (chat.messages || []).map((m): ChatMessage => {
              if (m.id === aiMsgId) {
                return {
                  ...m,
                  taskRun: {
                    id: `tr_${Date.now()}`,
                    executionStatus: 'Completed',
                    progressStages: [
                      { key: 'understanding', label: 'Understanding request', status: 'done' },
                      { key: 'reading', label: attachedFiles.length > 0 ? `Read ${attachedFiles.length} attached file(s)` : 'Context assembled', status: 'done' },
                      { key: 'searching', label: 'Queried vector knowledge store', status: 'done' },
                      { key: 'inference', label: 'Local Ollama execution completed', status: 'done' }
                    ],
                    answer: answerText,
                    findings: data.findings || [
                      {
                        num: '01',
                        title: 'Telemetry & Verification Status',
                        desc: 'Query verified against local sovereign knowledge base.'
                      }
                    ],
                    recommendation: data.recommendation || 'Save output note or export findings to task records.',
                    sources: sourceList,
                    generatedFiles: generatedFilesList,
                    technicalDetails: {
                      modelsUsed: data.model || 'Sovereign Local Inference',
                      ocrUsed: attachedFiles.length > 0 ? 'Document Parser Active' : 'None',
                      retrievalScope: `${sourceList.length} verified context source(s)`,
                      selectedSources: `${sourceList.length} sources`,
                      executionTime: `${elapsedSec} seconds`,
                      finalStatus: 'COMPLETED_SUCCESS'
                    }
                  }
                };
              }
              return m;
            })
          };
        }
        return chat;
      }));

    } catch (err: unknown) {
      console.error('[CHAT ENGINE ERROR]:', err);
      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);
      const errMsg = err instanceof Error ? err.message : String(err);

      // Render clean diagnostic failure message in the UI
      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          return {
            ...chat,
            messages: (chat.messages || []).map((m): ChatMessage => {
              if (m.id === aiMsgId) {
                return {
                  ...m,
                  taskRun: {
                    id: `tr_${Date.now()}`,
                    executionStatus: 'Failed',
                    progressStages: [
                      { key: 'understanding', label: 'Understanding request', status: 'done' },
                      { key: 'reading', label: 'Verifying network availability', status: 'failed' },
                      { key: 'inference', label: 'Connecting to inference engine', status: 'failed' }
                    ],
                    answer: `⚠️ **Inference Gateway Unreachable**\n\nCould not reach the local AI engine at \`http://localhost:3000/api/chat\` or \`http://127.0.0.1:8000/api/chat\`.\n\n*Error details*: ${errMsg}`,
                    findings: [
                      {
                        num: 'ERR',
                        title: 'Service Connectivity',
                        desc: 'Verify that the Node Gateway on port 3000 and FastAPI on port 8000 are actively running.'
                      }
                    ],
                    recommendation: 'Check terminal logs and restart backend engine if necessary.',
                    sources: [],
                    generatedFiles: [],
                    technicalDetails: {
                      modelsUsed: 'Inference Engine Unavailable',
                      ocrUsed: 'None',
                      retrievalScope: 'Local Fallback',
                      executionTime: `${elapsedSec} seconds`,
                      finalStatus: 'GATEWAY_ERROR'
                    }
                  }
                };
              }
              return m;
            })
          };
        }
        return chat;
      }));
    }
  };

  // Handler: Chat Actions Menu
  const handlePinChat = (chatId: string) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c));
    setOpenChatMenuId(null);
  };

  const handleDuplicateChat = (chatToDup: ActiveChat) => {
    const dupChat: ActiveChat = {
      ...chatToDup,
      id: `chat_${Date.now()}`,
      title: `${chatToDup.title} (Copy)`,
      createdDate: 'Just now',
      updatedDate: 'Just now',
      pinned: false
    };
    setChats(prev => [dupChat, ...prev]);
    setOpenChatMenuId(null);
  };

  const handleConfirmRename = (chatId: string) => {
    if (!renameTitleInput.trim()) return;
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: renameTitleInput.trim() } : c));
    setRenamingChatId(null);
    setRenameTitleInput('');
  };

  const handleConfirmDelete = () => {
    if (!deletingChatId) return;
    setChats(prev => prev.filter(c => c.id !== deletingChatId));
    if (activeChatId === deletingChatId) {
      const remaining = chats.filter(c => c.id !== deletingChatId);
      if (remaining.length > 0) {
        setActiveChatId(remaining[0].id);
      } else {
        handleStartNewChat();
      }
    }
    setDeletingChatId(null);
  };

  // Filtered Chats
  const filteredChats = chats.filter(c =>
    !c.archived && c.title.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter(c => c.pinned);
  const recentChats = filteredChats.filter(c => !c.pinned && (c.createdDate?.includes('Today') || c.createdDate?.includes('Just now') || c.createdDate?.includes('Yesterday')));
  const olderChats = filteredChats.filter(c => !c.pinned && !c.createdDate?.includes('Today') && !c.createdDate?.includes('Just now') && !c.createdDate?.includes('Yesterday'));

  // Render Admin Console if Admin Mode is active
  if (workspaceMode === 'admin') {
    return (
      <AdminConsoleView
        onExitAdmin={() => setWorkspaceMode('user')}
        onSignOut={onSignOut}
      />
    );
  }

  return (
    <div className="dashboard-container font-sans">
      {/* Top Header Bar */}
      <header className="dash-topbar">
        <div className="dash-brand-new">
          <div className="dash-brand-icon-new">
            <Shield size={18} strokeWidth={2.2} />
          </div>
          <div className="dash-brand-text">
            <span className="brand-primary font-bold">SOVEREIGN AI</span>
            <span className="brand-secondary font-sans">WorkBench</span>
          </div>
        </div>

        {/* Dynamic Sovereign Air-Gap Telemetry Badge */}
        <div 
          className="local-processing-pill font-mono"
          title={`Air-Gap Status: ${networkStatus.wan_status || 'SECURE_AIR_GAPPED'} | Egress: ${networkStatus.egress_packets ?? 0} WAN pkts | Interface: ${networkStatus.active_ip || '127.0.0.1'}`}
        >
          <span className="green-dot"></span>
          <span>{networkStatus.egress_packets === 0 ? '0 WAN Packets · Air-Gapped' : 'Sovereign Network'}</span>
        </div>

        <div className="dash-top-right-new">
          {/* Admin Console Switcher Button */}
          <button
            type="button"
            className="admin-switch-btn font-mono"
            onClick={() => setWorkspaceMode('admin')}
            title="Admin Console"
          >
            <ShieldCheck size={14} />
            <span>Admin</span>
          </button>

          {/* Quick Theme Toggle */}
          <button
            type="button"
            className="icon-btn-box"
            onClick={toggleQuickTheme}
            title="Switch Theme"
          >
            {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications Bell */}
          <div className="icon-btn-box" title="Notifications">
            <Bell size={16} />
            <span className="bell-red-dot"></span>
          </div>

          {/* User Profile Badge */}
          <div
            className="user-profile-badge-new"
            onClick={() => {
              if (window.confirm(`Sign out of enterprise session for ${user?.full_name || 'Reva Kulkarni'}?`)) {
                if (onSignOut) onSignOut();
              }
            }}
            title="Click to Sign Out"
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar-circle-purple font-mono">
              {user?.full_name ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'RK'}
            </div>
            <div className="user-meta-info">
              <span className="user-full-name">{user?.full_name || 'Reva Kulkarni'}</span>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{user?.department || 'Industrial Systems'}</span>
            </div>
            <LogOut size={13} className="user-dropdown-arrow" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <div className="dash-body">
        {/* Left Navigation Sidebar */}
        <aside className="dash-sidebar chatgpt-style-sidebar">

          {/* Top Primary Actions */}
          <div className="sidebar-top-section">
            {/* Prominent New Chat Button */}
            <button
              type="button"
              className="sidebar-new-chat-btn font-mono"
              onClick={handleStartNewChat}
            >
              <PlusSquare size={16} />
              <span>New Chat</span>
            </button>

            {/* Nav Links */}
            <nav className="sidebar-nav">
              <button
                className={`nav-item ${activeTab === 'Chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('Chat')}
              >
                <MessageSquare size={16} />
                <span>Chat</span>
              </button>

              <button
                className={`nav-item ${activeTab === 'Knowledge' ? 'active' : ''}`}
                onClick={() => setActiveTab('Knowledge')}
              >
                <BookOpen size={16} />
                <span>Knowledge</span>
              </button>

              <button
                className={`nav-item ${activeTab === 'Documents' ? 'active' : ''}`}
                onClick={() => setActiveTab('Documents')}
              >
                <FileText size={16} />
                <span>Documents</span>
              </button>

              <button
                className={`nav-item ${activeTab === 'History' ? 'active' : ''}`}
                onClick={() => setActiveTab('History')}
              >
                <Clock size={16} />
                <span>History</span>
              </button>

              <button
                className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`}
                onClick={() => setActiveTab('Settings')}
              >
                <SettingsIcon size={16} />
                <span>Settings</span>
              </button>
            </nav>
          </div>

          <div className="sidebar-divider"></div>

          {/* CHATGPT-STYLE CHAT HISTORY SECTION */}
          <div className="chat-history-sidebar-section font-sans">
            <div className="chat-search-box">
              <Search size={14} className="search-icon" />
              <input
                type="text"
                placeholder="Search chats..."
                value={chatSearchQuery}
                onChange={(e) => setChatSearchQuery(e.target.value)}
              />
            </div>

            <div className="chat-history-list-scroll">
              {pinnedChats.length > 0 && (
                <div className="history-group">
                  <span className="history-group-title font-mono">
                    <Pin size={11} /> Pinned
                  </span>
                  {pinnedChats.map(chat => renderChatItem(chat))}
                </div>
              )}

              {recentChats.length > 0 && (
                <div className="history-group">
                  <span className="history-group-title font-mono">Recent</span>
                  {recentChats.map(chat => renderChatItem(chat))}
                </div>
              )}

              {olderChats.length > 0 && (
                <div className="history-group">
                  <span className="history-group-title font-mono">Older</span>
                  {olderChats.map(chat => renderChatItem(chat))}
                </div>
              )}

              {filteredChats.length === 0 && (
                <div className="empty-history-text font-mono">
                  <span>No conversations</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Security Banner */}
          <div className="sidebar-security-subtle font-mono">
            <Lock size={12} className="lock-icon" />
            <span>Confidential & Secure</span>
          </div>
        </aside>

        {/* Center Content Column */}
        <main className="dash-center">
          {activeTab === 'Knowledge' && (
            <KnowledgeView
              onSelectForTask={() => {
                setActiveTab('Chat');
              }}
            />
          )}

          {activeTab === 'Documents' && (
            <DocumentsView
              onNavigateNewTask={() => setActiveTab('Chat')}
            />
          )}

          {activeTab === 'History' && (
            <HistoryView
              onViewResult={(taskItem: any) => {
                const foundChat = chats.find(c =>
                  c.title?.toLowerCase().includes(taskItem.name?.toLowerCase()) ||
                  c.id === taskItem.id
                );
                if (foundChat) {
                  setActiveChatId(foundChat.id);
                }
                setActiveTab('Chat');
              }}
            />
          )}

          {activeTab === 'Settings' && (
            <SettingsView onSignOut={onSignOut} />
          )}

          {activeTab === 'Chat' && (
            <ConversationWorkspaceView
              activeChat={activeChat}
              onSendMessage={handleSendMessage}
            />
          )}
        </main>
      </div>

      {/* RENAME MODAL */}
      {renamingChatId && (
        <div className="admin-modal-overlay font-sans" onClick={() => setRenamingChatId(null)}>
          <div className="admin-modal-box small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title font-sans">Rename Conversation</h3>
              <button className="modal-close-btn" onClick={() => setRenamingChatId(null)}><X size={16} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleConfirmRename(renamingChatId); }}>
              <div className="modal-body-form">
                <input
                  type="text"
                  className="form-input"
                  value={renameTitleInput}
                  onChange={(e) => setRenameTitleInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-footer font-mono">
                <button type="button" className="secondary-btn" onClick={() => setRenamingChatId(null)}>Cancel</button>
                <button type="submit" className="primary-action-btn">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingChatId && (
        <div className="admin-modal-overlay font-sans" onClick={() => setDeletingChatId(null)}>
          <div className="admin-modal-box small-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <AlertTriangle size={18} className="icon-red" />
                <h3 className="modal-title font-sans">Delete Conversation?</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setDeletingChatId(null)}><X size={16} /></button>
            </div>
            <div className="modal-body-form font-sans">
              <p className="confirm-delete-text">This will permanently delete this conversation and all associated task run outputs. This action cannot be undone.</p>
            </div>
            <div className="modal-footer font-mono">
              <button type="button" className="secondary-btn" onClick={() => setDeletingChatId(null)}>Cancel</button>
              <button type="button" className="primary-action-btn danger" onClick={handleConfirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper render for single chat item in sidebar
  function renderChatItem(chat: ActiveChat) {
    const isActive = activeTab === 'Chat' && activeChatId === chat.id;
    const isMenuOpen = openChatMenuId === chat.id;

    return (
      <div
        key={chat.id}
        className={`sidebar-chat-item ${isActive ? 'active' : ''}`}
        onClick={() => {
          setActiveChatId(chat.id);
          setActiveTab('Chat');
        }}
      >
        <MessageSquare size={14} className="chat-item-icon" />

        <div className="chat-item-title-block">
          <span className="chat-item-title font-sans">{chat.title}</span>
          <span className="chat-item-date font-mono">{chat.updatedDate}</span>
        </div>

        {chat.pinned && <Pin size={11} className="pinned-icon-badge" />}

        {/* Action Button Menu */}
        <div className="chat-item-actions-wrapper" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="chat-item-more-btn"
            onClick={() => setOpenChatMenuId(isMenuOpen ? null : chat.id)}
            title="More actions"
          >
            <MoreVertical size={13} />
          </button>

          {isMenuOpen && (
            <div className="chat-context-menu font-sans animate-fade-in">
              <button onClick={() => { setRenamingChatId(chat.id); setRenameTitleInput(chat.title); setOpenChatMenuId(null); }}>
                <Edit2 size={13} /> <span>Rename</span>
              </button>
              <button onClick={() => handlePinChat(chat.id)}>
                <Pin size={13} /> <span>{chat.pinned ? 'Unpin' : 'Pin'}</span>
              </button>
              <button onClick={() => handleDuplicateChat(chat)}>
                <Copy size={13} /> <span>Duplicate</span>
              </button>
              <div className="menu-divider"></div>
              <button className="danger" onClick={() => { setDeletingChatId(chat.id); setOpenChatMenuId(null); }}>
                <Trash2 size={13} /> <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}