import express from 'express';
import { eq, and } from 'drizzle-orm';
import { db } from '../db.js';
import { projects, users } from '../db/schema.js';
import { ROLES } from '../helpers/constants.js';
import { checkToken } from '../middlewares/checkToken.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();


// POST /api/projects
// Manager only — create a project under their company
router.post('/', checkToken, async (req, res) => {
    try {
        const { roleId, companyId, id } = req.user;

        if (roleId !== ROLES.MANAGER && roleId !== ROLES.ADMIN) {
            return res.status(403).send({ statusCode: 403, message: 'Only managers can create projects' });
        }

        const { name, description } = req.body;

        if (!name) return res.status(400).send({ statusCode: 400, message: 'Project name is required' });

        const result = await db
            .insert(projects)
            .values({
                name,
                description: description || null,
                companyId,
                createdBy: id,
            });

        const project = await db
            .select()
            .from(projects)
            .where(eq(projects.id, result[0].insertId))
            .limit(1);

        res.status(201).send({ statusCode: 201, message: 'Project created successfully', data: project[0] });
    } catch (err) {
        console.error('Create project error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// GET /api/projects
// All roles — returns all projects under the user's company
router.get('/', checkToken, async (req, res) => {
    try {
        const { companyId } = req.user;

        const result = await db
            .select({
                id: projects.id,
                name: projects.name,
                description: projects.description,
                companyId: projects.companyId,
                createdBy: projects.createdBy,
                createdByName: users.firstName,
                createdAt: projects.createdAt,
            })
            .from(projects)
            .innerJoin(users, eq(projects.createdBy, users.id))
            .where(and(
                eq(projects.companyId, companyId),
                eq(projects.isDeleted, 0)
            ))
            .orderBy(projects.createdAt);

        res.status(200).send({ statusCode: 200, data: result });
    } catch (err) {
        console.error('Get projects error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// GET /api/projects/:id
// All roles — single project, must belong to user's company
router.get('/:id', checkToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const projectId = parseInt(req.params.id);

        const result = await db
            .select({
                id: projects.id,
                name: projects.name,
                description: projects.description,
                companyId: projects.companyId,
                createdBy: projects.createdBy,
                createdByName: users.firstName,
                createdAt: projects.createdAt,
            })
            .from(projects)
            .innerJoin(users, eq(projects.createdBy, users.id))
            .where(and(
                eq(projects.id, projectId),
                eq(projects.companyId, companyId),
                eq(projects.isDeleted, 0)
            ))
            .limit(1);

        if (!result.length) return res.status(404).send({ statusCode: 404, message: 'Project not found' });

        res.status(200).send({ statusCode: 200, data: result[0] });
    } catch (err) {
        console.error('Get project error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

export default router;