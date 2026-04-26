import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { getRoleLabel, getUserRoleDisplayName, roleType, StatusCode } from '../utils/constants';
import { normalizeTask } from '../utils/taskApi';
import { useSnackbar } from '../utils/SnackbarProvider';
import { getCompanyMe } from '../api/companies';
import { getTeam, createUserByAdmin, getRoleDropdown, getRoster } from '../api/users';
import { listProjects } from '../api/projects';
import { listTasks } from '../api/tasks';
import OrganizationPanel from '../components/dashboard/OrganizationPanel';
import ProjectsPanel from '../components/dashboard/ProjectsPanel';
import TaskBoardKanban from '../components/dashboard/TaskBoardKanban';
import AddTaskModal from '../components/dashboard/AddTaskModal';
import TaskDetailModal from '../components/dashboard/TaskDetailModal';
import SettingsPanel from '../components/dashboard/SettingsPanel';
import { useTaskSocket } from '../hooks/useTaskSocket';

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

function TeamTable({ team, emptyHint }) {
    return (
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
                                {emptyHint}
                            </td>
                        </tr>
                    ) : (
                        team.map((m) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '14px 20px', fontWeight: 600 }}>
                                    {m.firstName} {m.lastName}
                                </td>
                                <td style={{ padding: '14px 20px', color: 'var(--text-secondary)' }}>
                                    {m.email}
                                </td>
                                <td style={{ padding: '14px 20px' }}>{getRoleLabel(m.roleId)}</td>
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
    );
}

function PlaceholderSection({ title, body }) {
    return (
        <div
            style={{
                borderRadius: 14,
                border: '1px dashed var(--border)',
                background: 'var(--bg-card)',
                padding: 48,
                textAlign: 'center',
                color: 'var(--text-muted)',
            }}
        >
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
                {title}
            </h2>
            <p style={{ fontSize: 14, maxWidth: 420, margin: '0 auto', lineHeight: 1.5 }}>{body}</p>
        </div>
    );
}

