import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { taskStatus, taskType, taskTypeLabel, StatusCode } from '../../utils/constants';
import {
    statusToApi,
    formatDateInputValue,
    taskTypeKeyToApi,
} from '../../utils/taskApi';
import { updateTask, forwardTask } from '../../api/tasks';

const STATUS_OPTIONS = [
    { value: taskStatus.todo, label: 'To do' },
    { value: taskStatus.inProgress, label: 'Ongoing' },
    { value: taskStatus.done, label: 'Done' },
];

const TASK_TYPE_OPTION_KEYS = ['bug', 'feature', 'improvement', 'chore'];

const PRIORITY_READ_LABEL = { low: 'Low', medium: 'Medium', high: 'High' };
const PRIORITY_PILL = { low: 'LOW', medium: 'MED', high: 'HIGH' };

const AVATAR_TINTS = [
    'linear-gradient(135deg, #6c63ff, #4a43b8)',
    'linear-gradient(135deg, #2dd4bf, #0d9488)',
    'linear-gradient(135deg, #f472b6, #db2777)',
    'linear-gradient(135deg, #60a5fa, #2563eb)',
    'linear-gradient(135deg, #fbbf24, #d97706)',
];

function strHash(s) {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h << 5) - h + s.charCodeAt(i);
    return Math.abs(h);
}

