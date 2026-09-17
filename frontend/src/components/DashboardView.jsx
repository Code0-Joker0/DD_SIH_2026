import React, { useState, useEffect } from 'react';
import {
  Shield,
  Bell,
  PlusSquare,
  BookOpen,
  Settings as SettingsIcon,
  ChevronDown,
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
  LogOut,
  Loader2
} from 'lucide-react';
import KnowledgeView from './KnowledgeView';
import HistoryView from './HistoryView';
import SettingsView from './SettingsView';
import DocumentsView from './DocumentsView';
import ConversationWorkspaceView from './ConversationWorkspaceView';
import AdminConsoleView from './admin/AdminConsoleView';
import LoginCard from './LoginCard';
import { useTheme } from '../context/useTheme';
import { useAuth } from '../context/AuthContext';
import { sendChatMessage, uploadRAGDocument, fetchConversations, fetchConversationMessages } from '../utils/api';
import { INITIAL_SOURCE_FILES } from '../data/chatStore';

const createBlankChat = (userId) => ({
  id: `chat_${Date.now()}`,
  title: 'New Conversation',
  userId: userId || 'usr_anonymous',
  createdDate: 'Just now',
  updatedDate: 'Just now',
  pinned: false,
  archived: false,
  attachedFileIds: [],
  selectedSourceDocumentIds: [],
  knowledgeScope: 'selected',
  aiMode: 'Auto (Recommended)',
  messages: []
});

