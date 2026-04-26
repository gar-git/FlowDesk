import { useState } from "react";
import OrgHierarchy from "./OrgHierarchy";
import OrgTreeView from "./OrgTreeView";

export default function OrganizationPanel({
  roster,
  loading,
  onRefresh,
  showSnackbar,
  currentUser,
}) {
  const [mode, setMode] = useState("assignments");

  const tabBtn = (key, label) => (
    <button
      key={key}
      type="button"
      onClick={() => setMode(key)}
      style={{
        padding: "8px 16px",
        borderRadius: 20,
        fontSize: 13,
        cursor: "pointer",
        border:
          mode === key ? "1px solid var(--purple)" : "1px solid var(--border)",
        background:
          mode === key ? "var(--badge-accent-bg)" : "transparent",
        color: mode === key ? "var(--badge-accent-text)" : "var(--text-secondary)",
        transition: "var(--transition)",
        fontFamily: "inherit",
        fontWeight: 600,
      }}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 20,
          alignItems: "center",
        }}
      >
        {tabBtn("assignments", "Assignments")}
        {tabBtn("tree", "Tree view")}
      </div>

      {mode === "assignments" ? (
        <OrgHierarchy
          roster={roster}
          loading={loading}
          onRefresh={onRefresh}
          showSnackbar={showSnackbar}
        />
      ) : (
        <OrgTreeView
          roster={roster}
          currentUser={currentUser}
          loading={loading}
        />
      )}
    </div>
  );
}
