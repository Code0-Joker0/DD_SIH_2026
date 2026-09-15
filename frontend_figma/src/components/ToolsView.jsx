import React from 'react';
import { Briefcase, Code, FileText, Calculator, Database, Shield, Play, CheckCircle2 } from 'lucide-react';

export default function ToolsView() {
  const tools = [
    {
      title: 'Python Enclave Sandbox',
      desc: 'Execute Python scripts in a strictly isolated local container with scientific libraries.',
      icon: Code,
      color: '#60A5FA',
      status: 'Active'
    },
    {
      title: 'OCR Text Extractor',
      desc: 'Local optical character recognition for scanned PDFs, engineering blueprints, and images.',
      icon: FileText,
      color: '#C084FC',
      status: 'Active'
    },
    {
      title: 'Engineering Calculator',
      desc: 'Perform stress, load, thermodynamic, and fluid dynamics calculations with units verification.',
      icon: Calculator,
      color: '#34D399',
      status: 'Active'
    },
    {
      title: 'Automated Report Generator',
      desc: 'Synthesize data insights into structured PDF, Word, and PPT presentation notes.',
      icon: FileText,
      color: '#FBBF24',
      status: 'Active'
    },
    {
      title: 'SCADA Telemetry Connector',
      desc: 'Stream on-premise Modbus/OPC-UA industrial telemetry directly into AI analysis pipeline.',
      icon: Database,
      color: '#38BDF8',
      status: 'Connected'
    },
    {
      title: 'Code Reviewer & Auditor',
      desc: 'Verify C, C++, and Python source code for memory safety and security vulnerabilities.',
      icon: Shield,
      color: '#A855F7',
      status: 'Active'
    }
  ];

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Tools & Enclaves</h2>
          <p className="subpage-subtitle">On-premise tools and specialized execution runtimes operating within internal physical boundaries.</p>
        </div>
      </header>

      {/* Tools Grid */}
      <div className="tools-cards-grid">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.title} className="tool-card-item">
              <div className="tool-card-top">
                <div className="tool-card-icon" style={{ borderColor: `${tool.color}40`, background: `${tool.color}15` }}>
                  <Icon size={20} color={tool.color} />
                </div>
                <span className="status-badge-green"><CheckCircle2 size={12} /> {tool.status}</span>
              </div>
              <h3 className="tool-card-title">{tool.title}</h3>
              <p className="tool-card-desc">{tool.desc}</p>
              <div className="tool-card-footer">
                <button className="launch-tool-btn">
                  <Play size={13} />
                  <span>Launch Tool</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
