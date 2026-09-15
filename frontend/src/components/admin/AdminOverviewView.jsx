import React from 'react';
import { 
  Users, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Database, 
  Cpu, 
  HardDrive, 
  ShieldCheck,
  ArrowRight,
  Activity
} from 'lucide-react';

export default function AdminOverviewView({ onNavigate }) {
  const recentActivities = [
    { id: 'act_1', title: 'User added', desc: 'Ananya Sharma assigned Engineer role by Reva Kulkarni', time: '15 mins ago', icon: Users, type: 'blue' },
    { id: 'act_2', title: 'Document indexed', desc: 'Refinery_Safety_SOP_v3.pdf indexed in Qdrant', time: '45 mins ago', icon: FileText, type: 'green' },
    { id: 'act_3', title: 'Permission updated', desc: 'Department Operations granted access to SOP_Inspection.pdf', time: '2 hours ago', icon: ShieldCheck, type: 'purple' },
    { id: 'act_4', title: 'Task completed', desc: 'P&ID Safety Analysis executed by user RK', time: '3 hours ago', icon: Activity, type: 'blue' },
    { id: 'act_5', title: 'Security audit log', desc: 'Successful SAML 2.0 authentication session created', time: '5 hours ago', icon: ShieldCheck, type: 'green' },
  ];

  const alerts = [
    { id: 'alt_1', title: 'Storage Capacity Notice', desc: 'Volume /mnt/storage is at 78% capacity. Consider archiving legacy reports.', level: 'warning' },
    { id: 'alt_2', title: 'OCR Pipeline Queue', desc: '1 document awaiting background OCR text extraction.', level: 'info' }
  ];

  return (
    <div className="subpage-container admin-overview-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Admin Overview</h2>
          <p className="subpage-subtitle">Governance dashboard monitoring users, system health, and security events.</p>
        </div>
      </header>

      {/* Top Status Badges */}
      <div className="subpage-stats-grid admin-status-grid">
        <div className="stat-card">
          <div className="stat-label font-mono"><Cpu size={14} className="icon-blue" /> System Status</div>
          <div className="stat-value text-green"><span className="green-dot"></span> Online</div>
        </div>

        <div className="stat-card">
          <div className="stat-label font-mono"><Activity size={14} className="icon-blue" /> AI Services</div>
          <div className="stat-value text-green"><span className="green-dot"></span> 8 / 8 Operational</div>
        </div>

        <div className="stat-card">
          <div className="stat-label font-mono"><Database size={14} className="icon-blue" /> Database</div>
          <div className="stat-value text-green"><span className="green-dot"></span> Connected</div>
        </div>

        <div className="stat-card">
          <div className="stat-label font-mono"><HardDrive size={14} className="icon-blue" /> Storage</div>
          <div className="stat-value text-green"><span className="green-dot"></span> Healthy</div>
        </div>
      </div>

      {/* Counts Overview Grid */}
      <div className="admin-counts-grid">
        <div className="count-card" onClick={() => onNavigate && onNavigate('Users & Access')}>
          <div className="count-icon-box blue-bg">
            <Users size={20} className="icon-blue" />
          </div>
          <div className="count-info">
            <span className="count-number font-sans">14</span>
            <span className="count-label font-mono">Total Users</span>
          </div>
          <ArrowRight size={14} className="count-arrow" />
        </div>

        <div className="count-card" onClick={() => onNavigate && onNavigate('Knowledge')}>
          <div className="count-icon-box green-bg">
            <FileText size={20} className="icon-green" />
          </div>
          <div className="count-info">
            <span className="count-number font-sans">28</span>
            <span className="count-label font-mono">Indexed Documents</span>
          </div>
          <ArrowRight size={14} className="count-arrow" />
        </div>

        <div className="count-card" onClick={() => onNavigate && onNavigate('Tasks & Runs')}>
          <div className="count-icon-box purple-bg">
            <Clock size={20} className="icon-purple" />
          </div>
          <div className="count-info">
            <span className="count-number font-sans">42</span>
            <span className="count-label font-mono">Today's Executions</span>
          </div>
          <ArrowRight size={14} className="count-arrow" />
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <div className="admin-alerts-card">
          <div className="alerts-card-header">
            <AlertTriangle size={16} className="icon-amber" />
            <h3 className="font-sans">System Alerts & Warnings</h3>
          </div>
          <div className="alerts-list">
            {alerts.map((alt) => (
              <div key={alt.id} className="alert-item-row font-mono">
                <span className="alert-badge warning">Warning</span>
                <div className="alert-text-block">
                  <span className="alert-title font-sans">{alt.title}</span>
                  <span className="alert-desc">{alt.desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Administrative Activity Feed */}
      <div className="subpage-card admin-activity-card">
        <div className="recent-tasks-header">
          <h3 className="recent-title font-sans">Recent Administrative Activity</h3>
          <button 
            className="view-history-link font-mono"
            onClick={() => onNavigate && onNavigate('Security & Audit')}
          >
            <span>Full Audit Log</span>
            <ArrowRight size={13} />
          </button>
        </div>

        <div className="recent-activity-list">
          {recentActivities.map((act) => {
            const Icon = act.icon;
            return (
              <div key={act.id} className="admin-activity-item font-sans">
                <div className={`act-icon-wrapper ${act.type}`}>
                  <Icon size={15} />
                </div>
                <div className="act-content-block">
                  <div className="act-title-row">
                    <span className="act-title font-semibold">{act.title}</span>
                    <span className="act-time font-mono">{act.time}</span>
                  </div>
                  <p className="act-desc">{act.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
