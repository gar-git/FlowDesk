import { taskStatus, taskPriority } from './constants';

const STATUS_NUM_TO_STR = {
    1: taskStatus.todo,
    2: taskStatus.inProgress,
    3: taskStatus.done,
};

const PRIORITY_NUM_TO_STR = {
    1: taskPriority.low,
    2: taskPriority.medium,
    3: taskPriority.high,
};

function buildCreatorDisplayName(row) {
    if (row.creatorName && String(row.creatorName).trim()) {
        return String(row.creatorName).trim();
    }
    const a = row.creatorFirstName || '';
    const b = row.creatorLastName || '';
    const s = `${a} ${b}`.trim();
    return s || null;
}

/** Map API row (numeric status/priority) to UI shape used by the board */
export function normalizeTask(row) {
    if (!row) return row;
    const st = row.status;
    const pr = row.priority;
    const creatorName = buildCreatorDisplayName(row);
    const fn = row.assigneeName || '';
    const ln = row.assigneeLastName || '';
    const assigneeDisplayName = `${fn} ${ln}`.trim() || fn || null;
    return {
        ...row,
        status:
            typeof st === 'number'
                ? STATUS_NUM_TO_STR[st] ?? taskStatus.todo
                : st ?? taskStatus.todo,
        priority:
            typeof pr === 'number'
                ? PRIORITY_NUM_TO_STR[pr] ?? taskPriority.medium
                : pr ?? taskPriority.medium,
        creatorName,
        assigneeDisplayName,
    };
}

/** UI status string → API integer */
export function statusToApi(statusStr) {
    const map = {
        [taskStatus.todo]: 1,
        [taskStatus.inProgress]: 2,
        [taskStatus.done]: 3,
    };
    return map[statusStr] ?? 1;
}

/** `YYYY-MM-DD` for `<input type="date" />` from API value */
export function formatDateInputValue(v) {
    if (v == null || v === '') return '';
    const s = typeof v === 'string' ? v : String(v);
    return s.slice(0, 10);
}
