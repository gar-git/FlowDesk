// ==============================|| LOADING SCREEN ||============================== //

const LoadingScreen = () => (
    <div
        style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            zIndex: 9999,
            gap: 20,
        }}
    >
        {/* Logo mark */}
        <div
            style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #6c63ff, #00d4ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                fontWeight: 800,
                color: '#fff',
                boxShadow: '0 0 40px rgba(108,99,255,0.5)',
            }}
        >
            F
        </div>

        {/* Spinner ring */}
        <div
            style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: '3px solid rgba(108,99,255,0.2)',
                borderTopColor: '#6c63ff',
                animation: 'fd-spin 0.8s linear infinite',
            }}
        />

        <style>{`
            @keyframes fd-spin {
                to { transform: rotate(360deg); }
            }
        `}</style>
    </div>
);

export default LoadingScreen;
