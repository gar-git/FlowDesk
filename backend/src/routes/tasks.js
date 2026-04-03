import express from 'express';
import jwt from 'jsonwebtoken';
import { eq, inArray } from 'drizzle-orm';
import { db } from '../db.js';
import { tasks, users } from '../db/schema.js';
import { notificationQueue } from '../queues/notificationQueue.js';
import { PRIORITY, TASK_STATUS } from '../helpers/constants.js';
import dotenv from 'dotenv';

import { checkToken } from '../middlewares/checkToken.js';
dotenv.config();
const router = express.Router();


router.post('/', checkToken, async (req, res) => {
    const { title, description, assignee_id, priority = 'medium', due_date = null } = req.body;
    const creatorId = req.user.id;

    const result = await db
        .insert(tasks)
        .values({
            title,
            description,
            status: TASK_STATUS.TODO,
            creatorId,
            assigneeId: assignee_id,
            priority: PRIORITY[priority.toUpperCase()] ?? PRIORITY.MEDIUM,
            dueDate: due_date,
        })
        .returning();

    const task = result[0];
    await notificationQueue.add('notify', { toUserId: assignee_id, type: 'task_assigned', payload: { task } });
    res.status(201).send(task);
});

router.get('/mine', checkToken, async (req, res) => {
    const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.assigneeId, req.user.id))
        .orderBy(tasks.createdAt);

    res.send(result);
});

router.get('/all', checkToken, async (req, res) => {
    const { roleId, id } = req.user;

    // Manager (roleId=1) or TL (roleId=2) — fetch their team's tasks with assignee name
    if (roleId === 1 || roleId === 2) {
        const members = await db
            .select({ id: users.id })
            .from(users)
            .where(roleId === 1 ? eq(users.managerId, id) : eq(users.tlId, id));

        const ids = members.map(m => m.id).concat([id]);

        const result = await db
            .select({
                id: tasks.id,
                title: tasks.title,
                description: tasks.description,
                status: tasks.status,
                priority: tasks.priority,
                dueDate: tasks.dueDate,
                creatorId: tasks.creatorId,
                assigneeId: tasks.assigneeId,
                assigneeName: users.name,
                createdAt: tasks.createdAt,
                updatedAt: tasks.updatedAt,
            })
            .from(tasks)
            .innerJoin(users, eq(tasks.assigneeId, users.id))
            .where(inArray(tasks.assigneeId, ids))
            .orderBy(tasks.createdAt);

        return res.send(result);
    }

    // Developer — only their own tasks
    const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.assigneeId, id))
        .orderBy(tasks.createdAt);

    res.send(result);
});

router.put('/:id/forward', checkToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { target_user_id } = req.body;

    const taskRes = await db
        .select({ assigneeId: tasks.assigneeId })
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!taskRes.length) return res.status(404).send({ message: 'Task not found' });
    if (taskRes[0].assigneeId !== req.user.id) return res.status(403).send({ message: 'Not owner' });

    await db
        .update(tasks)
        .set({ pendingForwardTo: target_user_id, forwardFrom: req.user.id })
        .where(eq(tasks.id, id));

    await notificationQueue.add('notify', {
        toUserId: target_user_id,
        type: 'forward_request',
        payload: { taskId: id, fromUserId: req.user.id },
    });

    res.send({ message: 'Forward request sent' });
});

router.post('/:id/forward/accept', checkToken, async (req, res) => {
    const id = parseInt(req.params.id);

    const taskRes = await db
        .select({ pendingForwardTo: tasks.pendingForwardTo })
        .from(tasks)
        .where(eq(tasks.id, id))
        .limit(1);

    if (!taskRes.length) return res.status(404).send({ message: 'Task not found' });
    if (taskRes[0].pendingForwardTo !== req.user.id) return res.status(403).send({ message: 'Not target' });

    await db
        .update(tasks)
        .set({ assigneeId: req.user.id, pendingForwardTo: null, forwardFrom: null })
        .where(eq(tasks.id, id));

    await notificationQueue.add('notify', {
        toUserId: req.user.id,
        type: 'forward_accepted',
        payload: { taskId: id },
    });

    res.send({ message: 'Task forwarded successfully' });
});

router.patch('/:id', checkToken, async (req, res) => {
    const id = parseInt(req.params.id);
    const { status, title, description } = req.body;

    const updates = { updatedAt: new Date() };
    if (status !== undefined) updates.status = status;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;

    await db.update(tasks).set(updates).where(eq(tasks.id, id));
    res.send({ message: 'Task updated' });
});
// hello

export default router;