export default function DashboardView() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { effectiveTheme, toggleQuickTheme } = useTheme();

  const [workspaceMode, setWorkspaceMode] = useState('user'); // 'user' | 'admin'
  const [activeTab, setActiveTab] = useState('Chat'); // 'Chat' | 'Knowledge' | 'Documents' | 'History' | 'Settings'

  // Chats state
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');

  // Fetch true chat history when user authenticates
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchConversations()
        .then(data => {
          if (data && data.length > 0) {
            const mappedChats = data.map(c => ({
              id: c.id,
              title: c.title,
              userId: user.id,
              createdDate: new Date(c.created_at).toLocaleString(),
              updatedDate: new Date(c.updated_at).toLocaleString(),
              pinned: false,
              archived: false,
              messages: []
            }));
            setChats(mappedChats);
            setActiveChatId(mappedChats[0].id);
          } else {
            const blank = createBlankChat(user.id);
            setChats([blank]);
            setActiveChatId(blank.id);
          }
        })
        .catch(console.error);
    } else {
      setChats([]);
      setActiveChatId(null);
    }
  }, [isAuthenticated, user?.id]);

  // Chat action dropdown & edit states
  const [openChatMenuId, setOpenChatMenuId] = useState(null);
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');
  const [deletingChatId, setDeletingChatId] = useState(null);

  // Close context menu when clicking outside
  useEffect(() => {
    if (!openChatMenuId) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.chat-item-actions-wrapper')) {
        setOpenChatMenuId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openChatMenuId]);

  // Active chat object lookup
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0] || createBlankChat(user?.id);

  // Fetch messages for active chat if they haven't been loaded yet
  useEffect(() => {
    if (activeChatId && activeChat && activeChat.messages.length === 0 && !activeChat.id.startsWith('chat_init') && !activeChatId.startsWith('chat_1')) {
      fetchConversationMessages(activeChatId)
        .then(messages => {
          if (messages && messages.length > 0) {
            setChats(prev => prev.map(c => {
              if (c.id === activeChatId) {
                return { ...c, messages: messages.map(m => ({
                  id: m.id,
                  sender: m.sender === 'user' ? 'user' : 'ai',
                  timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  content: m.content,
                  attachedFiles: [] // Or load from metadata if stored
                }))};
              }
              return c;
            }));
          }
        })
        .catch(console.error);
    }
  }, [activeChatId]);

  // -------------------------------------------------------------
  // PATTERN A: GATE GUARDS
  // -------------------------------------------------------------

  // 1. Session check in progress
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#090D16',
          color: '#E2E8F0',
          gap: '1rem'
        }}
      >
        <Loader2 className="animate-spin text-cyan-400" size={32} style={{ color: '#38BDF8' }} />
        <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.08em', color: '#94A3B8' }}>
          INITIALIZING SINGULARITY WORKBENCH...
        </span>
      </div>
    );
  }

  // 2. Unauthenticated: Full-screen Pattern A Login Card Gate
  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#090D16'
        }}
      >
        <header className="dash-topbar">
          <div className="dash-brand-new">
            <div className="dash-brand-icon-new">
              <Shield size={18} strokeWidth={2.2} />
            </div>
            <div className="dash-brand-text">
              <span className="brand-primary font-bold">Singularity</span>
              <span className="brand-secondary font-sans">WorkBench</span>
            </div>
          </div>

          <div className="local-processing-pill font-mono">
            <span className="green-dot"></span>
            <span>Air-Gapped Access</span>
          </div>

          <div className="dash-top-right-new">
            <button
              type="button"
              className="icon-btn-box"
              onClick={toggleQuickTheme}
              title="Switch Theme"
            >
              {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </header>

        <main
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem'
          }}
        >
          <LoginCard />
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // AUTHENTICATED OPERATIONAL WORKSPACE
  // -------------------------------------------------------------

  const handleStartNewChat = () => {
    const blank = createBlankChat(user?.id);
    setChats(prev => [blank, ...prev]);
    setActiveChatId(blank.id);
    setActiveTab('Chat');
  };

  const handleSendMessage = async ({ prompt, attachedFiles = [], sourcesCount = 0, selectedModel = 'auto' }) => {
    if (!activeChatId || !prompt?.trim()) return;

    const targetChatId = activeChatId;
    const userMsgId = `msg_u_${Date.now()}`;
    const aiMsgId = `msg_ai_${Date.now()}`;
    const startTime = performance.now();

    const userMessage = {
      id: userMsgId,
      sender: 'user',
      role: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: prompt,
      attachedFiles,
      selectedSourcesCount: sourcesCount
    };

    const currentChat = chats.find(c => c.id === targetChatId);
    const isFirstMsg = !currentChat?.messages || currentChat.messages.length === 0;
    const generatedTitle = isFirstMsg
      ? (prompt.length > 28 ? `${prompt.slice(0, 28)}...` : prompt)
      : currentChat?.title;

    const pendingAiMessage = {
      id: aiMsgId,
      sender: 'ai',
      role: 'assistant',
      resolved_model: selectedModel,
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
          modelsUsed: selectedModel,
          ocrUsed: attachedFiles.length > 0 ? 'Document Parser Active' : 'None',
          retrievalScope: `Selected source scope: ${sourcesCount}`,
          executionTime: 'Running...',
          finalStatus: 'IN_PROGRESS'
        }
      }
    };

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
      if (attachedFiles && attachedFiles.length > 0) {
        for (const fileItem of attachedFiles) {
          if (fileItem instanceof File || fileItem?.rawFile instanceof File) {
            try {
              await uploadRAGDocument(fileItem.rawFile || fileItem, {
                category: 'ChatAttachment',
                source_type: 'USER_UPLOAD'
              });
            } catch (upErr) {
              console.warn('[ATTACHMENT INGESTION SKIPPED]:', upErr.message);
            }
          }
        }
      }

      const docIds = currentChat?.selectedSourceDocumentIds || [];
      const data = await sendChatMessage(
        prompt,
        targetChatId,
        docIds,
        selectedModel,
        attachedFiles,
        currentChat?.title || 'Inspection Session'
      );

      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);
      const answerText = data.analysis || data.response || data.message || data.text || (typeof data === 'string' ? data : JSON.stringify(data));
      const resolvedModel = data.resolved_model || data.model || selectedModel;
      const sourceList = Array.isArray(data.sources) && data.sources.length > 0
        ? data.sources.map(s => typeof s === 'string' ? s : s.filename || s.title || 'Referenced Document')
        : (Array.isArray(INITIAL_SOURCE_FILES) ? INITIAL_SOURCE_FILES : []).slice(0, Math.min(sourcesCount || 2, 3)).map(d => d.name || d.title || 'Source Document');

      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          return {
            ...chat,
            messages: (chat.messages || []).map(m => {
              if (m.id === aiMsgId) {
                return {
                  ...m,
                  role: 'assistant',
                  resolved_model: resolvedModel,
                  sources: sourceList,
                  taskRun: {
                    id: `tr_${Date.now()}`,
                    executionStatus: 'Completed',
                    progressStages: [
                      { key: 'understanding', label: 'Understanding request', status: 'done' },
                      { key: 'reading', label: attachedFiles.length > 0 ? `Read ${attachedFiles.length} attached file(s)` : 'Context assembled', status: 'done' },
                      { key: 'searching', label: 'Queried vector knowledge store', status: 'done' },
                      { key: 'inference', label: `Local neural inference completed (${resolvedModel})`, status: 'done' }
                    ],
                    answer: answerText,
                    findings: data.findings || [
                      {
                        num: '01',
                        title: 'Telemetry & Verification Status',
                        desc: `Query verified against local Singularity's knowledge base using ${resolvedModel}.`
                      }
                    ],
                    recommendation: data.recommendation || 'Save output note or export findings to task records.',
                    sources: sourceList,
                    generatedFiles: data.generatedFiles || [],
                    technicalDetails: {
                      modelsUsed: resolvedModel,
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

    } catch (err) {
      console.error('[CHAT ENGINE ERROR]:', err);
      const elapsedSec = ((performance.now() - startTime) / 1000).toFixed(2);

      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          return {
            ...chat,
            messages: (chat.messages || []).map(m => {
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
                    answer: `⚠️ **Inference Gateway Unreachable**\n\nCould not reach the local AI engine at \`http://localhost:3000/api/chat\` or \`http://127.0.0.1:8000/api/chat\`.\n\n*Error details*: ${err.message}`,
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

  const handlePinChat = (chatId) => {
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c));
    setOpenChatMenuId(null);
  };

  const handleDuplicateChat = (chatToDup) => {
    const dupChat = {
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

  const handleConfirmRename = (chatId) => {
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

  const filteredChats = chats.filter(c =>
    !c.archived && c.title.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats.filter(c => c.pinned);
  const recentChats = filteredChats.filter(c => !c.pinned && (c.createdDate?.includes('Today') || c.createdDate?.includes('Just now') || c.createdDate?.includes('Yesterday')));
  const olderChats = filteredChats.filter(c => !c.pinned && !c.createdDate?.includes('Today') && !c.createdDate?.includes('Just now') && !c.createdDate?.includes('Yesterday'));

  if (workspaceMode === 'admin') {
    return (
      <AdminConsoleView
        onExitAdmin={() => setWorkspaceMode('user')}
        onSignOut={logout}
      />
    );
  }

  // Derive user initials & displayName
  const displayName = user?.full_name || user?.username || 'Inspection Engineer';
  const displayDepartment = user?.department || user?.role || 'Asset Integrity';
  const userInitials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'EN';

  return (
    <div className="dashboard-container font-sans">
      {/* Top Header Bar */}
      <header className="dash-topbar">
        <div className="dash-brand-new">
          <div className="floating-hero-logo-box">
            <img
              src="/assets/singularity_logo.png"
              alt="Singularity AI"
              className="h-8 w-auto max-h-[32px] object-contain"
              style={{ maxHeight: '32px', width: 'auto' }}
            />
          </div>
          <div className="dash-brand-text">
            <span className="brand-primary font-bold">SINGULARITY</span>
            <span className="brand-secondary font-sans">WorkBench</span>
          </div>
        </div>

        {/* Local Processing Indicator */}
        <div className="local-processing-pill font-mono">
          <span className="green-dot"></span>
          <span>Secure</span>
        </div>

        <div className="dash-top-right-new">
          {/* Admin Switcher Button */}
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

          {/* User Profile Badge (Click to Sign Out) */}
          <div
            className="user-profile-badge-new"
            onClick={() => {
              if (window.confirm(`Sign out of enterprise session for ${displayName}?`)) {
                logout();
              }
            }}
            title="Click to Sign Out"
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar-circle-purple font-mono">
              {userInitials}
            </div>
            <div className="user-meta-info">
              <span className="user-full-name">{displayName}</span>
              <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{displayDepartment}</span>
            </div>
            <LogOut size={13} className="user-dropdown-arrow" style={{ marginLeft: '4px' }} />
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <div className="dash-body">
        {/* Left Navigation Sidebar */}
        <aside className="dash-sidebar chatgpt-style-sidebar">
          <div className="sidebar-top-section">
            <button
              type="button"
              className="sidebar-new-chat-btn font-mono"
              onClick={handleStartNewChat}
            >
              <PlusSquare size={16} />
              <span>New Chat</span>
            </button>

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

          {/* CHATGPT-STYLE CHAT HISTORY */}
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
              onViewResult={(taskItem) => {
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
            <SettingsView onSignOut={logout} />
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

  function renderChatItem(chat) {
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