import React, { useState } from 'react';
import { 
  Terminal,
  Play,
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet, 
  Archive, 
  ChevronDown, 
  ChevronRight, 
  Check
} from 'lucide-react';

export default function NewTaskView({ onTaskStarted }) {
  const [taskQuery, setTaskQuery] = useState('');
  const [selectedWorkflow, setSelectedWorkflow] = useState('Document Analysis');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  // Advanced Toggles State
  const [toggles, setToggles] = useState({
    ocr: true,
    knowledgeBase: true,
    outputVerification: false,
    generateDocs: true
  });

  const handleToggle = (key) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const uploadOptions = [
    { label: 'PDF', icon: FileText },
    { label: 'Images', icon: ImageIcon },
    { label: 'DOCX', icon: FileText },
    { label: 'Excel', icon: FileSpreadsheet },
    { label: 'ZIP', icon: Archive }
  ];

  const workflowChips = [
    'Document Analysis',
    'Code Assistant',
    'Engineering Calculations',
    'Report Generation',
    'Knowledge Search',
    'Custom Workflow'
  ];

  const handleRunAgent = (e) => {
    e.preventDefault();
    if (onTaskStarted) {
      onTaskStarted({ query: taskQuery, workflow: selectedWorkflow });
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
              placeholder="What would you like to accomplish?"
              value={taskQuery}
              onChange={(e) => setTaskQuery(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Compact File Upload Buttons Row */}
        <div className="upload-buttons-section">
          <span className="section-micro-label">ATTACH FILES:</span>
          <div className="upload-buttons-row">
            {uploadOptions.map((opt) => {
              const Icon = opt.icon;
              return (
                <label key={opt.label} className="upload-chip-btn">
                  <input type="file" style={{ display: 'none' }} onChange={() => {}} />
                  <Icon size={14} />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Minimal Workflow Chips Row */}
        <div className="workflow-chips-section">
          <span className="section-micro-label">SELECT WORKFLOW:</span>
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
            <span>Advanced Options</span>
          </button>

          {isAdvancedOpen && (
            <div className="advanced-options-grid">
              <div className="option-toggle-row">
                <div className="toggle-info">
                  <span className="toggle-title">OCR (Optical Character Recognition)</span>
                  <span className="toggle-sub">Extract text from scanned PDFs and images</span>
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
                  <span className="toggle-title">Knowledge Base</span>
                  <span className="toggle-sub">Augment execution with internal RAG documents</span>
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
                  <span className="toggle-title">Output Verification</span>
                  <span className="toggle-sub">Run secondary validation pass before output</span>
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
                  <span className="toggle-title">Generate Word/PPT</span>
                  <span className="toggle-sub">Export report outputs as structured Word or PPT files</span>
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
          <button type="submit" className="run-agent-btn">
            <Play size={14} fill="currentColor" />
            <span>Run AI Agent</span>
          </button>
        </div>
      </form>
    </div>
  );
}
