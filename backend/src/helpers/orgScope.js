import { eq, and, inArray, isNull } from 'drizzle-orm';
import { users } from '../db/schema.js';
import { ROLES } from './constants.js';

/**
 * User ids a Manager may edit (hierarchy / project assignment): direct reports,
 * TLs under them, and developers under those TLs.
 */
export async function getManageableUserIds(db, managerUserId, companyId) {
    const direct = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.companyId, companyId),
                eq(users.managerId, managerUserId),
                eq(users.isDeleted, 0)
            )
        );

    const tls = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.companyId, companyId),
                eq(users.managerId, managerUserId),
                eq(users.roleId, ROLES.TL),
                eq(users.isDeleted, 0)
            )
        );

    const tlIds = tls.map((t) => t.id);
    const ids = new Set([...direct.map((d) => d.id), ...tlIds]);

    if (tlIds.length) {
        const underTl = await db
            .select({ id: users.id })
            .from(users)
            .where(
                and(
                    eq(users.companyId, companyId),
                    inArray(users.tlId, tlIds),
                    eq(users.isDeleted, 0)
                )
            );
        underTl.forEach((u) => ids.add(u.id));
    }

    return ids;
}

/**
 * Same as getManageableUserIds, plus TLs/Devs in the company who are not yet
 * assigned to another manager (manager_id IS NULL), so a manager can set
 * "reports to" and tech lead links from the Organization UI.
 */
export async function getHierarchyEditableUserIdsForManager(db, managerUserId, companyId) {
    const ids = await getManageableUserIds(db, managerUserId, companyId);

    const unassignedTls = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.companyId, companyId),
                eq(users.roleId, ROLES.TL),
                isNull(users.managerId),
                eq(users.isDeleted, 0)
            )
        );
    unassignedTls.forEach((r) => ids.add(r.id));

    const unassignedDevs = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.companyId, companyId),
                eq(users.roleId, ROLES.DEVELOPER),
                isNull(users.managerId),
                eq(users.isDeleted, 0)
            )
        );
    unassignedDevs.forEach((r) => ids.add(r.id));

    return ids;
}
