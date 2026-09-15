import React, { useState } from 'react';
import { 
  CheckCircle2, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  FileSpreadsheet, 
  Download, 
  Eye, 
  PlusSquare, 
  ArrowLeft
} from 'lucide-react';

export default function TaskResultView({ taskResult, onBackToTasks, onNewTask }) {
  const [isTechDetailsOpen, setIsTechDetailsOpen] = useState(false);

  const title = taskResult?.title || taskResult?.name || 'P&ID Safety & Compliance Analysis';
  const aiMode = taskResult?.aiMode || taskResult?.workflow || 'General Analysis';

  return (
    <div className="subpage-container result-page-container">
      {/* Top Bar Navigation back to tasks */}
      <div className="result-top-bar">
        <button className="back-nav-btn font-mono" onClick={onBackToTasks}>
          <ArrowLeft size={14} />
          <span>Back to History</span>
        </button>

        <button className="primary-action-btn" onClick={onNewTask}>
          <PlusSquare size={15} />
          <span>New Task</span>
        </button>
      </div>

      {/* Main Result Card */}
      <div className="result-main-card">
        {/* Status Header */}
        <div className="result-header">
          <div className="result-status-pill">
            <CheckCircle2 size={14} className="icon-emerald" />
            <span>Task completed</span>
          </div>
          <h1 className="result-title font-sans">{title}</h1>
          <div className="result-meta-row font-mono">
            <span>AI Mode: {aiMode}</span>
            <span>&middot;</span>
            <span>Completed 2 hours ago</span>
          </div>
        </div>

        {/* Answer Section */}
        <section className="result-section">
          <h3 className="section-heading font-sans">Answer</h3>
          <p className="answer-body-text">
            Based on the analysis of the provided inspection reports and operating manuals, the facility operates within acceptable safety margins for primary pressure vessels. However, three critical maintenance anomalies require immediate attention prior to the scheduled Q4 shutdown.
          </p>
        </section>

        {/* Key Findings Section */}
        <section className="result-section">
          <h3 className="section-heading font-sans">Key findings</h3>
          <div className="findings-list">
            <div className="finding-item">
              <span className="finding-num font-mono">01</span>
              <div className="finding-content">
                <span className="finding-title">Compressor Seal Degradation</span>
                <p className="finding-desc">Vibration telemetry readings in Compressor Unit 3 indicate 14% higher shaft displacement than ISO standards allow.</p>
              </div>
            </div>

            <div className="finding-item">
              <span className="finding-num font-mono">02</span>
              <div className="finding-content">
                <span className="finding-title">Safety Relief Valve Calibration Overdue</span>
                <p className="finding-desc">Relief valve RV-402 testing expired on August 15, 2026. Recalibration must be executed before vessel re-pressurization.</p>
              </div>
            </div>

            <div className="finding-item">
              <span className="finding-num font-mono">03</span>
              <div className="finding-content">
                <span className="finding-title">SOP Compliance Deviation</span>
                <p className="finding-desc">Section 4.2 of SOP-Inspection requires dual-technician sign-off on high-temperature line audits. Recent logs reflect single signatures.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Recommendation Section */}
        <section className="result-section">
          <h3 className="section-heading font-sans">Recommendation</h3>
          <div className="recommendation-box">
            Issue an immediate work order for RV-402 pressure testing, deploy acoustic sensor diagnostics to Compressor Unit 3, and re-issue standard operating guidelines to regional inspection leads.
          </div>
        </section>

        {/* Sources Section */}
        <section className="result-section">
          <h3 className="section-heading font-sans">Sources</h3>
          <div className="sources-list font-mono">
            <div className="source-chip">
              <FileText size={13} />
              <span>SOP_Inspection.pdf</span>
            </div>
            <div className="source-chip">
              <FileText size={13} />
              <span>Plant_Safety_Manual.pdf</span>
            </div>
            <div className="source-chip">
              <FileText size={13} />
              <span>Inspection_Report_Q3.pdf</span>
            </div>
          </div>
        </section>

        {/* Generated Files Section */}
        <section className="result-section">
          <h3 className="section-heading font-sans">Generated files</h3>
          <div className="files-grid">
            <div className="generated-file-card">
              <div className="file-card-left">
                <div className="file-icon-box pdf-bg">
                  <FileText size={18} style={{ color: 'var(--accent-red)' }} />
                </div>
                <div className="file-info-block">
                  <span className="file-name font-sans">Safety_Audit_Report.pdf</span>
                  <span className="file-size font-mono">1.8 MB &middot; Executive PDF</span>
                </div>
              </div>

              <div className="file-card-actions">
                <button className="icon-action-btn font-mono" title="Preview deliverable">
                  <Eye size={14} />
                  <span>Preview</span>
                </button>
                <button className="icon-action-btn primary font-mono" title="Download deliverable">
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </div>

            <div className="generated-file-card">
              <div className="file-card-left">
                <div className="file-icon-box xlsx-bg">
                  <FileSpreadsheet size={18} style={{ color: 'var(--accent-green)' }} />
                </div>
                <div className="file-info-block">
                  <span className="file-name font-sans">Action_Items_Summary.xlsx</span>
                  <span className="file-size font-mono">420 KB &middot; Structured Spreadsheet</span>
                </div>
              </div>

              <div className="file-card-actions">
                <button className="icon-action-btn font-mono" title="Preview deliverable">
                  <Eye size={14} />
                  <span>Preview</span>
                </button>
                <button className="icon-action-btn primary font-mono" title="Download deliverable">
                  <Download size={14} />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Collapsible Technical Details Section */}
        <section className="technical-details-accordion">
          <button
            className="tech-accordion-trigger font-mono"
            onClick={() => setIsTechDetailsOpen(!isTechDetailsOpen)}
          >
            {isTechDetailsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>Technical details</span>
          </button>

          {isTechDetailsOpen && (
            <div className="tech-details-content font-mono">
              <div className="tech-detail-row">
                <span className="tech-label">Model used</span>
                <span className="tech-value">Autonomous General Analysis Pipeline</span>
              </div>
              <div className="tech-detail-row">
                <span className="tech-label">OCR used</span>
                <span className="tech-value">Automatically applied to scanned PDF attachments</span>
              </div>
              <div className="tech-detail-row">
                <span className="tech-label">Retrieval scope</span>
                <span className="tech-value">Filtered by 3 selected document IDs (doc_001, doc_002, doc_003)</span>
              </div>
              <div className="tech-detail-row">
                <span className="tech-label">Sources selected</span>
                <span className="tech-value">3 verified organizational sources</span>
              </div>
              <div className="tech-detail-row">
                <span className="tech-label">Tools used</span>
                <span className="tech-value">Document Layout Parser &middot; Safety Standard Verifier</span>
              </div>
              <div className="tech-detail-row">
                <span className="tech-label">Execution time</span>
                <span className="tech-value">4.2 seconds</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
