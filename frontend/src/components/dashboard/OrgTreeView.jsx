import { useMemo, useState } from "react";
import { getRoleLabel, roleType } from "../../utils/constants";
import { buildOrgTreeNodes } from "../../utils/buildOrgTree";

function TreeNode({ node, depth }) {
  const [open, setOpen] = useState(true);
  const u = node.user;
  const hasKids = node.children?.length > 0;
  const label = `${u.firstName} ${u.lastName}`;
  const role = getRoleLabel(u.roleId);

  return (
    <div className="org-tree-node" style={{ marginLeft: depth === 0 ? 0 : 18 }}>
      <div
        className="org-tree-row"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 0",
          borderLeft: depth > 0 ? "2px solid rgba(108,99,255,0.35)" : "none",
          paddingLeft: depth > 0 ? 12 : 0,
          marginLeft: depth > 0 ? 6 : 0,
        }}
      >
        {hasKids ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            style={{
              width: 24,
              height: 24,
              flexShrink: 0,
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "rgba(255,255,255,0.06)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 12,
              lineHeight: 1,
              fontFamily: "inherit",
            }}
          >
            {open ? "−" : "+"}
          </button>
        ) : (
          <span style={{ width: 24, flexShrink: 0 }} aria-hidden />
        )}
        <div>
          <span style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>
            {label}
          </span>
          <span
            style={{
              marginLeft: 10,
              fontSize: 12,
              color: "var(--text-muted)",
            }}
          >
            {role}
          </span>
          {u.employeeCode && (
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                color: "var(--text-secondary)",
              }}
            >
              {u.employeeCode}
            </span>
          )}
        </div>
      </div>
      {hasKids && open && (
        <div className="org-tree-children">
          {node.children.map((ch) => (
            <TreeNode key={ch.user.id} node={ch} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Merge logged-in manager into user list when they are not in roster (manager API omits manager rows). */
function mergeManagerSelf(rosterUsers, currentUser) {
  const list = rosterUsers || [];
  if (!currentUser) return list;
  const rid = Number(currentUser.roleId);
  if (rid !== roleType.manager) return list;
  if (list.some((x) => x.id === currentUser.id)) return list;
  return [
    {
      id: currentUser.id,
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      email: currentUser.email,
      roleId: roleType.manager,
      managerId: null,
      tlId: null,
      employeeCode: currentUser.employeeCode || "",
    },
    ...list,
  ];
}

export default function OrgTreeView({ roster, currentUser, loading }) {
  const { roots, orphans } = useMemo(() => {
    const merged = mergeManagerSelf(roster?.users, currentUser);
    return buildOrgTreeNodes(merged);
  }, [roster, currentUser]);

  if (loading) {
    return (
      <p style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}>
        Loading organization…
      </p>
    );
  }

  return (
    <div
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        padding: "20px 22px 24px",
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          marginBottom: 18,
          lineHeight: 1.5,
        }}
      >
        Reporting lines follow <strong>manager → tech lead → developer</strong> when set.
        Expand rows to see who works under whom.
      </p>

      {roots.length === 0 && orphans.length === 0 ? (
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No people to show.</p>
      ) : (
        <>
          {roots.length > 0 && (
            <div className="org-tree-roots">
              {roots.map((node) => (
                <TreeNode key={node.user.id} node={node} depth={0} />
              ))}
            </div>
          )}

          {orphans.length > 0 && (
            <div style={{ marginTop: roots.length ? 28 : 0 }}>
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                Not in tree yet
              </h3>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 12,
                }}
              >
                Assign manager / tech lead in the Assignments tab so they appear above.
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {orphans.map((u) => (
                  <li
                    key={u.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "1px dashed var(--border)",
                      fontSize: 13,
                    }}
                  >
                    <strong style={{ color: "var(--text-primary)" }}>
                      {u.firstName} {u.lastName}
                    </strong>
                    <span style={{ marginLeft: 8, color: "var(--text-muted)" }}>
                      {getRoleLabel(u.roleId)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
