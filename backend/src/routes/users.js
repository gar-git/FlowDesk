import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { eq, asc, and, ne } from 'drizzle-orm';
import { getManageableUserIds, getHierarchyEditableUserIdsForManager } from '../helpers/orgScope.js';
import { db } from '../db.js';
import { users, roleMaster, companies } from '../db/schema.js';
import dotenv from 'dotenv';
import { checkToken } from '../middlewares/checkToken.js';
import { blockToken } from '../helpers/tokenBlocklist.js';
import { ROLES } from '../helpers/constants.js';

dotenv.config();
const router = express.Router();


// POST /api/users/signup
// Requires companyCode to join a company
router.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password, roleId, employeeCode, managerId, tlId, companyCode: rawCode } = req.body;

        const companyCode = typeof rawCode === 'string' ? rawCode.trim().toUpperCase() : '';
        if (!companyCode) return res.status(400).send({ statusCode: 400, message: 'Company code is required' });

        // Resolve companyId from companyCode (stored uppercase, e.g. FLOW-X9K2)
        const companyResult = await db
            .select({ id: companies.id })
            .from(companies)
            .where(and(
                eq(companies.companyCode, companyCode),
                eq(companies.isDeleted, 0)
            ))
            .limit(1);

        if (!companyResult.length) return res.status(400).send({ statusCode: 400, message: 'Invalid company code' });

        const companyId = companyResult[0].id;
        const encrypted = await bcrypt.hash(password, 10);

        const result = await db
            .insert(users)
            .values({
                firstName,
                lastName,
                email,
                password: encrypted,
                roleId,
                companyId,
                employeeCode,
                managerId: managerId || null,
                tlId: tlId || null,
            });

        const newUser = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                roleId: users.roleId,
                companyId: users.companyId,
                employeeCode: users.employeeCode,
            })
            .from(users)
            .where(eq(users.id, result[0].insertId))
            .limit(1);

        res.status(201).send({ statusCode: 201, message: 'User created successfully.', data: newUser[0] });
    } catch (err) {
        console.error('Signup error:', err.message);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});


// POST /api/users/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await db
            .select()
            .from(users)
            .where(and(
                eq(users.email, email),
                eq(users.isDeleted, 0)
            ))
            .limit(1);

        if (!result.length) return res.status(400).send({ statusCode: 400, message: 'Invalid credentials' });

        const user = result[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(400).send({ statusCode: 400, message: 'Invalid credentials' });

        const token = jwt.sign(
            { id: user.id, firstName: user.firstName, roleId: user.roleId, companyId: user.companyId },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(200).send({
            statusCode: 200,
            message: 'Login successful.',
            data: {
                token,
                user: {
                    id: user.id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    roleId: user.roleId,
                    companyId: user.companyId,
                },
            },
        });
    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});


// GET /api/users/profile
router.get('/profile', checkToken, async (req, res) => {
    try {
        const result = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                roleId: users.roleId,
                roleName: roleMaster.roleName,
                companyId: users.companyId,
                employeeCode: users.employeeCode,
                managerId: users.managerId,
                tlId: users.tlId,
                emailTaskAssigned: users.emailTaskAssigned,
                emailTaskDueSoon: users.emailTaskDueSoon,
                emailTaskStatus: users.emailTaskStatus,
            })
            .from(users)
            .innerJoin(roleMaster, eq(users.roleId, roleMaster.id))
            .where(eq(users.id, req.user.id))
            .limit(1);

        if (!result.length) return res.status(404).send({ statusCode: 404, message: 'User not found' });

        res.status(200).send({ statusCode: 200, message: 'Profile retrieved successfully.', data: result[0] });
    } catch (err) {
        console.error('Profile error:', err);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});

