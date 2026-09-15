import React, { useState, useRef, useEffect } from 'react';
import { 
  Paperclip, 
  Play, 
  Check, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Eye, 
  CheckCircle2, 
  X, 
  BookOpen, 
  CheckSquare, 
  Square,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { INITIAL_SOURCE_FILES } from '../data/chatStore';
import { executeAgentTask } from '../utils/api';

const SUGGESTION_CHIPS = [
  'Analyze',
  'Compare',
  'Summarize',
  'Extract',
  'Explain',
  'Calculate',
  'Generate'
];

const AI_MODES = [
  { id: 'auto', label: 'Auto (Recommended)', desc: 'Automatically determines capabilities' },
  { id: 'general', label: 'General Analysis', desc: 'Documents, research, summaries, reasoning' },
  { id: 'code', label: 'Code Assistance', desc: 'Code generation, debugging, scripts' },
  { id: 'vision', label: 'Vision & P&ID Analysis', desc: 'Schematics, P&IDs, blueprints, images' }
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.webp'];

export default function ConversationWorkspaceView({ activeChat, onSendMessage }) {
  const [promptInput, setPromptInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  
  // Knowledge scope & source selection state
  const [knowledgeScope, setKnowledgeScope] = useState('selected');
  const [selectedSourceIds, setSelectedSourceIds] = useState(['doc_001', 'doc_002', 'doc_005']);
  const [selectedAiMode, setSelectedAiMode] = useState('auto');
  
  // Dynamic UI dropdowns & modals
  const [isAiModeOpen, setIsAiModeOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [openExecutionDetailsMap, setOpenExecutionDetailsMap] = useState({});

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Close AI Mode picker when clicking anywhere outside
  useEffect(() => {
    if (!isAiModeOpen) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.ai-mode-picker-wrapper')) {
        setIsAiModeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAiModeOpen]);

  // Sync state when activeChat changes
  useEffect(() => {
    if (activeChat) {
      if (activeChat.knowledgeScope) setKnowledgeScope(activeChat.knowledgeScope);
      if (activeChat.selectedSourceDocumentIds) setSelectedSourceIds(activeChat.selectedSourceDocumentIds);
    }
  }, [activeChat?.id]);

  // Scroll to bottom of message thread
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages?.length]);

  const handleChipClick = (chip) => {
    if (!promptInput) {
      setPromptInput(`${chip} `);
    } else {
      setPromptInput(`${chip} ${promptInput}`);
    }
  };

  const processFiles = (files) => {
    setFileError('');
    const newFiles = [];
    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`Format '${ext}' unsupported. Allowed: PDF, DOCX, XLSX, PPTX, Images.`);
      } else {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        newFiles.push({
          name: file.name,
          size: `${sizeMb > 0 ? sizeMb : '0.8'} MB`,
          status: 'Ready'
        });
      }
    });

    if (newFiles.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeAttachment = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSelectSourceDoc = (id) => {
    setSelectedSourceIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllSourcesSelected = INITIAL_SOURCE_FILES.every(d => selectedSourceIds.includes(d.id));

  const toggleSelectAllSources = () => {
    if (isAllSourcesSelected) {
      setSelectedSourceIds([]);
    } else {
      setSelectedSourceIds(INITIAL_SOURCE_FILES.map(d => d.id));
    }
  };

  const toggleExecutionDetails = (msgId) => {
    setOpenExecutionDetailsMap(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!promptInput.trim() && attachedFiles.length === 0) return;

    const userPrompt = promptInput.trim();
    const currentFiles = [...attachedFiles];
    const sourcesCount = knowledgeScope === 'selected' ? selectedSourceIds.length : (knowledgeScope === 'all' ? INITIAL_SOURCE_FILES.length : 0);
    
    // Clear inputs
    setPromptInput('');
    setAttachedFiles([]);
    setFileError('');

    if (onSendMessage) {
      onSendMessage({
        prompt: userPrompt,
        attachedFiles: currentFiles,
        knowledgeScope,
        selectedSourceIds: knowledgeScope === 'selected' ? selectedSourceIds : [],
        sourcesCount,
        aiMode: AI_MODES.find(m => m.id === selectedAiMode)?.label || 'Auto (Recommended)'
      });
    }
  };

  const currentModeObj = AI_MODES.find(m => m.id === selectedAiMode);
  const isChatEmpty = !activeChat || !activeChat.messages || activeChat.messages.length === 0;

  // Reusable Composer Component
  const renderComposerForm = (isCenteredState = false) => (
    <form onSubmit={handleFormSubmit} className={`composer-form ${isCenteredState ? 'centered-composer-form' : ''}`}>
      
      {/* Attached Files Preview Strip */}
      {attachedFiles.length > 0 && (
        <div className="composer-attachments-strip font-mono">
          {attachedFiles.map((file, idx) => (
            <div key={idx} className="composer-attachment-pill">
              <FileText size={13} className="icon-blue" />
              <span className="file-name">{file.name}</span>
              <span className="file-size">{file.size}</span>
              <button 
                type="button" 
                className="remove-pill-btn" 
                onClick={() => removeAttachment(idx)}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {fileError && (
        <div className="file-error-row font-mono">
          <AlertCircle size={13} />
          <span>{fileError}</span>
        </div>
      )}

      {/* Main Composer Box with Subtle Neon-Blue Hover & Focus Glow */}
      <div className="composer-box">
        <textarea
          className="composer-textarea font-sans"
          placeholder="Ask a question or upload files..."
          value={promptInput}
          onChange={(e) => setPromptInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleFormSubmit(e);
            }
          }}
          rows={isCenteredState ? 3 : 2}
        />

        {/* Toolbar inside composer box */}
        <div className="composer-toolbar">
          <div className="composer-toolbar-left font-mono">
            {/* File Attachment Button */}
            <button 
              type="button" 
              className="composer-btn font-mono"
              onClick={() => fileInputRef.current?.click()}
              title="Add Files"
            >
              <Paperclip size={14} />
              <span>Add Files</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
            />

            {/* Source Selection Button */}
            <button 
              type="button" 
              className="composer-btn font-mono"
              onClick={() => setIsSourceModalOpen(true)}
              title="Select Sources"
            >
              <BookOpen size={14} />
              <span>
                {knowledgeScope === 'selected' ? `${selectedSourceIds.length} Sources` : knowledgeScope === 'all' ? 'All Sources' : 'Chat Only'}
              </span>
            </button>
          </div>

          <div className="composer-toolbar-right font-mono">
            {/* AI Mode Selector Dropdown */}
            <div className="ai-mode-picker-wrapper">
              <button
                type="button"
                className="ai-mode-picker-trigger font-mono"
                onClick={() => setIsAiModeOpen(!isAiModeOpen)}
              >
                <span>{currentModeObj?.label}</span>
                <ChevronDown size={13} />
              </button>

              {isAiModeOpen && (
                <div className="ai-mode-picker-menu">
                  {AI_MODES.map((mode) => (
                    <div
                      key={mode.id}
                      className={`mode-picker-item ${selectedAiMode === mode.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedAiMode(mode.id);
                        setIsAiModeOpen(false);
                      }}
                    >
                      <span className="mode-item-title font-sans">{mode.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Send Button */}
            <button 
              type="submit" 
              className="composer-send-btn font-mono"
              disabled={!promptInput.trim() && attachedFiles.length === 0}
            >
              <Play size={13} fill="currentColor" />
              <span>Send</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  return (
    <div className="chat-workspace-container font-sans">
      
      {/* 1. EMPTY CHAT STATE (CENTERED COMPOSER) */}
      {isChatEmpty ? (
        <div className="centered-chat-workspace font-sans">
          <div className="empty-welcome-header">
            <div className="empty-sparkle-badge">
              <Sparkles size={24} className="icon-blue" />
            </div>
            <h1 className="empty-welcome-heading font-sans">What would you like to work on?</h1>
          </div>

          {/* Large Centered Composer Box with Subtle Neon Glow */}
          <div className="centered-composer-container">
            {renderComposerForm(true)}
          </div>

          {/* Shortcut Chips Below Centered Composer */}
          <div className="centered-shortcuts-row font-mono">
            <div className="chips-scroll">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  className="shortcut-chip-btn"
                  onClick={() => handleChipClick(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 2. ACTIVE CHAT STATE (SCROLLABLE MESSAGES + BOTTOM COMPOSER) */
        <>
          {/* Top Conversation Header */}
          <header className="chat-topbar font-sans">
            <div className="chat-topbar-left">
              <h2 className="chat-topbar-title">{activeChat?.title || 'New Conversation'}</h2>
              <div className="chat-topbar-tags font-mono">
                {knowledgeScope === 'selected' && (
                  <button 
                    type="button" 
                    className="source-scope-badge"
                    onClick={() => setIsSourceModalOpen(true)}
                  >
                    <BookOpen size={12} />
                    <span>{selectedSourceIds.length} Sources</span>
                  </button>
                )}
                {knowledgeScope === 'all' && (
                  <span className="source-scope-badge muted">
                    <BookOpen size={12} />
                    <span>All Sources</span>
                  </span>
                )}
                {knowledgeScope === 'current' && (
                  <span className="source-scope-badge amber">
                    <Info size={12} />
                    <span>Chat Only</span>
                  </span>
                )}
              </div>
            </div>
          </header>

          {/* Scrollable Messages Area */}
          <div className="chat-messages-area font-sans">
            {activeChat.messages.map((msg, index) => (
              <div key={msg.id || index} className={`chat-message-row ${msg.sender === 'user' ? 'user-row' : 'ai-row'}`}>
                
                {/* USER MESSAGE BUBBLE */}
                {msg.sender === 'user' && (
                  <div className="user-message-wrapper">
                    <div className="user-message-bubble">
                      <p className="user-message-text">{msg.content}</p>

                      {msg.attachedFiles && msg.attachedFiles.length > 0 && (
                        <div className="user-attached-chips font-mono">
                          {msg.attachedFiles.map((file, idx) => (
                            <div key={idx} className="attached-file-chip">
                              <FileText size={13} />
                              <span>{file.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="msg-timestamp font-mono">{msg.timestamp || 'Just now'}</span>
                  </div>
                )}

                {/* AI MESSAGE RESPONSE CARD */}
                {msg.sender === 'ai' && (
                  <div className="ai-message-wrapper">
                    <div className="ai-message-card">

                      {/* 1. MAIN ANSWER BODY */}
                      {msg.taskRun?.answer && (
                        <div className="ai-answer-section">
                          <p className="ai-answer-text">{msg.taskRun.answer}</p>
                        </div>
                      )}

                      {/* 2. KEY FINDINGS */}
                      {msg.taskRun?.findings && msg.taskRun.findings.length > 0 && (
                        <div className="ai-findings-section">
                          <h4 className="findings-heading font-sans">Key Findings</h4>
                          <div className="findings-list">
                            {msg.taskRun.findings.map((finding, fIdx) => (
                              <div key={fIdx} className="finding-item">
                                <span className="finding-num font-mono">{finding.num}</span>
                                <div className="finding-content">
                                  <span className="finding-title">{finding.title}</span>
                                  <p className="finding-desc">{finding.desc}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 3. RECOMMENDATION */}
                      {msg.taskRun?.recommendation && (
                        <div className="ai-recommendation-box font-sans">
                          <span className="rec-label font-mono">Recommendation:</span>
                          <p className="rec-text">{msg.taskRun.recommendation}</p>
                        </div>
                      )}

                      {/* 4. SOURCES CITED */}
                      {msg.taskRun?.sources && msg.taskRun.sources.length > 0 && (
                        <div className="ai-sources-section">
                          <span className="sources-heading font-mono">Sources:</span>
                          <div className="sources-chips-row font-mono">
                            {msg.taskRun.sources.map((srcName, srcIdx) => (
                              <div key={srcIdx} className="source-chip">
                                <FileText size={12} />
                                <span>{srcName}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 5. GENERATED FILES */}
                      {msg.taskRun?.generatedFiles && msg.taskRun.generatedFiles.length > 0 && (
                        <div className="ai-generated-files-section">
                          <h4 className="findings-heading font-sans">Files</h4>
                          <div className="files-grid">
                            {msg.taskRun.generatedFiles.map((file, gIdx) => (
                              <div key={gIdx} className="generated-file-card">
                                <div className="file-card-left">
                                  <div className={`file-icon-box ${file.name.endsWith('.xlsx') ? 'xlsx-bg' : 'pdf-bg'}`}>
                                    {file.name.endsWith('.xlsx') ? (
                                      <FileSpreadsheet size={18} style={{ color: 'var(--accent-green)' }} />
                                    ) : (
                                      <FileText size={18} style={{ color: 'var(--accent-red)' }} />
                                    )}
                                  </div>
                                  <div className="file-info-block">
                                    <span className="file-name font-sans">{file.name}</span>
                                  </div>
                                </div>

                                <div className="file-card-actions font-mono">
                                  <button
                                    type="button"
                                    className="icon-action-btn primary"
                                    title="Download Deliverable Note"
                                    onClick={async () => {
                                      try {
                                        await executeAgentTask(activeChat?.title || 'Perform integrity assessment');
                                      } catch (err) {
                                        alert('Download failed: ' + err.message);
                                      }
                                    }}
                                  >
                                    <Download size={13} />
                                    <span>Download</span>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Composer Area */}
          <footer className="chat-composer-area font-sans">
            {renderComposerForm(false)}
          </footer>
        </>
      )}

      {/* SOURCE SELECTION MODAL */}
      {isSourceModalOpen && (
        <div className="admin-modal-overlay font-sans" onClick={() => setIsSourceModalOpen(false)}>
          <div className="admin-modal-box large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-row">
                <BookOpen size={18} />
                <h3 className="modal-title font-sans">Select Sources</h3>
              </div>
              <button className="modal-close-btn" onClick={() => setIsSourceModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body-form font-sans">
              <div className="knowledge-scope-radios">
                <label className={`radio-card ${knowledgeScope === 'selected' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="scope" 
                    value="selected" 
                    checked={knowledgeScope === 'selected'}
                    onChange={() => setKnowledgeScope('selected')}
                  />
                  <div className="radio-label-block">
                    <span className="radio-title">Selected Sources</span>
                  </div>
                </label>

                <label className={`radio-card ${knowledgeScope === 'all' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="scope" 
                    value="all" 
                    checked={knowledgeScope === 'all'}
                    onChange={() => setKnowledgeScope('all')}
                  />
                  <div className="radio-label-block">
                    <span className="radio-title">All Sources</span>
                  </div>
                </label>

                <label className={`radio-card ${knowledgeScope === 'current' ? 'active' : ''}`}>
                  <input 
                    type="radio" 
                    name="scope" 
                    value="current" 
                    checked={knowledgeScope === 'current'}
                    onChange={() => setKnowledgeScope('current')}
                  />
                  <div className="radio-label-block">
                    <span className="radio-title">Chat Only</span>
                  </div>
                </label>
              </div>

              {knowledgeScope === 'selected' && (
                <div className="selected-sources-box margin-top">
                  <div className="sources-header">
                    <span className="sources-title">Source Documents</span>
                    <span className="sources-count font-mono">{selectedSourceIds.length} Selected</span>
                  </div>

                  <div className="sources-checklist">
                    <div className="check-item header-item" onClick={toggleSelectAllSources}>
                      {isAllSourcesSelected ? (
                        <CheckSquare size={15} className="check-icon checked" />
                      ) : (
                        <Square size={15} className="check-icon" />
                      )}
                      <span className="check-label font-bold">Select All ({INITIAL_SOURCE_FILES.length})</span>
                    </div>

                    {INITIAL_SOURCE_FILES.map((doc) => {
                      const isChecked = selectedSourceIds.includes(doc.id);
                      return (
                        <div 
                          key={doc.id} 
                          className={`check-item ${isChecked ? 'selected' : ''}`}
                          onClick={() => toggleSelectSourceDoc(doc.id)}
                        >
                          {isChecked ? (
                            <CheckSquare size={15} className="check-icon checked" />
                          ) : (
                            <Square size={15} className="check-icon" />
                          )}
                          <div className="check-main-info">
                            <span className="check-label">{doc.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer font-mono">
              <button 
                className="secondary-btn"
                onClick={() => setIsSourceModalOpen(false)}
              >
                Cancel
              </button>
              <button 
                className="primary-action-btn"
                onClick={() => setIsSourceModalOpen(false)}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
