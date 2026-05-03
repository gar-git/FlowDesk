import { useEffect, useState } from 'react';
import WorkspaceFrameAccent from '../components/WorkspaceFrameAccent';

const features = [
  {
    icon: '🏗️',
    color: 'purple',
    title: 'Hierarchy-Based Access',
    desc: 'Manager → TL → Developer structure with role-aware dashboards. Each level sees exactly what they need, nothing more.',
  },
  {
    icon: '⚡',
    color: 'cyan',
    title: 'Real-Time Notifications',
    desc: 'Instant in-app alerts via WebSockets when tasks are assigned, forwarded, or updated. Never miss a beat.',
  },
  {
    icon: '🔁',
    color: 'green',
    title: 'Task Forwarding with Approval',
    desc: 'Developers can delegate tasks to peers. The recipient must accept — and the manager is always notified.',
  },
  {
    icon: '📊',
    color: 'orange',
    title: 'Progress Analytics',
    desc: 'Managers get a bird\'s-eye view of every team member\'s workload and completion rate at a glance.',
  },
  {
    icon: '📥',
    color: 'pink',
    title: 'Excel Export Reports',
    desc: 'Download weekly or monthly progress reports for any team member in one click. Built for review cycles.',
  },
  {
    icon: '🛡️',
    color: 'blue',
    title: 'Smart Team Management',
    desc: 'Managers can add, edit, and reorganize team members across the hierarchy without any admin overhead.',
  },
];

const managerPerms = [
  'View & manage all subordinates',
  'Assign tasks to any team member',
  'Reorganize team structure',
  'Download progress reports (weekly/monthly)',
  'Get notified on task forwards',
  'Full task CRUD for their org',
];

const tlPerms = [
  'View all developers in their team',
  'Assign & track developer tasks',
  'Assign tasks upward to managers',
  'Forward tasks with approval flow',
  'Monitor team-level progress',
  'Own task board like developers',
];

const devPerms = [
  'Personal Kanban board (All / Ongoing / Done)',
  'Click-to-expand task detail modal',
  'Forward tasks to other developers',
  'Accept or reject incoming forwards',
  'Real-time notification inbox',
  'See who assigned each task',
];

