import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { usersApi } from "../api/endpoints";

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
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(BLANK_USER);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadUsers = async () => {
    try { setUsers(await usersApi.list()); }
    catch { setError("Couldn't load staff list."); }
  };

  useEffect(() => { const t = setTimeout(loadUsers, 0); return () => clearTimeout(t); }, []);

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
      </div>
    </div>
  );
}