import React, { useState } from 'react';
import { Settings, Building, Lock, Sliders, Save, Check } from 'lucide-react';

export default function AdminSettingsView() {
  const [orgName, setOrgName] = useState('Confidential Industrial Operations');
  const [sessionTimeout, setSessionTimeout] = useState('8 Hours');
  const [requireSaml, setRequireSaml] = useState(true);
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
          <h2 className="subpage-title">Admin Settings</h2>
          <p className="subpage-subtitle">Configure organization governance, user access policies, and system-wide security defaults.</p>
        </div>
        <button className="primary-action-btn" onClick={handleSave}>
          {saved ? <Check size={15} /> : <Save size={15} />}
          <span>{saved ? 'Saved!' : 'Save Admin Settings'}</span>
        </button>
      </header>

      <div className="settings-sections-list">
        {/* Organization Configuration */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Building size={17} className="icon-blue" />
            <h3 className="font-sans">Organization Configuration</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field">
              <label className="setting-label font-sans">Organization Name</label>
              <input 
                type="text" 
                className="setting-input-text font-sans" 
                value={orgName} 
                onChange={(e) => setOrgName(e.target.value)} 
              />
            </div>

            <div className="setting-field">
              <label className="setting-label font-sans">Active Departments</label>
              <div className="setting-readonly-box font-mono">
                Engineering &middot; Operations &middot; Finance &middot; Management
              </div>
            </div>
          </div>
        </div>

        {/* Access Policies */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Lock size={17} className="icon-blue" />
            <h3 className="font-sans">Access & Session Policies</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field">
              <label className="setting-label font-sans">Session Inactivity Timeout</label>
              <select 
                className="setting-input-select font-sans" 
                value={sessionTimeout} 
                onChange={(e) => setSessionTimeout(e.target.value)}
              >
                <option value="4 Hours">4 Hours</option>
                <option value="8 Hours">8 Hours (Standard)</option>
                <option value="12 Hours">12 Hours</option>
              </select>
            </div>

            <div className="setting-field checkbox-setting font-sans">
              <label className="checkbox-label-row">
                <input 
                  type="checkbox" 
                  checked={requireSaml} 
                  onChange={(e) => setRequireSaml(e.target.checked)} 
                />
                <span>Require Enterprise SSO / SAML 2.0 Authentication for all users</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
