import { useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * Themed confirm dialog (replaces window.confirm) — uses CSS variables for light/dark.
 */
export default function ConfirmDialog({
    open,
    title = 'Are you sure?',
    children,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    danger = false,
    loading = false,
    onConfirm,
    onCancel,
}) {
    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape' && !loading) onCancel?.();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, loading, onCancel]);

    if (!open) return null;

    return createPortal(
        <div
            className="confirm-dialog-backdrop"
            role="presentation"
            onClick={loading ? undefined : onCancel}
        >
            <div
                className="confirm-dialog-panel"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-dialog-title" className="confirm-dialog-title">
                    {title}
                </h2>
                {children && <div className="confirm-dialog-body">{children}</div>}
                <div className="confirm-dialog-actions">
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        {cancelLabel}
                    </button>
                    <button
                        type="button"
                        className={danger ? 'btn-secondary confirm-dialog-confirm--danger' : 'btn-submit'}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Please wait…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
