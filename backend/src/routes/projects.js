import express from 'express';
import { eq, and, asc } from 'drizzle-orm';
import { db } from '../db.js';
import { projects, users, projectMembers } from '../db/schema.js';
import { ROLES } from '../helpers/constants.js';
import { getManageableUserIds } from '../helpers/orgScope.js';
import { checkToken } from '../middlewares/checkToken.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

async function getProjectInCompany(projectId, companyId) {
    const result = await db
        .select()
        .from(projects)
        .where(
            and(
                eq(projects.id, projectId),
                eq(projects.companyId, companyId),
                eq(projects.isDeleted, 0)
            )
        )
        .limit(1);
    return result[0] || null;
}

async function canAssignUser(req, assigneeUserId) {
    if (req.user.roleId === ROLES.ADMIN) return true;
    if (req.user.roleId === ROLES.MANAGER) {
        const manageable = await getManageableUserIds(db, req.user.id, req.user.companyId);
        manageable.add(req.user.id);
        return manageable.has(assigneeUserId);
    }
    return false;
}

// POST /api/projects
router.post('/', checkToken, async (req, res) => {
    try {
        const { roleId, companyId, id } = req.user;

        if (roleId !== ROLES.MANAGER && roleId !== ROLES.ADMIN) {
            return res.status(403).send({ statusCode: 403, message: 'Only managers and administrators can create projects' });
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
            .where(
                and(eq(projects.companyId, companyId), eq(projects.isDeleted, 0))
            )
            .orderBy(asc(projects.createdAt));

        res.status(200).send({ statusCode: 200, data: result });
    } catch (err) {
        console.error('Get projects error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

// GET /api/projects/:id/members — must be before GET /:id
router.get('/:id/members', checkToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const projectId = parseInt(req.params.id, 10);
        if (Number.isNaN(projectId)) {
            return res.status(400).send({ statusCode: 400, message: 'Invalid project id' });
        }

        const project = await getProjectInCompany(projectId, companyId);
        if (!project) return res.status(404).send({ statusCode: 404, message: 'Project not found' });

        const rows = await db
            .select({
                id: projectMembers.id,
                userId: projectMembers.userId,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                roleId: users.roleId,
                employeeCode: users.employeeCode,
            })
            .from(projectMembers)
            .innerJoin(users, eq(projectMembers.userId, users.id))
            .where(eq(projectMembers.projectId, projectId))
            .orderBy(asc(users.firstName));

        res.status(200).send({ statusCode: 200, data: rows });
    } catch (err) {
        console.error('Get project members error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

// POST /api/projects/:id/members — admin & manager only
router.post('/:id/members', checkToken, async (req, res) => {
    try {
        const { roleId, companyId, id: selfId } = req.user;
        if (roleId !== ROLES.ADMIN && roleId !== ROLES.MANAGER) {
            return res.status(403).send({ statusCode: 403, message: 'Only managers and administrators can assign people' });
        }

        const projectId = parseInt(req.params.id, 10);
        const { userId: assignUserId } = req.body;
        const userId = Number(assignUserId);
        if (Number.isNaN(projectId) || !userId) {
            return res.status(400).send({ statusCode: 400, message: 'Valid project and userId are required' });
        }

        const project = await getProjectInCompany(projectId, companyId);
        if (!project) return res.status(404).send({ statusCode: 404, message: 'Project not found' });

        const target = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.id, userId),
                    eq(users.companyId, companyId),
                    eq(users.isDeleted, 0)
                )
            )
            .limit(1);
        if (!target.length) return res.status(400).send({ statusCode: 400, message: 'User not found in company' });

        if (!(await canAssignUser(req, userId))) {
            return res.status(403).send({ statusCode: 403, message: 'You cannot assign this user (outside your hierarchy)' });
        }

        try {
            await db.insert(projectMembers).values({
                projectId,
                userId,
                addedBy: selfId,
            });
        } catch (e) {
            if (e.code === 'ER_DUP_ENTRY' || e.errno === 1062) {
                return res.status(400).send({ statusCode: 400, message: 'User is already on this project' });
            }
            throw e;
        }

        res.status(201).send({ statusCode: 201, message: 'Member added' });
    } catch (err) {
        console.error('Add project member error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', checkToken, async (req, res) => {
    try {
        const { roleId, companyId, id: selfId } = req.user;
        if (roleId !== ROLES.ADMIN && roleId !== ROLES.MANAGER) {
            return res.status(403).send({ statusCode: 403, message: 'Only managers and administrators can remove people' });
        }

        const projectId = parseInt(req.params.id, 10);
        const memberUserId = parseInt(req.params.userId, 10);
        if (Number.isNaN(projectId) || Number.isNaN(memberUserId)) {
            return res.status(400).send({ statusCode: 400, message: 'Invalid ids' });
        }

        const project = await getProjectInCompany(projectId, companyId);
        if (!project) return res.status(404).send({ statusCode: 404, message: 'Project not found' });

        if (!(await canAssignUser(req, memberUserId))) {
            return res.status(403).send({ statusCode: 403, message: 'You cannot modify this assignment' });
        }

        await db
            .delete(projectMembers)
            .where(
                and(
                    eq(projectMembers.projectId, projectId),
                    eq(projectMembers.userId, memberUserId)
                )
            );

        res.status(200).send({ statusCode: 200, message: 'Member removed' });
    } catch (err) {
        console.error('Remove project member error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

// GET /api/projects/:id
router.get('/:id', checkToken, async (req, res) => {
    try {
        const { companyId } = req.user;
        const projectId = parseInt(req.params.id, 10);

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
            .where(
                and(
                    eq(projects.id, projectId),
                    eq(projects.companyId, companyId),
                    eq(projects.isDeleted, 0)
                )
            )
            .limit(1);

        if (!result.length) return res.status(404).send({ statusCode: 404, message: 'Project not found' });

        res.status(200).send({ statusCode: 200, data: result[0] });
    } catch (err) {
        console.error('Get project error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});

export default router;
