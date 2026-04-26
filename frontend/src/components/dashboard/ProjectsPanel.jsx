import { useMemo, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { StatusCode, getRoleLabel } from "../../utils/constants";
import {
  listProjects,
  createProject,
  getProjectMembers,
  addProjectMember,
  removeProjectMember,
} from "../../api/projects";

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--input-surface)",
  color: "var(--text-primary)",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  marginTop: 6,
};

export default function ProjectsPanel({ roster, showSnackbar }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [addUserId, setAddUserId] = useState("");

  const loadProjects = async () => {
    const res = await listProjects();
    const body = res?.data ?? res;
    if (body?.statusCode === StatusCode.success) {
      setProjects(body.data || []);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await loadProjects();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setModalOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

  useEffect(() => {
    if (modalOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [modalOpen]);

  const openCreateModal = () => {
    setName("");
    setDescription("");
    setModalOpen(true);
  };

  const loadMembers = async (projectId) => {
    if (!projectId) {
      setMembers([]);
      return;
    }
    setMembersLoading(true);
    try {
      const res = await getProjectMembers(projectId);
      const body = res?.data ?? res;
      if (body?.statusCode === StatusCode.success) {
        setMembers(body.data || []);
      }
    } finally {
      setMembersLoading(false);
    }
  };

  /** Click same project again to collapse; another project to switch */
  const toggleProject = (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      setMembers([]);
      setAddUserId("");
    } else {
      setSelectedId(id);
      loadMembers(id);
      setAddUserId("");
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      const body = res?.data ?? res;
      if (body?.statusCode === StatusCode.created) {
        showSnackbar?.("Project created", "success");
        setModalOpen(false);
        setName("");
        setDescription("");
        await loadProjects();
      } else {
        showSnackbar?.(body?.message || "Could not create project", "error");
      }
    } finally {
      setCreating(false);
    }
  };

  const assignable = useMemo(() => {
    const list = roster?.users || [];
    const memberIds = new Set((members || []).map((m) => m.userId));
    return list.filter((u) => !memberIds.has(u.id));
  }, [roster, members]);

  const handleAddMember = async () => {
    if (!selectedId || !addUserId) return;
    const res = await addProjectMember(selectedId, Number(addUserId));
    const body = res?.data ?? res;
    if (body?.statusCode === StatusCode.created) {
      showSnackbar?.("Person added to project", "success");
      setAddUserId("");
      await loadMembers(selectedId);
    } else {
      showSnackbar?.(body?.message || "Could not add", "error");
    }
  };

  const handleRemove = async (userId) => {
    if (!selectedId) return;
    const res = await removeProjectMember(selectedId, userId);
    const body = res?.data ?? res;
    if (body?.statusCode === StatusCode.success) {
      showSnackbar?.("Removed from project", "success");
      await loadMembers(selectedId);
    } else {
      showSnackbar?.(body?.message || "Could not remove", "error");
    }
  };

  const modal =
    modalOpen &&
    createPortal(
      <div className="modal-backdrop" aria-hidden="true">
        <div
          className="modal-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-project-modal-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-panel-header">
            <h2 id="new-project-modal-title" className="modal-panel-title">
              New project
            </h2>
            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={() => setModalOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="modal-panel-body">
            <form onSubmit={handleCreate}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                }}
              >
                Name
                <input
                  required
                  autoFocus
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mobile app rewrite"
                />
              </label>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginTop: 12,
                }}
              >
                Description (optional)
                <textarea
                  style={{ ...inputStyle, minHeight: 88, resize: "vertical" }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short summary for your team"
                />
              </label>
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-submit"
                  style={{ marginBottom: 0, width: "auto", minWidth: 140 }}
                >
                  {creating ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>,
      document.body
    );

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {modal}

      <div>
        <div className="projects-section-header">
          <h2 className="projects-section-title">Your projects</h2>
          <button
            type="button"
            className="projects-add-btn"
            onClick={openCreateModal}
            aria-label="Add new project"
            title="Add new project"
          >
            +
          </button>
        </div>

        {loading ? (
          <p style={{ color: "var(--text-muted)" }}>Loading…</p>
        ) : projects.length === 0 ? (
          <p style={{ color: "var(--text-muted)" }}>
            No projects yet. Use the + button to create one.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {projects.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleProject(p.id)}
                className={`project-card${selectedId === p.id ? " selected" : ""}`}
              >
                <div className="project-card-title">{p.name}</div>
                {p.description && (
                  <div className="project-card-desc">{p.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <div
          style={{
            padding: 24,
            borderRadius: 14,
            border: "1px solid var(--border)",
            background: "var(--bg-card)",
          }}
        >
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
            People on this project
          </h3>
          {membersLoading ? (
            <p style={{ color: "var(--text-muted)" }}>Loading members…</p>
          ) : members.length === 0 ? (
            <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
              No one assigned yet.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 16px" }}>
              {members.map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <span>
                    <strong>
                      {m.firstName} {m.lastName}
                    </strong>{" "}
                    <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                      ({getRoleLabel(m.roleId)})
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemove(m.userId)}
                    style={{
                      fontSize: 12,
                      color: "var(--pink)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label style={{ flex: 1, minWidth: 200, fontSize: 12, fontWeight: 600 }}>
              Add teammate
              <select
                className="form-select dashboard-select"
                style={{ marginTop: 6 }}
                value={addUserId}
                onChange={(e) => setAddUserId(e.target.value)}
              >
                <option value="">Choose someone…</option>
                {assignable.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.firstName} {u.lastName} · {getRoleLabel(u.roleId)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={!addUserId}
              onClick={handleAddMember}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: addUserId ? "var(--badge-accent-bg)" : "transparent",
                color: addUserId ? "var(--badge-accent-text)" : "var(--text-muted)",
                fontWeight: 600,
                cursor: addUserId ? "pointer" : "not-allowed",
                fontFamily: "inherit",
              }}
            >
              Add to project
            </button>
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 14 }}>
            Only people in your hierarchy (for managers) or your whole company (for admins)
            can be added.
          </p>
        </div>
      )}
    </div>
  );
}