// PATCH /api/users/me/password
router.patch('/me/password', checkToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (currentPassword == null || newPassword == null) {
            return res.status(400).send({
                statusCode: 400,
                message: 'currentPassword and newPassword are required',
            });
        }
        const np = String(newPassword);
        if (np.length < 8) {
            return res.status(400).send({
                statusCode: 400,
                message: 'New password must be at least 8 characters',
            });
        }
        const rows = await db
            .select({ password: users.password })
            .from(users)
            .where(eq(users.id, req.user.id))
            .limit(1);
        if (!rows.length) {
            return res.status(404).send({ statusCode: 404, message: 'User not found' });
        }
        const ok = await bcrypt.compare(String(currentPassword), rows[0].password);
        if (!ok) {
            return res.status(401).send({ statusCode: 401, message: 'Current password is incorrect' });
        }
        const encrypted = await bcrypt.hash(np, 10);
        await db.update(users).set({ password: encrypted }).where(eq(users.id, req.user.id));
        res.status(200).send({ statusCode: 200, message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});

// PATCH /api/users/me/notifications — email notification toggles
router.patch('/me/notifications', checkToken, async (req, res) => {
    try {
        const a = req.body;
        const toNum = (v) => (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0);

        const next = {};
        if (a.emailTaskAssigned !== undefined) {
            next.emailTaskAssigned = toNum(a.emailTaskAssigned);
        }
        if (a.emailTaskDueSoon !== undefined) {
            next.emailTaskDueSoon = toNum(a.emailTaskDueSoon);
        }
        if (a.emailTaskStatus !== undefined) {
            next.emailTaskStatus = toNum(a.emailTaskStatus);
        }

        if (Object.keys(next).length === 0) {
            return res.status(400).send({
                statusCode: 400,
                message: 'Provide at least one: emailTaskAssigned, emailTaskDueSoon, emailTaskStatus',
            });
        }

        await db.update(users).set(next).where(eq(users.id, req.user.id));
        res.status(200).send({ statusCode: 200, message: 'Notification preferences updated' });
    } catch (err) {
        console.error('Notification prefs error:', err);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});

// GET /api/users/team
router.get('/team', checkToken, async (req, res) => {
    try {
        const { roleId, id, companyId } = req.user;

        // Admin — everyone in the company
        if (roleId === ROLES.ADMIN) {
            const members = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    roleId: users.roleId,
                    employeeCode: users.employeeCode,
                })
                .from(users)
                .where(and(
                    eq(users.companyId, companyId),
                    eq(users.isDeleted, 0)
                ))
                .orderBy(asc(users.firstName));

            return res.status(200).send({ statusCode: 200, message: 'Team members retrieved successfully.', data: members });
        }

        // Manager
        if (roleId === 1) {
            const devs = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    roleId: users.roleId,
                    employeeCode: users.employeeCode,
                })
                .from(users)
                .where(and(
                    eq(users.managerId, id),
                    eq(users.isDeleted, 0)
                ));

            return res.status(200).send({ statusCode: 200, message: 'Team members retrieved successfully.', data: devs });
        }

        // Team Lead
        if (roleId === 2) {
            const members = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    roleId: users.roleId,
                    employeeCode: users.employeeCode,
                })
                .from(users)
                .where(and(
                    eq(users.tlId, id),
                    eq(users.isDeleted, 0)
                ));

            return res.status(200).send({ statusCode: 200, message: 'Team members retrieved successfully.', data: members });
        }

        // Developer — peers under the same tech lead (for transfer requests / forwards)
        if (roleId === ROLES.DEVELOPER) {
            const meRows = await db
                .select({ tlId: users.tlId })
                .from(users)
                .where(and(eq(users.id, id), eq(users.companyId, companyId)))
                .limit(1);

            const myTlId = meRows[0]?.tlId;
            if (myTlId == null) {
                return res.status(200).send({
                    statusCode: 200,
                    message: 'Team members retrieved successfully.',
                    data: [],
                });
            }

            const peers = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    roleId: users.roleId,
                    employeeCode: users.employeeCode,
                })
                .from(users)
                .where(and(
                    eq(users.companyId, companyId),
                    eq(users.isDeleted, 0),
                    eq(users.tlId, myTlId),
                    ne(users.id, id),
                    eq(users.roleId, ROLES.DEVELOPER)
                ))
                .orderBy(asc(users.firstName));

            return res.status(200).send({
                statusCode: 200,
                message: 'Team members retrieved successfully.',
                data: peers,
            });
        }

        return res.status(403).send({ statusCode: 403, message: 'Access denied' });
    } catch (err) {
        console.error('Team error:', err.message);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});


// POST /api/users/create — Admin only; creates a user in the same company (no company code)
router.post('/create', checkToken, async (req, res) => {
    try {
        if (req.user.roleId !== ROLES.ADMIN) {
            return res.status(403).send({ statusCode: 403, message: 'Only administrators can create users' });
        }

        const {
            firstName,
            lastName,
            email,
            password,
            roleId: bodyRoleId,
            employeeCode,
            managerId,
            tlId,
        } = req.body;

        const roleId = Number(bodyRoleId);
        if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !password || !employeeCode?.trim()) {
            return res.status(400).send({ statusCode: 400, message: 'All fields are required' });
        }
        if (![ROLES.MANAGER, ROLES.TL, ROLES.DEVELOPER].includes(roleId)) {
            return res.status(400).send({ statusCode: 400, message: 'Choose Manager, Tech Lead, or Developer' });
        }

        const emailNorm = email.trim();
        const existing = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, emailNorm))
            .limit(1);
        if (existing.length) {
            return res.status(400).send({ statusCode: 400, message: 'Email already registered' });
        }

        const encrypted = await bcrypt.hash(password, 10);
        const result = await db
            .insert(users)
            .values({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: emailNorm,
                password: encrypted,
                roleId,
                companyId: req.user.companyId,
                employeeCode: employeeCode.trim(),
                managerId: managerId || null,
                tlId: tlId || null,
            });

        const newUser = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                roleId: users.roleId,
                companyId: users.companyId,
                employeeCode: users.employeeCode,
            })
            .from(users)
            .where(eq(users.id, result[0].insertId))
            .limit(1);

        res.status(201).send({ statusCode: 201, message: 'User created successfully.', data: newUser[0] });
    } catch (err) {
        console.error('Create user error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message || 'Error occurred' });
    }
});


