import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { taskStatus, StatusCode } from '../../utils/constants';
import { statusToApi, formatDateInputValue } from '../../utils/taskApi';
import { updateTask, forwardTask } from '../../api/tasks';

const STATUS_OPTIONS = [
    { value: taskStatus.todo, label: 'To do' },
    { value: taskStatus.inProgress, label: 'Ongoing' },
    { value: taskStatus.done, label: 'Done' },
];

const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginTop: 14,
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'rgba(255,255,255,0.06)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    marginTop: 6,
};

export default function TaskDetailModal({
    task,
    onClose,
    showSnackbar,
    onTaskUpdated,
    refreshTasks,
    currentUserId,
    forwardOptions,
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(taskStatus.todo);
    const [priority, setPriority] = useState('medium');
    const [startDate, setStartDate] = useState('');
    const [saving, setSaving] = useState(false);
    const [forwardTarget, setForwardTarget] = useState('');
    const [forwarding, setForwarding] = useState(false);
    const [error, setError] = useState('');

    const isAssignee = task && Number(task.assigneeId) === Number(currentUserId);
    const canForward = isAssignee && forwardOptions?.length > 0;

    useEffect(() => {
        if (!task) return;
        setTitle(task.title || '');
        setDescription(task.description || '');
        setStatus(task.status || taskStatus.todo);
        setPriority(task.priority || 'medium');
        setStartDate(formatDateInputValue(task.startDate));
        setError('');
        setForwardTarget('');
    }, [task]);

    useEffect(() => {
        if (!task) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [task, onClose]);

    useEffect(() => {
        if (!task) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [task]);

    if (!task) return null;

    const handleSave = async (e) => {
        e.preventDefault();
        setError('');
        const t = title.trim();
        if (!t) {
            setError('Title is required');
            return;
        }
        setSaving(true);
        try {
            const res = await updateTask(task.id, {
                title: t,
                description: description,
                status: statusToApi(status),
                priority,
                startDate: startDate || null,
            });
            const body = res?.data ?? res;
            if (body?.statusCode !== StatusCode.success) {
                setError(body?.message || 'Could not save');
                return;
            }
            showSnackbar?.('Task saved', 'success');
            onTaskUpdated?.(task.id, {
                title: t,
                description,
                status,
                priority,
                startDate: startDate || null,
            });
        } finally {
            setSaving(false);
        }
    };

    const handleForward = async () => {
        const tid = Number(forwardTarget);
        if (!tid) {
            setError('Choose someone to forward to');
            return;
        }
        setForwarding(true);
        setError('');
        try {
            const res = await forwardTask(task.id, tid);
            const body = res?.data ?? res;
            if (body?.statusCode !== StatusCode.success) {
                setError(body?.message || 'Forward failed');
                return;
            }
            showSnackbar?.('Forward request sent', 'success');
            await refreshTasks?.();
            onClose();
        } finally {
            setForwarding(false);
        }
    };

    return createPortal(
        <div className="modal-backdrop" aria-hidden="true">
            <div
                className="modal-panel task-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-detail-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-panel-header">
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <label
                            htmlFor="task-detail-status"
                            style={{
                                fontSize: 11,
                                fontWeight: 600,
                                color: 'var(--text-muted)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                            }}
                        >
                            List
                        </label>
                        <select
                            id="task-detail-status"
                            className="form-select dashboard-select"
                            style={{
                                marginTop: 6,
                                maxWidth: 200,
                                fontSize: 13,
                            }}
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                        >
                            {STATUS_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        className="modal-close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-panel-body">
                    <form onSubmit={handleSave}>
                        <label htmlFor="task-detail-title" style={{ ...labelStyle, marginTop: 0 }}>
                            Title
                        </label>
                        <input
                            id="task-detail-title"
                            required
                            style={{ ...inputStyle, marginTop: 6, fontSize: 18, fontWeight: 600 }}
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                        />

                        {task.creatorName &&
                            task.creatorId != null &&
                            task.assigneeId != null &&
                            Number(task.creatorId) !== Number(task.assigneeId) && (
                                <div className="app-task-delegated" style={{ marginTop: 12 }}>
                                    Assigned by{' '}
                                    <span className="app-task-delegated-name">{task.creatorName}</span>
                                </div>
                            )}

                        <label style={labelStyle}>
                            Priority
                            <select
                                className="form-select dashboard-select"
                                style={inputStyle}
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </label>

                        <label style={labelStyle}>
                            Start date
                            <input
                                type="date"
                                style={inputStyle}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </label>

                        <label style={labelStyle}>
                            Description
                            <textarea
                                style={{ ...inputStyle, minHeight: 120, resize: 'vertical' }}
                                value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add details for this task…"
                        />
                        </label>

                        {error && (
                            <div className="error-msg" style={{ marginTop: 12 }}>
                                {error}
                            </div>
                        )}

                        <div
                            style={{
                                display: 'flex',
                                gap: 10,
                                justifyContent: 'flex-end',
                                marginTop: 20,
                            }}
                        >
                            <button
                                type="button"
                                onClick={onClose}
                                style={{
                                    padding: '10px 18px',
                                    borderRadius: 8,
                                    border: '1px solid var(--border)',
                                    background: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontSize: 14,
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontFamily: 'inherit',
                                }}
                            >
                                Close
                            </button>
                            <button type="submit" disabled={saving} className="btn-submit">
                                {saving ? 'Saving…' : 'Save changes'}
                            </button>
                        </div>
                    </form>

                    {canForward && (
                        <div
                            style={{
                                marginTop: 28,
                                paddingTop: 22,
                                borderTop: '1px solid var(--border)',
                            }}
                        >
                            <h3
                                style={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: 'var(--text-secondary)',
                                    marginBottom: 10,
                                }}
                            >
                                Forward task
                            </h3>
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                                Ask a teammate to take over. They will need to accept the request.
                            </p>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                                <select
                                    className="form-select dashboard-select"
                                    style={{ ...inputStyle, flex: '1 1 200px', marginTop: 0 }}
                                    value={forwardTarget}
                                    onChange={(e) => setForwardTarget(e.target.value)}
                                >
                                    <option value="">Select teammate…</option>
                                    {forwardOptions.map((o) => (
                                        <option key={o.id} value={String(o.id)}>
                                            {o.label}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    disabled={forwarding || !forwardTarget}
                                    onClick={handleForward}
                                >
                                    {forwarding ? 'Sending…' : 'Send request'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
