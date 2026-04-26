import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StatusCode } from '../../utils/constants';
import { createTask } from '../../api/tasks';

const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginTop: 12,
};

const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid var(--border)',
    background: 'var(--input-surface)',
    color: 'var(--text-primary)',
    fontSize: 14,
    outline: 'none',
    fontFamily: 'inherit',
    marginTop: 6,
};

export default function AddTaskModal({
    open,
    onClose,
    projects,
    assigneeOptions,
    defaultAssigneeId,
    showSnackbar,
    onCreated,
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [projectId, setProjectId] = useState('');
    const [assigneeId, setAssigneeId] = useState(String(defaultAssigneeId ?? ''));
    const [priority, setPriority] = useState('medium');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!open) return;
        setTitle('');
        setDescription('');
        setProjectId(projects[0]?.id != null ? String(projects[0].id) : '');
        setAssigneeId(String(defaultAssigneeId ?? ''));
        setPriority('medium');
        setError('');
    }, [open, projects, defaultAssigneeId]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const pid = Number(projectId);
        const aid = Number(assigneeId);
        if (!title.trim()) {
            setError('Title is required');
            return;
        }
        if (!pid) {
            setError('Choose a project');
            return;
        }
        if (!aid) {
            setError('Choose an assignee');
            return;
        }
        setSubmitting(true);
        try {
            const res = await createTask({
                title: title.trim(),
                description: description.trim() || undefined,
                projectId: pid,
                assignee_id: aid,
                priority,
            });
            const body = res?.data ?? res;
            if (body?.statusCode === StatusCode.created) {
                showSnackbar?.('Task created', 'success');
                onCreated?.(body.data);
                onClose();
            } else {
                setError(body?.message || 'Could not create task');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (!open) return null;

    return createPortal(
        <div className="modal-backdrop" aria-hidden="true">
            <div
                className="modal-panel"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-task-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-panel-header">
                    <h2 id="add-task-modal-title" className="modal-panel-title">
                        New task
                    </h2>
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
                    {projects.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.5 }}>
                            Create a project under <strong>Projects</strong> before adding tasks.
                        </p>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <label style={{ ...labelStyle, marginTop: 0 }}>
                                Title
                                <input
                                    required
                                    autoFocus
                                    style={inputStyle}
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="What needs to be done?"
                                />
                            </label>
                            <label style={labelStyle}>
                                Description (optional)
                                <textarea
                                    style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Context or acceptance criteria"
                                />
                            </label>
                            <label style={labelStyle}>
                                Project
                                <select
                                    className="form-select dashboard-select"
                                    style={inputStyle}
                                    required
                                    value={projectId}
                                    onChange={(e) => setProjectId(e.target.value)}
                                >
                                    {projects.map((p) => (
                                        <option key={p.id} value={String(p.id)}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            {assigneeOptions.length > 1 && (
                                <label style={labelStyle}>
                                    Assign to
                                    <select
                                        className="form-select dashboard-select"
                                        style={inputStyle}
                                        required
                                        value={assigneeId}
                                        onChange={(e) => setAssigneeId(e.target.value)}
                                    >
                                        {assigneeOptions.map((o) => (
                                            <option key={o.id} value={String(o.id)}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
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
                            {error && (
                                <div className="error-msg" style={{ marginTop: 14 }}>
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
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="btn-submit"
                                >
                                    {submitting ? 'Creating…' : 'Create task'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
