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
    try {
        const { name, email, password, roleId, employeeCode, managerId, tlId } = req.body;
        const encrypted = await bcrypt.hash(password, 10);

        const result = await db
            .insert(users)
            .values({
                name,
                email,
                password: encrypted,
                roleId,
                employeeCode,
                managerId: managerId || null,
                tlId: tlId || null,
            });

        const newUser = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                roleId: users.roleId,
                employeeCode: users.employeeCode,
            })
            .from(users)
            .where(eq(users.id, result[0].insertId))
            .limit(1);

        res.status(201).send({ statusCode: 201, data: newUser[0] });
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


router.post('/login', async (req, res) => {
    try {
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

        res.status(200).send({
            statusCode: 200,
            data: {
                token,
                user: { id: user.id, name: user.name, email: user.email, roleId: user.roleId },
            },
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


router.get('/profile', checkToken, async (req, res) => {
    try {
        const result = await db
            .select({
                id: users.id,
                name: users.name,
                email: users.email,
                roleId: users.roleId,
                employeeCode: users.employeeCode,
                managerId: users.managerId,
                tlId: users.tlId,
            })
            .from(users)
            .where(eq(users.id, req.user.id))
            .limit(1);

        if (!result.length) return res.status(404).send({ statusCode: 404, message: 'User not found' });

        res.status(200).send({ statusCode: 200, data: result[0] });
    } catch (err) {
        console.error('Profile error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


router.get('/team', checkToken, async (req, res) => {
    try {
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

        return res.status(403).send({ statusCode: 403, message: 'Access denied' });
    } catch (err) {
        console.error('Team error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


export default router;