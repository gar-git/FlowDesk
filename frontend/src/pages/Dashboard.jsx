import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { roleLabel, roleType, taskStatus } from '../utils/constants';
import { getAllTasksApi, getMineTasksApi, updateTaskApi } from '../api/tasks';
import { getTeamApi } from '../api/user';
import { useSnackbar } from '../utils/SnackbarProvider';

// ==============================|| DASHBOARD — role-aware ||============================== //

export default function Dashboard() {
    const { user, logout } = useAuth();
    const { showSnackbar } = useSnackbar();

    const [tasks, setTasks]   = useState([]);
    const [team, setTeam]     = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');

    const isManagerOrTL = user?.roleId === roleType.manager || user?.roleId === roleType.tl;

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const taskRes = isManagerOrTL
            ? await getAllTasksApi()
            : await getMineTasksApi();

        if (taskRes?.statusCode === 200) {
            setTasks(taskRes.data || []);
        }

        if (isManagerOrTL) {
            const teamRes = await getTeamApi();
            if (teamRes?.statusCode === 200) setTeam(teamRes.data || []);
        }
        setLoading(false);
    };

    const handleStatusChange = async (taskId, newStatus) => {
        const res = await updateTaskApi(taskId, { status: newStatus });
        if (res?.statusCode === 200) {
            setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
            showSnackbar('Task updated', 'success');
        } else {
            showSnackbar(res?.message || 'Update failed', 'error');
        }
    };

    const filtered = activeTab === 'all'
        ? tasks
        : tasks.filter(t => t.status === activeTab);

    const statusColor = {
        [taskStatus.todo]:       '#9b9bc8',
        [taskStatus.inProgress]: '#00d4ff',
        [taskStatus.done]:       '#00e5a0',
    };

    const priorityColor = { low: '#00e5a0', medium: '#f59e0b', high: '#ff6b6b' };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)', fontFamily: 'Inter, sans-serif' }}>

            {/* ── Topbar ── */}
            <div style={{
                position: 'sticky', top: 0, zIndex: 50,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 32px',
                background: 'rgba(7,8,15,0.9)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid var(--border)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: 18, color: '#fff',
                    }}>F</div>
                    <span style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>
                        Flow<span style={{ color: '#6c63ff' }}>Desk</span>
                    </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {user?.firstName} {user?.lastName}
                        <span style={{
                            marginLeft: 8, padding: '2px 8px', borderRadius: 20,
                            background: 'rgba(108,99,255,0.15)', color: '#a09fff', fontSize: 11, fontWeight: 600,
                        }}>
                            {roleLabel[user?.roleId] || 'User'}
                        </span>
                    </span>
                    <button
                        onClick={logout}
                        style={{
                            padding: '7px 16px', borderRadius: 8, border: '1px solid var(--border)',
                            background: 'transparent', color: 'var(--text-secondary)', fontSize: 13,
                            cursor: 'pointer', transition: 'var(--transition)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = '#ff6b6b'; e.currentTarget.style.color = '#ff6b6b'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>

                {/* Greeting */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
                        Welcome back, {user?.firstName} 👋
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {isManagerOrTL
                            ? `${roleLabel[user?.roleId]} view · ${tasks.length} total tasks · ${team.length} team members`
                            : `${tasks.length} tasks assigned to you`}
                    </p>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
                    {[
                        { label: 'To Do',       value: tasks.filter(t => t.status === taskStatus.todo).length,       color: '#9b9bc8' },
                        { label: 'In Progress', value: tasks.filter(t => t.status === taskStatus.inProgress).length, color: '#00d4ff' },
                        { label: 'Done',        value: tasks.filter(t => t.status === taskStatus.done).length,       color: '#00e5a0' },
                    ].map(s => (
                        <div key={s.label} style={{
                            padding: '20px 24px', borderRadius: 14,
                            background: 'var(--bg-card)', border: '1px solid var(--border)',
                        }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Tab filters */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                    {[
                        { key: 'all',                    label: 'All Tasks' },
                        { key: taskStatus.todo,          label: 'To Do' },
                        { key: taskStatus.inProgress,    label: 'In Progress' },
                        { key: taskStatus.done,          label: 'Done' },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            style={{
                                padding: '7px 16px', borderRadius: 20, fontSize: 13, cursor: 'pointer',
                                border: activeTab === tab.key ? '1px solid #6c63ff' : '1px solid var(--border)',
                                background: activeTab === tab.key ? 'rgba(108,99,255,0.15)' : 'transparent',
                                color: activeTab === tab.key ? '#a09fff' : 'var(--text-secondary)',
                                transition: 'var(--transition)',
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Task list */}
                {loading ? (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 60 }}>Loading tasks…</div>
                ) : filtered.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: 60, borderRadius: 14,
                        border: '1px dashed var(--border)', color: 'var(--text-muted)',
                    }}>
                        No tasks found
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {filtered.map(task => (
                            <div
                                key={task.id}
                                style={{
                                    padding: '16px 20px', borderRadius: 12,
                                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                                    transition: 'var(--transition)',
                                }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                            >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{task.title}</div>
                                    {task.description && (
                                        <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {task.description}
                                        </div>
                                    )}
                                    {isManagerOrTL && task.assigneeName && (
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                                            Assigned to: <span style={{ color: 'var(--text-secondary)' }}>{task.assigneeName}</span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                                    {/* Priority badge */}
                                    <span style={{
                                        padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                                        background: `${priorityColor[task.priority] || '#9b9bc8'}20`,
                                        color: priorityColor[task.priority] || '#9b9bc8',
                                        border: `1px solid ${priorityColor[task.priority] || '#9b9bc8'}40`,
                                    }}>
                                        {task.priority || 'medium'}
                                    </span>

                                    {/* Status select */}
                                    <select
                                        value={task.status}
                                        onChange={e => handleStatusChange(task.id, e.target.value)}
                                        style={{
                                            padding: '4px 10px', borderRadius: 8, fontSize: 12,
                                            background: 'var(--bg-secondary)', border: `1px solid ${statusColor[task.status] || 'var(--border)'}`,
                                            color: statusColor[task.status] || 'var(--text-primary)', cursor: 'pointer', outline: 'none',
                                        }}
                                    >
                                        <option value={taskStatus.todo}>To Do</option>
                                        <option value={taskStatus.inProgress}>In Progress</option>
                                        <option value={taskStatus.done}>Done</option>
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
