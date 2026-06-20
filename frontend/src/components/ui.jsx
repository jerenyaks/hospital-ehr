export function Card({ children, style }) {
  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow-sm)",
        padding: "var(--space-5)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

const VARIANT_STYLES = {
  primary: { background: "var(--color-primary)", color: "#fff", border: "none" },
  secondary: {
    background: "transparent",
    color: "var(--color-primary-dark)",
    border: "1px solid var(--color-primary)",
  },
  danger: { background: "var(--color-danger)", color: "#fff", border: "none" },
};

export function Button({ children, variant = "primary", style, ...props }) {
  return (
    <button
      {...props}
      style={{
        padding: "10px 18px",
        borderRadius: "var(--radius-sm)",
        fontSize: "14px",
        fontWeight: 600,
        cursor: props.disabled ? "not-allowed" : "pointer",
        opacity: props.disabled ? 0.6 : 1,
        transition: "opacity 0.15s ease",
        ...VARIANT_STYLES[variant],
        ...style,
      }}
    >
      {children}
    </button>
  );
}

export function Field({ label, children, required }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)" }}>
        {label}
        {required && <span style={{ color: "var(--color-danger)" }}> *</span>}
      </span>
      {children}
    </label>
  );
}

export const inputStyle = {
  padding: "9px 12px",
  borderRadius: "var(--radius-sm)",
  border: "1px solid var(--color-border)",
  fontSize: "14px",
  background: "var(--color-surface)",
  color: "var(--color-text)",
};

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        background: "var(--color-danger-light)",
        color: "var(--color-danger)",
        padding: "10px 14px",
        borderRadius: "var(--radius-sm)",
        fontSize: "13px",
        fontWeight: 500,
      }}
    >
      {message}
    </div>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div
      style={{
        background: "var(--color-success-light)",
        color: "var(--color-success)",
        padding: "10px 14px",
        borderRadius: "var(--radius-sm)",
        fontSize: "13px",
        fontWeight: 500,
      }}
    >
      {message}
    </div>
  );
}
