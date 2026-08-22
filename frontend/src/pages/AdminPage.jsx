import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { usersApi, billingApi, storeApi, wardsApi } from "../api/endpoints";

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

const PERIODS = [
  { key: "today", label: "Today", icon: "📅" },
  { key: "week", label: "This Week", icon: "🗓️" },
  { key: "month", label: "This Month", icon: "📆" },
  { key: "year", label: "This Year", icon: "🌍" },
  { key: "all", label: "All Time", icon: "♾️" },
  { key: "custom", label: "Custom", icon: "🔧" },
];

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
  const [chartType, setChartType] = useState("bar");

  const [storeItems, setStoreItems] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeUpdateForms, setStoreUpdateForms] = useState({});

  const [wards, setWards] = useState([]);
  const [occupancy, setOccupancy] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [newWard, setNewWard] = useState({ name: "", capacity: 10 });

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

  const loadWards = async () => {
    setWardsLoading(true);
    try {
      const [w, occ] = await Promise.all([wardsApi.list(), wardsApi.getOccupancy()]);
      setWards(w); setOccupancy(occ);
    } catch { setError("Could not load wards."); }
    finally { setWardsLoading(false); }
  };

  useEffect(() => { const t = setTimeout(loadUsers, 0); return () => clearTimeout(t); }, []);

  useEffect(() => {
    if (pageMode === "reports") loadReports();
    if (pageMode === "store") loadStore();
    if (pageMode === "wards") loadWards();
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

  const handleAddWard = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await wardsApi.add({ name: newWard.name, capacity: Number(newWard.capacity) });
      setSuccess(`${newWard.name} added with ${newWard.capacity} beds.`);
      setNewWard({ name: "", capacity: 10 });
      loadWards();
    } catch (err) { setError(err.response?.data?.detail || "Could not add ward."); }
    finally { setLoading(false); }
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
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "var(--space-6)" }}>

        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)", flexWrap: "wrap" }}>
          <ModeBtn active={pageMode === "staff"} onClick={() => setPageMode("staff")}>Staff Administration</ModeBtn>
          <ModeBtn active={pageMode === "reports"} onClick={() => setPageMode("reports")}>Reports</ModeBtn>
          <ModeBtn active={pageMode === "store"} onClick={() => setPageMode("store")}>Store</ModeBtn>
          <ModeBtn active={pageMode === "wards"} onClick={() => setPageMode("wards")}>Wards & Beds</ModeBtn>
        </div>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><ErrorBanner message={error} /></div>}
        {success && <div style={{ marginBottom: "var(--space-4)" }}><SuccessBanner message={success} /></div>}

        {pageMode === "wards" ? (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--space-5)" }}>
            <Card>
              <h3 style={{ marginBottom: "var(--space-4)" }}>Ward capacity &amp; occupancy</h3>
              {wardsLoading && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p>}
              {!wardsLoading && occupancy.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No wards yet — add one to the right.</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {occupancy.map(w => (
                  <div key={w.id} style={{ padding: "12px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{w.name}</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{w.occupied}/{w.capacity} occupied</span>
                    </div>
                    <div style={{ height: 8, borderRadius: 4, background: "var(--color-bg)", overflow: "hidden" }}>
                      <div style={{ width: `${w.capacity > 0 ? (w.occupied / w.capacity) * 100 : 0}%`, height: "100%", background: w.free === 0 ? "var(--color-danger)" : w.free <= 2 ? "var(--color-warning)" : "var(--color-success)" }} />
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>{w.free} bed{w.free !== 1 ? "s" : ""} free</div>
                  </div>
                ))}
              </div>
            </Card>
            <Card>
              <h3 style={{ marginBottom: "var(--space-4)" }}>Add a ward</h3>
              <form onSubmit={handleAddWard} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <Field label="Ward name" required><input style={inputStyle} value={newWard.name} onChange={e => setNewWard(w => ({ ...w, name: e.target.value }))} placeholder="e.g. Medical Ward C" required /></Field>
                <Field label="Total bed capacity" required><input style={inputStyle} type="number" min="1" value={newWard.capacity} onChange={e => setNewWard(w => ({ ...w, capacity: e.target.value }))} required /></Field>
                <Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add ward"}</Button>
              </form>
            </Card>
          </div>
        ) : pageMode === "store" ? (
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
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>

            <Card>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 22 }}>Hospital Dashboard</h2>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--color-text-muted)" }}>Revenue, visits, and activity at a glance</p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {PERIODS.map(p => (
                    <button key={p.key} onClick={() => setReportPeriod(p.key)} style={{
                      padding: "8px 14px", borderRadius: 999, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12,
                      background: reportPeriod === p.key ? "linear-gradient(135deg, #6366f1, #8b5cf6)" : "var(--color-bg)",
                      color: reportPeriod === p.key ? "#fff" : "var(--color-text-muted)",
                      boxShadow: reportPeriod === p.key ? "0 2px 8px rgba(99,102,241,0.35)" : "none",
                    }}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {reportPeriod === "custom" && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: "var(--space-3)" }}>
                  <input type="date" style={{ ...inputStyle, width: 150 }} value={customStart} onChange={e => setCustomStart(e.target.value)} />
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>to</span>
                  <input type="date" style={{ ...inputStyle, width: 150 }} value={customEnd} onChange={e => setCustomEnd(e.target.value)} />
                  <Button onClick={loadReports} style={{ padding: "8px 16px", fontSize: 12 }}>Apply</Button>
                </div>
              )}
            </Card>

            {reportLoading && <Card><p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p></Card>}

            {!reportLoading && reportData && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                  <FlashyStat icon="💰" label="Total Revenue" value={`KES ${Number(reportData.total_revenue).toLocaleString()}`} from="#22c55e" to="#16a34a" />
                  <FlashyStat icon="✅" label="Paid" value={`KES ${Number(reportData.paid_revenue).toLocaleString()}`} from="#3b82f6" to="#2563eb" />
                  <FlashyStat icon="⏳" label="Unpaid" value={`KES ${Number(reportData.unpaid_revenue).toLocaleString()}`} from="#f97316" to="#ea580c" />
                  <FlashyStat icon="🏥" label="Total Visits" value={reportData.total_visits} from="#8b5cf6" to="#7c3aed" />
                  <FlashyStat icon="🚶" label="Outpatients" value={reportData.outpatient_count} from="#06b6d4" to="#0891b2" />
                  <FlashyStat icon="🛏️" label="Inpatients" value={reportData.inpatient_count} from="#ec4899" to="#db2777" />
                  <FlashyStat icon="💊" label="Prescriptions" value={reportData.total_prescriptions} from="#eab308" to="#ca8a04" />
                  {reportData.total_store_items !== undefined && (
                    <FlashyStat icon="📦" label="Store Items" value={reportData.total_store_items} from="#14b8a6" to="#0d9488" />
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <Card>
                    <h4 style={{ marginBottom: "var(--space-3)" }}>Revenue Breakdown</h4>
                    <DonutChart
                      segments={[
                        { label: "Consultation", value: reportData.consultation_revenue, color: "#3b82f6" },
                        { label: "Lab", value: reportData.lab_revenue, color: "#8b5cf6" },
                        { label: "Pharmacy", value: reportData.pharmacy_revenue, color: "#06b6d4" },
                      ]}
                    />
                  </Card>
                  <Card>
                    <h4 style={{ marginBottom: "var(--space-3)" }}>Visit Types</h4>
                    <DonutChart
                      segments={[
                        { label: "Outpatient", value: reportData.outpatient_count, color: "#06b6d4" },
                        { label: "Inpatient", value: reportData.inpatient_count, color: "#ec4899" },
                      ]}
                    />
                  </Card>
                </div>

                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--space-3)" }}>
                    <h4 style={{ margin: 0 }}>Revenue Trend</h4>
                    <div style={{ display: "flex", gap: 4 }}>
                      {["bar", "line"].map(t => (
                        <button key={t} onClick={() => setChartType(t)} style={{ padding: "6px 12px", borderRadius: "var(--radius-sm)", border: chartType === t ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: chartType === t ? "var(--color-primary-light)" : "var(--color-surface)", color: chartType === t ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 11, cursor: "pointer", textTransform: "capitalize" }}>
                          {t === "bar" ? "📊 Bar" : "📈 Line"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {timeseries.length === 0 || timeseries.every(d => d.revenue === 0) ? (
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No paid revenue in this period.</p>
                  ) : chartType === "bar" ? (
                    <RevenueBarChart data={timeseries} />
                  ) : (
                    <RevenueLineChart data={timeseries} />
                  )}
                </Card>
              </>
            )}
          </div>
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

function FlashyStat({ icon, label, value, from, to }) {
  return (
    <div style={{
      padding: "var(--space-4)", borderRadius: "var(--radius)", color: "#fff",
      background: `linear-gradient(135deg, ${from}, ${to})`,
      boxShadow: `0 4px 14px ${from}55`,
    }}>
      <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.9 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: 22, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const size = 180;
  const radius = 70;
  const stroke = 26;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = segments.map(seg => {
    const fraction = seg.value / total;
    const dash = fraction * circumference;
    const arc = { ...seg, dash, offset, fraction };
    offset += dash;
    return arc;
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-5)", flexWrap: "wrap" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        {arcs.map(a => (
          <circle
            key={a.label}
            cx={cx} cy={cy} r={radius} fill="none"
            stroke={a.color} strokeWidth={stroke}
            strokeDasharray={`${a.dash} ${circumference - a.dash}`}
            strokeDashoffset={-a.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap={arcs.length > 1 ? "butt" : "round"}
          >
            <title>{a.label}: {a.value} ({Math.round(a.fraction * 100)}%)</title>
          </circle>
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="700" fill="var(--color-text)">
          {total.toLocaleString()}
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
          total
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {segments.map(s => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
            <span style={{ width: 12, height: 12, borderRadius: 4, background: s.color, display: "inline-block" }} />
            <span style={{ color: "var(--color-text-muted)" }}>{s.label}</span>
            <span style={{ fontWeight: 700 }}>{s.value.toLocaleString()}</span>
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
  const padding = { top: 10, right: 10, bottom: 30, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const barGap = 2;
  const barWidth = Math.max((chartW / data.length) - barGap, 1);
  const showEveryNth = Math.max(Math.ceil(data.length / 10), 1);

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 500, height: "auto" }}>
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={padding.left} x2={width - padding.right} y1={padding.top + chartH * (1 - f)} y2={padding.top + chartH * (1 - f)} stroke="var(--color-border)" strokeWidth="1" />
        ))}
        {[0, 0.5, 1].map(f => (
          <text key={f} x={padding.left - 8} y={padding.top + chartH * (1 - f) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">
            {Math.round(maxRevenue * f).toLocaleString()}
          </text>
        ))}
        {data.map((d, i) => {
          const barH = (d.revenue / maxRevenue) * chartH;
          const x = padding.left + i * (chartW / data.length);
          const y = padding.top + chartH - barH;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barWidth} height={barH} fill="url(#barGrad)" rx="2">
                <title>{d.date}: KES {d.revenue.toLocaleString()}</title>
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

function RevenueLineChart({ data }) {
  const width = 800;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 30, left: 55 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 1);
  const showEveryNth = Math.max(Math.ceil(data.length / 10), 1);

  const points = data.map((d, i) => {
    const x = padding.left + (i / Math.max(data.length - 1, 1)) * chartW;
    const y = padding.top + chartH - (d.revenue / maxRevenue) * chartH;
    return { x, y, d };
  });
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 500, height: "auto" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={padding.left} x2={width - padding.right} y1={padding.top + chartH * (1 - f)} y2={padding.top + chartH * (1 - f)} stroke="var(--color-border)" strokeWidth="1" />
        ))}
        {[0, 0.5, 1].map(f => (
          <text key={f} x={padding.left - 8} y={padding.top + chartH * (1 - f) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">
            {Math.round(maxRevenue * f).toLocaleString()}
          </text>
        ))}
        <path d={areaPath} fill="url(#areaGrad)" />
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={p.d.date} cx={p.x} cy={p.y} r="3" fill="#6366f1">
            <title>{p.d.date}: KES {p.d.revenue.toLocaleString()}</title>
          </circle>
        ))}
        {points.map((p, i) => i % showEveryNth === 0 && (
          <text key={p.d.date} x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">
            {p.d.date.slice(5)}
          </text>
        ))}
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