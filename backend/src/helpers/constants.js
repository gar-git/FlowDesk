export const TASK_STATUS = {
    TODO: 1,
    ONGOING: 2,
    COMPLETED: 3,
};
 
export const PRIORITY = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
};
 
export const ROLES = {
    MANAGER: 1,
    TL: 2,
    DEVELOPER: 3,
    ADMIN: 4,
};

/** Stored on tasks.task_type; null means not set */
export const TASK_TYPE = {
    BUG: 1,
    FEATURE: 2,
    IMPROVEMENT: 3,
    CHORE: 4,
};
