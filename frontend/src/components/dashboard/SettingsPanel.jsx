import { useState } from 'react';
import { changePassword } from '../../api/users';
import { StatusCode } from '../../utils/constants';
import { getTheme, setTheme } from '../../utils/theme';

const card = {
    padding: 24,
    borderRadius: 14,
    border: '1px solid var(--border)',
    background: 'var(--bg-card)',
    marginBottom: 20,
    maxWidth: 480,
};

const label = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6,
};

const input = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
};

export default function SettingsPanel({ showSnackbar }) {
    const [theme, setThemeState] = useState(() => getTheme());
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleTheme = (value) => {
        setTheme(value);
        setThemeState(value);
        showSnackbar?.(value === 'light' ? 'Light theme' : 'Dark theme', 'success');
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 8) {
            setError('New password must be at least 8 characters');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('New passwords do not match');
            return;
        }
        setSaving(true);
        try {
            const res = await changePassword({ currentPassword, newPassword });
            const body = res?.data ?? res;
            if (body?.statusCode === StatusCode.success) {
                showSnackbar?.('Password updated', 'success');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                setError(body?.message || 'Could not update password');
            }
        } catch (err) {
            const data = err?.response?.data;
            const msg =
                (typeof data === 'object' && data?.message) ||
                err?.message ||
                'Request failed';
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div>
            <h2
                style={{
                    fontSize: 22,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    marginBottom: 8,
                }}
            >
                Settings
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                Appearance and your account security.
            </p>

            <div style={card}>
                <h3
                    style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 16,
                    }}
                >
                    Appearance
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    Dark is the default FlowDesk look. Light mode inverts the dashboard for brighter
                    rooms.
                </p>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {[
                        { value: 'dark', label: 'Dark' },
                        { value: 'light', label: 'Light' },
                    ].map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => handleTheme(o.value)}
                            style={{
                                padding: '10px 18px',
                                borderRadius: 8,
                                border:
                                    theme === o.value
                                        ? '1px solid var(--purple)'
                                        : '1px solid var(--border)',
                                background:
                                    theme === o.value
                                        ? 'rgba(108, 99, 255, 0.15)'
                                        : 'transparent',
                                color: 'var(--text-primary)',
                                fontSize: 14,
                                fontWeight: 600,
                                cursor: 'pointer',
                                fontFamily: 'inherit',
                            }}
                        >
                            {o.label}
                        </button>
                    ))}
                </div>
            </div>

            <div style={card}>
                <h3
                    style={{
                        fontSize: 15,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: 16,
                    }}
                >
                    Change password
                </h3>
                <form onSubmit={handleChangePassword}>
                    <label style={{ ...label, marginTop: 0 }}>
                        Current password
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            style={{ ...input, marginTop: 6 }}
                            required
                        />
                    </label>
                    <label style={{ ...label, marginTop: 14 }}>
                        New password
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            style={{ ...input, marginTop: 6 }}
                            required
                            minLength={8}
                        />
                    </label>
                    <label style={{ ...label, marginTop: 14 }}>
                        Confirm new password
                        <input
                            type="password"
                            autoComplete="new-password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            style={{ ...input, marginTop: 6 }}
                            required
                            minLength={8}
                        />
                    </label>
                    {error && (
                        <div className="error-msg" style={{ marginTop: 12 }}>
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        className="btn-submit"
                        disabled={saving}
                        style={{ marginTop: 18, width: 'auto', minWidth: 160 }}
                    >
                        {saving ? 'Updating…' : 'Update password'}
                    </button>
                </form>
            </div>
        </div>
    );
}
