import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../db/schema.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const checkToken = async (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).send({ message: 'Unauthorized' });
  try {
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).send({ message: 'Invalid token' });
  }
};

router.post('/signup', async (req, res) => {
  const { name, email, password, role_id, manager_id, tl_id } = req.body;
  const encrypted = await bcrypt.hash(password, 10);

  const result = await db
    .insert(users)
    .values({
      name,
      email,
      password: encrypted,
      roleId: role_id,
      managerId: manager_id || null,
      tlId: tl_id || null,
    })
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      roleId: users.roleId,
    });

  res.status(201).send(result[0]);
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!result.length) return res.status(400).send({ message: 'Invalid credentials' });

  const user = result[0];
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).send({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { id: user.id, name: user.name, roleId: user.roleId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.send({
    token,
    user: { id: user.id, name: user.name, email: user.email, roleId: user.roleId },
  });
});

router.get('/me', checkToken, async (req, res) => {
  const result = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      roleId: users.roleId,
      managerId: users.managerId,
      tlId: users.tlId,
    })
    .from(users)
    .where(eq(users.id, req.user.id))
    .limit(1);

  res.send(result[0]);
});

router.get('/team', checkToken, async (req, res) => {
  const { roleId, id } = req.user;

  // roleId 1 = Manager
  if (roleId === 1) {
    const devs = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        employeeCode: users.employeeCode,
      })
      .from(users)
      .where(eq(users.managerId, id));

    return res.send(devs);
  }

  // roleId 2 = Team Lead
  if (roleId === 2) {
    const members = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        roleId: users.roleId,
        employeeCode: users.employeeCode,
      })
      .from(users)
      .where(eq(users.tlId, id));

    return res.send(members);
  }

  return res.send([]);
});

export default router;