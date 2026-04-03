import './styles.css';
import { useState } from 'react';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';

// Simple state-based router: 'landing' | 'login' | 'signup'
export default function App() {
  const [view, setView] = useState('landing');

  if (view === 'login' || view === 'signup') {
    return (
      <AuthPage
        initialTab={view}
        onBack={() => setView('landing')}
      />
    );
  }

  return (
    <LandingPage
      onLogin={() => setView('login')}
      onSignup={() => setView('signup')}
    />
  );
}
