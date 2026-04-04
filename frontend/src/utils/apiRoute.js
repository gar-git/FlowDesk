// All API endpoint paths

export const API_Route = {
    // Auth
    signup: 'users/signup',
    login: 'users/login',
    logout: 'users/logout',

    // User
    getProfile: 'users/profile',
    getTeam: 'users/team',
    getRoleDropdown: 'users/roleDropdown',

    // Tasks — static
    createTask: 'tasks',
    getMineTasks: 'tasks/mine',
    getAllTasks: 'tasks/all',

    // Tasks — dynamic (return URL string for a given id)
    forwardTask:   (id) => `tasks/${id}/forward`,
    acceptForward: (id) => `tasks/${id}/forward/accept`,
    updateTask:    (id) => `tasks/${id}`,
};