// GET /api/users/roster — hierarchy editor + project assignment lists (admin & manager)
router.get('/roster', checkToken, async (req, res) => {
    try {
        const { roleId, companyId, id: selfId } = req.user;

        if (roleId !== ROLES.ADMIN && roleId !== ROLES.MANAGER) {
            return res.status(403).send({ statusCode: 403, message: 'Access denied' });
        }

        const managerOptions = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
            })
            .from(users)
            .where(
                and(
                    eq(users.companyId, companyId),
                    eq(users.roleId, ROLES.MANAGER),
                    eq(users.isDeleted, 0)
                )
            )
            .orderBy(asc(users.firstName));

        const tlBase = and(
            eq(users.companyId, companyId),
            eq(users.roleId, ROLES.TL),
            eq(users.isDeleted, 0)
        );
        const tlOptions =
            roleId === ROLES.MANAGER
                ? await db
                      .select({
                          id: users.id,
                          firstName: users.firstName,
                          lastName: users.lastName,
                      })
                      .from(users)
                      .where(and(tlBase, eq(users.managerId, selfId)))
                      .orderBy(asc(users.firstName))
                : await db
                      .select({
                          id: users.id,
                          firstName: users.firstName,
                          lastName: users.lastName,
                      })
                      .from(users)
                      .where(tlBase)
                      .orderBy(asc(users.firstName));

        let userRows;
        if (roleId === ROLES.ADMIN) {
            userRows = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    roleId: users.roleId,
                    managerId: users.managerId,
                    tlId: users.tlId,
                    employeeCode: users.employeeCode,
                })
                .from(users)
                .where(and(eq(users.companyId, companyId), eq(users.isDeleted, 0)))
                .orderBy(asc(users.firstName));
        } else {
            const editable = await getHierarchyEditableUserIdsForManager(db, selfId, companyId);
            const all = await db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    email: users.email,
                    roleId: users.roleId,
                    managerId: users.managerId,
                    tlId: users.tlId,
                    employeeCode: users.employeeCode,
                })
                .from(users)
                .where(and(eq(users.companyId, companyId), eq(users.isDeleted, 0)));

            userRows = all.filter(
                (u) =>
                    editable.has(u.id) &&
                    u.roleId !== ROLES.ADMIN &&
                    u.roleId !== ROLES.MANAGER
            );
        }

        res.status(200).send({
            statusCode: 200,
            data: {
                users: userRows,
                managerOptions,
                tlOptions,
            },
        });
    } catch (err) {
        console.error('Roster error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// PATCH /api/users/:targetId/hierarchy — set managerId / tlId (admin & manager)
router.patch('/:targetId/hierarchy', checkToken, async (req, res) => {
    try {
        const { roleId, companyId, id: selfId } = req.user;
        if (roleId !== ROLES.ADMIN && roleId !== ROLES.MANAGER) {
            return res.status(403).send({ statusCode: 403, message: 'Access denied' });
        }

        const targetId = parseInt(req.params.targetId, 10);
        if (Number.isNaN(targetId)) {
            return res.status(400).send({ statusCode: 400, message: 'Invalid user id' });
        }

        const { managerId: midRaw, tlId: tlRaw } = req.body;
        const managerId =
            midRaw === undefined ? undefined : midRaw === null ? null : Number(midRaw);
        const tlId = tlRaw === undefined ? undefined : tlRaw === null ? null : Number(tlRaw);

        if (managerId !== undefined && managerId !== null && Number.isNaN(managerId)) {
            return res.status(400).send({ statusCode: 400, message: 'Invalid manager id' });
        }
        if (tlId !== undefined && tlId !== null && Number.isNaN(tlId)) {
            return res.status(400).send({ statusCode: 400, message: 'Invalid tech lead id' });
        }

        const targetRows = await db
            .select()
            .from(users)
            .where(
                and(
                    eq(users.id, targetId),
                    eq(users.companyId, companyId),
                    eq(users.isDeleted, 0)
                )
            )
            .limit(1);

        if (!targetRows.length) {
            return res.status(404).send({ statusCode: 404, message: 'User not found' });
        }

        const t = targetRows[0];

        if (t.roleId === ROLES.ADMIN) {
            return res.status(400).send({ statusCode: 400, message: 'Cannot change hierarchy for an administrator' });
        }

        if (roleId === ROLES.MANAGER) {
            if (t.roleId === ROLES.MANAGER) {
                return res.status(403).send({ statusCode: 403, message: 'Cannot edit another manager' });
            }
            const editable = await getHierarchyEditableUserIdsForManager(db, selfId, companyId);
            if (!editable.has(targetId)) {
                return res.status(403).send({ statusCode: 403, message: 'You can only edit people in your hierarchy' });
            }
        }

        if (managerId !== undefined && managerId !== null) {
            const mRows = await db
                .select()
                .from(users)
                .where(
                    and(
                        eq(users.id, managerId),
                        eq(users.companyId, companyId),
                        eq(users.isDeleted, 0)
                    )
                )
                .limit(1);
            if (!mRows.length || mRows[0].roleId !== ROLES.MANAGER) {
                return res.status(400).send({ statusCode: 400, message: 'Manager must be a user with Manager role' });
            }
        }

        if (tlId !== undefined && tlId !== null) {
            const tlRows = await db
                .select()
                .from(users)
                .where(
                    and(
                        eq(users.id, tlId),
                        eq(users.companyId, companyId),
                        eq(users.isDeleted, 0)
                    )
                )
                .limit(1);
            if (!tlRows.length || tlRows[0].roleId !== ROLES.TL) {
                return res.status(400).send({ statusCode: 400, message: 'Tech lead must be a user with Tech Lead role' });
            }
        }

        if (t.roleId === ROLES.TL) {
            if (tlId !== undefined && tlId !== null) {
                return res.status(400).send({ statusCode: 400, message: 'Tech leads do not report to another tech lead' });
            }
            if (managerId !== undefined && managerId !== null && roleId === ROLES.MANAGER && managerId !== selfId) {
                return res.status(400).send({ statusCode: 400, message: 'Tech leads on your team must report to you' });
            }
        }

        if (t.roleId === ROLES.MANAGER && managerId !== undefined && managerId !== null) {
            return res.status(400).send({ statusCode: 400, message: 'Managers do not take a manager parent here' });
        }

        if (t.roleId === ROLES.DEVELOPER && roleId === ROLES.MANAGER && tlId !== undefined && tlId !== null) {
            const tlRows = await db
                .select()
                .from(users)
                .where(and(eq(users.id, tlId), eq(users.companyId, companyId)))
                .limit(1);
            if (!tlRows.length || tlRows[0].roleId !== ROLES.TL) {
                return res.status(400).send({ statusCode: 400, message: 'Invalid tech lead' });
            }
            const tl = tlRows[0];
            if (tl.managerId != null && tl.managerId !== selfId) {
                return res.status(400).send({
                    statusCode: 400,
                    message:
                        'Developers must be assigned to a tech lead on your team (or an unassigned tech lead)',
                });
            }
        }

        const update = {};
        if (managerId !== undefined) update.managerId = managerId;
        if (tlId !== undefined) update.tlId = tlId;

        if (Object.keys(update).length === 0) {
            return res.status(400).send({ statusCode: 400, message: 'Nothing to update' });
        }

        await db.update(users).set(update).where(eq(users.id, targetId));

        const out = await db
            .select({
                id: users.id,
                firstName: users.firstName,
                lastName: users.lastName,
                email: users.email,
                roleId: users.roleId,
                managerId: users.managerId,
                tlId: users.tlId,
                employeeCode: users.employeeCode,
            })
            .from(users)
            .where(eq(users.id, targetId))
            .limit(1);

        res.status(200).send({ statusCode: 200, message: 'Hierarchy updated', data: out[0] });
    } catch (err) {
        console.error('Hierarchy patch error:', err.message);
        res.status(500).send({ statusCode: 500, message: err.message });
    }
});


// GET /api/users/roleDropdown
router.get('/roleDropdown', async (req, res) => {
    try {
        const result = await db
            .select({
                id: roleMaster.id,
                text: roleMaster.roleName,
            })
            .from(roleMaster)
            .orderBy(asc(roleMaster.id));

        if (!result.length) return res.status(404).send({ statusCode: 404, message: 'No roles found' });

        res.status(200).send({ statusCode: 200, message: 'Roles retrieved successfully.', data: result });
    } catch (err) {
        console.error('Role dropdown error:', err.message);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});


// POST /api/users/logout
router.post('/logout', checkToken, (req, res) => {
    try {
        const token = req.token;
        blockToken(token);
        res.status(200).send({ statusCode: 200, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err.message);
        res.status(500).send({ statusCode: 500, message: 'Error occurred' });
    }
});

export default router;