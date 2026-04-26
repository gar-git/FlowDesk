import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import companyRoutes from './routes/companies.js';
import projectRoutes from './routes/projects.js';
import { notificationQueue } from './queues/notificationQueue.js';
import { apiLogger } from './middlewares/logger.js';
import { db } from './db.js';
import { users } from './db/schema.js';
import { eq } from 'drizzle-orm';
import { isEmailConfigured, sendTaskAssignedEmail, maskEmailForLog } from './helpers/email.js';
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());
app.use(apiLogger);

app.use('/api/companies', companyRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);

const socketUsers = new Map();

io.on('connection', (socket) => {
    socket.on('register', (userId) => { socketUsers.set(userId, socket.id); });

    socket.on('disconnect', () => {
        Array.from(socketUsers.entries()).forEach(([userId, sid]) => {
            if (sid === socket.id) socketUsers.delete(userId);
        });
    });

    socket.on('task-forward', async ({ taskId, fromUserId, toUserId }) => {
        const notify = {
            toUserId,
            type: 'task_forward_request',
            payload: { taskId, fromUserId }
        };
        await notificationQueue.add('notify', notify);
        const toSocket = socketUsers.get(toUserId);
        if (toSocket) io.to(toSocket).emit('notification', notify);
    });
});

// Notification queue processor (in-app + optional email)
// Must use a real IORedis (or same constructor as the Queue). Spreading the Queue’s
// connection object breaks the Worker so jobs never run.
import { Worker } from 'bullmq';
import IORedis from 'ioredis';

const workerRedis = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
});

workerRedis.on('ready', () => {
    console.log('[queue] Worker Redis client connected');
});
workerRedis.on('error', (err) => {
    console.error('[queue] Worker Redis error:', err?.message || err);
});

const notificationWorker = new Worker(
    'notifications',
    async (job) => {
        const { toUserId, type, payload } = job.data;
        const name = job.name || 'notify';

        console.log(
            `[queue] start job id=${job.id} name=${name} type=${type} toUserId=${toUserId}`
        );

        const socketId = socketUsers.get(toUserId);
        if (socketId) {
            io.to(socketId).emit('notification', { type, payload, when: new Date() });
            console.log(`[queue] job ${job.id} socket → delivered in-app to user ${toUserId}`);
        } else {
            console.log(
                `[queue] job ${job.id} socket → no active connection for user ${toUserId} (in-app not pushed live)`
            );
        }

        if (type === 'task_assigned' && isEmailConfigured()) {
            try {
                const userRows = await db
                    .select({ email: users.email, firstName: users.firstName })
                    .from(users)
                    .where(eq(users.id, toUserId))
                    .limit(1);
                const u = userRows[0];
                const task = payload?.task;
                if (!u?.email) {
                    console.log(
                        `[email] task_assigned skipped job=${job.id} reason=no_user_email toUserId=${toUserId}`
                    );
                } else {
                    const result = await sendTaskAssignedEmail({
                        to: u.email,
                        assigneeFirstName: u.firstName,
                        taskTitle: task?.title,
                    });
                    if (result?.skipped) {
                        console.log(
                            `[email] task_assigned skipped job=${job.id} reason=${result.reason || 'unknown'} to=${maskEmailForLog(u.email)}`
                        );
                    } else if (result?.sent) {
                        const raw = task?.title != null ? String(task.title) : '';
                        const taskPreview =
                            raw.length > 60 ? `${raw.slice(0, 60)}…` : raw;
                        console.log(
                            `[email] task_assigned sent ok job=${job.id} to=${maskEmailForLog(result.to || u.email)}${
                                taskPreview ? ` task="${taskPreview}"` : ''
                            }`
                        );
                    }
                }
            } catch (e) {
                console.error(
                    `[email] task_assigned send failed job=${job.id} toUserId=${toUserId}:`,
                    e?.message || e
                );
            }
        } else if (type === 'task_assigned' && !isEmailConfigured()) {
            console.log(
                `[queue] job ${job.id} task_assigned (email skip: SMTP not configured in .env)`
            );
        }
    },
    { connection: workerRedis, concurrency: 5 }
);

notificationWorker.on('ready', () => {
    console.log('[queue] worker ready — subscribed to "notifications" (jobs will be processed here)');
});

notificationWorker.on('completed', (job) => {
    console.log(`[queue] done job id=${job.id} name=${job.name || 'notify'}`);
});

notificationWorker.on('failed', (job, err) => {
    console.error(
        `[queue] failed job id=${job?.id} name=${job?.name || 'notify'}:`,
        err?.message || err
    );
});

notificationWorker.on('error', (err) => {
    console.error('[queue] worker error:', err?.message || err);
});

const port = process.env.PORT || 4000;
server.listen(port, () => {
    console.log(`FlowDesk backend listening on ${port}`);
    if (!isEmailConfigured()) {
        console.log(
            '[email] SMTP not configured (set SMTP_HOST + SMTP_FROM in .env) — task assignment emails disabled'
        );
    } else {
        console.log('[email] SMTP env present — assignment emails will be sent when jobs run');
    }
    const redisLabel = process.env.REDIS_URL ? 'REDIS_URL set' : 'REDIS_URL missing (using ioredis default?)';
    console.log(`[queue] ${redisLabel}`);
});

/** Best-effort: log queue depth (helps if jobs pile up unprocessed) */
setTimeout(() => {
    notificationQueue
        .getJobCounts('wait', 'active', 'completed', 'failed', 'delayed')
        .then((c) => console.log('[queue] job counts', c))
        .catch((e) => console.error('[queue] could not read job counts — is Redis up?', e.message));
}, 500);