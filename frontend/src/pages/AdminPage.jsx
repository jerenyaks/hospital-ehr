import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { usersApi, billingApi, storeApi } from "../api/endpoints";

const BLANK_USER = { full_name: "", email: "", password: "", role: "receptionist" };

const ROLE_LABELS = {
  admin: "Administrator",
  doctor: "Doctor",
  nurse: "Nurse",
  receptionist: "Receptionist",
  pharmacist: "Pharmacist",
  lab_technician: "Lab Technician",
  store_keeper: "Store Keeper",
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
  const [reportPeriod, setReportPeriod] = useState("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [timeseries, setTimeseries] = useState([]);

  const [storeItems, setStoreItems] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeUpdateForms, setStoreUpdateForms] = useState({});

  const loadUsers = async () => {
    try { setUsers(await usersApi.list()); }
    catch { setError("Couldn't load staff list."); }
  };

  const getRangeForPeriod = (period) => {
    const today = new Date();
    const fmt = (d) => d.toISOString().slice(0, 10);
    const end = fmt(today);
    if (period === "today") return { start: end, end };
    if (period === "week") { const s = new Date(today); s.setDate(s.getDate() - 6); return { start: fmt(s), end }; }
    if (period === "month") { const s = new Date(today); s.setDate(s.getDate() - 29); return { start: fmt(s), end }; }
    if (period === "year") { const s = new Date(today); s.setDate(s.getDate() - 364); return { start: fmt(s), end }; }
    if (period === "custom") return { start: customStart, end: customEnd };
    return null;
  };

  const loadReports = async () => {
    setReportLoading(true);
    try {
      if (reportPeriod === "all") {
        setReportData(await billingApi.getReportsSummary());
      } else {
        const range = getRangeForPeriod(reportPeriod);
        if (range && range.start && range.end) {
          setReportData(await billingApi.getReportsRange(range.start, range.end));
        }
      }
      const days = reportPeriod === "year" ? 365 : reportPeriod === "month" ? 30 : reportPeriod === "week" ? 7 : 30;
      setTimeseries(await billingApi.getTimeseries(days));
    } catch { setError("Could not load reports."); }
    finally { setReportLoading(false); }
  };

  const loadStore = async () => {
    setStoreLoading(true);
    try { setStoreItems(await storeApi.getItems()); }
    catch { setError("Could not load store items."); }
    finally { setStoreLoading(false); }
  };

  useEffect(() => { const t = setTimeout(loadUsers, 0); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (pageMode === "reports") loadReports();
    if (pageMode === "store") loadStore();
  }, [pageMode, reportPeriod]);

  const storeUpdateField = (itemId, value) => setStoreUpdateForms(f => ({ ...f, [itemId]: value }));

  const handleStoreUpdate = async (item) => {
    const val = storeUpdateForms[item.id];
    if (val === undefined || val === "") return;
    setError(""); setSuccess("");
    try {
      await storeApi.updateItem(item.id, { quantity: Number(val) });
      setSuccess(`${item.name} stock updated.`);
      setStoreUpdateForms(f => { const n = { ...f }; delete n[item.id]; return n; });
      loadStore();
    } catch (err) { setError(err.response?.data?.detail || "Could not update item."); }
  };

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
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "var(--space-6)" }}>

        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
          <ModeBtn active={pageMode === "staff"} onClick={() => setPageMode("staff")}>Staff Administration</ModeBtn>
          <ModeBtn active={pageMode === "reports"} onClick={() => setPageMode("reports")}>Reports</ModeBtn>
          <ModeBtn active={pageMode === "store"} onClick={() => setPageMode("store")}>Store</ModeBtn>
        </div>

        {pageMode === "store" ? (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Store inventory (food & patient supplies)</h3>
            {storeLoading && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p>}
            {!storeLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto", gap: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                  <span>Item</span><span>Category</span><span>Amount</span><span>Unit</span><span>Price (KES)</span><span>Update</span>
                </div>
                {storeItems.map(i => (
                  <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto", gap: 8, padding: "10px 12px", fontSize: 13, alignItems: "center", borderRadius: "var(--radius-sm)", background: i.quantity <= i.reorder_level ? "var(--color-warning-light)" : "transparent" }}>
                    <span style={{ fontWeight: 500 }}>{i.name}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>{i.category || "—"}</span>
                    <span style={{ color: i.quantity <= i.reorder_level ? "var(--color-warning)" : "var(--color-text)" }}>{i.quantity}</span>
                    <span>{i.unit}</span>
                    <span>{i.unit_price.toFixed(2)}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input type="number" style={{ ...inputStyle, width: 70, padding: "6px 8px" }} placeholder="New qty" value={storeUpdateForms[i.id] ?? ""} onChange={e => storeUpdateField(i.id, e.target.value)} />
                      <Button onClick={() => handleStoreUpdate(i)} style={{ padding: "6px 10px", fontSize: 12 }}>Update</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : pageMode === "reports" ? (
          <Card>
            <h3 style={{ marginBottom: "var(--space-3)" }}>Hospital summary</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)", flexWrap: "wrap", alignItems: "center" }}>
              {["all", "today", "week", "month", "year", "custom"].map(p => (
                <button key={p} onClick={() => setReportPeriod(p)} style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", border: reportPeriod === p ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: reportPeriod === p ? "var(--color-primary-light)" : "var(--color-surface)", color: reportPeriod === p ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                  {p === "all" ? "All time" : p === "today" ? "Today" : p === "week" ? "This week" : p === "month" ? "This month" : p === "year" ? "This year" : "Custom"}
                </button>
              ))}
              {reportPeriod === "custom" && (
                <>
                  <input type="date" style={{ ...inputStyle, width: 140 }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>to</span>
                  <input type="date" style={{ ...inputStyle, width: 140 }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                  <Button onClick={loadReports} style={{ padding: "6px 12px", fontSize: 12 }}>Apply</Button>
                </>
              )}
            </div>
            {reportLoading && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p>}
            {!reportLoading && reportData && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--space-4)" }}>
                <ReportStat label="Total visits" value={reportData.total_visits} accent="var(--color-primary)" />
                <ReportStat label="Outpatient visits" value={reportData.outpatient_count} accent="var(--color-primary)" />
                <ReportStat label="Inpatient visits" value={reportData.inpatient_count} accent="var(--color-primary)" />
                <ReportStat label="Prescriptions issued" value={reportData.total_prescriptions} accent="var(--color-primary)" />
                <ReportStat label="Consultation revenue" value={`KES ${reportData.consultation_revenue}`} accent="#3b82f6" />
                <ReportStat label="Lab revenue" value={`KES ${reportData.lab_revenue}`} accent="#8b5cf6" />
                <ReportStat label="Pharmacy revenue" value={`KES ${reportData.pharmacy_revenue}`} accent="#06b6d4" />
                <ReportStat label="Total revenue" value={`KES ${reportData.total_revenue}`} accent="var(--color-success)" big />
                <ReportStat label="Paid" value={`KES ${reportData.paid_revenue}`} accent="var(--color-success)" />
                <ReportStat label="Unpaid" value={`KES ${reportData.unpaid_revenue}`} accent="var(--color-warning)" />
              </div>
            )}
            {reportData && (
              <div style={{ marginTop: "var(--space-5)" }}>
                <h4 style={{ marginBottom: "var(--space-3)" }}>Revenue breakdown</h4>
                <RevenueBreakdown
                  consultation={reportData.consultation_revenue}
                  lab={reportData.lab_revenue}
                  pharmacy={reportData.pharmacy_revenue}
                />
              </div>
            )}
            {timeseries.length > 0 && (
              <div style={{ marginTop: "var(--space-5)" }}>
                <h4 style={{ marginBottom: "var(--space-3)" }}>Revenue trend</h4>
                {timeseries.every(d => d.revenue === 0) ? (
                  <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No paid revenue in this period.</p>
                ) : (
                  <RevenueBarChart data={timeseries} />
                )}
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
                  <option value="store_keeper">Store Keeper</option>
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

function ReportStat({ label, value, accent = "var(--color-primary)", big = false }) {
  return (
    <div style={{ padding: "var(--space-4)", background: "var(--color-bg)", borderRadius: "var(--radius)", borderLeft: `3px solid ${accent}` }}>
      <div style={{ color: "var(--color-text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontWeight: 700, fontSize: big ? 26 : 20, marginTop: 4 }}>{value}</div>
    </div>
  );
}

function RevenueBreakdown({ consultation, lab, pharmacy }) {
  const total = consultation + lab + pharmacy || 1;
  const segments = [
    { label: "Consultation", value: consultation, color: "#3b82f6" },
    { label: "Lab", value: lab, color: "#8b5cf6" },
    { label: "Pharmacy", value: pharmacy, color: "#06b6d4" },
  ];
  return (
    <div>
      <div style={{ display: "flex", width: "100%", height: 28, borderRadius: 6, overflow: "hidden", marginBottom: "var(--space-3)" }}>
        {segments.map(s => (
          <div key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color, transition: "width 0.3s" }} title={`${s.label}: KES ${s.value}`} />
        ))}
      </div>
      <div style={{ display: "flex", gap: "var(--space-5)", flexWrap: "wrap" }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color, display: "inline-block" }} />
            <span style={{ color: "var(--color-text-muted)" }}>{s.label}</span>
            <span style={{ fontWeight: 600 }}>KES {s.value.toFixed(0)}</span>
            <span style={{ color: "var(--color-text-muted)", fontSize: 11 }}>({total > 0 ? Math.round((s.value / total) * 100) : 0}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RevenueBarChart({ data }) {
  const width = 800;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const barGap = 2;
  const barWidth = Math.max((chartW / data.length) - barGap, 1);
  const showEveryNth = Math.ceil(data.length / 10);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 500, height: "auto" }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={padding.left} x2={width - padding.right} y1={padding.top + chartH * (1 - f)} y2={padding.top + chartH * (1 - f)} stroke="var(--color-border)" strokeWidth="1" />
        ))}
        {[0, 0.5, 1].map(f => (
          <text key={f} x={padding.left - 8} y={padding.top + chartH * (1 - f) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">
            {Math.round(maxRevenue * f)}
          </text>
        ))}
        {data.map((d, i) => {
          const barH = (d.revenue / maxRevenue) * chartH;
          const x = padding.left + i * (chartW / data.length);
          const y = padding.top + chartH - barH;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barWidth} height={barH} fill="var(--color-primary)" rx="2">
                <title>{d.date}: KES {d.revenue}</title>
              </rect>
              {i % showEveryNth === 0 && (
                <text x={x + barWidth / 2} y={height - 8} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
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