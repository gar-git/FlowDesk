import { useCallback, useState } from 'react';
import { acceptForward, rejectForward } from '../../api/tasks';
import { StatusCode } from '../../utils/constants';

function fromLabel(firstName, lastName) {
    const s = `${firstName || ''} ${lastName || ''}`.trim();
    return s || 'A teammate';
}

export default function IncomingForwardRequests({ items, onChanged, showSnackbar }) {
    const [busyId, setBusyId] = useState(null);

    const handleAccept = useCallback(
        async (taskId) => {
            setBusyId(taskId);
            try {
                const res = await acceptForward(taskId);
                const body = res?.data ?? res;
                if (body?.statusCode !== StatusCode.success) {
                    showSnackbar?.(body?.message || 'Could not accept', 'error');
                    return;
                }
                showSnackbar?.('Task transferred to you', 'success');
                await onChanged?.();
            } finally {
                setBusyId(null);
            }
        },
        [onChanged, showSnackbar]
    );

    const handleReject = useCallback(
        async (taskId) => {
            setBusyId(taskId);
            try {
                const res = await rejectForward(taskId);
                const body = res?.data ?? res;
                if (body?.statusCode !== StatusCode.success) {
                    showSnackbar?.(body?.message || 'Could not decline', 'error');
                    return;
                }
                showSnackbar?.('Transfer request declined', 'success');
                await onChanged?.();
            } finally {
                setBusyId(null);
            }
        },
        [onChanged, showSnackbar]
    );

    if (!items?.length) return null;

    return (
        <section className="incoming-forwards" aria-label="Incoming transfer requests">
            <h2 className="incoming-forwards-title">Transfer requests</h2>
            <p className="incoming-forwards-hint">
                Teammates asked you to take over these tasks. Accept to become the assignee, or decline to
                leave them unchanged.
            </p>
            <ul className="incoming-forwards-list">
                {items.map((row) => {
                    const taskId = row.id;
                    const busy = busyId === taskId;
                    const project =
                        row.projectName && String(row.projectName).trim()
                            ? String(row.projectName).trim()
                            : 'No project';
                    return (
                        <li key={taskId} className="incoming-forwards-item">
                            <div className="incoming-forwards-item-main">
                                <span className="incoming-forwards-task-title">{row.title || 'Untitled'}</span>
                                <span className="incoming-forwards-meta">
                                    {project} · from {fromLabel(row.fromFirstName, row.fromLastName)}
                                </span>
                            </div>
                            <div className="incoming-forwards-actions">
                                <button
                                    type="button"
                                    className="btn-secondary incoming-forwards-btn"
                                    disabled={busy}
                                    onClick={() => handleReject(taskId)}
                                >
                                    {busy ? '…' : 'Decline'}
                                </button>
                                <button
                                    type="button"
                                    className="btn-submit incoming-forwards-btn"
                                    disabled={busy}
                                    onClick={() => handleAccept(taskId)}
                                >
                                    {busy ? '…' : 'Accept'}
                                </button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
