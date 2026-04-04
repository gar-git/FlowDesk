import { useState } from 'react';
import useAuth from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function AuthPage({ initialTab = 'login', onBack }) {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(initialTab); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Signup state
  const [signupData, setSignupData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    employeeCode: '',
    role: 3,
    password: '',
    confirmPassword: '',
  });

  const handleSignupChange = (field) => (e) =>
    setSignupData(prev => ({ ...prev, [field]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!loginEmail || !loginPassword) {
      setError('Please fill in all fields.');
      return;
    }
    const res = await login(loginEmail, loginPassword);
    if (res.success) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(res.message || 'Login failed.');
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setError('');
    const { firstName, lastName, email, employeeCode, role, password, confirmPassword } = signupData;
    if (!firstName || !lastName || !email || !employeeCode || !password || !confirmPassword) {
      setError('Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    const res = await signup({ firstName, lastName, email, employeeCode, roleId: Number(role), password });
    if (res.success) {
      setSuccess('Account created! Redirecting to login…');
      switchTab('login');
    } else {
      setError(res.message || 'Signup failed.');
    }
  };

  const switchTab = (newTab) => {
    setTab(newTab);
    setError('');
    setSuccess('');
  };

  const testimonials = {
    login: {
      text: '"FlowDesk changed how we run sprints. The hierarchy-aware views mean I never have to chase updates anymore."',
      name: 'Priya Sharma',
      role: 'Engineering Manager, Razorpay',
      color: '#6c63ff',
      initial: 'P',
    },
    signup: {
      text: '"The task forwarding feature alone saved us hours of meetings. My team loves the clean interface."',
      name: 'Rahul Mehta',
      role: 'Tech Lead, Zepto',
      color: '#00d4ff',
      initial: 'R',
    },
  };

  const t = testimonials[tab];

  return (
    <div className="auth-page">
      {/* LEFT PANEL */}
      <div className="auth-left">
        <div className="auth-left-decoration">
          <div className="auth-orb auth-orb-1" />
          <div className="auth-orb auth-orb-2" />
        </div>
        <div className="auth-left-content">
          <div className="auth-left-logo" onClick={onBack}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="logo-icon">F</div>
              <span className="logo-text">Flow<span>Desk</span></span>
            </div>
          </div>

          <h2 className="auth-left-tagline">
            Manage tasks<br />the way your <span className="gradient-text">team actually works</span>
          </h2>

          <p className="auth-left-desc">
            The only task tracker built around your org hierarchy. Assign, track, and
            delegate — with real-time notifications and full visibility at every level.
          </p>

          <div className="auth-testimonial">
            <p className="auth-testimonial-text">{t.text}</p>
            <div className="auth-testimonial-author">
              <div className="author-avatar" style={{ background: t.color }}>
                {t.initial}
              </div>
              <div className="author-info">
                <p className="author-name">{t.name}</p>
                <p className="author-role">{t.role}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="auth-right">
        <div className="auth-form-container">
          {/* Back link */}
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', fontSize: 13, marginBottom: 32,
              transition: 'var(--transition)', fontFamily: 'inherit',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ← Back to home
          </button>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              className={`auth-tab${tab === 'login' ? ' active' : ''}`}
              onClick={() => switchTab('login')}
            >
              Log In
            </button>
            <button
              className={`auth-tab${tab === 'signup' ? ' active' : ''}`}
              onClick={() => switchTab('signup')}
            >
              Sign Up
            </button>
          </div>

          {/* Messages */}
          {error && <div className="error-msg">⚠ {error}</div>}
          {success && <div className="success-msg">✓ {success}</div>}

          {/* ===== LOGIN FORM ===== */}
          {tab === 'login' && (
            <>
              <h2 className="auth-form-title">Welcome back</h2>
              <p className="auth-form-subtitle">Log in to your FlowDesk workspace</p>

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@company.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    autoComplete="email"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="password-wrapper">
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Your password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(p => !p)}
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-footer">
                  <label className="remember-me">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={e => setRememberMe(e.target.checked)}
                    />
                    <span>Remember me</span>
                  </label>
                  <button type="button" className="forgot-link">Forgot password?</button>
                </div>

                <button type="submit" className="btn-submit">
                  Log in to FlowDesk
                </button>
              </form>

              <p className="auth-switch">
                Don't have an account?{' '}
                <button onClick={() => switchTab('signup')}>Sign up free</button>
              </p>
            </>
          )}

          {/* ===== SIGNUP FORM ===== */}
          {tab === 'signup' && (
            <>
              <h2 className="auth-form-title">Create your account</h2>
              <p className="auth-form-subtitle">Join your team's FlowDesk workspace</p>

              <form onSubmit={handleSignup}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">First Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Ashish"
                      value={signupData.firstName}
                      onChange={handleSignupChange('firstName')}
                      autoComplete="given-name"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Last Name</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Kumar"
                      value={signupData.lastName}
                      onChange={handleSignupChange('lastName')}
                      autoComplete="family-name"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Work Email</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="you@company.com"
                    value={signupData.email}
                    onChange={handleSignupChange('email')}
                    autoComplete="email"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Employee Code</label>
                    <input
                      className="form-input"
                      type="text"
                      placeholder="EMP-001"
                      value={signupData.employeeCode}
                      onChange={handleSignupChange('employeeCode')}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={signupData.role}
                      onChange={handleSignupChange('role')}
                    >
                      <option value={3}>Developer (SDE)</option>
                      <option value={2}>Tech Lead</option>
                      <option value={1}>Manager</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="password-wrapper">
                    <input
                      className="form-input"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 8 characters"
                      value={signupData.password}
                      onChange={handleSignupChange('password')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPassword(p => !p)}
                      tabIndex={-1}
                    >
                      {showPassword ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="password-wrapper">
                    <input
                      className="form-input"
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Repeat your password"
                      value={signupData.confirmPassword}
                      onChange={handleSignupChange('confirmPassword')}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirm(p => !p)}
                      tabIndex={-1}
                    >
                      {showConfirm ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-submit" style={{ marginTop: 8 }}>
                  Create Account →
                </button>
              </form>

              <p className="auth-switch">
                Already have an account?{' '}
                <button onClick={() => switchTab('login')}>Log in</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
