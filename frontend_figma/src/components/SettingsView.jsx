import React, { useState } from 'react';
import { Settings, Cpu, Shield, Key, Save, HardDrive, Check } from 'lucide-react';

export default function SettingsView() {
  const [model, setModel] = useState('Sovereign-LLM-v4.2-70B');
  const [gpuAlloc, setGpuAlloc] = useState('95% (4x NVIDIA H100)');
  const [contextWindow, setContextWindow] = useState('200,000 Tokens');
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
          <p className="subpage-subtitle">Configure local neural runtimes, hardware allocation, and air-gapped enclave security.</p>
        </div>
        <button className="primary-action-btn" onClick={handleSave}>
          {saved ? <Check size={15} /> : <Save size={15} />}
          <span>{saved ? 'Saved!' : 'Save Settings'}</span>
        </button>
      </header>

      {/* Settings Grid */}
      <div className="settings-sections-list">
        {/* Model & Runtime Settings */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Cpu size={18} color="#38BDF8" />
            <h3>Local Neural Model Runtime</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field">
              <label className="setting-label">Active Air-Gapped Model</label>
              <select className="setting-input-select" value={model} onChange={(e) => setModel(e.target.value)}>
                <option value="Sovereign-LLM-v4.2-70B">Sovereign-LLM-v4.2 (70B Parameters)</option>
                <option value="Sovereign-Coder-v3-32B">Sovereign-Coder-v3 (32B Parameters)</option>
                <option value="Sovereign-Calc-v2-13B">Sovereign-Calc-v2 (13B Parameters)</option>
              </select>
            </div>

            <div className="setting-field">
              <label className="setting-label">Hardware GPU Allocation</label>
              <input type="text" className="setting-input-text" value={gpuAlloc} onChange={(e) => setGpuAlloc(e.target.value)} />
            </div>

            <div className="setting-field">
              <label className="setting-label">Maximum Context Window Size</label>
              <select className="setting-input-select" value={contextWindow} onChange={(e) => setContextWindow(e.target.value)}>
                <option value="128,000 Tokens">128,000 Tokens</option>
                <option value="200,000 Tokens">200,000 Tokens (Recommended)</option>
                <option value="256,000 Tokens">256,000 Tokens</option>
              </select>
            </div>
          </div>
        </div>

        {/* Security & Air-Gap */}
        <div className="subpage-card settings-card">
          <div className="settings-card-header">
            <Shield size={18} color="#10B981" />
            <h3>Security & Air-Gap Enclave</h3>
          </div>
          <div className="settings-form-grid">
            <div className="setting-field">
              <label className="setting-label">Hardware Security Module (HSM)</label>
              <div className="setting-readonly-box">FIPS 140-3 Compliant Active</div>
            </div>

            <div className="setting-field">
              <label className="setting-label">Data Egress Prevention</label>
              <div className="setting-readonly-box">Strict Physical Network Isolation Enabled</div>
            </div>

            <div className="setting-field">
              <label className="setting-label">Storage Encryption</label>
              <div className="setting-readonly-box">AES-256 Volume Key Encrypted</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
