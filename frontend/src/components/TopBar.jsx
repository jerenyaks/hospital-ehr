import { useAuth } from "../context/AuthContext";

const ROLE_LABELS = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
};

export default function TopBar({ title }) {
  const { user, logout } = useAuth();

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-4) var(--space-6)",
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-3)" }}>
        <h1 style={{ fontSize: "19px", color: "var(--color-primary-dark)" }}>
          Kitengela District Hospital
        </h1>
        <span style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
          {title}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>{user?.full_name}</div>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            {ROLE_LABELS[user?.role] || user?.role}
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            padding: "8px 14px",
            background: "transparent",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "13px",
          }}
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
