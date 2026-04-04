import { useNavigate } from 'react-router-dom';

// ==============================|| 404 NOT FOUND ||============================== //

export default function NotFound() {
    const navigate = useNavigate();

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg-primary)', color: 'var(--text-primary)',
            fontFamily: 'Inter, sans-serif', textAlign: 'center', padding: 24,
        }}>
            <div style={{
                fontSize: 80, fontWeight: 800, lineHeight: 1,
                background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                marginBottom: 16,
            }}>
                404
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 600, marginBottom: 10 }}>Page not found</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 32 }}>
                The page you're looking for doesn't exist or has been moved.
            </p>
            <button
                onClick={() => navigate('/')}
                style={{
                    padding: '12px 28px', borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg,#6c63ff,#8b85ff)',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                }}
            >
                Back to Home
            </button>
        </div>
    );
}
