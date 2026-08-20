import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { storeApi, visitsApi, patientsApi } from "../api/endpoints";

const CATEGORY_COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#ec4899", "#eab308", "#14b8a6", "#f97316"];

export default function StorePage() {
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Food", unit: "kg", quantity: 0, reorder_level: 10, unit_price: 0, notes: "" });
  const [updateForms, setUpdateForms] = useState({});

  const [activeVisits, setActiveVisits] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [issueForm, setIssueForm] = useState({ store_item_id: "", target_type: "patient", visit_id: "", ward: "", quantity_issued: "", notes: "" });
  const [restockForm, setRestockForm] = useState({ store_item_id: "", quantity_added: "", source: "", notes: "" });

  const [dashboard, setDashboard] = useState(null);
  const [timeseries, setTimeseries] = useState([]);
  const [dashLoading, setDashLoading] = useState(false);
    const [period, setPeriod] = useState("month"); // day | week | month | year

  const loadData = async () => {
    try {
      const [all, low] = await Promise.all([storeApi.getItems(), storeApi.getLowStock()]);
      setItems(all); setLowStock(low);
    } catch { setError("Could not load store items."); }
  };

    const loadDashboard = async (p = period) => {
    setDashLoading(true);
    try {
      const [summary, series] = await Promise.all([storeApi.getDashboardSummary(30), storeApi.getDashboardTimeseries(p)]);
      setDashboard(summary); setTimeseries(series);
    } catch { setError("Could not load dashboard."); }
    finally { setDashLoading(false); }
  };

  const handlePeriodChange = (p) => { setPeriod(p); loadDashboard(p); };

  useEffect(() => { const t = setTimeout(() => { loadData(); loadDashboard(); }, 0); return () => clearTimeout(t); }, []);

  const loadActiveVisits = async () => {
    try {
      const [queue, inpatients] = await Promise.all([visitsApi.list(), visitsApi.getActiveInpatients()]);
      const merged = [...queue, ...inpatients].filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);
      setActiveVisits(merged);
      const names = {};
      for (const v of merged) {
        if (!patientNames[v.patient_id]) {
          try { const p = await patientsApi.get(v.patient_id); names[v.patient_id] = `${p.first_name} ${p.last_name}`; }
          catch { names[v.patient_id] = `Patient #${v.patient_id}`; }
        }
      }
      setPatientNames(prev => ({ ...prev, ...names }));
    } catch { /* non-critical */ }
  };

  const handleIssueItem = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const payload = {
        store_item_id: Number(issueForm.store_item_id),
        quantity_issued: Number(issueForm.quantity_issued),
        notes: issueForm.notes || null,
        visit_id: issueForm.target_type === "patient" ? Number(issueForm.visit_id) : null,
        ward: issueForm.target_type === "ward" ? issueForm.ward : null,
      };
      await storeApi.issueItem(payload);
      setSuccess("Item issued and stock updated.");
      setIssueForm({ store_item_id: "", target_type: "patient", visit_id: "", ward: "", quantity_issued: "", notes: "" });
      loadData(); loadDashboard();
    } catch (err) { setError(err.response?.data?.detail || "Could not issue item."); }
    finally { setLoading(false); }
  };

  const handleRestock = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await storeApi.restock({
        store_item_id: Number(restockForm.store_item_id),
        quantity_added: Number(restockForm.quantity_added),
        source: restockForm.source || null,
        notes: restockForm.notes || null,
      });
      setSuccess("Stock added and recorded as inflow.");
      setRestockForm({ store_item_id: "", quantity_added: "", source: "", notes: "" });
      loadData(); loadDashboard();
    } catch (err) { setError(err.response?.data?.detail || "Could not restock item."); }
    finally { setLoading(false); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await storeApi.addItem({ ...newItem, quantity: Number(newItem.quantity), reorder_level: Number(newItem.reorder_level), unit_price: Number(newItem.unit_price) });
      setSuccess(`${newItem.name} added to store.`);
      setNewItem({ name: "", category: "Food", unit: "kg", quantity: 0, reorder_level: 10, unit_price: 0, notes: "" }); loadData(); loadDashboard();
    } catch (err) { setError(err.response?.data?.detail || "Could not add item."); }
    finally { setLoading(false); }
  };

  const updateFormField = (itemId, key, value) => {
    setUpdateForms((f) => ({ ...f, [itemId]: { ...(f[itemId] || {}), [key]: value } }));
  };

  const handleUpdateQuantity = async (item) => {
    const form = updateForms[item.id] || {};
    if (form.quantity === undefined || form.quantity === "") return;
    setError(""); setSuccess("");
    try {
      await storeApi.updateItem(item.id, { quantity: Number(form.quantity) });
      setSuccess(`${item.name} stock corrected.`);
      setUpdateForms((f) => { const n = { ...f }; delete n[item.id]; return n; });
      loadData(); loadDashboard();
    } catch (err) { setError(err.response?.data?.detail || "Could not update item."); }
  };

  return (
    <div>
      <TopBar title="Store" />
      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "var(--space-6)" }}>
        {lowStock.length > 0 && (
          <div style={{ background: "var(--color-warning-light)", border: "1px solid var(--color-warning)", borderRadius: "var(--radius)", padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-4)", color: "var(--color-warning)", fontSize: 13, fontWeight: 500 }}>
            ⚠️ Low stock alert: {lowStock.map(i => i.name).join(", ")}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
          {["dashboard", "inventory", "restock", "issue", "add"].map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === "issue") loadActiveVisits(); }} style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: tab === t ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: tab === t ? "var(--color-primary-light)" : "var(--color-surface)", color: tab === t ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {t === "dashboard" ? "📊 Dashboard" : t === "inventory" ? "View & Correct Store" : t === "restock" ? "➕ Restock (Inflow)" : t === "issue" ? "➖ Issue Item (Outflow)" : "Add New Item"}
            </button>
          ))}
        </div>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><ErrorBanner message={error} /></div>}
        {success && <div style={{ marginBottom: "var(--space-4)" }}><SuccessBanner message={success} /></div>}

        {tab === "dashboard" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {dashLoading && <Card><p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p></Card>}
            {!dashLoading && dashboard && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                  <FlashyStat icon="📦" label="Total Items" value={dashboard.total_items} from="#3b82f6" to="#2563eb" />
                  <FlashyStat icon="⚠️" label="Low Stock" value={dashboard.low_stock_count} from="#f97316" to="#ea580c" />
                  <FlashyStat icon="💰" label="Stock Value" value={`KES ${Number(dashboard.total_stock_value).toLocaleString()}`} from="#22c55e" to="#16a34a" />
                  <FlashyStat icon="📥" label="Inflow (30d)" value={dashboard.total_inflow_qty} from="#06b6d4" to="#0891b2" />
                  <FlashyStat icon="📤" label="Outflow (30d)" value={dashboard.total_outflow_qty} from="#ec4899" to="#db2777" />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <Card>
                    <h4 style={{ marginBottom: "var(--space-3)" }}>Stock Value by Category</h4>
                    {dashboard.category_breakdown.length === 0 || dashboard.category_breakdown.every(c => c.value === 0) ? (
                      <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No stock value to show yet.</p>
                    ) : (
                      <DonutChart segments={dashboard.category_breakdown.map((c, i) => ({ label: c.category, value: c.value, color: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }))} />
                    )}
                  </Card>
                  <Card>
                    <h4 style={{ marginBottom: "var(--space-3)" }}>Top Issued Items (30d)</h4>
                    {dashboard.top_issued.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No items issued in this period.</p>
                    ) : (
                      <TopItemsBar items={dashboard.top_issued} />
                    )}
                  </Card>
                </div>

                               <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: "var(--space-3)" }}>
                    <h4>Inflow vs Outflow</h4>
                    <div style={{ display: "flex", gap: 6 }}>
                      {["day", "week", "month", "year"].map(p => (
                        <button key={p} onClick={() => handlePeriodChange(p)} style={{
                          padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700,
                          border: "none", cursor: "pointer", textTransform: "capitalize",
                          background: period === p ? "linear-gradient(135deg,#8b5cf6,#ec4899)" : "var(--color-bg)",
                          color: period === p ? "#fff" : "var(--color-text-muted)",
                        }}>{p}</button>
                      ))}
                    </div>
                  </div>
                  {timeseries.length === 0 || timeseries.every(d => d.inflow === 0 && d.outflow === 0) ? (
                    <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>No activity in this period.</p>
                  ) : (
                    <InOutChart data={timeseries} />
                  )}
                </Card>
              </>
            )}
          </div>
        )}

        {tab === "inventory" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Store inventory</h3>
            <p style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>Use this only for corrections (e.g. fixing a miscount). For normal restocking, use the "Restock" tab so it's tracked as inflow.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto", gap: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <span>Item</span><span>Category</span><span>Amount</span><span>Unit</span><span>Price (KES)</span><span>Correct</span>
              </div>
              {items.map(i => {
                const form = updateForms[i.id] || {};
                return (
                  <div key={i.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto", gap: 8, padding: "10px 12px", fontSize: 13, alignItems: "center", borderRadius: "var(--radius-sm)", background: i.quantity <= i.reorder_level ? "var(--color-warning-light)" : "transparent", border: `1px solid ${i.quantity <= i.reorder_level ? "var(--color-warning)" : "transparent"}` }}>
                    <span style={{ fontWeight: 500 }}>{i.name}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>{i.category || "—"}</span>
                    <span style={{ color: i.quantity <= i.reorder_level ? "var(--color-warning)" : "var(--color-text)" }}>{i.quantity}</span>
                    <span style={{ color: "var(--color-text)" }}>{i.unit}</span>
                    <span>{i.unit_price.toFixed(2)}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      <input type="number" style={{ ...inputStyle, width: 70, padding: "6px 8px" }} placeholder="New qty" value={form.quantity ?? ""} onChange={e => updateFormField(i.id, "quantity", e.target.value)} />
                      <Button onClick={() => handleUpdateQuantity(i)} style={{ padding: "6px 10px", fontSize: 12 }}>Set</Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {tab === "restock" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Restock item (inflow)</h3>
            <form onSubmit={handleRestock} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Item" required>
                  <select style={inputStyle} value={restockForm.store_item_id} onChange={e => setRestockForm(f => ({ ...f, store_item_id: e.target.value }))} required>
                    <option value="">Select item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} (Current: {i.quantity} {i.unit})</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Quantity added" required><input style={inputStyle} type="number" min="1" value={restockForm.quantity_added} onChange={e => setRestockForm(f => ({ ...f, quantity_added: e.target.value }))} required /></Field>
              <Field label="Source (optional)"><input style={inputStyle} value={restockForm.source} onChange={e => setRestockForm(f => ({ ...f, source: e.target.value }))} placeholder="e.g. Supplier name, donation" /></Field>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Notes"><input style={inputStyle} value={restockForm.notes} onChange={e => setRestockForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></Field></div>
              <div style={{ gridColumn: "1 / -1" }}><Button type="submit" disabled={loading}>{loading ? "Restocking..." : "Restock item"}</Button></div>
            </form>
          </Card>
        )}

        {tab === "issue" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Issue item to a patient or ward</h3>
            <form onSubmit={handleIssueItem} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Item" required>
                  <select style={inputStyle} value={issueForm.store_item_id} onChange={e => setIssueForm(f => ({ ...f, store_item_id: e.target.value }))} required>
                    <option value="">Select item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} (Available: {i.quantity} {i.unit})</option>)}
                  </select>
                </Field>
              </div>
              <Field label="Issue to" required>
                <select style={inputStyle} value={issueForm.target_type} onChange={e => setIssueForm(f => ({ ...f, target_type: e.target.value, visit_id: "", ward: "" }))}>
                  <option value="patient">A specific patient</option>
                  <option value="ward">A ward / department (general)</option>
                </select>
              </Field>
              <Field label="Quantity" required>
                <input style={inputStyle} type="number" min="1" value={issueForm.quantity_issued} onChange={e => setIssueForm(f => ({ ...f, quantity_issued: e.target.value }))} required />
              </Field>
              {issueForm.target_type === "patient" ? (
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Patient" required>
                    <select style={inputStyle} value={issueForm.visit_id} onChange={e => setIssueForm(f => ({ ...f, visit_id: e.target.value }))} required>
                      <option value="">Select patient...</option>
                      {activeVisits.map(v => (
                        <option key={v.id} value={v.id}>
                          {patientNames[v.patient_id] || `Patient #${v.patient_id}`} {v.ward ? `— ${v.ward}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              ) : (
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Ward / department" required>
                    <input style={inputStyle} value={issueForm.ward} onChange={e => setIssueForm(f => ({ ...f, ward: e.target.value }))} placeholder="e.g. Medical Ward A" required />
                  </Field>
                </div>
              )}
              <div style={{ gridColumn: "1 / -1" }}><Field label="Notes"><input style={inputStyle} value={issueForm.notes} onChange={e => setIssueForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></Field></div>
              <div style={{ gridColumn: "1 / -1" }}><Button type="submit" disabled={loading}>{loading ? "Issuing..." : "Issue item"}</Button></div>
            </form>
          </Card>
        )}

        {tab === "add" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Add new store item</h3>
            <form onSubmit={handleAddItem} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Field label="Item name" required><input style={inputStyle} value={newItem.name} onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))} required /></Field>
              <Field label="Category" required>
                <select style={inputStyle} value={newItem.category} onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}>
                  <option>Food</option><option>Bedding</option><option>Cleaning</option><option>Patient supplies</option><option>Other</option>
                </select>
              </Field>
              <Field label="Unit" required>
                <select style={inputStyle} value={newItem.unit} onChange={e => setNewItem(p => ({ ...p, unit: e.target.value }))}>
                  <option>kg</option><option>litres</option><option>pieces</option><option>rolls</option><option>packs</option><option>boxes</option>
                </select>
              </Field>
              <Field label="Initial quantity"><input style={inputStyle} type="number" min="0" value={newItem.quantity} onChange={e => setNewItem(p => ({ ...p, quantity: e.target.value }))} /></Field>
              <Field label="Reorder level"><input style={inputStyle} type="number" min="0" value={newItem.reorder_level} onChange={e => setNewItem(p => ({ ...p, reorder_level: e.target.value }))} /></Field>
              <Field label="Unit price (KES)"><input style={inputStyle} type="number" min="0" step="0.01" value={newItem.unit_price} onChange={e => setNewItem(p => ({ ...p, unit_price: e.target.value }))} /></Field>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Notes"><input style={inputStyle} value={newItem.notes} onChange={e => setNewItem(p => ({ ...p, notes: e.target.value }))} placeholder="Optional" /></Field></div>
              <div style={{ gridColumn: "1 / -1" }}><Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add item"}</Button></div>
            </form>
          </Card>
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
          >
            <title>{a.label}: {a.value.toLocaleString()} ({Math.round(a.fraction * 100)}%)</title>
          </circle>
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-text)">
          KES
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="11" fill="var(--color-text-muted)">
          {total.toLocaleString()}
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

function TopItemsBar({ items }) {
  const max = Math.max(...items.map(i => i.total), 1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((item, i) => (
        <div key={item.name}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
            <span>{item.name}</span>
            <span style={{ fontWeight: 700 }}>{item.total}</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: "var(--color-bg)", overflow: "hidden" }}>
            <div style={{ width: `${(item.total / max) * 100}%`, height: "100%", borderRadius: 5, background: `linear-gradient(90deg, ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}, ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}cc)` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function InOutChart({ data }) {
  const width = 800;
  const height = 220;
  const padding = { top: 10, right: 10, bottom: 30, left: 45 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...data.map(d => Math.max(d.inflow, d.outflow)), 1);
  const groupWidth = chartW / data.length;
  const barWidth = Math.max(groupWidth / 2.5, 1);
  const showEveryNth = Math.max(Math.ceil(data.length / 8), 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 8, fontSize: 12 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#06b6d4", display: "inline-block" }} /> Inflow</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: "#ec4899", display: "inline-block" }} /> Outflow</span>
      </div>
      <div style={{ width: "100%", overflowX: "auto" }}>
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", minWidth: 500, height: "auto" }}>
          {[0, 0.25, 0.5, 0.75, 1].map(f => (
            <line key={f} x1={padding.left} x2={width - padding.right} y1={padding.top + chartH * (1 - f)} y2={padding.top + chartH * (1 - f)} stroke="var(--color-border)" strokeWidth="1" />
          ))}
          {[0, 0.5, 1].map(f => (
            <text key={f} x={padding.left - 6} y={padding.top + chartH * (1 - f) + 4} textAnchor="end" fontSize="10" fill="var(--color-text-muted)">
              {Math.round(maxVal * f)}
            </text>
          ))}
          {data.map((d, i) => {
            const groupX = padding.left + i * groupWidth;
            const inflowH = (d.inflow / maxVal) * chartH;
            const outflowH = (d.outflow / maxVal) * chartH;
            return (
              <g key={d.date}>
                <rect x={groupX + groupWidth / 2 - barWidth - 1} y={padding.top + chartH - inflowH} width={barWidth} height={inflowH} fill="#06b6d4" rx="1">
                  <title>{d.date} inflow: {d.inflow}</title>
                </rect>
                <rect x={groupX + groupWidth / 2 + 1} y={padding.top + chartH - outflowH} width={barWidth} height={outflowH} fill="#ec4899" rx="1">
                  <title>{d.date} outflow: {d.outflow}</title>
                </rect>
                                {i % showEveryNth === 0 && (
                  <text x={groupX + groupWidth / 2} y={height - 8} textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">
                    {d.date}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}