import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { users } from '../db/schema.js';
import dotenv from 'dotenv';

import { checkToken } from '../middlewares/checkToken.js';

dotenv.config();
const router = express.Router();


router.post('/signup', async (req, res) => {
    const { name, email, password, roleId, managerId, tlId } = req.body;
    const encrypted = await bcrypt.hash(password, 10);

    const result = await db
        .insert(users)
        .values({
            name,
            email,
            password: encrypted,
            roleId: roleId,
            managerId: managerId || null,
            tlId: tlId || null,
        })
        .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            roleId: users.roleId,
        });

    res.status(201).send({ statusCode: 201, data: result[0] });
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);


    if (!result.length) return res.status(400).send({ statusCode: 400, message: 'Invalid credentials' });

    const user = result[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).send({ statusCode: 400, message: 'Invalid credentials' });

    const token = jwt.sign(
        { id: user.id, name: user.name, roleId: user.roleId },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );

    res.send({
        statusCode: 200,
        data: {
            token,
            user: { id: user.id, name: user.name, email: user.email, roleId: user.roleId },
        },
    });
});

router.get('/profile', checkToken, async (req, res) => {
    const result = await db
        .select({
            id: users.id,
            name: users.name,
            email: users.email,
            roleId: users.roleId,
            managerId: users.managerId,
            employeeCode: users.employeeCode,
            tlId: users.tlId,
        })
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1);

    res.status(200).send({ statusCode: 200, data: result[0] });
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

        return res.status(200).send({ statusCode: 200, data: devs });
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

        return res.status(200).send({ statusCode: 200, data: members });
    }

    return res.status(404).send({ statusCode: 400, data: [] });
});

export default router;