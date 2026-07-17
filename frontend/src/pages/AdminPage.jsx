import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { usersApi, billingApi } from "../api/endpoints";

const BLANK_USER = { full_name: "", email: "", password: "", role: "receptionist" };

const ROLE_LABELS = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  pharmacist: "Pharmacist",
  lab_technician: "Lab Technician",
};

export default function AdminPage() {
  const [pageMode, setPageMode] = useState("staff");
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(BLANK_USER);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  const loadUsers = async () => {
    try { setUsers(await usersApi.list()); }
    catch { setError("Couldn't load staff list."); }
  };

  const loadReports = async () => {
    setReportLoading(true);
    try { setReportData(await billingApi.getReportsSummary()); }
    catch { setError("Could not load reports."); }
    finally { setReportLoading(false); }
  };

  useEffect(() => { const t = setTimeout(loadUsers, 0); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (pageMode === "reports") loadReports();
  }, [pageMode]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await usersApi.create(form);
      setSuccess(`Created account for ${form.full_name}.`);
      setForm(BLANK_USER); loadUsers();
    } catch (err) { setError(err.response?.data?.detail || "Couldn't create this account."); }
    finally { setLoading(false); }
  };

  const handleDeactivate = async (userId) => {
    setError("");
    try { await usersApi.deactivate(userId); loadUsers(); }
    catch { setError("Couldn't deactivate this account."); }
  };

  return (
    <div>
      <TopBar title="Staff Administration" />
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "var(--space-6)" }}>

        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
          <ModeBtn active={pageMode === "staff"} onClick={() => setPageMode("staff")}>Staff Administration</ModeBtn>
          <ModeBtn active={pageMode === "reports"} onClick={() => setPageMode("reports")}>Reports</ModeBtn>
        </div>

        {pageMode === "reports" ? (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Hospital summary</h3>
            {reportLoading && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p>}
            {!reportLoading && reportData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
                <ReportStat label="Total visits" value={reportData.total_visits} />
                <ReportStat label="Outpatient visits" value={reportData.outpatient_count} />
                <ReportStat label="Inpatient visits" value={reportData.inpatient_count} />
                <ReportStat label="Prescriptions issued" value={reportData.total_prescriptions} />
                <ReportStat label="Consultation revenue" value={`KES ${reportData.consultation_revenue}`} />
                <ReportStat label="Lab revenue" value={`KES ${reportData.lab_revenue}`} />
                <ReportStat label="Pharmacy revenue" value={`KES ${reportData.pharmacy_revenue}`} />
                <ReportStat label="Total revenue" value={`KES ${reportData.total_revenue}`} />
                <ReportStat label="Paid" value={`KES ${reportData.paid_revenue}`} />
                <ReportStat label="Unpaid" value={`KES ${reportData.unpaid_revenue}`} />
              </div>
            )}
          </Card>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "var(--space-5)" }}>
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Add staff account</h3>
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              <Field label="Full name" required><input style={inputStyle} value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} required /></Field>
              <Field label="Email" required><input type="email" style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required /></Field>
              <Field label="Temporary password" required><input type="text" style={inputStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} /></Field>
              <Field label="Role" required>
                <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                  <option value="receptionist">Receptionist</option>
                  <option value="nurse">Nurse</option>
                  <option value="doctor">Doctor</option>
                  <option value="pharmacist">Pharmacist</option>
                  <option value="lab_technician">Lab Technician</option>
                  <option value="admin">Administrator</option>
                </select>
              </Field>
              <ErrorBanner message={error} />
              <SuccessBanner message={success} />
              <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
            </form>
          </Card>

          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Staff accounts</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 520, overflowY: "auto" }}>
              {users.map(u => (
                <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", opacity: u.is_active ? 1 : 0.5 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{u.full_name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{u.email} · {ROLE_LABELS[u.role] || u.role} {!u.is_active && "· Deactivated"}</div>
                  </div>
                  {u.is_active && <Button variant="danger" onClick={() => handleDeactivate(u.id)} style={{ padding: "6px 12px", fontSize: 12 }}>Deactivate</Button>}
                </div>
              ))}
            </div>
          </Card>
        </div>
        )}
      </div>
    </div>
  );
}

function ReportStat({ label, value }) {
  return (
    <div style={{ padding: "var(--space-3)", background: "var(--color-bg)", borderRadius: "var(--radius-sm)" }}>
      <div style={{ color: "var(--color-text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: 20, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function ModeBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: active ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: active ? "var(--color-primary-light)" : "var(--color-surface)", color: active ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
      {children}
    </button>
  );
}