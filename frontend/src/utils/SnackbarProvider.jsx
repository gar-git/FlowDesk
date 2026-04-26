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
                        boxShadow: 'var(--shadow-card)',
                        background:
                            snack.type === 'success' ? 'var(--snack-bg-success)' :
                            snack.type === 'error'   ? 'var(--snack-bg-error)' :
                                                       'var(--snack-bg-info)',
                        border: `1px solid ${
                            snack.type === 'success' ? 'var(--green)' :
                            snack.type === 'error'   ? 'var(--pink)' :
                                                       'var(--purple)'
                        }`,
                        color:
                            snack.type === 'success' ? 'var(--green)' :
                            snack.type === 'error'   ? 'var(--pink)' :
                                                       'var(--badge-accent-text)',
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