export default function Dashboard() {
    const { user, logout } = useAuth();
    const { showSnackbar } = useSnackbar();

    const [tasks, setTasks] = useState([]);
    const [projectsList, setProjectsList] = useState([]);
    const [team, setTeam] = useState([]);
    const [company, setCompany] = useState(null);
    const [roleOptions, setRoleOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [navSection, setNavSection] = useState('board');
    const [roster, setRoster] = useState(null);
    const [rosterLoading, setRosterLoading] = useState(false);
    const [createForm, setCreateForm] = useState(initialCreateForm);
    const [createError, setCreateError] = useState('');
    const [creating, setCreating] = useState(false);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [selectedTaskId, setSelectedTaskId] = useState(null);

    const roleIdNum = user?.roleId != null ? Number(user.roleId) : null;
    const isAdmin = roleIdNum === roleType.admin;
    const isManager = roleIdNum === roleType.manager;
    const isTL = roleIdNum === roleType.tl;
    const isManagerOrTL =
        roleIdNum === roleType.manager || roleIdNum === roleType.tl;

    const assigneeOptions = useMemo(() => {
        if (!user?.id) return [];
        const opts = [];
        const seen = new Set();
        const push = (id, label) => {
            const n = Number(id);
            if (!n || seen.has(n)) return;
            seen.add(n);
            opts.push({ id: n, label });
        };
        push(user.id, 'Me');
        if (isManagerOrTL && team?.length) {
            for (const m of team) {
                push(
                    m.id,
                    `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email || `User ${m.id}`
                );
            }
        }
        return opts;
    }, [user, team, isManagerOrTL]);

    const refreshTasks = useCallback(async () => {
        const tRes = await listTasks();
        const tBody = tRes?.data ?? tRes;
        if (tBody?.statusCode === StatusCode.success) {
            setTasks((tBody.data || []).map(normalizeTask));
        }
    }, []);

    useTaskSocket({
        userId: user?.id,
        onRefresh: refreshTasks,
        showSnackbar,
    });

    const selectedTask = useMemo(
        () => (selectedTaskId != null ? tasks.find((t) => t.id === selectedTaskId) ?? null : null),
        [tasks, selectedTaskId]
    );

    useEffect(() => {
        if (selectedTaskId == null) return;
        if (!tasks.some((t) => t.id === selectedTaskId)) setSelectedTaskId(null);
    }, [tasks, selectedTaskId]);

    const forwardOptions = useMemo(
        () => assigneeOptions.filter((o) => o.id !== Number(user?.id)),
        [assigneeOptions, user?.id]
    );

    const sidebarItems = useMemo(() => {
        if (isAdmin) {
            return [
                { key: 'people', label: 'People' },
                { key: 'invite', label: 'Add user' },
                { key: 'organization', label: 'Organization' },
                { key: 'projects', label: 'Projects' },
                { key: 'board', label: 'My board' },
                { key: 'settings', label: 'Settings' },
            ];
        }
        if (isManager) {
            return [
                { key: 'board', label: 'My board' },
                { key: 'team', label: 'Team view' },
                { key: 'organization', label: 'Organization' },
                { key: 'projects', label: 'Projects' },
                { key: 'notifications', label: 'Notifications' },
                { key: 'reports', label: 'Reports' },
                { key: 'settings', label: 'Settings' },
            ];
        }
        if (isTL) {
            return [
                { key: 'board', label: 'My board' },
                { key: 'team', label: 'Team view' },
                { key: 'notifications', label: 'Notifications' },
                { key: 'reports', label: 'Reports' },
                { key: 'settings', label: 'Settings' },
            ];
        }
        return [
            { key: 'board', label: 'My board' },
            { key: 'notifications', label: 'Notifications' },
            { key: 'reports', label: 'Reports' },
            { key: 'settings', label: 'Settings' },
        ];
    }, [isAdmin, isManager, isTL]);

    const lastNavUserId = useRef(null);
    useEffect(() => {
        if (!user?.id) return;
        if (lastNavUserId.current === user.id) return;
        lastNavUserId.current = user.id;
        setNavSection(isAdmin ? 'people' : 'board');
    }, [user?.id, isAdmin]);

    useEffect(() => {
        if (!user || isAdmin || navSection !== 'board') return;
        let cancelled = false;
        (async () => {
            const pRes = await listProjects().catch(() => null);
            const pBody = pRes?.data ?? pRes;
            if (!cancelled && pBody?.statusCode === StatusCode.success) {
                setProjectsList(pBody.data || []);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [user, isAdmin, navSection]);

    const refreshRoster = async () => {
        const rRes = await getRoster();
        const rBody = rRes?.data ?? rRes;
        if (rBody?.statusCode === StatusCode.success) {
            setRoster(rBody.data);
        }
    };

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

                if (rid !== roleType.admin) {
                    const [tasksRes, projRes] = await Promise.all([
                        listTasks().catch(() => null),
                        listProjects().catch(() => null),
                    ]);
                    const tasksBody = tasksRes?.data ?? tasksRes;
                    if (!cancelled && tasksBody?.statusCode === StatusCode.success) {
                        setTasks((tasksBody.data || []).map(normalizeTask));
                    }
                    const projBody = projRes?.data ?? projRes;
                    if (!cancelled && projBody?.statusCode === StatusCode.success) {
                        setProjectsList(projBody.data || []);
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
                setNavSection('people');
            } else {
                setCreateError(body?.message || 'Could not create user');
            }
        } finally {
            setCreating(false);
        }
    };

    const roleBadge = getUserRoleDisplayName(user);

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
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
                    background: 'var(--surface-topbar)',
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
                            Flow<span style={{ color: 'var(--purple)' }}>Desk</span>
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
                                    color: 'var(--badge-accent-text)',
                                    padding: '3px 8px',
                                    borderRadius: 6,
                                    background: 'var(--badge-accent-bg)',
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
                                background: 'var(--badge-accent-bg)',
                                color: 'var(--badge-accent-text)',
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
                            e.currentTarget.style.borderColor = 'var(--pink)';
                            e.currentTarget.style.color = 'var(--pink)';
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

            {/* ── Sidebar + workspace ── */}
            <div
                style={{
                    display: 'flex',
                    flex: 1,
                    minHeight: 0,
                    alignItems: 'stretch',
                }}
            >
                <aside className="app-dash-sidebar">
                    <nav className="preview-sidebar" aria-label="Workspace">
                        {sidebarItems.map((item) => (
                            <button
                                key={item.key}
                                type="button"
                                className={`preview-sidebar-item${navSection === item.key ? ' active' : ''}`}
                                onClick={() => setNavSection(item.key)}
                            >
                                <span className="preview-sidebar-icon" aria-hidden />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>
                <div
                    className="app-dash-workarea"
                    style={{ flex: 1, minWidth: 0, padding: '24px 28px 40px', overflow: 'auto' }}
                >
                    <div className="preview-frame app-dash-frame" style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div className="preview-topbar">
                            <span className="dot-red" />
                            <span className="dot-yellow" />
                            <span className="dot-green" />
                            <span className="preview-topbar-title">
                                FlowDesk — {company?.name || 'Workspace'}
                            </span>
                        </div>
                        <div style={{ padding: 24 }}>
                            {navSection !== 'settings' && (
                            <div style={{ marginBottom: 28 }}>
                                <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
                                    Hi {user?.firstName}{' '}!
                                    
                                </h1>
                                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                                    {isAdmin
                                        ? `Administrator · ${team.length} people in your organization`
                                        : isManagerOrTL
                                          ? `${getUserRoleDisplayName(user)} view · ${tasks.length} total tasks · ${team.length} team members`
                                          : `${getUserRoleDisplayName(user)} · ${tasks.length} tasks assigned to you`}
                                </p>
                            </div>
                            )}

                            {isAdmin && navSection === 'people' && (
                                <>
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
                                    ) : (
                                        <TeamTable
                                            team={team}
                                            emptyHint='No team members yet. Use "Add user" in the sidebar to invite people.'
                                        />
                                    )}
                                </>
                            )}

                {isAdmin && navSection === 'invite' && (
                    <>
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
                                                className="admin-form-input form-select dashboard-select"
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

                {isAdmin && navSection === 'organization' && (
                    <OrganizationPanel
                        roster={roster}
                        loading={rosterLoading}
                        onRefresh={refreshRoster}
                        showSnackbar={showSnackbar}
                        currentUser={user}
                    />
                )}

                {isAdmin && navSection === 'projects' && (
                    <ProjectsPanel roster={roster} showSnackbar={showSnackbar} />
                )}

                {isAdmin && navSection === 'board' && (
                    <PlaceholderSection
                        title="My board"
                        body="Task boards are for managers, tech leads, and developers. Use the sidebar to manage people, hierarchy, and projects."
                    />
                )}

                {isManager && navSection === 'organization' && (
                    <OrganizationPanel
                        roster={roster}
                        loading={rosterLoading}
                        onRefresh={refreshRoster}
                        showSnackbar={showSnackbar}
                        currentUser={user}
                    />
                )}

                {isManager && navSection === 'projects' && (
                    <ProjectsPanel roster={roster} showSnackbar={showSnackbar} />
                )}

                {(isManager || isTL) && navSection === 'team' && (
                    <TeamTable team={team} emptyHint="No team members to show." />
                )}

                {!isAdmin && navSection === 'notifications' && (
                    <PlaceholderSection
                        title="Notifications"
                        body="You do not have any notifications yet. Activity from tasks and team updates will appear here."
                    />
                )}

                {!isAdmin && navSection === 'reports' && (
                    <PlaceholderSection
                        title="Reports"
                        body="Reporting and analytics will be available in a future update."
                    />
                )}

                {navSection === 'settings' && (
                    <SettingsPanel showSnackbar={showSnackbar} />
                )}

                {!isAdmin && navSection === 'board' && (
                    <TaskBoardKanban
                        tasks={tasks}
                        loading={loading}
                        projects={projectsList}
                        onAddTask={() => setAddTaskOpen(true)}
                        onSelectTask={(t) => setSelectedTaskId(t.id)}
                    />
                )}

                {!isAdmin && (
                    <AddTaskModal
                        open={addTaskOpen}
                        onClose={() => setAddTaskOpen(false)}
                        projects={projectsList}
                        assigneeOptions={assigneeOptions}
                        defaultAssigneeId={user?.id}
                        showSnackbar={showSnackbar}
                        onCreated={(raw) => {
                            if (!raw) {
                                refreshTasks();
                                return;
                            }
                            // The board only lists tasks where you are the assignee (see GET /tasks/all).
                            // Merging a task created for someone else would incorrectly show it on the creator's board.
                            const forSelf =
                                Number(raw.assigneeId) === Number(user?.id) ||
                                Number(raw.assignee_id) === Number(user?.id);
                            if (forSelf) {
                                setTasks((prev) => [...prev, normalizeTask(raw)]);
                            }
                        }}
                    />
                )}

                {!isAdmin && selectedTask && (
                    <TaskDetailModal
                        task={selectedTask}
                        onClose={() => setSelectedTaskId(null)}
                        showSnackbar={showSnackbar}
                        refreshTasks={refreshTasks}
                        currentUserId={user?.id}
                        currentUser={user}
                        forwardOptions={forwardOptions}
                        assigneeOptions={assigneeOptions}
                    />
                )}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
