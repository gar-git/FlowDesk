// All API endpoint paths

export const API_Route = {
    // Auth
    signup: 'users/signup',
    login: 'users/login',
    logout: 'users/logout',

    // Companies (public create)
    createCompany: 'companies',

    // User
    getProfile: 'users/profile',
    changePassword: 'users/me/password',
    getTeam: 'users/team',
    getRoleDropdown: 'users/roleDropdown',
    createUser: 'users/create',

    // Companies (authenticated)
    companyMe: 'companies/me',

    // Projects
    projects: 'projects',
    projectMembers: (projectId) => `projects/${projectId}/members`,
    projectMember: (projectId, userId) => `projects/${projectId}/members/${userId}`,

    // Users — org
    roster: 'users/roster',
    userHierarchy: (userId) => `users/${userId}/hierarchy`,

    // Tasks — static
    createTask: 'tasks',
    getMineTasks: 'tasks/mine',
    getAllTasks: 'tasks/all',

    // Tasks — dynamic (return URL string for a given id)
    forwardTask:   (id) => `tasks/${id}/forward`,
    acceptForward: (id) => `tasks/${id}/forward/accept`,
    updateTask:    (id) => `tasks/${id}`,
};