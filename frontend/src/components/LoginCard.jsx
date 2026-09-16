import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle, Key, Mail, User, BadgeCheck, Briefcase, Building } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginCard({ onLoginSuccess }) {
  const { login, register } = useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('engineer@mrpl.co.in');
  const [password, setPassword] = useState('SecurePassword2026!');
  const [username, setUsername] = useState('lead_engineer');
  const [fullName, setFullName] = useState('Lead Inspector Gopal');
  const [role, setRole] = useState('engineer');
  const [department, setDepartment] = useState('Asset Integrity & Inspection');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleToggleMode = (toRegister) => {
    setIsRegisterMode(toRegister);
    setErrorMessage('');
    if (toRegister) {
      setEmail('');
      setPassword('');
      setUsername('');
      setFullName('');
      setRole('engineer');
      setDepartment('Asset Integrity & Inspection');
    } else {
      setEmail('engineer@mrpl.co.in');
      setPassword('SecurePassword2026!');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      let authUser;
      if (isRegisterMode) {
        authUser = await register({
          username,
          full_name: fullName,
          email,
          password,
          role,
          department
        });
      } else {
        authUser = await login(email, password);
      }

      if (onLoginSuccess) {
        onLoginSuccess(authUser);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="right-panel">
      <div className="login-card">
        <div className="card-icon-wrapper">
          <Shield size={26} strokeWidth={2.2} />
        </div>

        <h2 className="card-title">
          {isRegisterMode ? 'Enroll Inspection Engineer' : 'MRPL Sovereign Access'}
        </h2>
        <p className="card-subtitle">
          {isRegisterMode
            ? 'Provision new asset integrity credentials'
            : 'Sign in to your sovereign air-gapped workbench'}
        </p>

        {errorMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#F87171',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              textAlign: 'left',
              width: '100%',
              boxSizing: 'border-box'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            width: '100%',
            marginBottom: '1rem'
          }}
        >
          {isRegisterMode && (
            <>
              {/* Full Name */}
              <div style={{ position: 'relative' }}>
                <User
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }}
                />
                <input
                  type="text"
                  placeholder="Full Name (e.g. Gopal Sharma)"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#F8FAFC',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Username / Badge ID */}
              <div style={{ position: 'relative' }}>
                <BadgeCheck
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }}
                />
                <input
                  type="text"
                  placeholder="Badge ID / Username (Unique)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: 'rgba(15, 23, 42, 0.6)',
                    color: '#F8FAFC',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Shared Role Selector */}
              <div style={{ position: 'relative' }}>
                <Briefcase
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8', pointerEvents: 'none' }}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="engineer">Inspection Engineer</option>
                  <option value="lead_inspector">Lead Integrity Inspector</option>
                  <option value="ndt_technician">NDT Level-II Specialist</option>
                  <option value="corrosion_specialist">Corrosion & Materials Engineer</option>
                  <option value="plant_manager">Refinery Operations Manager</option>
                </select>
              </div>

              {/* Shared Department Selector */}
              <div style={{ position: 'relative' }}>
                <Building
                  size={16}
                  style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8', pointerEvents: 'none' }}
                />
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    background: '#0F172A',
                    color: '#F8FAFC',
                    fontSize: '0.88rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  <option value="Asset Integrity & Inspection">Asset Integrity & Inspection</option>
                  <option value="Refinery Operations">Refinery Operations</option>
                  <option value="Corrosion & Metallurgy">Corrosion & Metallurgy</option>
                  <option value="Mechanical Maintenance">Mechanical Maintenance</option>
                </select>
              </div>
            </>
          )}

          {/* Email */}
          <div style={{ position: 'relative' }}>
            <Mail
              size={16}
              style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }}
            />
            <input
              type="email"
              placeholder="Enterprise Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#F8FAFC',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Password */}
          <div style={{ position: 'relative' }}>
            <Key
              size={16}
              style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }}
            />
            <input
              type="password"
              placeholder="Master Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                background: 'rgba(15, 23, 42, 0.6)',
                color: '#F8FAFC',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            className="primary-action-btn"
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: '#0EA5E9',
              color: '#0F172A',
              fontWeight: 700,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginTop: '0.25rem'
            }}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
            <span>
              {isLoading
                ? 'Validating Credentials...'
                : isRegisterMode
                  ? 'Create Local Engineer Account'
                  : 'Authenticate Sovereign Session'}
            </span>
          </button>
        </form>

        {/* Toggle Mode Footer */}
        <div
          style={{
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            paddingTop: '0.75rem',
            width: '100%',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: '#94A3B8'
          }}
        >
          {isRegisterMode ? (
            <span>
              Already verified?{' '}
              <button
                type="button"
                onClick={() => handleToggleMode(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38BDF8',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              First-time inspector?{' '}
              <button
                type="button"
                onClick={() => handleToggleMode(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#38BDF8',
                  cursor: 'pointer',
                  fontWeight: 600,
                  textDecoration: 'underline'
                }}
              >
                Enroll Engineer Profile
              </button>
            </span>
          )}
        </div>

        {/* Sovereign Status Pill */}
        <div className="sso-badge" style={{ marginTop: '0.75rem' }}>
          <span className="sso-dot" style={{ backgroundColor: '#10B981' }}></span>
          <span>PostgreSQL SHA-256 Vault &middot; Offline Sovereign Node</span>
        </div>
      </div>
    </section>
  );
}