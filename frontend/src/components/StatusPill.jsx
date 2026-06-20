/**
 * StatusPill: the one visual thread that ties the whole app together.
 *
 * A patient's journey through the hospital is the entire substance of
 * this system -- waiting, with the nurse, with the doctor, done. Every
 * screen that lists a visit shows this same pill so staff can scan a
 * queue at a glance and immediately know who's where, without reading
 * any text.
 */

const STATUS_CONFIG = {
  waiting: { label: "Waiting", bg: "var(--color-waiting-light)", fg: "var(--color-waiting)" },
  with_nurse: { label: "With nurse", bg: "var(--color-warning-light)", fg: "var(--color-warning)" },
  with_doctor: { label: "With doctor", bg: "var(--color-primary-light)", fg: "var(--color-primary-dark)" },
  completed: { label: "Completed", bg: "var(--color-success-light)", fg: "var(--color-success)" },
  cancelled: { label: "Cancelled", bg: "var(--color-danger-light)", fg: "var(--color-danger)" },
};

export default function StatusPill({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.waiting;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 11px",
        borderRadius: "999px",
        fontSize: "13px",
        fontWeight: 600,
        background: config.bg,
        color: config.fg,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          background: config.fg,
          display: "inline-block",
        }}
      />
      {config.label}
    </span>
  );
}
