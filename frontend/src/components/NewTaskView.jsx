import React, { useState, useRef } from 'react';
import { 
  FileText, 
  Upload, 
  X, 
  Check, 
  ChevronDown, 
  Play, 
  CheckSquare, 
  Square,
  AlertCircle
} from 'lucide-react';

const SUGGESTION_CHIPS = [
  'Analyze',
  'Compare',
  'Search',
  'Summarize',
  'Calculate',
  'Extract',
  'Explain',
  'Generate'
];

const AI_MODES = [
  { 
    id: 'auto', 
    label: 'Auto (Recommended)', 
    desc: 'Automatically selects the appropriate capabilities for the task.' 
  },
  { 
    id: 'general', 
    label: 'General Analysis', 
    desc: 'Documents, research, summaries, comparisons and reasoning.' 
  },
  { 
    id: 'code', 
    label: 'Code Assistance', 
    desc: 'Code generation, analysis, debugging and verification.' 
  },
  { 
    id: 'vision', 
    label: 'Vision & P&ID Analysis', 
    desc: 'Images, scanned documents, drawings and P&IDs.' 
  }
];

const MOCK_KNOWLEDGE_DOCS = [
  { id: 'doc_001', name: 'SOP_Inspection.pdf', category: 'SOP' },
  { id: 'doc_002', name: 'Plant_Safety_Manual.pdf', category: 'Manual' },
  { id: 'doc_003', name: 'Inspection_Report_Q3.pdf', category: 'Report' },
  { id: 'doc_004', name: 'Maintenance_Guidelines.pdf', category: 'Guidelines' },
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.xlsx', '.pptx', '.png', '.jpg', '.jpeg', '.webp'];

export default function NewTaskView({ initialQuery, onTaskSubmit }) {
  const [taskQuery, setTaskQuery] = useState(initialQuery || '');
  const [attachedFiles, setAttachedFiles] = useState([
    { name: 'Inspection_Report.pdf', size: '4.2 MB', status: 'Ready' }
  ]);
  const [fileError, setFileError] = useState('');
  const [knowledgeScope, setKnowledgeScope] = useState('all'); // 'all' | 'selected' | 'current'
  const [selectedDocIds, setSelectedDocIds] = useState(['doc_001', 'doc_002', 'doc_003']);
  const [selectedAiMode, setSelectedAiMode] = useState('auto');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleChipClick = (chip) => {
    if (!taskQuery) {
      setTaskQuery(`${chip} `);
    } else {
      setTaskQuery(`${chip} ${taskQuery}`);
    }
  };

  const processFiles = (files) => {
    setFileError('');
    const newFiles = [];

    Array.from(files).forEach((file) => {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        setFileError(`Unsupported format '${ext}'. Allowed: PDF, DOCX, XLSX, PPTX, Images.`);
      } else {
        const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
        newFiles.push({
          name: file.name,
          size: `${sizeMb} MB`,
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

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAttachment = (index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocIds((prev) => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const isAllDocsSelected = MOCK_KNOWLEDGE_DOCS.every(d => selectedDocIds.includes(d.id));

  const toggleSelectAllDocs = () => {
    if (isAllDocsSelected) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(MOCK_KNOWLEDGE_DOCS.map(d => d.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskQuery.trim() && attachedFiles.length === 0) return;

    if (onTaskSubmit) {
      onTaskSubmit({
        query: taskQuery,
        files: attachedFiles,
        knowledgeScope,
        selectedDocIds: knowledgeScope === 'selected' ? selectedDocIds : [],
        aiMode: AI_MODES.find(m => m.id === selectedAiMode)?.label || 'Auto (Recommended)'
      });
    }
  };

  const currentModeObj = AI_MODES.find(m => m.id === selectedAiMode);

  return (
    <div className="new-task-container">
      <form onSubmit={handleSubmit} className="new-task-form">
        
        {/* Step 1: Describe Task */}
        <section className="form-section">
          <div className="section-label-row">
            <span className="section-step-num font-mono">1</span>
            <h3 className="section-title">Describe task</h3>
          </div>

          <div className="task-textarea-wrapper">
            <textarea
              className="task-textarea"
              placeholder="Describe your request in natural language... (e.g., 'Analyze this inspection report and identify safety issues.')"
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
              rows={3}
            />
          </div>

          {/* Suggestion Chips */}
          <div className="suggestion-chips-row">
            <span className="chips-label font-mono">Shortcuts:</span>
            <div className="chips-wrapper">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  type="button"
                  key={chip}
                  className="shortcut-chip-btn font-mono"
                  onClick={() => handleChipClick(chip)}
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Step 2: Add Files */}
        <section className="form-section">
          <div className="section-label-row">
            <span className="section-step-num font-mono">2</span>
            <h3 className="section-title">Add files</h3>
          </div>

          {/* Uploader Box */}
          <div 
            className="file-dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              multiple 
              accept=".pdf,.docx,.xlsx,.pptx,.png,.jpg,.jpeg,.webp"
              onChange={handleFileChange}
            />
            <Upload size={20} className="dropzone-icon" />
            <div className="dropzone-text">
              <span className="dropzone-primary">Drop files here or <span className="browse-link">browse</span></span>
              <span className="dropzone-sub font-mono">PDF &middot; DOCX &middot; XLSX &middot; PPTX &middot; Images</span>
            </div>
          </div>

          {fileError && (
            <div className="file-error-row font-mono">
              <AlertCircle size={14} />
              <span>{fileError}</span>
            </div>
          )}

          {/* Attached Files List */}
          {attachedFiles.length > 0 && (
            <div className="attachments-list">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="attachment-row font-mono">
                  <div className="attachment-left">
                    <FileText size={15} className="file-icon" />
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">{file.size}</span>
                  </div>
                  <div className="attachment-right">
                    <span className="status-ready"><Check size={12} /> Ready</span>
                    <button 
                      type="button" 
                      className="remove-file-btn" 
                      onClick={() => removeAttachment(idx)}
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Step 3: Select Knowledge Scope */}
        <section className="form-section">
          <div className="section-label-row">
            <span className="section-step-num font-mono">3</span>
            <h3 className="section-title">Select knowledge scope</h3>
          </div>

          <div className="knowledge-scope-radios">
            <label className={`radio-card ${knowledgeScope === 'all' ? 'active' : ''}`}>
              <input 
                type="radio" 
                name="knowledgeScope" 
                value="all" 
                checked={knowledgeScope === 'all'}
                onChange={() => setKnowledgeScope('all')}
              />
              <div className="radio-label-block">
                <span className="radio-title">All authorized sources</span>
                <span className="radio-sub">Search across all indexed organization knowledge</span>
              </div>
            </label>

            <label className={`radio-card ${knowledgeScope === 'selected' ? 'active' : ''}`}>
              <input 
                type="radio" 
                name="knowledgeScope" 
                value="selected" 
                checked={knowledgeScope === 'selected'}
                onChange={() => setKnowledgeScope('selected')}
              />
              <div className="radio-label-block">
                <span className="radio-title">Selected sources</span>
                <span className="radio-sub">Restrict retrieval to specific chosen documents</span>
              </div>
            </label>

            <label className={`radio-card ${knowledgeScope === 'current' ? 'active' : ''}`}>
              <input 
                type="radio" 
                name="knowledgeScope" 
                value="current" 
                checked={knowledgeScope === 'current'}
                onChange={() => setKnowledgeScope('current')}
              />
              <div className="radio-label-block">
                <span className="radio-title">Current files only</span>
                <span className="radio-sub">Rely exclusively on attached files for this task</span>
              </div>
            </label>
          </div>

          {/* Conditional Selected Sources Checklist */}
          {knowledgeScope === 'selected' && (
            <div className="selected-sources-box">
              <div className="sources-header">
                <span className="sources-title">Knowledge sources</span>
                <span className="sources-count font-mono">{selectedDocIds.length} sources selected</span>
              </div>

              <div className="sources-checklist">
                <div className="check-item header-item" onClick={toggleSelectAllDocs}>
                  {isAllDocsSelected ? (
                    <CheckSquare size={15} className="check-icon checked" />
                  ) : (
                    <Square size={15} className="check-icon" />
                  )}
                  <span className="check-label font-bold">Select all</span>
                </div>

                {MOCK_KNOWLEDGE_DOCS.map((doc) => {
                  const isChecked = selectedDocIds.includes(doc.id);
                  return (
                    <div 
                      key={doc.id} 
                      className={`check-item ${isChecked ? 'selected' : ''}`}
                      onClick={() => toggleSelectDoc(doc.id)}
                    >
                      {isChecked ? (
                        <CheckSquare size={15} className="check-icon checked" />
                      ) : (
                        <Square size={15} className="check-icon" />
                      )}
                      <span className="check-label">{doc.name}</span>
                      <span className="doc-type-pill font-mono">{doc.category}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {/* Step 4: Select AI Mode */}
        <section className="form-section">
          <div className="section-label-row">
            <span className="section-step-num font-mono">4</span>
            <h3 className="section-title">Select AI Mode</h3>
          </div>

          <div className="ai-mode-dropdown-wrapper">
            <button
              type="button"
              className="ai-mode-trigger"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <div className="trigger-left">
                <span className="mode-selected-title font-sans">{currentModeObj?.label}</span>
                <span className="mode-selected-desc font-mono">{currentModeObj?.desc}</span>
              </div>
              <ChevronDown size={16} className={`dropdown-chevron ${isDropdownOpen ? 'open' : ''}`} />
            </button>

            {isDropdownOpen && (
              <div className="ai-mode-dropdown-menu">
                {AI_MODES.map((mode) => (
                  <div
                    key={mode.id}
                    className={`dropdown-option-item ${selectedAiMode === mode.id ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedAiMode(mode.id);
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="option-title-row">
                      <span className="option-label font-sans">{mode.label}</span>
                      {selectedAiMode === mode.id && <Check size={14} className="option-check" />}
                    </div>
                    <span className="option-desc font-mono">{mode.desc}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Step 5: Start Task */}
        <div className="start-task-bar">
          <button type="submit" className="primary-start-btn">
            <Play size={15} fill="currentColor" />
            <span>Start Task</span>
          </button>
        </div>

      </form>
    </div>
  );
}
