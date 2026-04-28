import { useCallback, useEffect, useState } from 'react';
import { changePassword, getProfile, updateNotificationPrefs } from '../../api/users';
import { StatusCode } from '../../utils/constants';
import { getTheme, setTheme } from '../../utils/theme';

function IconMoon({ className = '' }) {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
                d="M21 14.5A8.5 8.5 0 0 1 9.5 3a8.5 8.5 0 1 0 11.5 11.5Z"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconSun({ className = '' }) {
    return (
        <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
            <path
                d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
            />
        </svg>
    );
}

function numToBool(v) {
    if (v === true || v === 1) return true;
    if (v === false || v === 0) return false;
    return undefined;
}

export default function SettingsPanel({ showSnackbar }) {
    const [theme, setThemeState] = useState(() => getTheme());
    const [emailTaskAssigned, setEmailTaskAssigned] = useState(true);
    const [emailTaskDueSoon, setEmailTaskDueSoon] = useState(true);
    const [emailTaskStatus, setEmailTaskStatus] = useState(false);
    const [prefsLoaded, setPrefsLoaded] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const res = await getProfile();
            const body = res?.data ?? res;
            if (cancelled || body?.statusCode !== StatusCode.success || !body?.data) {
                setPrefsLoaded(true);
                return;
            }
            const d = body.data;
            const a = numToBool(d.emailTaskAssigned);
            const b = numToBool(d.emailTaskDueSoon);
            const c = numToBool(d.emailTaskStatus);
            if (a !== undefined) setEmailTaskAssigned(a);
            if (b !== undefined) setEmailTaskDueSoon(b);
            if (c !== undefined) setEmailTaskStatus(c);
            setPrefsLoaded(true);
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    const persistNotif = useCallback(
        async (payload) => {
            const res = await updateNotificationPrefs(payload);
            const body = res?.data ?? res;
            if (body?.statusCode !== StatusCode.success) {
                showSnackbar?.(body?.message || 'Could not save notification settings', 'error');
                return false;
            }
            return true;
        },
        [showSnackbar]
    );

    const handleTheme = (value) => {
        setTheme(value);
        setThemeState(value);
        showSnackbar?.(value === 'light' ? 'Light theme' : 'Dark theme', 'success');
    };

    const toggleAssigned = async () => {
        const next = !emailTaskAssigned;
        setEmailTaskAssigned(next);
        const ok = await persistNotif({ emailTaskAssigned: next });
        if (!ok) setEmailTaskAssigned(!next);
    };

    const toggleDueSoon = async () => {
        const next = !emailTaskDueSoon;
        setEmailTaskDueSoon(next);
        const ok = await persistNotif({ emailTaskDueSoon: next });
        if (!ok) setEmailTaskDueSoon(!next);
    };

    const toggleStatus = async () => {
        const next = !emailTaskStatus;
        setEmailTaskStatus(next);
        const ok = await persistNotif({ emailTaskStatus: next });
        if (!ok) setEmailTaskStatus(!next);
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
        <div className="settings-page-outer">
        <div className="settings-page">
            <header className="settings-page__header">
                <h1 className="settings-page__title">Settings</h1>
                <p className="settings-page__lead">
                    Manage your appearance, notifications, and security.
                </p>
            </header>

            <section className="settings-card" aria-labelledby="settings-appearance">
                <div className="settings-card__head">
                    <h2 id="settings-appearance" className="settings-card__title">
                        Appearance
                    </h2>
                    <p className="settings-card__sub">Choose how FlowDesk looks for you.</p>
                </div>
                <div className="settings-theme-pair" role="group" aria-label="Theme">
                    {[
                        { value: 'dark', label: 'Dark', Icon: IconMoon },
                        { value: 'light', label: 'Light', Icon: IconSun },
                    ].map(({ value, label, Icon }) => {
                        const on = theme === value;
                        return (
                            <button
                                key={value}
                                type="button"
                                className={
                                    on ? 'settings-theme-btn settings-theme-btn--active' : 'settings-theme-btn'
                                }
                                onClick={() => handleTheme(value)}
                            >
                                <Icon className="settings-theme-btn__icon" />
                                {label}
                            </button>
                        );
                    })}
                </div>
            </section>

            <section className="settings-card" aria-labelledby="settings-notifications">
                <div className="settings-card__head">
                    <h2 id="settings-notifications" className="settings-card__title">
                        Notifications
                    </h2>
                    <p className="settings-card__sub">Control which emails FlowDesk sends you.</p>
                </div>
                <div
                    className={`settings-notif-list${!prefsLoaded ? ' settings-notif-list--loading' : ''}`}
                >
                    <div className="settings-notif-row">
                        <div>
                            <div className="settings-notif-row__title">Task assigned to me</div>
                            <p className="settings-notif-row__desc">Email when someone assigns you a task.</p>
                        </div>
                        <button
                            type="button"
                            className="settings-switch"
                            role="switch"
                            aria-checked={emailTaskAssigned}
                            disabled={!prefsLoaded}
                            onClick={toggleAssigned}
                        >
                            <span
                                className={`settings-switch__track${emailTaskAssigned ? ' settings-switch__track--on' : ''}`}
                            />
                        </button>
                    </div>
                    <div className="settings-notif-row">
                        <div>
                            <div className="settings-notif-row__title">Task due soon</div>
                            <p className="settings-notif-row__desc">Reminder 24 hours before a task is due.</p>
                        </div>
                        <button
                            type="button"
                            className="settings-switch"
                            role="switch"
                            aria-checked={emailTaskDueSoon}
                            disabled={!prefsLoaded}
                            onClick={toggleDueSoon}
                        >
                            <span
                                className={`settings-switch__track${emailTaskDueSoon ? ' settings-switch__track--on' : ''}`}
                            />
                        </button>
                    </div>
                    <div className="settings-notif-row settings-notif-row--last">
                        <div>
                            <div className="settings-notif-row__title">Task status updates</div>
                            <p className="settings-notif-row__desc">Email when a task you created changes status.</p>
                        </div>
                        <button
                            type="button"
                            className="settings-switch"
                            role="switch"
                            aria-checked={emailTaskStatus}
                            disabled={!prefsLoaded}
                            onClick={toggleStatus}
                        >
                            <span
                                className={`settings-switch__track${emailTaskStatus ? ' settings-switch__track--on' : ''}`}
                            />
                        </button>
                    </div>
                </div>
            </section>

            <section className="settings-card" aria-labelledby="settings-password">
                <div className="settings-card__head">
                    <h2 id="settings-password" className="settings-card__title">
                        Change password
                    </h2>
                    <p className="settings-card__sub">Update your account password anytime.</p>
                </div>
                <form onSubmit={handleChangePassword} className="settings-password-form">
                    <label className="settings-field">
                        <span className="settings-field__label">Current password</span>
                        <input
                            className="settings-field__input"
                            type="password"
                            autoComplete="current-password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                        />
                    </label>
                    <div className="settings-password-form__row2">
                        <label className="settings-field">
                            <span className="settings-field__label">New password</span>
                            <input
                                className="settings-field__input"
                                type="password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </label>
                        <label className="settings-field">
                            <span className="settings-field__label">Confirm new password</span>
                            <input
                                className="settings-field__input"
                                type="password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                            />
                        </label>
                    </div>
                    {error && (
                        <div className="error-msg settings-field__error" style={{ marginTop: 0 }}>
                            {error}
                        </div>
                    )}
                    <div className="settings-password-form__actions">
                        <button type="submit" className="btn-submit settings-password__submit" disabled={saving}>
                            {saving ? 'Updating…' : 'Update password'}
                        </button>
                    </div>
                </form>
            </section>
        </div>
        </div>
    );
}
