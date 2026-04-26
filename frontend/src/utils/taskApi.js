import { taskStatus, taskPriority, taskType as taskTypeMap } from './constants';

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

const TASK_TYPE_NUM_TO_KEY = {
    1: 'bug',
    2: 'feature',
    3: 'improvement',
    4: 'chore',
};

const TASK_TYPE_KEY_TO_NUM = {
    bug: taskTypeMap.bug,
    feature: taskTypeMap.feature,
    improvement: taskTypeMap.improvement,
    chore: taskTypeMap.chore,
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
    const tt = row.taskType;
    let taskTypeKey = null;
    if (tt != null && tt !== '') {
        if (typeof tt === 'number') {
            taskTypeKey = TASK_TYPE_NUM_TO_KEY[tt] ?? null;
        } else {
            const k = String(tt).toLowerCase();
            taskTypeKey = TASK_TYPE_KEY_TO_NUM[k] != null ? k : null;
        }
    }

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
        taskType: taskTypeKey,
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

/** Human-readable date for display (e.g. "20 Apr 2026"), or "Not set" */
export function formatDateDisplay(ymd) {
    if (ymd == null || ymd === '') return 'Not set';
    try {
        const s = String(ymd).slice(0, 10);
        const d = new Date(`${s}T12:00:00`);
        if (Number.isNaN(d.getTime())) return 'Not set';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return 'Not set';
    }
}

/** UI key (`bug` … `chore`) → API */
export function taskTypeKeyToApi(key) {
    if (key == null || key === '') return null;
    return TASK_TYPE_KEY_TO_NUM[key] ?? null;
}
