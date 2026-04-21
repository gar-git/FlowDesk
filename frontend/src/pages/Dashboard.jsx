import { useEffect, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { getRoleLabel, roleType, taskStatus, StatusCode } from '../utils/constants';
import { useSnackbar } from '../utils/SnackbarProvider';
import { getCompanyMe } from '../api/companies';
import { getTeam, createUserByAdmin, getRoleDropdown, getRoster } from '../api/users';
import OrganizationPanel from '../components/dashboard/OrganizationPanel';
import ProjectsPanel from '../components/dashboard/ProjectsPanel';

// import { getAllTasksApi, getMineTasksApi, updateTaskApi } from '../api/tasks';

// ==============================|| DASHBOARD — role-aware ||============================== //

const initialCreateForm = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    employeeCode: '',
    roleId: '3',
};

export default function Dashboard() {
    const { user, logout } = useAuth();
    const { showSnackbar } = useSnackbar();

    const [tasks, setTasks] = useState([]);
    const [team, setTeam] = useState([]);
    const [company, setCompany] = useState(null);
    const [roleOptions, setRoleOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [adminTab, setAdminTab] = useState('team');
    const [managerTab, setManagerTab] = useState('tasks');
    const [roster, setRoster] = useState(null);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [createForm, setCreateForm] = useState(initialCreateForm);
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);

    const roleIdNum = user?.roleId != null ? Number(user.roleId) : null;
    const isAdmin = roleIdNum === roleType.admin;
    const isManager = roleIdNum === roleType.manager;
    const isManagerOrTL =
        roleIdNum === roleType.manager || roleIdNum === roleType.tl;

    const refreshRoster = async () => {
        const rRes = await getRoster();
        const rBody = rRes?.data ?? rRes;
        if (rBody?.statusCode === StatusCode.success) {
            setRoster(rBody.data);
        }
    };

    const showTaskBoard =
        !isAdmin && (!isManager || (isManager && managerTab === 'tasks'));

    useEffect(() => {
        if (!user) return;
        let cancelled = false;

        (async () => {
            try {
                const cRes = await getCompanyMe();
                const cBody = cRes?.data ?? cRes;
                if (!cancelled && cBody?.statusCode === StatusCode.success) {
                    setCompany(cBody.data);
                }

                const rid = user?.roleId != null ? Number(user.roleId) : null;
                const canTeam =
                    rid === roleType.admin ||
                    rid === roleType.manager ||
                    rid === roleType.tl;

                if (canTeam) {
                    const tRes = await getTeam();
                    const tBody = tRes?.data ?? tRes;
                    if (!cancelled && tBody?.statusCode === StatusCode.success) {
                        setTeam(tBody.data || []);
                    }
                }

                if (rid === roleType.admin) {
                    const rRes = await getRoleDropdown();
                    const rBody = rRes?.data ?? rRes;
                    if (!cancelled && rBody?.statusCode === StatusCode.success) {
                        setRoleOptions(
                            (rBody.data || []).filter((r) => r.id !== roleType.admin)
                        );
                    }
                }

                if (rid === roleType.admin || rid === roleType.manager) {
                    if (!cancelled) setRosterLoading(true);
                    try {
                        const rosterRes = await getRoster();
                        const rosterBody = rosterRes?.data ?? rosterRes;
                        if (!cancelled && rosterBody?.statusCode === StatusCode.success) {
                            setRoster(rosterBody.data);
                        }
                    } finally {
                        if (!cancelled) setRosterLoading(false);
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [user]);

    const handleLogout = async () => {
        await logout();
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setCreateError('');
        if (createForm.password.length < 8) {
            setCreateError('Password must be at least 8 characters');
            return;
        }
        if (createForm.password !== createForm.confirmPassword) {
            setCreateError('Passwords do not match');
            return;
        }
        setCreating(true);
        try {
            const res = await createUserByAdmin({
                firstName: createForm.firstName.trim(),
                lastName: createForm.lastName.trim(),
                email: createForm.email.trim(),
                password: createForm.password,
                employeeCode: createForm.employeeCode.trim(),
                roleId: Number(createForm.roleId),
            });
            const body = res?.data ?? res;
            if (body?.statusCode === StatusCode.created) {
                showSnackbar('User created successfully', 'success');
                setCreateForm(initialCreateForm);
                const tRes = await getTeam();
                const tBody = tRes?.data ?? tRes;
                if (tBody?.statusCode === StatusCode.success) {
                    setTeam(tBody.data || []);
                }
                setAdminTab('team');
            } else {
                setCreateError(body?.message || 'Could not create user');
            }
        } finally {
            setCreating(false);
        }
    };

    const handleStatusChange = async (taskId, newStatus) => {
        // const res = await updateTaskApi(taskId, { status: newStatus });
        // if (res?.statusCode === 200) {
        //     setTasks((prev) =>
        //         prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
        //     );
        //     showSnackbar('Task updated', 'success');
        // } else {
        //     showSnackbar(res?.message || 'Update failed', 'error');
        // }
    };

    const filtered =
        activeTab === 'all'
            ? tasks
            : tasks.filter((t) => t.status === activeTab);

    const statusColor = {
        [taskStatus.todo]: '#9b9bc8',
        [taskStatus.inProgress]: '#00d4ff',
        [taskStatus.done]: '#00e5a0',
    };

    const priorityColor = { low: '#00e5a0', medium: '#f59e0b', high: '#ff6b6b' };

    const roleBadge = getRoleLabel(user?.roleId);

    return (
        <div
            style={{
                minHeight: '100vh',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif',
            }}
        >
            {/* ── Topbar ── */}
            <div
                style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 50,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 32px',
                    background: 'rgba(7,8,15,0.9)',
                    backdropFilter: 'blur(20px)',
                    borderBottom: '1px solid var(--border)',
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 10,
                                background: 'linear-gradient(135deg,#6c63ff,#00d4ff)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 800,
                                fontSize: 18,
                                color: '#fff',
                            }}
                        >
                            F
                        </div>
                        <span
                            style={{
                                fontWeight: 700,
                                fontSize: 17,
                                letterSpacing: '-0.3px',
                            }}
                        >
                            Flow<span style={{ color: '#6c63ff' }}>Desk</span>
                        </span>
                    </div>
                    {company && (
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '6px 12px',
                                borderRadius: 10,
                                border: '1px solid var(--border)',
                                background: 'var(--bg-card)',
                            }}
                        >
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                                {company.name}
                            </span>
                            <span
                                style={{
                                    fontFamily: 'ui-monospace, monospace',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    letterSpacing: '0.06em',
                                    color: '#a09fff',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background: 'rgba(108,99,255,0.15)',
                                }}
                            >
                                {company.companyCode}
                            </span>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                        {user?.firstName} {user?.lastName}
                        <span
                            style={{
                                marginLeft: 8,
                                padding: '3px 10px',
                                borderRadius: 20,
                                background: 'rgba(108,99,255,0.15)',
                                color: '#a09fff',
                                fontSize: 11,
                                fontWeight: 600,
                            }}
                        >
                            {roleBadge}
                        </span>
                    </span>
                    <button
                        onClick={handleLogout}
                        style={{
                            padding: '7px 16px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'transparent',
                            color: 'var(--text-secondary)',
                            fontSize: 13,
                            cursor: 'pointer',
                            transition: 'var(--transition)',
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#ff6b6b';
                            e.currentTarget.style.color = '#ff6b6b';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'var(--border)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                        }}
                    >
                        Logout
                    </button>
                </div>
            </div>

            {/* ── Content ── */}
            <div style={{ padding: '32px', maxWidth: 1100, margin: '0 auto' }}>
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 4 }}>
                        Welcome back, {user?.firstName}{' '}
                        <span role="img" aria-label="wave">
                            👋
                        </span>
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                        {isAdmin
                            ? `Administrator · ${team.length} people in your organization`
                            : isManagerOrTL
                              ? `${getRoleLabel(user?.roleId)} view · ${tasks.length} total tasks · ${team.length} team members`
                              : `${getRoleLabel(user?.roleId)} · ${tasks.length} tasks assigned to you`}
                    </p>
                </div>

                {/* ── Admin: team & create user (no task board) ── */}
                {isAdmin && (
                    <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                            {[
                                { key: 'team', label: 'Team' },
                                { key: 'create', label: 'Add user' },
                                { key: 'hierarchy', label: 'Organization' },
                                { key: 'projects', label: 'Projects' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setAdminTab(tab.key)}
                                    style={{
                                        padding: '8px 18px',
                                        borderRadius: 20,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        border:
                                            adminTab === tab.key
                                                ? '1px solid #6c63ff'
                                                : '1px solid var(--border)',
                                        background:
                                            adminTab === tab.key
                                                ? 'rgba(108,99,255,0.15)'
                                                : 'transparent',
                                        color:
                                            adminTab === tab.key
                                                ? '#a09fff'
                                                : 'var(--text-secondary)',
                                        transition: 'var(--transition)',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    padding: 48,
                                }}
                            >
                                Loading…
                            </div>
                        ) : adminTab === 'hierarchy' ? (
                            <OrganizationPanel
                                roster={roster}
                                loading={rosterLoading}
                                onRefresh={refreshRoster}
                                showSnackbar={showSnackbar}
                                currentUser={user}
                            />
                        ) : adminTab === 'projects' ? (
                            <ProjectsPanel roster={roster} showSnackbar={showSnackbar} />
                        ) : adminTab === 'team' ? (
                            <div
                                style={{
                                    borderRadius: 14,
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-card)',
                                    overflow: 'hidden',
                                }}
                            >
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                                    <thead>
                                        <tr
                                            style={{
                                                textAlign: 'left',
                                                borderBottom: '1px solid var(--border)',
                                                color: 'var(--text-muted)',
                                                fontSize: 12,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.06em',
                                            }}
                                        >
                                            <th style={{ padding: '14px 20px' }}>Name</th>
                                            <th style={{ padding: '14px 20px' }}>Email</th>
                                            <th style={{ padding: '14px 20px' }}>Role</th>
                                            <th style={{ padding: '14px 20px' }}>Employee code</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {team.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={4}
                                                    style={{
                                                        padding: 40,
                                                        textAlign: 'center',
                                                        color: 'var(--text-muted)',
                                                    }}
                                                >
                                                    No team members yet. Use &quot;Add user&quot; to invite people.
                                                </td>
                                            </tr>
                                        ) : (
                                            team.map((m) => (
                                                <tr
                                                    key={m.id}
                                                    style={{ borderBottom: '1px solid var(--border)' }}
                                                >
                                                    <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                                                        {m.firstName} {m.lastName}
                                                    </td>
                                                    <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                                                        {m.email}
                                                    </td>
                                                    <td style={{ padding: '14px 20px' }}>
                                                        {getRoleLabel(m.roleId)}
                                                    </td>
                                                    <td
                                                        style={{
                                                            padding: '14px 20px',
                                                            fontFamily: 'monospace',
                                                            fontSize: 13,
                                                        }}
                                                    >
                                                        {m.employeeCode}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="admin-create-user-wrap">
                                <form
                                    className="admin-create-user-card"
                                    onSubmit={handleCreateUser}
                                >
                                    <h2 className="admin-create-user-title">Create a user</h2>
                                    <p className="admin-create-user-lead">
                                        Adds someone to <strong>{company?.name || 'your organization'}</strong>.
                                        No company code is required — they log in with the email and password
                                        you set here.
                                    </p>
                                    {createError && (
                                        <div
                                            className="error-msg"
                                            style={{ marginBottom: 20 }}
                                        >
                                            {createError}
                                        </div>
                                    )}
                                    <div className="admin-create-user-grid">
                                        <label className="admin-form-label">
                                            First name
                                            <input
                                                required
                                                className="admin-form-input"
                                                value={createForm.firstName}
                                                onChange={(e) =>
                                                    setCreateForm((f) => ({
                                                        ...f,
                                                        firstName: e.target.value,
                                                    }))
                                                }
                                                autoComplete="given-name"
                                            />
                                        </label>
                                        <label className="admin-form-label">
                                            Last name
                                            <input
                                                required
                                                className="admin-form-input"
                                                value={createForm.lastName}
                                                onChange={(e) =>
                                                    setCreateForm((f) => ({
                                                        ...f,
                                                        lastName: e.target.value,
                                                    }))
                                                }
                                                autoComplete="family-name"
                                            />
                                        </label>
                                        <label className="admin-form-label span-2">
                                            Work email
                                            <input
                                                required
                                                type="email"
                                                className="admin-form-input"
                                                value={createForm.email}
                                                onChange={(e) =>
                                                    setCreateForm((f) => ({
                                                        ...f,
                                                        email: e.target.value,
                                                    }))
                                                }
                                                autoComplete="email"
                                            />
                                        </label>
                                        <label className="admin-form-label">
                                            Employee code
                                            <input
                                                required
                                                className="admin-form-input"
                                                value={createForm.employeeCode}
                                                onChange={(e) =>
                                                    setCreateForm((f) => ({
                                                        ...f,
                                                        employeeCode: e.target.value,
                                                    }))
                                                }
                                                autoComplete="off"
                                            />
                                        </label>
                                        <label className="admin-form-label">
                                            Role
                                            <select
                                                required
                                                className="admin-form-input"
                                                value={createForm.roleId}
                                                onChange={(e) =>
                                                    setCreateForm((f) => ({
                                                        ...f,
                                                        roleId: e.target.value,
                                                    }))
                                                }
                                            >
                                                {roleOptions.map((r) => (
                                                    <option key={r.id} value={String(r.id)}>
                                                        {r.text}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="admin-form-label">
                                            Password
                                            <input
                                                required
                                                type="password"
                                                minLength={8}
                                                className="admin-form-input"
                                                value={createForm.password}
                                                onChange={(e) =>
                                                    setCreateForm((f) => ({
                                                        ...f,
                                                        password: e.target.value,
                                                    }))
                                                }
                                                autoComplete="new-password"
                                            />
                                        </label>
                                        <label className="admin-form-label">
                                            Confirm password
                                            <input
                                                required
                                                type="password"
                                                minLength={8}
                                                className="admin-form-input"
                                                value={createForm.confirmPassword}
                                                onChange={(e) =>
                                                    setCreateForm((f) => ({
                                                        ...f,
                                                        confirmPassword: e.target.value,
                                                    }))
                                                }
                                                autoComplete="new-password"
                                            />
                                        </label>
                                    </div>
                                    <div className="admin-create-user-actions">
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="btn-submit"
                                        >
                                            {creating ? 'Creating…' : 'Create user'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </>
                )}

                {/* ── Manager: tabs for tasks / org / projects ── */}
                {isManager && (
                    <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                        {[
                            { key: 'tasks', label: 'Tasks' },
                            { key: 'org', label: 'Organization' },
                            { key: 'projects', label: 'Projects' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setManagerTab(tab.key)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: 20,
                                    fontSize: 13,
                                    cursor: 'pointer',
                                    border:
                                        managerTab === tab.key
                                            ? '1px solid #6c63ff'
                                            : '1px solid var(--border)',
                                    background:
                                        managerTab === tab.key
                                            ? 'rgba(108,99,255,0.15)'
                                            : 'transparent',
                                    color:
                                        managerTab === tab.key
                                            ? '#a09fff'
                                            : 'var(--text-secondary)',
                                    transition: 'var(--transition)',
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {isManager && managerTab === 'org' && (
                    <OrganizationPanel
                        roster={roster}
                        loading={rosterLoading}
                        onRefresh={refreshRoster}
                        showSnackbar={showSnackbar}
                        currentUser={user}
                    />
                )}

                {isManager && managerTab === 'projects' && (
                    <ProjectsPanel roster={roster} showSnackbar={showSnackbar} />
                )}

                {/* ── Non-admin: task board (developers, managers on Tasks tab, TLs) ── */}
                {!isAdmin && showTaskBoard && (
                    <>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: 16,
                                marginBottom: 32,
                            }}
                        >
                            {[
                                {
                                    label: 'To Do',
                                    value: tasks.filter((t) => t.status === taskStatus.todo).length,
                                    color: '#9b9bc8',
                                },
                                {
                                    label: 'In Progress',
                                    value: tasks.filter((t) => t.status === taskStatus.inProgress).length,
                                    color: '#00d4ff',
                                },
                                {
                                    label: 'Done',
                                    value: tasks.filter((t) => t.status === taskStatus.done).length,
                                    color: '#00e5a0',
                                },
                            ].map((s) => (
                                <div
                                    key={s.label}
                                    style={{
                                        padding: '20px 24px',
                                        borderRadius: 14,
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                    }}
                                >
                                    <div style={{ fontSize: 28, fontWeight: 700, color: s.color }}>
                                        {s.value}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 13,
                                            color: 'var(--text-secondary)',
                                            marginTop: 4,
                                        }}
                                    >
                                        {s.label}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                            {[
                                { key: 'all', label: 'All Tasks' },
                                { key: taskStatus.todo, label: 'To Do' },
                                { key: taskStatus.inProgress, label: 'In Progress' },
                                { key: taskStatus.done, label: 'Done' },
                            ].map((tab) => (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setActiveTab(tab.key)}
                                    style={{
                                        padding: '7px 16px',
                                        borderRadius: 20,
                                        fontSize: 13,
                                        cursor: 'pointer',
                                        border:
                                            activeTab === tab.key
                                                ? '1px solid #6c63ff'
                                                : '1px solid var(--border)',
                                        background:
                                            activeTab === tab.key
                                                ? 'rgba(108,99,255,0.15)'
                                                : 'transparent',
                                        color:
                                            activeTab === tab.key
                                                ? '#a09fff'
                                                : 'var(--text-secondary)',
                                        transition: 'var(--transition)',
                                    }}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {loading ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    color: 'var(--text-muted)',
                                    padding: 60,
                                }}
                            >
                                Loading tasks…
                            </div>
                        ) : filtered.length === 0 ? (
                            <div
                                style={{
                                    textAlign: 'center',
                                    padding: 60,
                                    borderRadius: 14,
                                    border: '1px dashed var(--border)',
                                    color: 'var(--text-muted)',
                                }}
                            >
                                No tasks found
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {filtered.map((task) => (
                                    <div
                                        key={task.id}
                                        style={{
                                            padding: '16px 20px',
                                            borderRadius: 12,
                                            background: 'var(--bg-card)',
                                            border: '1px solid var(--border)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            gap: 12,
                                            transition: 'var(--transition)',
                                        }}
                                        onMouseEnter={(e) =>
                                            (e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)')
                                        }
                                        onMouseLeave={(e) =>
                                            (e.currentTarget.style.borderColor = 'var(--border)')
                                        }
                                    >
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>
                                                {task.title}
                                            </div>
                                            {task.description && (
                                                <div
                                                    style={{
                                                        fontSize: 12,
                                                        color: 'var(--text-muted)',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                >
                                                    {task.description}
                                                </div>
                                            )}
                                            {isManagerOrTL && task.assigneeName && (
                                                <div
                                                    style={{
                                                        fontSize: 11,
                                                        color: 'var(--text-muted)',
                                                        marginTop: 4,
                                                    }}
                                                >
                                                    Assigned to:{' '}
                                                    <span style={{ color: 'var(--text-secondary)' }}>
                                                        {task.assigneeName}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 10,
                                                flexShrink: 0,
                                            }}
                                        >
                                            <span
                                                style={{
                                                    padding: '2px 8px',
                                                    borderRadius: 20,
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    background: `${priorityColor[task.priority] || '#9b9bc8'}20`,
                                                    color: priorityColor[task.priority] || '#9b9bc8',
                                                    border: `1px solid ${priorityColor[task.priority] || '#9b9bc8'}40`,
                                                }}
                                            >
                                                {task.priority || 'medium'}
                                            </span>

                                            <select
                                                value={task.status}
                                                onChange={(e) =>
                                                    handleStatusChange(task.id, e.target.value)
                                                }
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 8,
                                                    fontSize: 12,
                                                    background: 'var(--bg-secondary)',
                                                    border: `1px solid ${statusColor[task.status] || 'var(--border)'}`,
                                                    color: statusColor[task.status] || 'var(--text-primary)',
                                                    cursor: 'pointer',
                                                    outline: 'none',
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
                    </>
                )}
            </div>
        </div>
    );
}
