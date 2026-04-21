// ==============================|| FLOWDESK CONSTANTS ||============================== //

export const StatusCode = {
    success:      200,
    created:      201,
    badRequest:   400,
    unauthorized: 401,
    forbidden:    403,
    notFound:     404,
    serverError:  500,
};

// Role IDs — must match roleMaster table in the backend
export const roleType = {
    manager:   1,
    tl:        2,
    developer: 3,
    admin:     4,
};

// Human-readable role labels
export const roleLabel = {
    1: 'Manager',
    2: 'Tech Lead',
    3: 'Developer',
    4: 'Admin',
};

/** Safe label when roleId is missing or unknown */
export function getRoleLabel(roleId) {
    if (roleId == null) return 'User';
    return roleLabel[roleId] ?? `Role ${roleId}`;
}

// Task statuses — must match TASK_STATUS constants in backend helpers/constants.js
export const taskStatus = {
    todo:       'todo',
    inProgress: 'in_progress',
    done:       'done',
};

// Task priority levels
export const taskPriority = {
    low:    'low',
    medium: 'medium',
    high:   'high',
};
