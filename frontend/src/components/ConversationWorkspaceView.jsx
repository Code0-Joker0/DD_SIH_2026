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
import { executeAgentTask, fetchModels } from '../utils/api';

const SUGGESTION_CHIPS = [
  'Analyze',
  'Compare',
  'Summarize',
  'Extract',
  'Explain',
  'Calculate',
  'Generate'
];

const DEFAULT_MODELS = [
  { id: 'auto', label: 'Auto (Recommended)', tag: 'Adaptive', icon: '✨', desc: 'Auto-evaluates query intent and routes to optimal sovereign model' },
  { id: 'llama3.2:3b', label: 'Llama 3.2 (3B)', tag: 'Fast', icon: '⚡', desc: 'Ultra-fast low-latency sovereign engine for quick conversational QA' },
  { id: 'qwen2.5:7b', label: 'Qwen 2.5 (7B)', tag: 'Technical QA', icon: '🔍', desc: 'Deep statutory synthesis (API 570/510, ASME, OISD-118)' },
  { id: 'llama3.1:8b', label: 'Llama 3.1 (8B)', tag: 'Agent & Tools', icon: '🛠️', desc: 'Multi-turn agent reasoning, tool execution, and document synthesis' },
  { id: 'deepseek-r1:7b', label: 'DeepSeek-R1 (7B)', tag: 'Calculations', icon: '🧠', desc: 'Reasoning engine for corrosion rates, wall loss % & remaining life math' }
];

const MODEL_LABEL_MAP = {
  'auto': { label: 'Auto (Recommended)', tag: 'Adaptive', icon: '✨', desc: 'Auto-evaluates query intent and routes to optimal sovereign model' },
  'llama3.2:3b': { label: 'Llama 3.2 (3B)', tag: 'Fast', icon: '⚡', desc: 'Ultra-fast low-latency sovereign engine for quick conversational QA' },
  'qwen2.5:7b': { label: 'Qwen 2.5 (7B)', tag: 'Technical QA', icon: '🔍', desc: 'Deep statutory synthesis (API 570/510, ASME, OISD-118)' },
  'llama3.1:8b': { label: 'Llama 3.1 (8B)', tag: 'Agent & Tools', icon: '🛠️', desc: 'Multi-turn agent reasoning, tool execution, and document synthesis' },
  'deepseek-r1:7b': { label: 'DeepSeek-R1 (7B)', tag: 'Calculations', icon: '🧠', desc: 'Reasoning engine for corrosion rates, wall loss % & remaining life math' }
};

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.webp'];

