import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  Clock, 
  Cpu, 
  ShieldCheck, 
  Activity, 
  Settings as SettingsIcon,
  Lock,
  ArrowLeft
} from 'lucide-react';

export default function AdminSidebar({ activeTab, onSelectTab, onExitAdmin }) {
  const adminNavItems = [
    { name: 'Overview', icon: LayoutDashboard },
    { name: 'Users & Access', icon: Users },
    { name: 'Knowledge', icon: BookOpen },
    { name: 'Tasks & Runs', icon: Clock },
    { name: 'AI Services', icon: Cpu },
    { name: 'Security & Audit', icon: ShieldCheck },
    { name: 'System Health', icon: Activity },
    { name: 'Settings', icon: SettingsIcon },
  ];

  return (
    <aside className="dash-sidebar admin-sidebar">
      <div className="sidebar-top-section">
        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {adminNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;
            return (
              <button
                key={item.name}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTab(item.name)}
              >
                <Icon size={17} />
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="sidebar-bottom-section">
        {/* Exit Admin Workspace Button */}
        {onExitAdmin && (
          <button 
            type="button" 
            className="exit-admin-btn font-mono"
            onClick={onExitAdmin}
          >
            <ArrowLeft size={14} />
            <span>User Workspace</span>
          </button>
        )}

        {/* Security Badge */}
        <div className="sidebar-security-subtle font-mono">
          <Lock size={12} className="lock-icon" />
          <span>Local processing &middot; Authorized Admin Governance</span>
        </div>
      </div>
    </aside>
  );
}
