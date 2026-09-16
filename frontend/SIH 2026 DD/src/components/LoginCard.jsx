import React, { useState } from 'react';
import { User, ShieldCheck, Lock, Eye, EyeOff, Loader2, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function LoginCard({ onLoginSuccess }) {
  const [loginRole, setLoginRole] = useState('user'); // 'user' | 'admin'
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handlePasswordLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim()) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    if (password.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);

    // Determine final role based on selected tab or credentials
    const isExplicitAdmin = loginRole === 'admin' || username.toLowerCase().includes('admin');
    const finalRole = isExplicitAdmin ? 'admin' : 'user';

    // Simulate enterprise authentication request
    setTimeout(() => {
      setIsLoading(false);
      if (onLoginSuccess) {
        onLoginSuccess({ 
          username: username.trim(), 
          role: finalRole,
          authType: 'credentials' 
        });
      }
    }, 1000);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    triggerToast('Password reset link sent to registered enterprise email.');
  };

  return (
    <section className="right-panel">
      <div className="login-card">
        <div className="card-icon-wrapper">
          <img src="/assets/singularity_logo.png" alt="Singularity AI" className="login-card-logo-img" />
        </div>

        <h2 className="card-title">Welcome Back</h2>
        <p className="card-subtitle">
          Sign in to access {loginRole === 'admin' ? 'Admin Console' : 'Singularity AI Workbench'}
        </p>

        {/* Portal Role Selector Tabs */}
        <div className="role-tabs">
          <button
            type="button"
            className={`role-tab-btn ${loginRole === 'user' ? 'active' : ''}`}
            onClick={() => {
              setLoginRole('user');
              if (username === 'admin@singularity.ai') setUsername('');
            }}
          >
            <User size={14} />
            <span>User Login</span>
          </button>
          <button
            type="button"
            className={`role-tab-btn ${loginRole === 'admin' ? 'active admin-active' : ''}`}
            onClick={() => {
              setLoginRole('admin');
              if (!username) setUsername('admin@singularity.ai');
            }}
          >
            <ShieldCheck size={14} />
            <span>Admin Login</span>
          </button>
        </div>

        {errorMessage && (
          <div className="login-error-alert" role="alert">
            <AlertCircle size={16} className="error-icon" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Username & Password Form */}
        <form onSubmit={handlePasswordLogin} className="login-form">
          {/* Username Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-username">
              {loginRole === 'admin' ? 'Admin Username / Email' : 'Username or Email'}
            </label>
            <div className="input-wrapper">
              <User className="input-icon" size={16} />
              <input
                id="login-username"
                type="text"
                className="login-input"
                placeholder={loginRole === 'admin' ? 'admin@singularity.ai' : 'enter username or email'}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input password-input"
                placeholder="enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errorMessage) setErrorMessage('');
                }}
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Options Row: Remember Me & Forgot Password */}
          <div className="form-options-row">
            <label className="remember-me-label">
              <input
                type="checkbox"
                className="remember-checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <button
              type="button"
              className="forgot-password-link"
              onClick={handleForgotPassword}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="login-submit-btn"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In to {loginRole === 'admin' ? 'Admin Dashboard' : 'User Dashboard'}</span>
              </>
            )}
          </button>
        </form>

        <div className="sso-badge">
          <span className="sso-dot"></span>
          <span>{loginRole === 'admin' ? 'Air-Gapped Admin Security Protocol' : 'Air-Gapped Secure Authentication'}</span>
        </div>

        {toastMessage && (
          <div className="login-toast">
            <CheckCircle2 size={14} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </section>
  );
}