export default function LandingPage({ onLogin, onSignup, onRegisterCompany }) {
  const [scrolled, setScrolled] = useState(false);
  const [navMenuOpen, setNavMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 769px)');
    const closeWhenWide = () => {
      if (mq.matches) setNavMenuOpen(false);
    };
    mq.addEventListener('change', closeWhenWide);
    closeWhenWide();
    return () => mq.removeEventListener('change', closeWhenWide);
  }, []);

  const closeNavMenu = () => setNavMenuOpen(false);

  return (
    <>
      {/* NAVBAR */}
      <nav
        className={`navbar${scrolled ? ' scrolled' : ''}${navMenuOpen ? ' navbar--menu-open' : ''}`}
      >
        <div className="nav-logo">
          <div className="logo-icon">F</div>
          <span className="logo-text">Flow<span>Desk</span></span>
        </div>
        <button
          type="button"
          className="nav-mobile-toggle"
          aria-label={navMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={navMenuOpen}
          onClick={() => setNavMenuOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden fill="none">
            {navMenuOpen ? (
              <path
                d="M18 6L6 18M6 6l12 12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
        <div className="nav-links">
          <a href="#features" className="nav-link" onClick={closeNavMenu}>
            Features
          </a>
          <a href="#roles" className="nav-link" onClick={closeNavMenu}>
            Roles
          </a>
          {onRegisterCompany && (
            <button
              type="button"
              className="nav-link"
              onClick={() => {
                closeNavMenu();
                onRegisterCompany();
              }}
            >
              Create company
            </button>
          )}
          <button
            type="button"
            className="btn-nav-login"
            onClick={() => {
              closeNavMenu();
              onLogin();
            }}
          >
            Log In
          </button>
          <button
            type="button"
            className="btn-nav-signup"
            onClick={() => {
              closeNavMenu();
              onSignup();
            }}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <span className="dot" /> Currently in Beta · Built for real teams
        </div>

        <h1 className="hero-title">
          Where teams actually<br />
          <span className="gradient-text">get things done</span>
        </h1>

        <p className="hero-subtitle">
          FlowDesk is a hierarchy-aware task tracker for engineering teams.
          Managers delegate, TLs coordinate, developers execute — all in real time.
        </p>

        <div className="hero-actions">
          <button className="btn-primary" onClick={onSignup}>
            Start for free →
          </button>
          <button className="btn-secondary" onClick={onLogin}>
            Sign in to your workspace
          </button>
          {onRegisterCompany && (
            <button type="button" className="btn-secondary hero-cta-org" onClick={onRegisterCompany}>
              New organization? Create company
            </button>
          )}
        </div>

        {/* PREVIEW */}
        <div className="hero-preview">
          <div className="preview-frame">
            <div className="preview-topbar">
              <WorkspaceFrameAccent />
              <span className="preview-topbar-title">FlowDesk — Sprint Q2 · Ashish's Team</span>
            </div>
            <div className="preview-body">
              <div className="preview-sidebar">
                {[
                  { label: 'My Board', active: true },
                  { label: 'Team View', active: false },
                  { label: 'Notifications', active: false },
                  { label: 'Reports', active: false },
                  { label: 'Settings', active: false },
                ].map(item => (
                  <div key={item.label} className={`preview-sidebar-item${item.active ? ' active' : ''}`}>
                    <span className="preview-sidebar-icon" />
                    {item.label}
                  </div>
                ))}
              </div>
              <div className="preview-kanban">
                {/* All Tasks */}
                <div className="preview-col">
                  <div className="preview-col-header">
                    <span className="col-dot todo" /> All Tasks
                  </div>
                  <div className="preview-task-card">
                    <div className="task-title">Auth service refactor</div>
                    <span className="task-tag">Backend</span>
                  </div>
                  <div className="preview-task-card">
                    <div className="task-title">Design review — v2</div>
                    <span className="task-tag pink">Design</span>
                  </div>
                  <div className="preview-task-card">
                    <div className="task-title">API rate limiting</div>
                    <span className="task-tag cyan">Infra</span>
                  </div>
                </div>
                {/* Ongoing */}
                <div className="preview-col">
                  <div className="preview-col-header">
                    <span className="col-dot progress" /> Ongoing
                  </div>
                  <div className="preview-task-card">
                    <div className="task-title">Dashboard analytics</div>
                    <span className="task-tag cyan">Frontend</span>
                  </div>
                  <div className="preview-task-card">
                    <div className="task-title">Socket.io integration</div>
                    <span className="task-tag">Backend</span>
                  </div>
                </div>
                {/* Completed */}
                <div className="preview-col">
                  <div className="preview-col-header">
                    <span className="col-dot done" /> Completed
                  </div>
                  <div className="preview-task-card">
                    <div className="task-title">DB schema finalized</div>
                    <span className="task-tag green">Done</span>
                  </div>
                  <div className="preview-task-card">
                    <div className="task-title">Login flow — all roles</div>
                    <span className="task-tag green">Done</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-strip">
        {[
          { value: '3', label: 'Role Tiers Supported' },
          { value: '<1s', label: 'Real-time Notification Latency' },
          { value: '100%', label: 'Hierarchy Aware' },
          { value: '∞', label: 'Team Size' },
        ].map(s => (
          <div key={s.label} className="stat-item">
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* FEATURES */}
      <section className="section" id="features">
        <div className="section-tag">Features</div>
        <h2 className="section-title">Everything your team needs,<br />nothing it doesn't</h2>
        <p className="section-subtitle">
          Built specifically for engineering teams with real hierarchy — not a generic board tool bolted onto org charts.
        </p>
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card">
              <div className={`feature-icon ${f.color}`}>{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ROLES */}
      <section className="roles-section" id="roles">
        <div className="roles-inner">
          <div className="section-tag">Role System</div>
          <h2 className="section-title">One platform, three perspectives</h2>
          <p className="section-subtitle">
            Every person logs in to a tailored experience based on where they sit in your org.
          </p>
          <div className="roles-grid">
            {/* Manager */}
            <div className="role-card manager">
              <div className="role-emoji">👔</div>
              <h3 className="role-title">Manager</h3>
              <p className="role-subtitle">Full Org Visibility</p>
              <ul className="role-perms">
                {managerPerms.map(p => (
                  <li key={p}>
                    <span className="perm-check">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            {/* TL */}
            <div className="role-card tl">
              <div className="role-emoji">🧑‍💻</div>
              <h3 className="role-title">Tech Lead</h3>
              <p className="role-subtitle">Team Coordinator</p>
              <ul className="role-perms">
                {tlPerms.map(p => (
                  <li key={p}>
                    <span className="perm-check">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            {/* Developer */}
            <div className="role-card developer">
              <div className="role-emoji">⚙️</div>
              <h3 className="role-title">Developer</h3>
              <p className="role-subtitle">Individual Contributor</p>
              <ul className="role-perms">
                {devPerms.map(p => (
                  <li key={p}>
                    <span className="perm-check">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2 className="cta-title">
          Ready to bring order<br />to your team's chaos?
        </h2>
        <p className="cta-subtitle">
          Set up your workspace in under 2 minutes. No credit card needed.
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>
          <button className="btn-primary" onClick={onSignup} style={{ fontSize: 16, padding: '16px 40px' }}>
            Create your workspace →
          </button>
          <button className="btn-secondary" onClick={onLogin} style={{ fontSize: 16, padding: '16px 40px' }}>
            Already have an account
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <p className="footer-copy">
          © 2026 <span>FlowDesk</span>. Built for teams who move fast.
        </p>
        <div className="footer-links">
          <button className="footer-link">Privacy</button>
          <button className="footer-link">Terms</button>
          <button className="footer-link">Support</button>
        </div>
      </footer>
    </>
  );
}
