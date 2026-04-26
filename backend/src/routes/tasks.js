import express from 'express';
import { eq, and } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import { db } from '../db.js';
import { tasks, users, projects } from '../db/schema.js';
import { notificationQueue } from '../queues/notificationQueue.js';
import { PRIORITY, TASK_STATUS, ROLES, TASK_TYPE } from '../helpers/constants.js';
import { getManageableUserIds } from '../helpers/orgScope.js';
import dotenv from 'dotenv';
import { checkToken } from '../middlewares/checkToken.js';

dotenv.config();
const router = express.Router();

/** Ids whose tasks a manager or TL may update (PATCH), including direct reports. */
async function visibleAssigneeIdsForLeadership(roleId, userId) {
    const members = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
            roleId === ROLES.MANAGER ? eq(users.managerId, userId) : eq(users.tlId, userId),
            eq(users.isDeleted, 0)
        ));
    return new Set(members.map((m) => m.id).concat([userId]));
}

const TASK_TYPE_NUMS = new Set([TASK_TYPE.BUG, TASK_TYPE.FEATURE, TASK_TYPE.IMPROVEMENT, TASK_TYPE.CHORE]);
const TASK_TYPE_BY_NAME = {
    bug: TASK_TYPE.BUG,
    feature: TASK_TYPE.FEATURE,
    improvement: TASK_TYPE.IMPROVEMENT,
    chore: TASK_TYPE.CHORE,
};

function normalizeTagsInput(raw) {
    if (raw == null || raw === '') return null;
    const s = String(raw).trim();
    if (!s) return null;
    const parts = s.split(/[,;]+/).map((p) => p.trim()).filter(Boolean);
    if (!parts.length) return null;
    const out = parts.join(', ');
    return out.length > 512 ? out.slice(0, 512) : out;
}

function parseTaskTypeForCreateOrReplace(raw) {
    if (raw === undefined || raw === null || raw === '') return null;
    const n = Number(raw);
    if (Number.isInteger(n) && TASK_TYPE_NUMS.has(n)) return n;
    const m = TASK_TYPE_BY_NAME[String(raw).toLowerCase().trim()];
    if (m) return m;
    const err = new Error('Invalid task type');
    err.statusCode = 400;
    throw err;
}

/** @returns {number|null|undefined} */
function parseTaskTypeForPatch(raw) {
    if (raw === undefined) return undefined;
    if (raw === null || raw === '') return null;
    const n = Number(raw);
    if (Number.isInteger(n) && TASK_TYPE_NUMS.has(n)) return n;
    const m = TASK_TYPE_BY_NAME[String(raw).toLowerCase().trim()];
    if (m) return m;
    const err = new Error('Invalid task type');
    err.statusCode = 400;
    throw err;
}

async function assertCanAssignTo(req, assigneeId) {
    const target = await db
        .select()
        .from(users)
        .where(and(
            eq(users.id, assigneeId),
            eq(users.companyId, req.user.companyId),
            eq(users.isDeleted, 0)
        ))
        .limit(1);

    if (!target.length) {
        const err = new Error('Assignee not found in your company');
        err.statusCode = 400;
        throw err;
    }

    const { roleId, id } = req.user;

    if (roleId === ROLES.ADMIN) return;

    if (roleId === ROLES.DEVELOPER) {
        if (assigneeId !== id) {
            const err = new Error('You can only create tasks for yourself');
            err.statusCode = 403;
            throw err;
        }
        return;
    }

    if (roleId === ROLES.TL) {
        if (assigneeId === id) return;
        const u = target[0];
        if (u.tlId === id) return;
        const err = new Error('You can only assign tasks to yourself or your team');
        err.statusCode = 403;
        throw err;
    }

    if (roleId === ROLES.MANAGER) {
        const manageable = await getManageableUserIds(db, id, req.user.companyId);
        manageable.add(id);
        if (!manageable.has(assigneeId)) {
            const err = new Error('You cannot assign a task to this person');
            err.statusCode = 403;
            throw err;
        }
        return;
    }

    const err = new Error('Not allowed to create tasks');
    err.statusCode = 403;
    throw err;
}

async function assertCanModifyTask(req, task) {
    if (!task) {
        const err = new Error('Task not found');
        err.statusCode = 404;
        throw err;
    }

    const { roleId, id } = req.user;

    if (task.assigneeId === id) return;

    if (roleId === ROLES.MANAGER || roleId === ROLES.TL) {
        const visible = await visibleAssigneeIdsForLeadership(roleId, id);
        if (visible.has(task.assigneeId)) return;
    }

    const err = new Error('You cannot update this task');
    err.statusCode = 403;
    throw err;
}

/** Only the creator may change priority and assignee (e.g. TL sets these for a dev's task). */
function userMayEditPriorityAndAssignee(req, task) {
    if (task == null) return true;
    const c = task.creatorId;
    if (c == null) return true; // legacy rows without creator
    return Number(c) === Number(req.user.id);
}


