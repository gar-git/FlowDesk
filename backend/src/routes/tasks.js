import express from 'express';
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
    try {
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
            });

        const task = await db
            .select()
            .from(tasks)
            .where(eq(tasks.id, result[0].insertId))
            .limit(1);

        await notificationQueue.add('notify', {
            toUserId: assignee_id,
            type: 'task_assigned',
            payload: { task: task[0] },
        });

        res.status(201).send({ statusCode: 201, data: task[0] });
    } catch (err) {
        console.error('Create task error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


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


router.get('/all', checkToken, async (req, res) => {
    try {
        const { roleId, id } = req.user;

        // Manager (roleId=1) or TL (roleId=2)
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

            return res.status(200).send({ statusCode: 200, data: result });
        }

        // Developer — only their own tasks
        const result = await db
            .select()
            .from(tasks)
            .where(eq(tasks.assigneeId, id))
            .orderBy(tasks.createdAt);

        res.status(200).send({ statusCode: 200, data: result });
    } catch (err) {
        console.error('All tasks error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


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

        await db
            .update(tasks)
            .set({ pendingForwardTo: target_user_id, forwardFrom: req.user.id })
            .where(eq(tasks.id, id));

        await notificationQueue.add('notify', {
            toUserId: target_user_id,
            type: 'forward_request',
            payload: { taskId: id, fromUserId: req.user.id },
        });

        res.status(200).send({ statusCode: 200, message: 'Forward request sent' });
    } catch (err) {
        console.error('Forward task error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


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


router.patch('/:id', checkToken, async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, title, description } = req.body;

        const taskRes = await db
            .select({ assigneeId: tasks.assigneeId })
            .from(tasks)
            .where(eq(tasks.id, id))
            .limit(1);

        if (!taskRes.length) return res.status(404).send({ statusCode: 404, message: 'Task not found' });

        const updates = { updatedAt: new Date() };
        if (status !== undefined) updates.status = status;
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;

        await db.update(tasks).set(updates).where(eq(tasks.id, id));

        res.status(200).send({ statusCode: 200, message: 'Task updated' });
    } catch (err) {
        console.error('Update task error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


export default router;