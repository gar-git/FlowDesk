import { createContext, useCallback, useContext, useState } from 'react';

// ==============================|| SNACKBAR CONTEXT ||============================== //

const SnackbarContext = createContext(null);

const DURATION = 3500; // ms

export const SnackbarProvider = ({ children }) => {
    const [snack, setSnack] = useState(null); // { message, type: 'success'|'error'|'info' }

    const showSnackbar = useCallback((message, type = 'info') => {
        setSnack({ message, type });
        setTimeout(() => setSnack(null), DURATION);
    }, []);

    const dismiss = useCallback(() => setSnack(null), []);

    return (
        <SnackbarContext.Provider value={{ showSnackbar }}>
            {children}
            {snack && (
                <div
                    onClick={dismiss}
                    style={{
                        position: 'fixed',
                        bottom: 28,
                        right: 28,
                        zIndex: 9999,
                        padding: '12px 20px',
                        borderRadius: 10,
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: 'pointer',
                        maxWidth: 360,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        background:
                            snack.type === 'success' ? 'rgba(0,229,160,0.15)' :
                            snack.type === 'error'   ? 'rgba(255,107,107,0.15)' :
                                                       'rgba(108,99,255,0.15)',
                        border: `1px solid ${
                            snack.type === 'success' ? '#00e5a0' :
                            snack.type === 'error'   ? '#ff6b6b' :
                                                       '#6c63ff'
                        }`,
                        color:
                            snack.type === 'success' ? '#00e5a0' :
                            snack.type === 'error'   ? '#ff6b6b' :
                                                       '#a09fff',
                    }}
                >
                    {snack.message}
                </div>
            )}
        </SnackbarContext.Provider>
    );
};

export const useSnackbar = () => {
    const ctx = useContext(SnackbarContext);
    if (!ctx) throw new Error('useSnackbar must be used inside SnackbarProvider');
    return ctx;
};