function initialsFromName(name) {
    if (!name || !String(name).trim()) return '?';
    const p = String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    if (p.length === 0) return '?';
    if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
    return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function UserAvatar({ name, initialsFrom, className = '' }) {
    const forInitials = (initialsFrom && String(initialsFrom).trim()) || name || '';
    const forHash = forInitials || 'user';
    const bg = AVATAR_TINTS[strHash(String(forHash)) % AVATAR_TINTS.length];
    return (
        <span
            className={`task-detail-avatar ${className}`.trim()}
            style={{ background: bg }}
            aria-hidden
        >
            {initialsFromName(forInitials)}
        </span>
    );
}

function UserInCell({ name, initialsFrom }) {
    if (!name) {
        return <span className="task-detail-user-muted">—</span>;
    }
    return (
        <div className="task-detail-user">
            <UserAvatar name={name} initialsFrom={initialsFrom} />
            <span className="task-detail-user-name">{name}</span>
        </div>
    );
}

export default function TaskDetailModal({
    task,
    onClose,
    showSnackbar,
    refreshTasks,
    currentUserId,
    forwardOptions,
    assigneeOptions = [],
    currentUser = null,
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [status, setStatus] = useState(taskStatus.todo);
    const [priority, setPriority] = useState('medium');
    const [startDate, setStartDate] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [tags, setTags] = useState('');
    const [taskTypeVal, setTaskTypeVal] = useState('');
    const [saving, setSaving] = useState(false);
    const [forwardTarget, setForwardTarget] = useState('');
    const [forwarding, setForwarding] = useState(false);
    const [error, setError] = useState('');

    const isAssignee = task && Number(task.assigneeId) === Number(currentUserId);
    const canForward = isAssignee && forwardOptions?.length > 0;
    const canEditPriorityAndAssignee =
        task.creatorId == null || Number(task.creatorId) === Number(currentUserId);

    const isDelegated =
        task &&
        task.creatorId != null &&
        task.assigneeId != null &&
        Number(task.creatorId) !== Number(task.assigneeId);

    const assigneeName =
        assigneeOptions.find((o) => o.id === Number(task?.assigneeId))?.label ??
        task?.assigneeDisplayName ??
        '';

    const assignedByName = (() => {
        if (!task) return '';
        if (isDelegated) {
            return task.creatorName ? String(task.creatorName).trim() : '—';
        }
        if (task.creatorId != null && Number(task.creatorId) === Number(currentUserId)) {
            return 'You';
        }
        return task.creatorName ? String(task.creatorName).trim() : 'You';
    })();

    /** Full name for avatar initials (API creator fields or logged-in user when label is "You") */
    const assignedByInitialsFrom = (() => {
        if (!task) return '';
        const fromRow = [task.creatorFirstName, task.creatorLastName]
            .map((s) => (s != null ? String(s) : ''))
            .join(' ')
            .trim();
        if (fromRow) return fromRow;
        if (task.creatorName) return String(task.creatorName).trim();
        if (assignedByName === 'You' && currentUser) {
            const u = [currentUser.firstName, currentUser.lastName]
                .map((s) => (s != null ? String(s) : ''))
                .join(' ')
                .trim();
            if (u) return u;
        }
        return assignedByName;
    })();

    const assigneeInitialsFrom = (() => {
        if (!task) return '';
        const fromRow = [task.assigneeName, task.assigneeLastName]
            .map((s) => (s != null ? String(s) : ''))
            .join(' ')
            .trim();
        if (fromRow) return fromRow;
        if (task.assigneeDisplayName) return String(task.assigneeDisplayName).trim();
        return assigneeName;
    })();

    const projectHeaderName =
        task?.projectName && String(task.projectName).trim() !== ''
            ? String(task.projectName).trim()
            : 'No project';

    useEffect(() => {
        if (!task) return;
        setTitle(task.title || '');
        setDescription(task.description || '');
        setStatus(task.status || taskStatus.todo);
        setPriority(task.priority || 'medium');
        setStartDate(formatDateInputValue(task.startDate));
        setDueDate(formatDateInputValue(task.dueDate));
        setAssigneeId(String(task.assigneeId ?? ''));
        setTags(task.tags && typeof task.tags === 'string' ? task.tags : '');
        setTaskTypeVal(task.taskType || '');
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
            if (canEditPriorityAndAssignee) {
                const aid = Number(assigneeId);
                if (!aid) {
                    setError('Assignee is required');
                    return;
                }
            }
            const res = await updateTask(task.id, {
                title: t,
                description: description,
                status: statusToApi(status),
                ...(canEditPriorityAndAssignee
                    ? { priority, assignee_id: Number(assigneeId) }
                    : {}),
                startDate: startDate || null,
                dueDate: dueDate || null,
                tags: tags.trim() || null,
                task_type: taskTypeKeyToApi(taskTypeVal),
            });
            const body = res?.data ?? res;
            if (body?.statusCode !== StatusCode.success) {
                setError(body?.message || 'Could not save');
                return;
            }
            showSnackbar?.('Task saved', 'success');
            await refreshTasks?.();
            onClose();
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

    const typeLabel =
        taskTypeVal && taskTypeLabel[taskType[taskTypeVal]]
            ? taskTypeLabel[taskType[taskTypeVal]]
            : '';

    return createPortal(
        <div className="modal-backdrop" aria-hidden="true">
            <div
                className="modal-panel task-detail-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="task-detail-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="task-detail-modal-header">
                    <div className="task-detail-brand">
                        <span className="task-detail-brand-dot" aria-hidden />
                        <span
                            className="task-detail-brand-text task-detail-brand-project"
                            title={projectHeaderName}
                        >
                            {projectHeaderName} /
                        </span>
                        <select
                            id="task-detail-status"
                            className="task-detail-status-select"
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            aria-label="List or status"
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
                        className="modal-close task-detail-close"
                        aria-label="Close"
                        onClick={onClose}
                    >
                        ×
                    </button>
                </div>

                <div className="modal-panel-body">
                    <form onSubmit={handleSave} className="task-detail-form">
                        <input
                            id="task-detail-title"
                            className="task-detail-title"
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Task title"
                        />

                        <div className="task-detail-pill-row" aria-label="Task meta">
                            <span
                                className={`task-detail-pill task-detail-pill--pri task-detail-pill--p-${priority}`}
                            >
                                {PRIORITY_PILL[priority] ?? 'MED'}
                            </span>
                            {typeLabel ? (
                                <span className="task-detail-pill task-detail-pill--type">
                                    {typeLabel}
                                </span>
                            ) : null}
                            <input
                                type="text"
                                className="task-detail-tags-pill-input"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="+ tag, comma separated"
                            />
                        </div>

                        <div className="task-detail-grid">
                            <div className="task-detail-cell">
                                <div className="task-detail-cell-label">Start date</div>
                                <input
                                    type="date"
                                    className="task-detail-control task-detail-control--date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="task-detail-cell">
                                <div className="task-detail-cell-label">Due date</div>
                                <input
                                    type="date"
                                    className="task-detail-control task-detail-control--date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                />
                            </div>

                            <div className="task-detail-cell">
                                <div className="task-detail-cell-label">Priority</div>
                                {canEditPriorityAndAssignee ? (
                                    <select
                                        className="task-detail-control"
                                        value={priority}
                                        onChange={(e) => setPriority(e.target.value)}
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                    </select>
                                ) : (
                                    <div
                                        className={`task-detail-priority-disp task-detail-priority-disp--${priority}`}
                                    >
                                        {PRIORITY_READ_LABEL[priority] ?? priority}
                                    </div>
                                )}
                            </div>

                            <div className="task-detail-cell">
                                <div className="task-detail-cell-label">Task type</div>
                                <select
                                    className="task-detail-control"
                                    value={taskTypeVal}
                                    onChange={(e) => setTaskTypeVal(e.target.value)}
                                >
                                    <option value="">—</option>
                                    {TASK_TYPE_OPTION_KEYS.map((k) => (
                                        <option key={k} value={k}>
                                            {taskTypeLabel[taskType[k]]}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="task-detail-cell">
                                <div className="task-detail-cell-label">Assigned by</div>
                                <UserInCell
                                    name={assignedByName}
                                    initialsFrom={assignedByInitialsFrom}
                                />
                                {!isDelegated &&
                                    task.creatorId != null &&
                                    Number(task.creatorId) === Number(currentUserId) && (
                                        <p className="task-detail-cell-note">You created this task</p>
                                    )}
                            </div>

                            <div className="task-detail-cell">
                                <div className="task-detail-cell-label">Assignee</div>
                                {canEditPriorityAndAssignee && assigneeOptions.length > 0 ? (
                                    <select
                                        className="task-detail-control"
                                        value={assigneeId}
                                        onChange={(e) => setAssigneeId(e.target.value)}
                                    >
                                        {assigneeOptions.map((o) => (
                                            <option key={o.id} value={String(o.id)}>
                                                {o.label}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <UserInCell
                                        name={assigneeName}
                                        initialsFrom={assigneeInitialsFrom}
                                    />
                                )}
                                {!canEditPriorityAndAssignee && (
                                    <p className="task-detail-cell-note">Set by the task creator</p>
                                )}
                            </div>
                        </div>

                        <div className="task-detail-desc">
                            <label htmlFor="task-detail-desc-input" className="task-detail-desc-label">
                                Description
                            </label>
                            <textarea
                                id="task-detail-desc-input"
                                className="task-detail-textarea"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Add a description…"
                                rows={5}
                            />
                        </div>

                        {error && <div className="error-msg task-detail-error">{error}</div>}

                        <div className="task-detail-modal-actions">
                            <button type="button" className="btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} className="btn-submit">
                                {saving ? 'Saving…' : 'Save and close'}
                            </button>
                        </div>
                    </form>

                    {canForward && (
                        <div className="task-detail-forward">
                            <h3 className="task-detail-forward-title">Forward task</h3>
                            <p className="task-detail-forward-hint">
                                Ask a teammate to take over. They will need to accept the request.
                            </p>
                            <div className="task-detail-forward-row">
                                <select
                                    className="form-select dashboard-select task-detail-forward-select"
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
