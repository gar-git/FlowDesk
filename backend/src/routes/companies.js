import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from '../db.js';
import { companies, users } from '../db/schema.js';
import { ROLES } from '../helpers/constants.js';
import { checkToken } from '../middlewares/checkToken.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

// Generate a random company code e.g. "FLOW-X9K2"
const generateCompanyCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return `FLOW-${code}`;
};


// POST /api/companies
// Public — creates company + admin user in one shot
router.post('/', async (req, res) => {
    try {
        const {
            companyName,
            adminFirstName,
            adminLastName,
            adminEmail,
            adminPassword,
            adminEmployeeCode,
        } = req.body;

        if (!companyName || !adminFirstName || !adminLastName || !adminEmail || !adminPassword || !adminEmployeeCode) {
            return res.status(400).send({ statusCode: 400, message: 'All fields are required' });
        }

        // Generate unique company code — retry if collision (extremely rare)
        let companyCode;
        let codeExists = true;
        while (codeExists) {
            companyCode = generateCompanyCode();
            const existing = await db
                .select({ id: companies.id })
                .from(companies)
                .where(eq(companies.companyCode, companyCode))
                .limit(1);
            codeExists = existing.length > 0;
        }

        // Create company
        const companyResult = await db
            .insert(companies)
            .values({ name: companyName, companyCode });

        const companyId = companyResult[0].insertId;

        // Create admin user
        const encrypted = await bcrypt.hash(adminPassword, 10);
        const adminResult = await db
            .insert(users)
            .values({
                firstName: adminFirstName,
                lastName: adminLastName,
                email: adminEmail,
                password: encrypted,
                roleId: ROLES.ADMIN,
                companyId,
                employeeCode: adminEmployeeCode,
            });

        const adminId = adminResult[0].insertId;

        // Fetch created admin
        const admin = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                roleId: users.roleId,
                employeeCode: users.employeeCode,
                companyId: users.companyId,
            })
            .from(users)
            .where(eq(users.id, adminId))
            .limit(1);

        // Sign token so admin is logged in immediately
        const token = jwt.sign(
            { id: admin[0].id, firstName: admin[0].firstName, roleId: admin[0].roleId, companyId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).send({
            statusCode: 201,
            message: 'Company created successfully. Share your company code with your team.',
            data: {
                companyCode,
                token,
                user: admin[0],
            },
        });
    } catch (err) {
        console.error('Create company error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// GET /api/companies/me
// Returns the company info of the logged-in user
router.get('/me', checkToken, async (req, res) => {
    try {
        const { companyId } = req.user;

        const result = await db
            .select({
                id: companies.id,
                name: companies.name,
                companyCode: companies.companyCode,
                createdAt: companies.createdAt,
            })
            .from(companies)
            .where(eq(companies.id, companyId))
            .limit(1);

        if (!result.length) return res.status(404).send({ statusCode: 404, message: 'Company not found' });

        res.status(200).send({ statusCode: 200, data: result[0] });
    } catch (err) {
        console.error('Get company error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

export default router;