import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle, Key, Mail } from 'lucide-react';
import { loginUser, demoLoginUser } from '../utils/api';

export default function LoginCard({ onLoginSuccess }) {
  const [email, setEmail] = useState('reva.kulkarni@singularity.local');
  const [password, setPassword] = useState('SingularityEnterprise2026!');
  const [isLoading, setIsLoading] = useState(false);
  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Handle standard email/password login
  const handleStandardLogin = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const data = await loginUser(email, password);
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Invalid enterprise credentials');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 1-click Enterprise SSO login
  const handleDemoSso = async () => {
    setErrorMessage('');
    setIsSsoLoading(true);

    try {
      const data = await demoLoginUser();
      if (onLoginSuccess) {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMessage(err.message || 'SSO authentication failed');
    } finally {
      setIsSsoLoading(false);
    }
  };

  return (
    <section className="right-panel">
      <div className="login-card">
        <div className="card-icon-wrapper">
          <Shield size={26} strokeWidth={2.2} />
        </div>

        <h2 className="card-title">Welcome Back</h2>
        <p className="card-subtitle">Sign in to your Singularity workbench</p>

        {errorMessage && (
          <div style={{
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
            textAlign: 'left'
          }}>
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Standard Email / Password Form */}
        <form onSubmit={handleStandardLogin} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginBottom: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Mail size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
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

          <div style={{ position: 'relative' }}>
            <Key size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94A3B8' }} />
            <input
              type="password"
              placeholder="Password"
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
              backgroundColor: '#3B82F6',
              color: '#FFF',
              fontWeight: 600,
              fontSize: '0.92rem',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'background-color 0.2s'
            }}
            disabled={isLoading || isSsoLoading}
          >
            {isLoading ? <Loader2 className="animate-spin" size={18} /> : null}
            <span>{isLoading ? 'Authenticating...' : 'Sign In with Credentials'}</span>
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', margin: '0.5rem 0 1rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
          <span style={{ fontSize: '0.75rem', color: '#94A3B8', textTransform: 'uppercase' }}>or continue with</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.1)' }}></div>
        </div>

        {/* Enterprise SSO 1-Click Demo Button */}
        <button 
          type="button"
          className="google-auth-btn" 
          onClick={handleDemoSso}
          disabled={isLoading || isSsoLoading}
        >
          {isSsoLoading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <svg className="google-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          )}
          <span>{isSsoLoading ? 'Verifying SSO Ticket...' : 'Continue with Enterprise SSO (Demo)'}</span>
        </button>

        <div className="sso-badge">
          <span className="sso-dot"></span>
          <span>SAML 2.0 / OIDC &middot; Authorized Personnel Only</span>
        </div>
      </div>
    </section>
  );
}
