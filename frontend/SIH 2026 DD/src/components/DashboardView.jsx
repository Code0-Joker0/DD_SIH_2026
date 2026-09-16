import React, { useState, useEffect, useRef } from 'react';
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
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Clock,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  Plus
} from 'lucide-react';
import KnowledgeView from './KnowledgeView';
import HistoryView from './HistoryView';
import SettingsView from './SettingsView';
import ConversationWorkspaceView from './ConversationWorkspaceView';
import { useTheme } from '../context/useTheme';
import { INITIAL_CHATS, INITIAL_SOURCE_FILES, generateConversationTitle, getRelativeTimeLabel } from '../data/chatStore';

export default function DashboardView({ onSignOut, user }) {
  const { effectiveTheme, toggleQuickTheme } = useTheme();
  const [workspaceMode, setWorkspaceMode] = useState('user'); // 'user' | 'admin'
  const [activeTab, setActiveTab] = useState('Chat'); // 'Chat' | 'Knowledge' | 'History' | 'Settings'
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  
  const displayName = user?.username 
    ? (user.username.includes('@') ? user.username.split('@')[0] : user.username)
    : 'Reva Kulkarni';
  const displayInitials = displayName.length >= 2 ? displayName.slice(0, 2).toUpperCase() : displayName.toUpperCase();
  
  // Persistent Chats state initialized from localStorage
  const [chats, setChats] = useState(() => {
    try {
      const saved = localStorage.getItem('singularity_conversations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error('Failed to load saved chats', e);
    }
    return INITIAL_CHATS;
  });

  // Active chat ID state - default to null (empty chat workspace) unless restored from localStorage
  const [activeChatId, setActiveChatId] = useState(() => {
    try {
      const savedId = localStorage.getItem('singularity_active_chat_id');
      if (savedId && savedId !== 'null' && savedId !== 'undefined') return savedId;
    } catch (e) {
      // ignore
    }
    return null;
  });

  const [isAiThinking, setIsAiThinking] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  
  // Chat action dropdown & edit states
  const [openChatMenuId, setOpenChatMenuId] = useState(null);
  const [renamingChatId, setRenamingChatId] = useState(null);
  const [renameTitleInput, setRenameTitleInput] = useState('');
  const [deletingChatId, setDeletingChatId] = useState(null);
  const [renameError, setRenameError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [chatMenuPosition, setChatMenuPosition] = useState(null);
  const chatMenuRef = useRef(null);

  // Sync chats to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('singularity_conversations', JSON.stringify(chats));
    } catch (e) {
      // ignore
    }
  }, [chats]);

  // Sync activeChatId to localStorage
  useEffect(() => {
    try {
      if (activeChatId) {
        localStorage.setItem('singularity_active_chat_id', activeChatId);
      } else {
        localStorage.removeItem('singularity_active_chat_id');
      }
    } catch (e) {
      // ignore
    }
  }, [activeChatId]);

  // Close contextual menu when clicking outside
  useEffect(() => {
    if (!openChatMenuId) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.chat-item-actions-wrapper')) {
        setOpenChatMenuId(null);
        setChatMenuPosition(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openChatMenuId]);

  useEffect(() => {
    if (openChatMenuId) {
      chatMenuRef.current?.querySelector('button')?.focus();
    }
  }, [openChatMenuId]);

  const showToast = (message) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2600);
  };

  // Active chat object lookup
  const activeChat = activeChatId ? chats.find(c => c.id === activeChatId) : null;

  // Handler: Start New Thread (Clears workspace to empty state, does NOT create empty chat in sidebar)
  const handleStartNewChat = () => {
    setActiveChatId(null);
    setActiveTab('Chat');
  };

  // Handler: Send Message in Chat
  const handleSendMessage = ({ prompt, attachedFiles = [], sourcesCount = 0, aiMode = 'Auto (Recommended)' }) => {
    if (!prompt.trim() && attachedFiles.length === 0) return;

    const userMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: prompt,
      attachedFiles,
      selectedSourcesCount: sourcesCount
    };

    let targetChatId = activeChatId;

    // If no active chat exists, create a NEW conversation object on first message!
    if (!targetChatId || !chats.some(c => c.id === targetChatId)) {
      targetChatId = `chat_${Date.now()}`;
      const generatedTitle = generateConversationTitle(prompt);

      const newChatObj = {
        id: targetChatId,
        title: generatedTitle,
        userId: user?.username || 'usr_rkulkarni',
        createdDate: 'Just now',
        updatedDate: 'Just now',
        updatedAt: new Date().toISOString(),
        preview: prompt,
        sourceCount: sourcesCount,
        pinned: false,
        archived: false,
        attachedFileIds: [],
        selectedSourceDocumentIds: ['doc_001', 'doc_002'],
        knowledgeScope: 'selected',
        aiMode: aiMode,
        messages: [userMessage]
      };

      setChats(prev => [newChatObj, ...prev]);
      setActiveChatId(targetChatId);
    } else {
      // Append message to existing active conversation & update preview / timestamp
      setChats(prev => {
        const existing = prev.find(c => c.id === targetChatId);
        if (!existing) return prev;

        const updatedChat = {
          ...existing,
          preview: prompt,
          updatedDate: 'Just now',
          updatedAt: new Date().toISOString(),
          sourceCount: sourcesCount || existing.sourceCount,
          messages: [...(existing.messages || []), userMessage]
        };

        const others = prev.filter(c => c.id !== targetChatId);
        return [updatedChat, ...others];
      });
    }

    setIsAiThinking(true);

    // Simulate AI Task Run Response after 800ms
    setTimeout(() => {
      const aiResponseMsg = {
        id: `msg_ai_${Date.now()}`,
        sender: 'ai',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        taskRun: {
          id: `tr_${Date.now()}`,
          executionStatus: 'Completed',
          progressStages: [
            { key: 'understanding', label: 'Understanding request', status: 'done' },
            { key: 'reading', label: attachedFiles.length > 0 ? `Reading ${attachedFiles.length} attached file(s)` : 'Reading documents', status: 'done' },
            { key: 'searching', label: sourcesCount > 0 ? `Searching ${sourcesCount} selected source(s)` : 'Searching knowledge', status: 'done' },
            { key: 'comparing', label: 'Analyzing & verifying values', status: 'done' },
            { key: 'preparing', label: 'Preparing final answer', status: 'done' }
          ],
          answer: `I have processed your request ("${prompt}"). Cross-verification against your selected organizational documents indicates verified baseline operating conditions with routine maintenance recommendations.`,
          findings: [
            {
              num: '01',
              title: 'Primary Parameter Verification',
              desc: 'Extracted metrics match baseline standard operating procedure requirements.'
            },
            {
              num: '02',
              title: 'Source Cross-Verification',
              desc: 'Cross-verified across selected Qdrant vector index document references.'
            }
          ],
          recommendation: 'Archive this conversation run and export the generated summary PDF for your team record.',
          sources: INITIAL_SOURCE_FILES.slice(0, Math.min(sourcesCount || 2, 3)).map(d => d.name),
          generatedFiles: [
            { name: 'Executive_Summary_Report.pdf', size: '1.4 MB', type: 'PDF Summary' }
          ],
          technicalDetails: {
            modelsUsed: 'Autonomous Industrial Analysis Pipeline',
            ocrUsed: attachedFiles.length > 0 ? 'Applied PaddleOCR-VL' : 'None',
            retrievalScope: `Filtered by ${sourcesCount} selected document IDs`,
            selectedSources: `${sourcesCount} verified sources`,
            toolsUsed: 'Document Layout Parser · Safety Verifier',
            executionTime: '2.4 seconds',
            finalStatus: 'COMPLETED_SUCCESS'
          }
        }
      };

      setChats(prev => prev.map(chat => {
        if (chat.id === targetChatId) {
          return {
            ...chat,
            messages: [...(chat.messages || []), aiResponseMsg]
          };
        }
        return chat;
      }));

      setIsAiThinking(false);
    }, 800);
  };

  // Handler: Chat Actions Menu
  const handleOpenChat = (chatId) => {
    setActiveChatId(chatId);
    setActiveTab('Chat');
    setOpenChatMenuId(null);
    setChatMenuPosition(null);
  };

  const handlePinChat = (chatId) => {
    const chat = chats.find(item => item.id === chatId);
    if (!chat) return;
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, pinned: !c.pinned } : c));
    setOpenChatMenuId(null);
    setChatMenuPosition(null);
    showToast(chat.pinned ? 'Conversation unpinned' : 'Conversation pinned');
  };

  const handleConfirmRename = (chatId) => {
    const title = renameTitleInput.trim();
    if (!title) {
      setRenameError('Conversation name cannot be empty.');
      return;
    }
    setChats(prev => prev.map(c => c.id === chatId ? { ...c, title } : c));
    setRenamingChatId(null);
    setRenameTitleInput('');
    setRenameError('');
    showToast('Conversation renamed successfully');
  };

  const handleConfirmDelete = () => {
    if (!deletingChatId) return;
    setChats(prev => prev.filter(c => c.id !== deletingChatId));
    if (activeChatId === deletingChatId) {
      setActiveChatId(null);
      setActiveTab('Chat');
    }
    setDeletingChatId(null);
    showToast('Conversation deleted');
  };

  // Filtered & Sorted Chats
  const filteredChats = chats.filter(c => 
    !c.archived && `${c.title} ${c.preview || ''}`.toLowerCase().includes(chatSearchQuery.toLowerCase())
  );

  const pinnedChats = filteredChats
    .filter(c => c.pinned)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const recentChats = filteredChats
    .filter(c => !c.pinned)
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

  const historyItems = chats.flatMap(chat => {
    const taskRuns = (chat.messages || []).filter(message => message.taskRun).map(message => message.taskRun);
    if (taskRuns.length === 0) {
      return [{
        id: chat.id,
        chatId: chat.id,
        name: chat.title,
        aiMode: chat.aiMode || 'Auto (Recommended)',
        date: getRelativeTimeLabel(chat.updatedAt || chat.updatedDate),
        status: 'Completed'
      }];
    }
    return taskRuns.map(taskRun => ({
      id: taskRun.id,
      chatId: chat.id,
      name: chat.title,
      aiMode: chat.aiMode || 'Auto (Recommended)',
      date: getRelativeTimeLabel(chat.updatedAt || chat.updatedDate),
      status: taskRun.executionStatus === 'Completed' ? 'Completed' : taskRun.executionStatus || 'Completed'
    }));
  });

  const [knowledgeSelectedSources, setKnowledgeSelectedSources] = useState(null);

  return (
    <div className="dashboard-container-v2 font-sans">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isSidebarExpanded && (
        <div 
          className="sidebar-mobile-backdrop" 
          onClick={() => setIsSidebarExpanded(false)} 
          title="Close sidebar"
        />
      )}

      {/* 1. Ultra-sleek Expandable Sidebar Rail */}
      <aside className={`icon-sidebar-rail ${isSidebarExpanded ? 'expanded' : ''} font-sans`}>
        <div className="rail-top">
          {/* Top Logo & Expand/Collapse Toggle */}
          <div className="rail-header-row font-sans">
            <div 
              className="rail-brand-block" 
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              style={{ cursor: 'pointer' }}
              title={isSidebarExpanded ? "Singularity AI" : "Click to expand sidebar"}
            >
              <div className="rail-logo-box">
                <img src="/assets/singularity_logo.png" alt="Singularity AI" className="brand-logo-img" />
              </div>
              {isSidebarExpanded && (
                <span className="rail-brand-name font-bold">Singularity</span>
              )}
            </div>

            {isSidebarExpanded && (
              <button 
                type="button" 
                className="rail-toggle-btn"
                onClick={() => setIsSidebarExpanded(false)}
                title="Collapse Sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>

          {/* Vertical Icon & Text Navigation */}
          <nav className="rail-nav font-sans">
            <button
              className={`rail-nav-btn ${activeTab === 'Chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('Chat')}
              title="Chat Workspace"
            >
              <MessageSquare size={18} />
              {isSidebarExpanded && <span className="rail-nav-label">Chat</span>}
            </button>

            <button
              className={`rail-nav-btn ${activeTab === 'History' ? 'active' : ''}`}
              onClick={() => setActiveTab('History')}
              title="Conversation History"
            >
              <Clock size={18} />
              {isSidebarExpanded && <span className="rail-nav-label">History</span>}
            </button>

            <button
              className={`rail-nav-btn ${activeTab === 'Knowledge' ? 'active' : ''}`}
              onClick={() => setActiveTab('Knowledge')}
              title="Knowledge Sources"
            >
              <BookOpen size={18} />
              {isSidebarExpanded && <span className="rail-nav-label">Knowledge</span>}
            </button>
          </nav>

          {/* When Sidebar is Expanded, render Recent Chats section */}
          {isSidebarExpanded && (
            <div className="rail-chats-section font-sans animate-fade-in">
              <div className="rail-section-title-row">
                <span className="rail-section-title">CHATS</span>
                <button 
                  type="button" 
                  className="rail-new-chat-icon-btn" 
                  onClick={handleStartNewChat} 
                  title="New Chat"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div className="chat-search-box">
                <Search size={13} className="search-icon" />
                <input
                  type="search"
                  placeholder="Search chats..."
                  value={chatSearchQuery}
                  onChange={(event) => setChatSearchQuery(event.target.value)}
                  aria-label="Search chats"
                />
              </div>

              {pinnedChats.length > 0 && (
                <div className="history-group">
                  <div className="history-group-title font-mono">PINNED</div>
                  {pinnedChats.map(renderChatItem)}
                </div>
              )}

              <div className="history-group">
                <div className="history-group-title font-mono">RECENT</div>
                {recentChats.length > 0 ? (
                  recentChats.map(renderChatItem)
                ) : (
                  <div className="empty-history-text font-mono">No recent conversations</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="rail-bottom">
          {/* Theme Quick Toggle */}
          <button 
            type="button" 
            className="rail-nav-btn" 
            onClick={toggleQuickTheme}
            title="Switch Dark/Light Theme"
          >
            {effectiveTheme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
            {isSidebarExpanded && (
              <span className="rail-nav-label">
                {effectiveTheme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </span>
            )}
          </button>

          {/* Settings */}
          <button 
            className={`rail-nav-btn ${activeTab === 'Settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('Settings')}
            title="Settings"
          >
            <SettingsIcon size={18} />
            {isSidebarExpanded && <span className="rail-nav-label">Settings</span>}
          </button>

          {/* User Profile Avatar */}
          {isSidebarExpanded ? (
            <div 
              className="rail-avatar-box expanded-avatar-box font-sans" 
              onClick={() => setActiveTab('Settings')}
              title={`${displayName} (Account)`}
            >
              <div className="rail-avatar-circle font-mono">{displayInitials}</div>
              <div className="rail-avatar-info">
                <span className="avatar-name">{displayName}</span>
                <span className="avatar-role">Operations User</span>
              </div>
            </div>
          ) : (
            <div 
              className="rail-avatar-box font-mono" 
              onClick={() => setActiveTab('Settings')}
              title={`${displayName} (Account)`}
            >
              <span>{displayInitials}</span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Right Shell */}
      <div className="dash-main-shell font-sans">
        
        {/* Top Header Navigation matching reference screenshot */}
        <header className="dash-topbar-v2 font-sans">
          <div className="topbar-left font-sans">
            {!isSidebarExpanded && (
              <button 
                type="button" 
                className="rail-toggle-btn topbar-sidebar-toggle"
                onClick={() => setIsSidebarExpanded(true)}
                title="Expand Sidebar"
              >
                <PanelLeftOpen size={18} />
              </button>
            )}
          </div>

          <div className="topbar-right font-sans">
            {/* + New Chat Primary Button */}
            <button 
              type="button" 
              className="topbar-new-thread-btn font-sans"
              onClick={handleStartNewChat}
            >
              <span>+ New Chat</span>
            </button>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="dash-workspace-body font-sans">
          
          {/* Main Content Area */}
          <main className="dash-center font-sans">
            {activeTab === 'Knowledge' && (
              <KnowledgeView
                onSelectForTask={(sourceIds) => {
                  setKnowledgeSelectedSources(sourceIds);
                  setActiveTab('Chat');
                }}
              />
            )}

            {activeTab === 'History' && (
              <HistoryView
                historyItems={historyItems}
                onViewResult={(taskItem) => {
                  const foundChat = chats.find(c => c.id === taskItem.chatId || c.id === taskItem.id || c.title.toLowerCase().includes(taskItem.name.toLowerCase()));
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
                isAiThinking={isAiThinking}
                initialSelectedSourceIds={knowledgeSelectedSources}
                onRenameChat={(chatToRename) => {
                  setRenamingChatId(chatToRename.id);
                  setRenameTitleInput(chatToRename.title);
                }}
                onDeleteChat={(chatIdToDelete) => {
                  setDeletingChatId(chatIdToDelete);
                }}
              />
            )}
          </main>
        </div>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setRenamingChatId(null);
                  }}
                  autoFocus
                />
                {renameError && <p className="form-error-text">{renameError}</p>}
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
                <h3 className="modal-title font-sans">Delete conversation?</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setDeletingChatId(null)}><X size={16} /></button>
            </div>
            <div className="modal-body-form font-sans">
              <p className="confirm-delete-text">Are you sure you want to delete<br />'{chats.find(chat => chat.id === deletingChatId)?.title}'?</p>
              <p className="confirm-delete-text">This conversation and its chat history will be permanently removed.</p>
            </div>
            <div className="modal-footer font-mono">
              <button type="button" className="secondary-btn" onClick={() => setDeletingChatId(null)}>Cancel</button>
              <button type="button" className="primary-action-btn danger" onClick={handleConfirmDelete}>Delete conversation</button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && <div className="conversation-toast" role="status">{toastMessage}</div>}

    </div>
  );

  // Helper render for single chat item in sidebar
  function renderChatItem(chat) {
    const isActive = activeTab === 'Chat' && activeChatId === chat.id;
    const isMenuOpen = openChatMenuId === chat.id;

    return (
      <div 
        key={chat.id} 
        className={`sidebar-chat-item ${isActive ? 'active' : ''}`}
        onClick={() => handleOpenChat(chat.id)}
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
            onClick={(event) => {
              const nextOpen = isMenuOpen ? null : chat.id;
              setOpenChatMenuId(nextOpen);
              setChatMenuPosition(nextOpen ? { top: event.currentTarget.getBoundingClientRect().bottom + 4, left: event.currentTarget.getBoundingClientRect().right - 156 } : null);
            }}
            aria-label="Conversation actions"
            aria-expanded={isMenuOpen}
          >
            <MoreVertical size={13} />
          </button>

          {isMenuOpen && (
            <div ref={chatMenuRef} className="chat-context-menu font-sans animate-fade-in" style={chatMenuPosition || undefined} role="menu" onKeyDown={(event) => {
              const menuItems = [...event.currentTarget.querySelectorAll('button')];
              const currentIndex = menuItems.indexOf(document.activeElement);
              if (event.key === 'Escape') {
                setOpenChatMenuId(null);
                setChatMenuPosition(null);
              } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const nextIndex = event.key === 'ArrowDown' ? (currentIndex + 1) % menuItems.length : (currentIndex - 1 + menuItems.length) % menuItems.length;
                menuItems[nextIndex]?.focus();
              }
            }}>
              <button role="menuitem" onClick={() => handleOpenChat(chat.id)}>
                <MessageSquare size={13} /> <span>Open</span>
              </button>
              <button role="menuitem" onClick={() => { setRenamingChatId(chat.id); setRenameTitleInput(chat.title); setRenameError(''); setOpenChatMenuId(null); setChatMenuPosition(null); }}>
                <Pencil size={13} /> <span>Rename</span>
              </button>
              <button role="menuitem" onClick={() => handlePinChat(chat.id)}>
                <Pin size={13} /> <span>{chat.pinned ? 'Unpin' : 'Pin'}</span>
              </button>
              <div className="menu-divider"></div>
              <button role="menuitem" className="danger" onClick={() => { setDeletingChatId(chat.id); setOpenChatMenuId(null); setChatMenuPosition(null); }}>
                <Trash2 size={13} /> <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }
}
