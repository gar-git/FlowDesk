import { useState, useEffect } from "react";
import { getRoleLabel, roleType, StatusCode } from "../../utils/constants";
import { updateUserHierarchy } from "../../api/users";

export default function OrgHierarchy({ roster, loading, onRefresh, showSnackbar }) {
  const [savingId, setSavingId] = useState(null);

  if (loading && !roster) {
    return (
      <div style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}>
        Loading organization…
      </div>
    );
  }

  if (!roster?.users?.length) {
    return (
      <div style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}>
        No people to show yet.
      </div>
    );
  }

  const { users, managerOptions = [], tlOptions = [] } = roster;

  const handleSave = async (u, draft) => {
    setSavingId(u.id);
    try {
      const res = await updateUserHierarchy(u.id, {
        managerId: draft.managerId,
        tlId: draft.tlId,
      });
      const body = res?.data ?? res;
      if (body?.statusCode === StatusCode.success) {
        showSnackbar?.("Hierarchy updated", "success");
        await onRefresh?.();
      } else {
        showSnackbar?.(body?.message || "Update failed", "error");
      }
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div
      className="table-responsive-shell"
      style={{
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--bg-card)",
        overflow: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <p style={{ padding: "16px 20px", margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
        Set which <strong>manager</strong> a tech lead reports to, and which <strong>tech lead</strong> a
        developer rolls up under. Managers and admins do not need a row edit here.
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14, minWidth: 640 }}>
        <thead>
          <tr
            style={{
              textAlign: "left",
              borderBottom: "1px solid var(--border)",
              color: "var(--text-muted)",
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            <th style={{ padding: "12px 16px" }}>Person</th>
            <th style={{ padding: "12px 16px" }}>Role</th>
            <th style={{ padding: "12px 16px", minWidth: 180 }}>Reports to (manager)</th>
            <th style={{ padding: "12px 16px", minWidth: 180 }}>Tech lead</th>
            <th style={{ padding: "12px 16px" }} />
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <HierarchyRow
              key={u.id}
              u={u}
              managerOptions={managerOptions}
              tlOptions={tlOptions}
              savingId={savingId}
              onSave={handleSave}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HierarchyRow({ u, managerOptions, tlOptions, savingId, onSave }) {
  const [draft, setDraft] = useState(() => ({
    managerId: u.managerId ?? "",
    tlId: u.tlId ?? "",
  }));

  useEffect(() => {
    setDraft({
      managerId: u.managerId ?? "",
      tlId: u.tlId ?? "",
    });
  }, [u.id, u.managerId, u.tlId]);

  const isAdmin = u.roleId === roleType.admin;
  const isManager = u.roleId === roleType.manager;
  const isTL = u.roleId === roleType.tl;
  const isDev = u.roleId === roleType.developer;

  const showManager = isTL || isDev;
  const showTl = isDev;

  if (isAdmin) {
    return (
      <tr style={{ borderBottom: "1px solid var(--border)" }}>
        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
          {u.firstName} {u.lastName}
        </td>
        <td style={{ padding: "12px 16px" }}>{getRoleLabel(u.roleId)}</td>
        <td colSpan={3} style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
          —
        </td>
      </tr>
    );
  }

  if (isManager) {
    return (
      <tr style={{ borderBottom: "1px solid var(--border)" }}>
        <td style={{ padding: "12px 16px", fontWeight: 600 }}>
          {u.firstName} {u.lastName}
        </td>
        <td style={{ padding: "12px 16px" }}>{getRoleLabel(u.roleId)}</td>
        <td colSpan={3} style={{ padding: "12px 16px", color: "var(--text-muted)" }}>
          —
        </td>
      </tr>
    );
  }

  const dirty =
    String(draft.managerId === "" ? "" : draft.managerId) !== String(u.managerId ?? "") ||
    String(draft.tlId === "" ? "" : draft.tlId) !== String(u.tlId ?? "");

  return (
    <tr style={{ borderBottom: "1px solid var(--border)", verticalAlign: "middle" }}>
      <td style={{ padding: "12px 16px", fontWeight: 600 }}>
        {u.firstName} {u.lastName}
        <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>{u.email}</div>
      </td>
      <td style={{ padding: "12px 16px" }}>{getRoleLabel(u.roleId)}</td>
      <td style={{ padding: "10px 16px" }}>
        {showManager ? (
          <select
            className="form-select dashboard-select"
            value={draft.managerId === "" || draft.managerId == null ? "" : String(draft.managerId)}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                managerId: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          >
            <option value="">— None —</option>
            {managerOptions.map((m) => (
              <option key={m.id} value={String(m.id)}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </td>
      <td style={{ padding: "10px 16px" }}>
        {showTl ? (
          <select
            className="form-select dashboard-select"
            value={draft.tlId === "" || draft.tlId == null ? "" : String(draft.tlId)}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                tlId: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          >
            <option value="">— None —</option>
            {tlOptions.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.firstName} {t.lastName}
              </option>
            ))}
          </select>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>—</span>
        )}
      </td>
      <td style={{ padding: "10px 16px" }}>
        <button
          type="button"
          disabled={!dirty || savingId === u.id}
          onClick={() =>
            onSave(u, {
              managerId: draft.managerId === "" ? null : draft.managerId,
              tlId: draft.tlId === "" ? null : draft.tlId,
            })
          }
          style={{
            padding: "6px 14px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: dirty ? "var(--badge-accent-bg)" : "transparent",
            color: dirty ? "var(--badge-accent-text)" : "var(--text-muted)",
            fontSize: 12,
            fontWeight: 600,
            cursor: dirty ? "pointer" : "not-allowed",
            fontFamily: "inherit",
          }}
        >
          {savingId === u.id ? "Saving…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
