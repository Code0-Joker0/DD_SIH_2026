import React from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Database, 
  Terminal, 
  CheckCircle2, 
  ShieldCheck 
} from 'lucide-react';

export default function AdminSystemHealthView() {
  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">System Health</h2>
          <p className="subpage-subtitle">Infrastructure hardware metrics, storage volumes, database connections, and sandbox environments.</p>
        </div>
      </header>

      {/* Infrastructure Section */}
      <div className="admin-health-section">
        <h3 className="section-heading font-sans">Infrastructure</h3>
        <div className="admin-services-grid">
          
          <div className="subpage-card service-health-card">
            <div className="service-card-top">
              <div className="service-icon-box blue-bg">
                <Cpu size={18} className="icon-blue" />
              </div>
              <span className="status-badge-green"><CheckCircle2 size={12} /> Active Runtimes</span>
            </div>

            <div className="service-info-block">
              <h3 className="service-name font-sans">GPU Compute Accelerators</h3>
              <span className="service-type font-mono">Local Hardware Runtimes</span>
            </div>

            <div className="service-metrics-row font-mono">
              <div className="metric-item">
                <span className="metric-label">Utilization</span>
                <span className="metric-val">42%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Temperature</span>
                <span className="metric-val">58&deg;C</span>
              </div>
            </div>
          </div>

          <div className="subpage-card service-health-card">
            <div className="service-card-top">
              <div className="service-icon-box green-bg">
                <HardDrive size={18} className="icon-green" />
              </div>
              <span className="status-badge-green"><CheckCircle2 size={12} /> Healthy</span>
            </div>

            <div className="service-info-block">
              <h3 className="service-name font-sans">Storage Volume</h3>
              <span className="service-type font-mono">Encrypted Local Disks</span>
            </div>

            <div className="service-metrics-row font-mono">
              <div className="metric-item">
                <span className="metric-label">Used Space</span>
                <span className="metric-val">78%</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Read/Write</span>
                <span className="metric-val">120 MB/s</span>
              </div>
            </div>
          </div>

          <div className="subpage-card service-health-card">
            <div className="service-card-top">
              <div className="service-icon-box purple-bg">
                <Database size={18} className="icon-purple" />
              </div>
              <span className="status-badge-green"><CheckCircle2 size={12} /> Connected</span>
            </div>

            <div className="service-info-block">
              <h3 className="service-name font-sans">Vector & Metadata DB</h3>
              <span className="service-type font-mono">Local Qdrant Cluster</span>
            </div>

            <div className="service-metrics-row font-mono">
              <div className="metric-item">
                <span className="metric-label">Query Latency</span>
                <span className="metric-val">4ms</span>
              </div>
              <div className="metric-item">
                <span className="metric-label">Connections</span>
                <span className="metric-val">14 Active</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Sandbox Environment Section (Integrated under System Health) */}
      <div className="admin-health-section">
        <h3 className="section-heading font-sans">Isolated Code Execution Sandbox</h3>
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Terminal size={17} className="icon-blue" />
            <h3 className="font-sans">Sandbox Environment</h3>
          </div>

          <div className="sandbox-status-block font-mono">
            <div className="sandbox-metric">
              <span className="sb-label">Sandbox Status</span>
              <span className="status-badge-green"><CheckCircle2 size={12} /> Running</span>
            </div>

            <div className="sandbox-metric">
              <span className="sb-label">Executions Today</span>
              <span className="sb-val">42</span>
            </div>

            <div className="sandbox-metric">
              <span className="sb-label">Successful Runs</span>
              <span className="sb-val text-green">41</span>
            </div>

            <div className="sandbox-metric">
              <span className="sb-label">Failed Runs</span>
              <span className="sb-val text-red">1</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
