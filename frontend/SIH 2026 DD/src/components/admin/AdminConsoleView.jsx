import React, { useState } from 'react';
import { 
  Shield, 
  Bell, 
  Sun, 
  Moon, 
  ChevronDown, 
  ArrowLeft,
  Lock,
  UserCheck
} from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import AdminOverviewView from './AdminOverviewView';
import AdminUsersView from './AdminUsersView';
import AdminKnowledgeView from './AdminKnowledgeView';
import AdminTasksView from './AdminTasksView';
import AdminAIServicesView from './AdminAIServicesView';
import AdminAuditView from './AdminAuditView';
import AdminSystemHealthView from './AdminSystemHealthView';
import AdminSettingsView from './AdminSettingsView';
import { useTheme } from '../../context/useTheme';

export default function AdminConsoleView({ onExitAdmin, onSignOut, user }) {
  const { effectiveTheme, toggleQuickTheme } = useTheme();
  const [activeAdminTab, setActiveAdminTab] = useState('Overview');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const displayName = user?.username 
    ? (user.username.includes('@') ? user.username.split('@')[0] : user.username)
    : 'System Admin';
  const displayInitials = displayName.length >= 2 ? displayName.slice(0, 2).toUpperCase() : displayName.toUpperCase();

  return (
    <div className="dashboard-container admin-console-container font-sans">
      {/* Top Admin Header Bar */}
      <header className="dash-topbar admin-topbar">
        <div className="dash-brand-new">
          <div className="dash-brand-icon-new admin-brand-icon">
            <img src="/assets/singularity_logo.png" alt="Singularity AI" className="brand-logo-img" />
          </div>
          <div className="dash-brand-text">
            <span className="brand-primary font-bold">SINGULARITY AI WORKBENCH</span>
            <span className="admin-console-badge font-mono">ADMIN DASHBOARD</span>
          </div>
        </div>

        {/* Local Processing Pill */}
        <div className="local-processing-pill font-mono">
          <span className="green-dot"></span>
          <span>Local processing &middot; Air-gapped</span>
        </div>

        <div className="dash-top-right-new">
          {/* Quick Theme Toggle */}
          <button 
            type="button"
            className="icon-btn-box" 
            onClick={toggleQuickTheme}
            title={`Switch to ${effectiveTheme === 'dark' ? 'Light' : 'Dark'} theme`}
          >
            {effectiveTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {/* Notifications Bell */}
          <div className="icon-btn-box" title="Notifications">
            <Bell size={16} />
            <span className="bell-red-dot"></span>
          </div>

          {/* User Profile Badge */}
          <div 
            className="user-profile-badge-new"
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            title="Admin Profile Menu"
          >
            <div className="avatar-circle-purple font-mono">{displayInitials}</div>
            <div className="user-meta-info">
              <span className="user-full-name">{displayName}</span>
              <span className="user-role-sub font-mono">System Administrator</span>
            </div>
            <ChevronDown size={14} className="user-dropdown-arrow" />
          </div>

          {/* Profile Dropdown */}
          {isProfileMenuOpen && (
            <div className="admin-profile-menu font-sans" onClick={(e) => e.stopPropagation()}>
              <div className="menu-header">
                <span className="menu-name">{displayName}</span>
                <span className="menu-role font-mono">Administrator Access</span>
              </div>
              <div className="menu-divider"></div>
              <button className="menu-item font-mono" onClick={() => { setIsProfileMenuOpen(false); setActiveAdminTab('Settings'); }}>
                <span>Admin Settings</span>
              </button>
              {onSignOut && (
                <button className="menu-item danger font-mono" onClick={() => { setIsProfileMenuOpen(false); onSignOut(); }}>
                  <span>Log Out (Sign Out)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Admin Body */}
      <div className="dash-body">
        {/* Admin Navigation Sidebar */}
        <AdminSidebar 
          activeTab={activeAdminTab}
          onSelectTab={setActiveAdminTab}
          onExitAdmin={onExitAdmin}
        />

        {/* Center Admin Content Router */}
        <main className="dash-center admin-center">
          {activeAdminTab === 'Overview' && (
            <AdminOverviewView onNavigate={(tab) => setActiveAdminTab(tab)} />
          )}

          {activeAdminTab === 'Users & Access' && (
            <AdminUsersView />
          )}

          {activeAdminTab === 'Knowledge' && (
            <AdminKnowledgeView />
          )}

          {activeAdminTab === 'Tasks & Runs' && (
            <AdminTasksView />
          )}

          {activeAdminTab === 'AI Services' && (
            <AdminAIServicesView />
          )}

          {activeAdminTab === 'Security & Audit' && (
            <AdminAuditView />
          )}

          {activeAdminTab === 'System Health' && (
            <AdminSystemHealthView />
          )}

          {activeAdminTab === 'Settings' && (
            <AdminSettingsView />
          )}
        </main>
      </div>
    </div>
  );
}
