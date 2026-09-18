import React, { useState } from 'react';
import { User, Bell, Sliders, Shield, Save, Check, LogOut, Moon, Sun, Monitor, Palette } from 'lucide-react';
import { useTheme } from '../context/useTheme';

export default function SettingsView({ onSignOut, user }) {
  const { themeMode, setThemeMode } = useTheme();
  
  const initialName = user?.username ? (user.username.includes('@') ? user.username.split('@')[0] : user.username) : 'User';
  const initialRole = user?.role === 'admin' ? 'System Administrator' : 'Operations User';
  
  const [profileName, setProfileName] = useState(initialName);
  const [profileRole, setProfileRole] = useState(initialRole);
  const [defaultAiMode, setDefaultAiMode] = useState('Auto (Recommended)');
  const [defaultScope, setDefaultScope] = useState('All authorized sources');
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [taskCompletionSound, setTaskCompletionSound] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="subpage-container">
      {/* Header */}
      <header className="subpage-header">
        <div>
          <h2 className="subpage-title">Settings</h2>
        </div>
        <button className="primary-action-btn" onClick={handleSave}>
          {saved ? <Check size={15} /> : <Save size={15} />}
          <span>{saved ? 'Saved' : 'Save'}</span>
        </button>
      </header>

      <div className="settings-sections-list">
        
        {/* Appearance Settings */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Palette size={17} style={{ color: 'var(--accent-blue)' }} />
            <h3 className="font-sans">Appearance</h3>
          </div>
          <div className="setting-field font-sans">
            <div className="theme-segmented-control font-sans">
              <button
                type="button"
                className={`theme-segment-btn ${themeMode === 'dark' ? 'active' : ''}`}
                onClick={() => setThemeMode('dark')}
              >
                <Moon size={14} />
                <span>Dark</span>
              </button>

              <button
                type="button"
                className={`theme-segment-btn ${themeMode === 'light' ? 'active' : ''}`}
                onClick={() => setThemeMode('light')}
              >
                <Sun size={14} />
                <span>Light</span>
              </button>

              <button
                type="button"
                className={`theme-segment-btn ${themeMode === 'system' ? 'active' : ''}`}
                onClick={() => setThemeMode('system')}
              >
                <Monitor size={14} />
                <span>System</span>
              </button>
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <User size={17} style={{ color: 'var(--accent-blue)' }} />
            <h3 className="font-sans">Profile</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field">
              <label className="setting-label font-sans">Full Name</label>
              <input 
                type="text" 
                className="setting-input-text font-sans" 
                value={profileName} 
                onChange={(e) => setProfileName(e.target.value)} 
              />
            </div>

            <div className="setting-field">
              <label className="setting-label font-sans">Role / Department</label>
              <input 
                type="text" 
                className="setting-input-text font-sans" 
                value={profileRole} 
                onChange={(e) => setProfileRole(e.target.value)} 
              />
            </div>
          </div>
        </div>

        {/* Workspace Preferences */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Sliders size={17} style={{ color: 'var(--accent-blue)' }} />
            <h3 className="font-sans">Workspace preferences</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field">
              <label className="setting-label font-sans">Default AI Mode</label>
              <select 
                className="setting-input-select font-sans" 
                value={defaultAiMode} 
                onChange={(e) => setDefaultAiMode(e.target.value)}
              >
                <option value="Auto (Recommended)">Auto (Recommended)</option>
                <option value="General Analysis">General Analysis</option>
                <option value="Code Assistance">Code Assistance</option>
                <option value="Vision & P&ID Analysis">Vision & P&ID Analysis</option>
              </select>
            </div>

            <div className="setting-field">
              <label className="setting-label font-sans">Default Knowledge Scope</label>
              <select 
                className="setting-input-select font-sans" 
                value={defaultScope} 
                onChange={(e) => setDefaultScope(e.target.value)}
              >
                <option value="All authorized sources">All authorized sources</option>
                <option value="Selected sources">Selected sources</option>
                <option value="Current files only">Current files only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Bell size={17} style={{ color: 'var(--accent-blue)' }} />
            <h3 className="font-sans">Notifications</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field checkbox-setting font-sans">
              <label className="checkbox-label-row">
                <input 
                  type="checkbox" 
                  checked={emailAlerts} 
                  onChange={(e) => setEmailAlerts(e.target.checked)} 
                />
                <span>Receive email summary upon long task completion</span>
              </label>
            </div>

            <div className="setting-field checkbox-setting font-sans">
              <label className="checkbox-label-row">
                <input 
                  type="checkbox" 
                  checked={taskCompletionSound} 
                  onChange={(e) => setTaskCompletionSound(e.target.checked)} 
                />
                <span>Audio tone when background task finishes</span>
              </label>
            </div>
          </div>
        </div>

        {/* Security & Session */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Shield size={17} style={{ color: 'var(--accent-green)' }} />
            <h3 className="font-sans">Security & Session</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field">
              <label className="setting-label font-sans">Session Status</label>
              <div className="setting-readonly-box font-mono">
                Active Local On-Premise Session
              </div>
            </div>

            <div className="setting-field">
              <label className="setting-label font-sans">Data Isolation</label>
              <div className="setting-readonly-box font-mono">
                Your documents remain within your organization's infrastructure.
              </div>
            </div>
          </div>
        </div>

        {/* Log Out Section */}
        <div className="subpage-card settings-card logout-card">
          <div className="settings-card-header">
            <LogOut size={17} style={{ color: 'var(--accent-red)' }} />
            <h3 className="font-sans">Account session</h3>
          </div>
          <div className="logout-action-row font-sans">
            <div className="logout-info">
              <span className="logout-title">Sign out of Sovereign AI</span>
              <span className="logout-sub font-mono">End your active session on this appliance</span>
            </div>
            {onSignOut && (
              <button type="button" className="logout-btn font-mono" onClick={onSignOut}>
                <LogOut size={14} />
                <span>Log Out</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
