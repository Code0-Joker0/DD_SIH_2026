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
  Info,
  ArrowUp,
  User,
  Mail,
  MessageSquare,
  Code,
  Search,
  RotateCw,
  UploadCloud,
  ShieldCheck,
  Zap,
  Sliders,
  Edit2,
  Trash2,
  MoreVertical,
  Loader2
} from 'lucide-react';
import { INITIAL_SOURCE_FILES } from '../data/chatStore';

const AI_MODES = [
  { id: 'auto', label: 'Auto (Recommended)', tag: 'RECOMMENDED', desc: 'Auto-routes queries to optimal reasoning models', icon: Sparkles },
  { id: 'general', label: 'General Analysis', tag: 'RESEARCH & SOPs', desc: 'Executive summaries, compliance reasoning, policy audits', icon: FileText },
  { id: 'code', label: 'Code Assistance', tag: 'PYTHON & SCADA', desc: 'SCADA automation scripts, SQL queries, code debugging', icon: Code },
  { id: 'vision', label: 'Vision & P&ID Analysis', tag: 'BLUEPRINTS & SCHEMATICS', desc: 'P&ID diagrams, engineering schematics, visual OCR', icon: Eye }
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.webp'];

const PROMPT_EXAMPLE_SETS = [
  [
    { category: 'Productivity', text: 'Write a to-do list for a personal project', icon: User },
    { category: 'Communication', text: 'Generate an email to reply to a job offer', icon: Mail },
    { category: 'Summarization', text: 'Summarize key risk factors from selected SOP documents', icon: MessageSquare },
    { category: 'Technical Code', text: 'How does AI work in a technical capacity', icon: Code }
  ],
  [
    { category: 'Safety Audit', text: 'Review standard operating procedure P&ID pressure tolerances', icon: ShieldCheck },
    { category: 'Data Analysis', text: 'Compare vendor specification sheets side-by-side', icon: FileSpreadsheet },
    { category: 'Drafting', text: 'Draft an incident response plan for emergency shutdown procedures', icon: FileText },
    { category: 'Engineering', text: 'Analyze legacy piping schematic diagrams with vision OCR', icon: Eye }
  ]
];

export default function ConversationWorkspaceView({ activeChat, onSendMessage, onRenameChat, onDeleteChat, isAiThinking, initialSelectedSourceIds }) {
  const [promptInput, setPromptInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const [citationEnabled, setCitationEnabled] = useState(true);
  
  // Knowledge scope & source selection state
  const [knowledgeScope, setKnowledgeScope] = useState('selected');
  const [selectedSourceIds, setSelectedSourceIds] = useState(['doc_001', 'doc_002', 'doc_005']);
  const [selectedAiMode, setSelectedAiMode] = useState('auto');

  // Sync initialSelectedSourceIds from parent/Knowledge page if provided
  useEffect(() => {
    if (initialSelectedSourceIds && Array.isArray(initialSelectedSourceIds) && initialSelectedSourceIds.length > 0) {
      setSelectedSourceIds(initialSelectedSourceIds);
      setKnowledgeScope('selected');
    }
  }, [initialSelectedSourceIds]);
  
  // Dynamic UI dropdowns & modals
  const [isAiModeOpen, setIsAiModeOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [modalSourceSearch, setModalSourceSearch] = useState('');
  const [promptSetIdx, setPromptSetIdx] = useState(0);
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
    setPromptInput(chip);
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
    if (isAiThinking) return;
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

  // Reusable Composer Component (Refactored to match design reference)
  const renderComposerForm = (isCenteredState = false) => (
    <form onSubmit={handleFormSubmit} className={`composer-form ${isCenteredState ? 'centered-composer-form' : ''}`}>
      
      {/* Attached Files Preview Strip */}
      {attachedFiles.length > 0 && (
        <div className="composer-attachments-strip font-sans">
          {attachedFiles.map((file, idx) => (
            <div key={idx} className="composer-attachment-pill">
              <FileText size={13} style={{ color: 'var(--accent-royal)' }} />
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
        <div className="file-error-row font-sans">
          <AlertCircle size={13} />
          <span>{fileError}</span>
        </div>
      )}

      {/* Main Composer Card Container */}
      <div className="composer-box-v2 font-sans">
        
        {/* Textarea Input Row with Sparkle Icon */}
        <div className="composer-input-row font-sans">
          <Sparkles size={16} className="composer-sparkle-icon" />
          <textarea
            className="composer-textarea-v2 font-sans"
            placeholder="Ask AI a question or make a request."
            value={promptInput}
            onChange={(e) => setPromptInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isAiThinking) {
                  handleFormSubmit(e);
                }
              }
            }}
            rows={isCenteredState ? 3 : 2}
          />
        </div>

        {/* Toolbar inside composer box */}
        <div className="composer-toolbar-v2 font-sans">
          <div className="composer-toolbar-left font-sans">
            {/* Attach Button */}
            <button 
              type="button" 
              className="composer-pill-btn font-sans"
              onClick={() => fileInputRef.current?.click()}
              title="Attach Files"
            >
              <Paperclip size={14} />
              <span>@ Attach</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
            />

            {/* AI Mode Selector Dropdown */}
            <div className="ai-mode-picker-wrapper font-sans">
              <button
                type="button"
                className="composer-pill-btn font-sans"
                onClick={() => setIsAiModeOpen(!isAiModeOpen)}
              >
                <Sliders size={13} style={{ color: 'var(--accent-gold)' }} />
                <span>{currentModeObj?.label || 'Writing Styles'}</span>
                <ChevronDown size={13} />
              </button>

              {isAiModeOpen && (
                <div className="ai-mode-picker-menu font-sans animate-fade-in">
                  <div className="picker-header-title font-mono">SELECT AI WRITING MODE</div>
                  {AI_MODES.map((mode) => {
                    const ModeIcon = mode.icon;
                    const isSelected = selectedAiMode === mode.id;
                    return (
                      <div
                        key={mode.id}
                        className={`mode-picker-item ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedAiMode(mode.id);
                          setIsAiModeOpen(false);
                        }}
                      >
                        <div className="mode-item-left">
                          <ModeIcon size={16} className="mode-icon" />
                          <div className="mode-text-block">
                            <div className="mode-item-title-row">
                              <span className="mode-item-title font-sans">{mode.label}</span>
                              <span className="mode-tag-pill font-mono">{mode.tag}</span>
                            </div>
                            <span className="mode-item-desc font-sans">{mode.desc}</span>
                          </div>
                        </div>
                        {isSelected && <Check size={14} className="mode-check-gold" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Knowledge Sources Button */}
            <button 
              type="button" 
              className="composer-pill-btn font-sans"
              onClick={() => setIsSourceModalOpen(true)}
              title="Select Knowledge Sources"
            >
              <BookOpen size={13} />
              <span>
                {knowledgeScope === 'selected' ? `${selectedSourceIds.length} Sources` : 'All Sources'}
              </span>
            </button>
          </div>

          <div className="composer-toolbar-right font-sans">
            {/* Round Send Button */}
            <button 
              type="submit" 
              className="composer-send-circle-btn font-sans"
              disabled={(!promptInput.trim() && attachedFiles.length === 0) || isAiThinking}
              title="Send Request"
            >
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    </form>
  );

  return (
    <div className="chat-workspace-container font-sans">
      
      {/* 1. EMPTY CHAT STATE MATCHING REFERENCE SCREENSHOT */}
      {isChatEmpty ? (
        <div className="centered-chat-workspace-v2 font-sans">
          
          {/* Flat Floating Singularity Logo Emblem */}
          <div className="floating-hero-logo-wrapper font-sans">
            <img src="/assets/singularity_logo.png" alt="Singularity AI" className="floating-hero-logo-flat" />
          </div>

          {/* Welcome Titles */}
          <div className="hero-greeting-container font-sans">
            <h2 className="hero-greeting-sub font-sans">Good Afternoon, Reva</h2>
            <h1 className="hero-greeting-heading font-sans">
              What's on <span className="royal-blue-text-highlight">your mind?</span>
            </h1>
          </div>

          {/* Centered Composer Card Box */}
          <div className="centered-composer-container-v2 font-sans">
            {renderComposerForm(true)}
          </div>

          {/* GET STARTED WITH AN EXAMPLE BELOW - 4 Prompt Cards Grid */}
          <div className="prompt-examples-section font-sans">
            <div className="prompt-examples-header-row font-sans">
              <span className="prompt-examples-section-title font-sans">GET STARTED WITH AN EXAMPLE BELOW</span>
              <button 
                type="button" 
                className="refresh-prompts-btn font-mono"
                onClick={() => setPromptSetIdx((prev) => (prev + 1) % PROMPT_EXAMPLE_SETS.length)}
                title="Shuffle recommended prompts"
              >
                <RotateCw size={12} />
                <span>Shuffle examples</span>
              </button>
            </div>
            
            <div className="prompt-examples-grid font-sans">
              {PROMPT_EXAMPLE_SETS[promptSetIdx].map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div 
                    key={idx} 
                    className="prompt-example-card font-sans"
                    onClick={() => handleChipClick(item.text)}
                  >
                    <div className="card-top-category font-mono">
                      <span>{item.category}</span>
                    </div>
                    <p className="example-card-text font-sans">{item.text}</p>
                    <div className="example-card-icon-wrapper font-sans">
                      <IconComponent size={16} className="example-card-icon" />
                    </div>
                  </div>
                );
              })}
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
                                  <button className="icon-action-btn primary" title="Download">
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

            {isAiThinking && (
              <div className="chat-message-row ai-row">
                <div className="ai-message-wrapper">
                  <div className="ai-message-card thinking-card font-mono">
                    <Loader2 size={16} className="animate-spin text-gold" style={{ color: 'var(--accent-gold)' }} />
                    <span>AI is thinking & analyzing sources...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Composer Area */}
          <footer className="chat-composer-area font-sans">
            {renderComposerForm(false)}
          </footer>
        </>
      )}

      {/* KNOWLEDGE SOURCES MODAL */}
      {isSourceModalOpen && (
        <div className="admin-modal-overlay font-sans" onClick={() => setIsSourceModalOpen(false)}>
          <div className="admin-modal-box large-modal font-sans" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header font-sans">
              <div className="modal-title-row font-sans">
                <div className="modal-icon-badge">
                  <BookOpen size={18} style={{ color: 'var(--accent-gold)' }} />
                </div>
                <div>
                  <h3 className="modal-title font-sans">Knowledge Sources Selector</h3>
                  <span className="modal-subtitle-text font-mono">Qdrant Vector Index</span>
                </div>
              </div>
              <button className="modal-close-btn" onClick={() => setIsSourceModalOpen(false)}>
                <X size={15} />
              </button>
            </div>

            <div className="modal-body-form font-sans">
              {/* Progress & Selection Counter */}
              <div className="modal-sources-progress-card font-sans">
                <div className="progress-card-top font-sans">
                  <span className="sources-count-text">
                    <strong>{selectedSourceIds.length}</strong> of {INITIAL_SOURCE_FILES.length} sources selected for query context
                  </span>
                  <span className="sources-pct font-mono">
                    {Math.round((selectedSourceIds.length / INITIAL_SOURCE_FILES.length) * 100)}% active
                  </span>
                </div>
                <div className="modal-progress-bar-track">
                  <div 
                    className="modal-progress-bar-fill" 
                    style={{ width: `${(selectedSourceIds.length / INITIAL_SOURCE_FILES.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Search & Action Controls */}
              <div className="modal-sources-controls-row">
                <div className="subpage-search-box modal-search font-sans">
                  <Search size={14} className="search-icon" />
                  <input 
                    type="text" 
                    placeholder="Search sources by name or department..." 
                    value={modalSourceSearch}
                    onChange={(e) => setModalSourceSearch(e.target.value)}
                  />
                  {modalSourceSearch && (
                    <button className="search-clear-btn" onClick={() => setModalSourceSearch('')}><X size={12} /></button>
                  )}
                </div>

                <div className="modal-sources-quick-actions font-mono">
                  <button type="button" className="secondary-pill-btn font-mono" onClick={toggleSelectAllSources}>
                    {isAllSourcesSelected ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              {/* Sources Checklist */}
              <div className="sources-checklist font-sans">
                {INITIAL_SOURCE_FILES.filter(doc => 
                  doc.name.toLowerCase().includes(modalSourceSearch.toLowerCase()) || 
                  doc.department.toLowerCase().includes(modalSourceSearch.toLowerCase())
                ).map((doc) => {
                  const isChecked = selectedSourceIds.includes(doc.id);
                  return (
                    <div 
                      key={doc.id} 
                      className={`check-item ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleSelectSourceDoc(doc.id)}
                    >
                      <div className="check-box-icon font-mono">
                        {isChecked ? (
                          <CheckSquare size={16} className="check-icon checked" style={{ color: 'var(--accent-gold)' }} />
                        ) : (
                          <Square size={16} className="check-icon text-muted" />
                        )}
                      </div>

                      <div className="check-main-info font-sans">
                        <div className="check-title-row">
                          <span className="check-label font-sans">{doc.name}</span>
                          <span className="doc-dept-badge font-mono">{doc.department}</span>
                        </div>
                        <div className="check-sub-info font-mono">
                          <span>{doc.fileSize}</span>
                          <span>&middot;</span>
                          <span className="status-badge-green-inline"><CheckCircle2 size={11} /> Ready in Qdrant</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-footer font-sans">
              <button className="secondary-btn font-sans" onClick={() => setIsSourceModalOpen(false)}>
                Cancel
              </button>
              <button className="primary-action-btn font-sans" onClick={() => setIsSourceModalOpen(false)}>
                Apply Selected Sources ({selectedSourceIds.length})
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
