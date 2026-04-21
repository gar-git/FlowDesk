import { roleType } from "./constants";

/**
 * Build a reporting tree from flat users (manager → TL → developer).
 * Returns root nodes (managers + admins) and people not linked into the tree.
 */
export function buildOrgTreeNodes(users) {
  if (!users?.length) return { roots: [], orphans: [] };

  const byId = new Map(
    users.map((u) => [u.id, { user: u, children: [] }])
  );
  const childIds = new Set();

  const sortNodes = (nodes) =>
    [...nodes].sort((a, b) => {
      const na = `${a.user.firstName} ${a.user.lastName}`;
      const nb = `${b.user.firstName} ${b.user.lastName}`;
      return na.localeCompare(nb);
    });

  // Tech leads under a manager
  for (const u of users) {
    if (
      u.roleId === roleType.tl &&
      u.managerId != null &&
      byId.has(u.managerId)
    ) {
      byId.get(u.managerId).children.push(byId.get(u.id));
      childIds.add(u.id);
    }
  }

  // Developers under a tech lead
  for (const u of users) {
    if (
      u.roleId === roleType.developer &&
      u.tlId != null &&
      byId.has(u.tlId)
    ) {
      byId.get(u.tlId).children.push(byId.get(u.id));
      childIds.add(u.id);
    }
  }

  // Developers reporting only to a manager (no TL)
  for (const u of users) {
    if (
      u.roleId === roleType.developer &&
      u.tlId == null &&
      u.managerId != null &&
      byId.has(u.managerId) &&
      !childIds.has(u.id)
    ) {
      byId.get(u.managerId).children.push(byId.get(u.id));
      childIds.add(u.id);
    }
  }

  for (const n of byId.values()) {
    n.children = sortNodes(n.children);
  }

  const roots = [];
  for (const u of users) {
    if (u.roleId === roleType.manager || u.roleId === roleType.admin) {
      roots.push(byId.get(u.id));
    }
  }

  sortNodes(roots);

  const orphans = users.filter(
    (u) =>
      !childIds.has(u.id) &&
      u.roleId !== roleType.manager &&
      u.roleId !== roleType.admin
  );
  orphans.sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(
      `${b.firstName} ${b.lastName}`
    )
  );

  return { roots, orphans };
}
