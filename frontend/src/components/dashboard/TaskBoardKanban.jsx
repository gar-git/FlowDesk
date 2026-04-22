import { taskStatus } from '../../utils/constants';

const COLS = [
    { key: taskStatus.todo, label: 'All tasks', dot: 'todo' },
    { key: taskStatus.inProgress, label: 'Ongoing', dot: 'progress' },
    { key: taskStatus.done, label: 'Completed', dot: 'done' },
];

function formatAssignedDate(value) {
    if (value == null || value === '') return '—';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function priorityLabel(p) {
    const s = (p || 'medium').toString().toLowerCase();
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function isDelegated(task) {
    if (task.creatorId == null || task.assigneeId == null) return false;
    return Number(task.creatorId) !== Number(task.assigneeId);
}

function projectNameFor(task, projects) {
    if (!task?.projectId || !projects?.length) return null;
    const p = projects.find((x) => Number(x.id) === Number(task.projectId));
    return p?.name || null;
}

function getInitials(name) {
    if (!name || !String(name).trim()) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function FolderIcon() {
    return (
        <svg
            className="app-task-card-project-icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
        >
            <path
                d="M3 8.25V17.25C3 18.2165 3.7835 19 4.75 19H19.25C20.2165 19 21 18.2165 21 17.25V9.75C21 8.7835 20.2165 8 19.25 8H12.75L11.25 6H4.75C3.7835 6 3 6.7835 3 7.75V8.25Z"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinejoin="round"
                fill="rgba(108, 99, 255, 0.12)"
            />
        </svg>
    );
}

export default function TaskBoardKanban({ tasks, loading, onAddTask, onSelectTask, projects = [] }) {
    const byStatus = (s) => tasks.filter((t) => t.status === s);

    return (
        <div className="app-task-board">
            {onAddTask && (
                <div className="app-kanban-toolbar">
                    <button type="button" className="btn-secondary" onClick={onAddTask}>
                        + Add task
                    </button>
                </div>
            )}
            <div className="preview-kanban app-kanban">
                {COLS.map((col) => (
                    <div key={col.key} className="preview-col app-kanban-col">
                        <div className="preview-col-header">
                            <span className={`col-dot ${col.dot}`} />
                            {col.label}
                        </div>
                        {loading ? (
                            <p className="app-kanban-empty">Loading…</p>
                        ) : (
                            byStatus(col.key).map((task) => {
                                const delegated = isDelegated(task);
                                const pname = projectNameFor(task, projects);
                                const footName = delegated
                                    ? task.creatorName || 'Unknown'
                                    : task.assigneeDisplayName || 'Member';
                                const initials = delegated
                                    ? getInitials(task.creatorName)
                                    : getInitials(task.assigneeDisplayName);
                                const pr = (task.priority || 'medium').toString().toLowerCase();

                                return (
                                    <button
                                        key={task.id}
                                        type="button"
                                        className="app-task-card-refined"
                                        onClick={() => onSelectTask?.(task)}
                                    >
                                        <span className="app-task-card-refined-inner">
                                            <span className="app-task-card-head">
                                                <span className="app-task-card-head-left">
                                                    <span className="app-task-card-heading">{task.title}</span>
                                                    <span
                                                        className={`app-task-card-priority app-task-card-priority--${pr}`}
                                                    >
                                                        {priorityLabel(task.priority)}
                                                    </span>
                                                    <span className="app-task-card-assigned-date">
                                                        Assigned {formatAssignedDate(task.createdAt)}
                                                    </span>
                                                </span>
                                                <span className="app-task-card-project">
                                                    <span className="app-task-card-project-top">
                                                        <FolderIcon />
                                                        <span className="app-task-card-project-label">Project:</span>
                                                    </span>
                                                    <span className="app-task-card-project-name">
                                                        {pname || '—'}
                                                    </span>
                                                </span>
                                            </span>
                                            <span className="app-task-card-rule" />
                                            <span className="app-task-card-foot">
                                                <span className="app-task-card-avatar">{initials}</span>
                                                <span className="app-task-card-foot-line">
                                                    <span className="app-task-card-foot-label">
                                                        {delegated ? 'Assigned by: ' : 'Assignee: '}
                                                    </span>
                                                    <span className="app-task-card-foot-name">{footName}</span>
                                                </span>
                                            </span>
                                        </span>
                                    </button>
                                );
                            })
                        )}
                        {!loading && byStatus(col.key).length === 0 && (
                            <p className="app-kanban-empty">No tasks</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
