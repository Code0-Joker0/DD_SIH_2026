import { useState, useRef } from 'react';
import { 
  Terminal,
  Play,
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Archive, 
  ChevronDown, 
  ChevronRight, 
  Check,
  UploadCloud,
  X,
  Loader2,
  File as FileIcon
} from 'lucide-react';

interface NewTaskViewProps {
  prompt: string;
  setPrompt: (v: string) => void;
  file: File | null;
  filePreview: string | null;
  onFileSelect: (f: File) => void;
  onClearFile: () => void;
  isRunning: boolean;
  onRun: () => void;
  onTaskStarted?: () => void;
}

export default function NewTaskView({
  prompt,
  setPrompt,
  file,
  filePreview,
  onFileSelect,
  onClearFile,
  isRunning,
  onRun,
  onTaskStarted
}: NewTaskViewProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState('Document Analysis');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Advanced Toggles State
  const [toggles, setToggles] = useState({
    ocr: true,
    knowledgeBase: true,
    outputVerification: true,
    generateDocs: true
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const uploadOptions = [
    { label: 'PDF', icon: FileText, accept: '.pdf' },
    { label: 'Images', icon: ImageIcon, accept: 'image/*' },
    { label: 'DOCX', icon: FileText, accept: '.docx' },
    { label: 'Excel', icon: FileSpreadsheet, accept: '.xlsx,.csv' },
    { label: 'ZIP', icon: Archive, accept: '.zip' }
  ];

  const workflowChips = [
    'Document Analysis',
    'Code Assistant',
    'Engineering Calculations',
    'Report Generation',
    'Knowledge Search',
    'Custom Workflow'
  ];

  const presetTemplates = [
    {
      title: 'Pipe E-101 Thickness Scan',
      prompt: 'Perform API 570 ultrasonic thickness inspection on line 10-HC-4001 tagged E-101 (Nominal 8.0mm, Measured 3.8mm, Corrosion Allowance 3.0mm).'
    },
    {
      title: 'Centrifugal Pump P-201 Alert',
      prompt: 'Verify vibration velocity for crude booster pump P-201A against ISO 10816-3 limits (Measured: 7.8 mm/s RMS).'
    },
    {
      title: 'API 510 Vessel Integrity Check',
      prompt: 'Assess remaining life of sour crude flash drum V-301 shell thickness (Nominal 12.0mm, Measured 5.8mm, MAWP 25 bar).'
    }
  ];

  const handleRunAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRunning) return;
    onRun();
    if (onTaskStarted) {
      onTaskStarted();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="new-task-container">
      <form className="new-task-form" onSubmit={handleRunAgent}>
        {/* Command-Style Large Input */}
        <div className="command-input-wrapper">
          <div className="command-input-row">
            <Terminal size={18} className="command-sparkle" style={{ color: '#38BDF8' }} />
            <textarea
              className="command-textarea"
              placeholder="What industrial task would you like to execute? (e.g. Ultrasonic inspection, stress calculation, P&ID audit)..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preset Buttons */}
          <div className="presets-chips-row">
            <span className="section-micro-label" style={{ alignSelf: 'center', marginBottom: 0, marginRight: '4px' }}>PRESETS:</span>
            {presetTemplates.map((tpl, i) => (
              <button
                key={i}
                type="button"
                className="preset-chip-btn"
                onClick={() => setPrompt(tpl.prompt)}
              >
                {tpl.title}
              </button>
            ))}
          </div>
        </div>

        {/* Multimodal File Upload Zone */}
        <div className="upload-buttons-section">
          <span className="section-micro-label">ATTACH REFINERY INSPECTION OR BLUEPRINT FILE:</span>
          
          <div
            className={`dropzone-upload-box ${isDragging ? 'dragging' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onFileSelect(e.target.files[0]);
                }
              }}
              accept="image/*,.pdf,.docx,.xlsx,.png,.jpg,.jpeg"
            />

            {file ? (
              <div className="selected-file-preview-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {filePreview ? (
                    <img src={filePreview} alt="File Preview" className="file-preview-thumb" />
                  ) : (
                    <div className="file-preview-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#191E2B' }}>
                      <FileIcon size={20} color="#38BDF8" />
                    </div>
                  )}
                  <div className="file-info-text">
                    <span className="file-name-main">{file.name}</span>
                    <span className="file-meta-sub font-mono">
                      {(file.size / 1024).toFixed(1)} KB &middot; Vision Enclave Ready
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="remove-file-icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClearFile();
                  }}
                  title="Remove File"
                >
                  <X size={15} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                <UploadCloud size={24} color="#60A5FA" />
                <span style={{ fontSize: '0.825rem', fontWeight: 600, color: '#E5E7EB' }}>
                  Click to browse or drag & drop scan / report
                </span>
                <span style={{ fontSize: '0.7rem', color: '#6B7280' }}>
                  Supports PDF inspection sheets, ultrasonic scans, P&ID images, and CSV logs
                </span>
              </div>
            )}
          </div>

          <div className="upload-buttons-row" style={{ marginTop: '0.65rem' }}>
            {uploadOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <label key={opt.label} className="upload-chip-btn">
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept={opt.accept}
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onFileSelect(e.target.files[0]);
                      }
                    }}
                  />
                  <Icon size={14} />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Minimal Workflow Chips Row */}
        <div className="workflow-chips-section">
          <span className="section-micro-label">SELECT WORKFLOW ENGINE:</span>
          <div className="workflow-chips-row">
            {workflowChips.map((chip) => {
              const isSelected = selectedWorkflow === chip;
              return (
                <button
                  type="button"
                  key={chip}
                  className={`workflow-chip ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedWorkflow(chip)}
                >
                  {isSelected && <Check size={13} className="chip-check" />}
                  <span>{chip}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced Options Collapsible Section */}
        <div className="advanced-options-section">
          <button
            type="button"
            className="advanced-toggle-btn"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            {isAdvancedOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            <span>Advanced Pipeline Runtime Options</span>
          </button>

          {isAdvancedOpen && (
            <div className="advanced-options-grid">
              <div className="option-toggle-row">
                <div className="toggle-info">
                  <span className="toggle-title">OCR & Multimodal Vision</span>
                  <span className="toggle-sub">Qwen2.5-VL text & ultrasonic scan extraction</span>
                </div>
                <button
                  type="button"
                  className={`switch-track ${toggles.ocr ? 'active' : ''}`}
                  onClick={() => handleToggle('ocr')}
                >
                  <span className="switch-thumb"></span>
                </button>
              </div>

              <div className="option-toggle-row">
                <div className="toggle-info">
                  <span className="toggle-title">Statutory Knowledge RAG</span>
                  <span className="toggle-sub">ChromaDB API 570 / 510 / ASME SOP grounding</span>
                </div>
                <button
                  type="button"
                  className={`switch-track ${toggles.knowledgeBase ? 'active' : ''}`}
                  onClick={() => handleToggle('knowledgeBase')}
                >
                  <span className="switch-thumb"></span>
                </button>
              </div>

              <div className="option-toggle-row">
                <div className="toggle-info">
                  <span className="toggle-title">Deterministic Output Verification</span>
                  <span className="toggle-sub">Sandboxed Python math & retirement check</span>
                </div>
                <button
                  type="button"
                  className={`switch-track ${toggles.outputVerification ? 'active' : ''}`}
                  onClick={() => handleToggle('outputVerification')}
                >
                  <span className="switch-thumb"></span>
                </button>
              </div>

              <div className="option-toggle-row">
                <div className="toggle-info">
                  <span className="toggle-title">Generate Word (.docx) Note</span>
                  <span className="toggle-sub">Export verified MRPL inter-office approval note</span>
                </div>
                <button
                  type="button"
                  className={`switch-track ${toggles.generateDocs ? 'active' : ''}`}
                  onClick={() => handleToggle('generateDocs')}
                >
                  <span className="switch-thumb"></span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Prominent Bottom Center Button */}
        <div className="run-agent-footer">
          <button type="submit" className="run-agent-btn" disabled={isRunning || !prompt.trim()}>
            {isRunning ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Executing Swarm Pipeline...</span>
              </>
            ) : (
              <>
                <Play size={14} fill="currentColor" />
                <span>Run Sovereign AI Agent</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