// POST /api/tasks
router.post('/', checkToken, async (req, res) => {
    try {
        const {
            title,
            description,
            assignee_id,
            priority = 'medium',
            due_date = null,
            projectId,
            tags: tagsBody,
            task_type: taskTypeSnake,
            taskType: taskTypeCamel,
        } = req.body;
        const creatorId = req.user.id;
        const { companyId } = req.user;

        if (!title || String(title).trim() === '') {
            return res.status(400).send({ statusCode: 400, message: 'title is required' });
        }

        const assigneeId = Number(assignee_id);
        if (!assigneeId) {
            return res.status(400).send({ statusCode: 400, message: 'assignee_id is required' });
        }

        if (!projectId) return res.status(400).send({ statusCode: 400, message: 'projectId is required' });

        await assertCanAssignTo(req, assigneeId);

        // Verify project belongs to user's company
        const projectRes = await db
            .select({ id: projects.id })
            .from(projects)
            .where(and(
                eq(projects.id, projectId),
                eq(projects.companyId, companyId),
                eq(projects.isDeleted, 0)
            ))
            .limit(1);

        if (!projectRes.length) return res.status(404).send({ statusCode: 404, message: 'Project not found' });

        const startRaw = req.body.start_date ?? req.body.startDate;
        const startDate =
            startRaw === undefined || startRaw === null || startRaw === ''
                ? null
                : String(startRaw).slice(0, 10);

        let taskTypeVal;
        try {
            taskTypeVal = parseTaskTypeForCreateOrReplace(taskTypeSnake ?? taskTypeCamel);
        } catch (e) {
            return res.status(400).send({ statusCode: 400, message: e.message });
        }
        const tagsVal = normalizeTagsInput(tagsBody);

        const result = await db
            .insert(tasks)
            .values({
                title: String(title).trim(),
                description,
                status: TASK_STATUS.TODO,
                projectId,
                creatorId,
                assigneeId: assigneeId,
                priority: PRIORITY[priority.toUpperCase()] ?? PRIORITY.MEDIUM,
                dueDate: due_date,
                startDate,
                tags: tagsVal,
                taskType: taskTypeVal,
            });

        const task = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, result[0].insertId))
            .limit(1);

        await notificationQueue.add('notify', {
            toUserId: assigneeId,
            type: 'task_assigned',
            payload: { task: task[0] },
        });

        res.status(201).send({ statusCode: 201, data: task[0] });
    } catch (err) {
        const code = err.statusCode;
        if (code) {
            return res.status(code).send({ statusCode: code, message: err.message });
        }
        console.error('Create task error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// GET /api/tasks/mine
router.get('/mine', checkToken, async (req, res) => {
    try {
        const result = await db
            .select()
            .from(tasks)
            .where(eq(tasks.assigneeId, req.user.id))
            .orderBy(tasks.createdAt);

        res.status(200).send({ statusCode: 200, data: result });
    } catch (err) {
        console.error('Mine tasks error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// GET /api/tasks/all — only tasks assigned to the current user (assignee = self).
// Tasks a manager/TL created for others appear only on the assignee’s board; creator name is included for UI.
router.get('/all', checkToken, async (req, res) => {
    try {
        const { id } = req.user;

        const taskCreator = alias(users, 'task_creator');

        const result = await db
            .select({
                id: tasks.id,
                title: tasks.title,
                description: tasks.description,
                status: tasks.status,
                priority: tasks.priority,
                projectId: tasks.projectId,
                projectName: projects.name,
                dueDate: tasks.dueDate,
                startDate: tasks.startDate,
                tags: tasks.tags,
                taskType: tasks.taskType,
                creatorId: tasks.creatorId,
                assigneeId: tasks.assigneeId,
                assigneeName: users.firstName,
                assigneeLastName: users.lastName,
                creatorFirstName: taskCreator.firstName,
                creatorLastName: taskCreator.lastName,
                createdAt: tasks.createdAt,
                updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .innerJoin(users, eq(tasks.assigneeId, users.id))
            .leftJoin(projects, eq(tasks.projectId, projects.id))
            .leftJoin(taskCreator, eq(tasks.creatorId, taskCreator.id))
            .where(eq(tasks.assigneeId, id))
            .orderBy(tasks.createdAt);

        res.status(200).send({ statusCode: 200, data: result });
    } catch (err) {
        console.error('All tasks error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// PUT /api/tasks/:id/forward
router.put('/:id/forward', checkToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { target_user_id } = req.body;

        const taskRes = await db
            .select({ assigneeId: tasks.assigneeId })
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);

        if (!taskRes.length) return res.status(404).send({ statusCode: 404, message: 'Task not found' });
        if (taskRes[0].assigneeId !== req.user.id) return res.status(403).send({ statusCode: 403, message: 'Not owner' });

        const targetId = Number(target_user_id);
        if (!targetId || targetId === req.user.id) {
            return res.status(400).send({ statusCode: 400, message: 'Valid target_user_id is required' });
        }

        await db
            .update(tasks)
            .set({ pendingForwardTo: targetId, forwardFrom: req.user.id })
            .where(eq(tasks.id, id));

        await notificationQueue.add('notify', {
            toUserId: targetId,
            type: 'forward_request',
            payload: { taskId: id, fromUserId: req.user.id },
        });

        res.status(200).send({ statusCode: 200, message: 'Forward request sent' });
    } catch (err) {
        console.error('Forward task error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// POST /api/tasks/:id/forward/accept
router.post('/:id/forward/accept', checkToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        const taskRes = await db
            .select({ pendingForwardTo: tasks.pendingForwardTo, forwardFrom: tasks.forwardFrom })
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);

        if (!taskRes.length) return res.status(404).send({ statusCode: 404, message: 'Task not found' });
        if (taskRes[0].pendingForwardTo !== req.user.id) return res.status(403).send({ statusCode: 403, message: 'Not target' });

        const originalSender = taskRes[0].forwardFrom;

        await db
            .update(tasks)
            .set({ assigneeId: req.user.id, pendingForwardTo: null, forwardFrom: null })
            .where(eq(tasks.id, id));

        await notificationQueue.add('notify', {
            toUserId: originalSender,
            type: 'forward_accepted',
            payload: { taskId: id },
        });

        res.status(200).send({ statusCode: 200, message: 'Task forwarded successfully' });
    } catch (err) {
        console.error('Accept forward error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// PATCH /api/tasks/:id
router.patch('/:id', checkToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const {
            status,
            title,
            description,
            priority,
            start_date: startSnake,
            startDate: startCamel,
            due_date: dueSnake,
            dueDate: dueCamel,
            tags: tagsBody,
            task_type: taskTypeSnake,
            taskType: taskTypeCamel,
            assignee_id: assigneeSnake,
            assigneeId: assigneeCamel,
        } = req.body;

        const taskRes = await db
            .select({ assigneeId: tasks.assigneeId, title: tasks.title, creatorId: tasks.creatorId })
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);

        if (!taskRes.length) return res.status(404).send({ statusCode: 404, message: 'Task not found' });

        const before = taskRes[0];
        await assertCanModifyTask(req, before);
        const canSetPriorityAssignee = userMayEditPriorityAndAssignee(req, before);

        const updates = { updatedAt: new Date() };

        if (status !== undefined) {
            const n = Number(status);
            if (![TASK_STATUS.TODO, TASK_STATUS.ONGOING, TASK_STATUS.COMPLETED].includes(n)) {
                return res.status(400).send({ statusCode: 400, message: 'Invalid status' });
            }
            updates.status = n;
        }
        if (title !== undefined) {
            const t = String(title).trim();
            if (!t) {
                return res.status(400).send({ statusCode: 400, message: 'Title cannot be empty' });
            }
            updates.title = t;
        }
        if (description !== undefined) updates.description = description;

        if (priority !== undefined && canSetPriorityAssignee) {
            const key = String(priority).toUpperCase();
            const p = PRIORITY[key];
            if (!p) {
                return res.status(400).send({ statusCode: 400, message: 'Invalid priority' });
            }
            updates.priority = p;
        }

        const startRaw = startSnake ?? startCamel;
        if (startRaw !== undefined) {
            updates.startDate =
                startRaw === null || startRaw === '' ? null : String(startRaw).slice(0, 10);
        }

        const dueRaw = dueSnake ?? dueCamel;
        if (dueRaw !== undefined) {
            updates.dueDate =
                dueRaw === null || dueRaw === '' ? null : String(dueRaw).slice(0, 10);
        }

        if (tagsBody !== undefined) {
            updates.tags = normalizeTagsInput(tagsBody);
        }

        const rawTaskType = taskTypeSnake !== undefined ? taskTypeSnake : taskTypeCamel;
        if (rawTaskType !== undefined) {
            try {
                updates.taskType = parseTaskTypeForPatch(rawTaskType);
            } catch (e) {
                return res.status(400).send({ statusCode: 400, message: e.message });
            }
        }

        const assigneeRaw = assigneeSnake !== undefined ? assigneeSnake : assigneeCamel;
        if (assigneeRaw !== undefined && canSetPriorityAssignee) {
            const newAssigneeId = Number(assigneeRaw);
            if (!newAssigneeId) {
                return res.status(400).send({ statusCode: 400, message: 'Invalid assignee_id' });
            }
            try {
                await assertCanAssignTo(req, newAssigneeId);
            } catch (e) {
                const code = e.statusCode || 403;
                return res.status(code).send({ statusCode: code, message: e.message });
            }
            updates.assigneeId = newAssigneeId;
        }

        await db.update(tasks).set(updates).where(eq(tasks.id, id));

        if (updates.assigneeId !== undefined && updates.assigneeId !== before.assigneeId) {
            const taskRow = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
            if (taskRow[0]) {
                await notificationQueue.add('notify', {
                    toUserId: updates.assigneeId,
                    type: 'task_assigned',
                    payload: { task: taskRow[0] },
                });
            }
        }

        res.status(200).send({ statusCode: 200, message: 'Task updated' });
    } catch (err) {
        const code = err.statusCode;
        if (code) {
            return res.status(code).send({ statusCode: code, message: err.message });
        }
        console.error('Update task error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

export default router;