export default function ConversationWorkspaceView({ activeChat, onSendMessage }) {
  const [promptInput, setPromptInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  
  // Knowledge scope & source selection state
  const [knowledgeScope, setKnowledgeScope] = useState('selected');
  const [selectedSourceIds, setSelectedSourceIds] = useState(['doc_001', 'doc_002', 'doc_005']);

  // Sovereign AI Model switcher state
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [openExecutionDetailsMap, setOpenExecutionDetailsMap] = useState({});

  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch available models on component mount
  useEffect(() => {
    let isMounted = true;
    async function loadModels() {
      try {
        const data = await fetchModels();
        if (isMounted && data && Array.isArray(data.models) && data.models.length > 0) {
          const mapped = data.models.map((m) => {
            const modelId = typeof m === 'string' ? m : m.id || m.name;
            const meta = MODEL_LABEL_MAP[modelId];
            return {
              id: modelId,
              label: meta?.label || (typeof m === 'object' && m.label ? m.label : modelId),
              tag: meta?.tag || 'Local',
              icon: meta?.icon || '🤖',
              desc: meta?.desc || `Sovereign ${modelId} inference model`
            };
          });
          setAvailableModels(mapped);
          if (data.default && mapped.some(m => m.id === data.default)) {
            setSelectedModel(data.default);
          }
        }
      } catch (err) {
        console.warn('[Failed to fetch available models, fallback to default list]:', err);
      }
    }
    loadModels();
    return () => { isMounted = false; };
  }, []);

  // Close Model picker when clicking anywhere outside
  useEffect(() => {
    if (!isModelPickerOpen) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.model-picker-wrapper')) {
        setIsModelPickerOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isModelPickerOpen]);

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

  const currentModelObj = availableModels.find(m => m.id === selectedModel) || availableModels[0] || DEFAULT_MODELS[0];

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
        aiMode: currentModelObj?.label || 'Auto (Recommended)',
        selectedModel
      });
    }
  };

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
            {/* Model Selection Dropdown - In Place of Auto(Recommended) */}
            <div className="model-picker-wrapper">
              <button
                type="button"
                className="model-picker-trigger font-mono"
                onClick={() => setIsModelPickerOpen(!isModelPickerOpen)}
                title="Select Local AI Inference Engine"
              >
                <span className="model-trigger-icon">{currentModelObj?.icon || '⚡'}</span>
                <span className="model-trigger-label font-sans">{currentModelObj?.label || 'Auto (Recommended)'}</span>
                <ChevronDown size={13} className={`model-chevron-icon ${isModelPickerOpen ? 'open' : ''}`} />
              </button>

              {isModelPickerOpen && (
                <div className="model-picker-menu animate-fade-in font-sans">
                  <div className="model-picker-header font-mono">
                    <span>Sovereign Local Engine</span>
                  </div>
                  {availableModels.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <div
                        key={model.id}
                        className={`model-picker-item ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedModel(model.id);
                          setIsModelPickerOpen(false);
                        }}
                      >
                        <div className="model-item-top">
                          <div className="model-item-title-row">
                            <span className="model-icon">{model.icon || '🤖'}</span>
                            <span className="model-name">{model.label}</span>
                          </div>
                          {model.tag && (
                            <span className="model-tag-badge font-mono">{model.tag}</span>
                          )}
                        </div>
                        {model.desc && (
                          <p className="model-item-desc">{model.desc}</p>
                        )}
                      </div>
                    );
                  })}
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
            <div className="chat-topbar-left flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="chat-topbar-title">{activeChat?.title || 'New Conversation'}</h2>
              </div>

              <div className="chat-topbar-tags font-mono flex items-center gap-2 flex-wrap">
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
                {(msg.sender === 'ai' || msg.role === 'assistant') && (
                  <div className="ai-message-wrapper">
                    {/* Weight Swapping & Reasoning Loading Animation */}
                    {(msg.taskRun?.executionStatus === 'Processing' || (!msg.taskRun?.answer && !msg.content && !msg.text)) ? (
                      <div className="flex items-start gap-3 p-3.5 my-3 bg-slate-900/70 border border-cyan-500/30 rounded-xl text-slate-300 text-xs animate-pulse shadow-md w-full max-w-xl">
                        <div className="relative flex h-3 w-3 mt-0.5">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-cyan-300">
                            {selectedModel === 'auto'
                              ? 'Evaluating intent & routing to optimal sovereign model...'
                              : `Allocating weights for ${selectedModel}...`}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            Swapping model weights in RTX 3050 VRAM & synthesizing Qdrant knowledge context
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="ai-message-card">

                        {/* 1. MAIN ANSWER BODY */}
                        {msg.taskRun?.answer && (
                          <div className="ai-answer-section">
                            <p className="ai-answer-text">{msg.taskRun.answer}</p>
                          </div>
                        )}
                        {(!msg.taskRun?.answer && (msg.content || msg.text)) && (
                          <div className="ai-answer-section">
                            <p className="ai-answer-text">{msg.content || msg.text}</p>
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

                        {/* 6. ENGINE ATTRIBUTION BADGE */}
                        {(msg.resolved_model || msg.taskRun?.technicalDetails?.modelsUsed) && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/60">
                              ⚡ Engine: <span className="text-cyan-400 font-semibold">{msg.resolved_model || msg.taskRun?.technicalDetails?.modelsUsed}</span>
                            </span>
                            {((msg.sources && msg.sources.length > 0) || (msg.taskRun?.sources && msg.taskRun.sources.length > 0)) && (
                              <span className="text-slate-500">
                                📚 {(msg.sources || msg.taskRun?.sources || []).length} Verified Sources
                              </span>
                            )}
                          </div>
                        )}

                      </div>
                    )}
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
