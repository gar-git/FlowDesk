import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
// import { pool } from './db.js';
import userRoutes from './routes/users.js';
import taskRoutes from './routes/tasks.js';
import { notificationQueue } from './queues/notificationQueue.js';
import dotenv from "dotenv";

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, { cors: { origin: '*', methods: ['GET','POST'] } });

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);

const socketUsers = new Map();

io.on('connection', (socket) => {
  socket.on('register', (userId) => { socketUsers.set(userId, socket.id); });

  socket.on('disconnect', () => {
    Array.from(socketUsers.entries()).forEach(([userId,sid]) => {
      if (sid === socket.id) socketUsers.delete(userId);
    });
  });

  socket.on('task-forward', async ({taskId, fromUserId, toUserId}) => {
    // can be extended with acceptance flow in task routes + DB status
    const notify = {
      toUserId,
      type: 'task_forward_request',
      payload: {taskId, fromUserId}
    };
    await notificationQueue.add('notify', notify);
    const toSocket = socketUsers.get(toUserId);
    if (toSocket) io.to(toSocket).emit('notification', notify);
  });
});

// Notification queue processor (backend side deliverer)
import { Worker } from 'bullmq';
const redisConnection = {
  ...notificationQueue.opts.connection,
  maxRetriesPerRequest: null,
  enableReadyCheck: false
};
new Worker('notifications', async job => {
  const { toUserId, type, payload } = job.data;
  const socketId = socketUsers.get(toUserId);
  if (socketId) io.to(socketId).emit('notification', { type, payload, when: new Date() });
}, { connection: redisConnection });

const port = process.env.PORT || 4000;
server.listen(port, () => {
  console.log(`FlowDesk backend listening on ${port}`);
});
