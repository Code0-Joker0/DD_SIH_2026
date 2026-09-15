import { Code, FileText, Calculator, Database, Shield, Play, CheckCircle2 } from 'lucide-react';

interface ToolsViewProps {
  onSelectTool?: (toolName: string) => void;
}

export default function ToolsView({ onSelectTool }: ToolsViewProps) {
  const tools = [
    {
      title: 'Python Enclave Sandbox',
      desc: 'Execute isolated Python scripts with NumPy, SciPy, and SymPy for deterministic ASME equations.',
      icon: Code,
      color: '#60A5FA',
      status: 'Active Enclave'
    },
    {
      title: 'Qwen2.5-VL Vision Extractor',
      desc: 'Local multimodal optical character and diagram recognition for scanned UT inspection sheets and P&IDs.',
      icon: FileText,
      color: '#C084FC',
      status: 'Ready'
    },
    {
      title: 'Engineering Calculator & Unit Engine',
      desc: 'Perform stress, load, retirement wall thickness, and corrosion rate verification with strict units validation.',
      icon: Calculator,
      color: '#34D399',
      status: 'Verified'
    },
    {
      title: 'Automated Inter-Office Note Generator',
      desc: 'Synthesize data insights and compliance verdicts into official MRPL Word (.docx) approval notes.',
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
      title: 'Zero-Egress Socket Auditor',
      desc: 'Continuous hardware network socket auditor verifying 0 outbound WAN packets during model inference.',
      icon: Shield,
      color: '#A855F7',
      status: 'Enforced'
    }
  ];

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Tools & Runtimes</h2>
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
                <button
                  type="button"
                  className="launch-tool-btn"
                  onClick={() => onSelectTool?.(tool.title)}
                >
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
