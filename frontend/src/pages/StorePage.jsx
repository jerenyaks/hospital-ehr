import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { storeApi, visitsApi, patientsApi } from "../api/endpoints";

export default function StorePage() {
  const [items, setItems] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tab, setTab] = useState("inventory");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", category: "Food", unit: "kg", quantity: 0, reorder_level: 10, unit_price: 0, notes: "" });
  const [updateForms, setUpdateForms] = useState({});

  const [activeVisits, setActiveVisits] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [issueForm, setIssueForm] = useState({ store_item_id: "", target_type: "patient", visit_id: "", ward: "", quantity_issued: "", notes: "" });

  const loadData = async () => {
    try {
      const [all, low] = await Promise.all([storeApi.getItems(), storeApi.getLowStock()]);
      setItems(all); setLowStock(low);
    } catch { setError("Could not load store items."); }
  };

  useEffect(() => { const t = setTimeout(loadData, 0); return () => clearTimeout(t); }, []);

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
      loadData();
    } catch (err) { setError(err.response?.data?.detail || "Could not issue item."); }
    finally { setLoading(false); }
  };

  const handleAddItem = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await storeApi.addItem({ ...newItem, quantity: Number(newItem.quantity), reorder_level: Number(newItem.reorder_level), unit_price: Number(newItem.unit_price) });
      setSuccess(`${newItem.name} added to store.`);
      setNewItem({ name: "", category: "Food", unit: "kg", quantity: 0, reorder_level: 10, unit_price: 0, notes: "" }); loadData();
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
      setSuccess(`${item.name} stock updated.`);
      setUpdateForms((f) => { const n = { ...f }; delete n[item.id]; return n; });
      loadData();
    } catch (err) { setError(err.response?.data?.detail || "Could not update item."); }
  };

  return (
    <div>
      <TopBar title="Store" />
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "var(--space-6)" }}>
        {lowStock.length > 0 && (
          <div style={{ background: "var(--color-warning-light)", border: "1px solid var(--color-warning)", borderRadius: "var(--radius)", padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-4)", color: "var(--color-warning)", fontSize: 13, fontWeight: 500 }}>
            Low stock alert: {lowStock.map(i => i.name).join(", ")}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          {["inventory", "issue", "add"].map(t => (
            <button key={t} onClick={() => { setTab(t); if (t === "issue") loadActiveVisits(); }} style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: tab === t ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: tab === t ? "var(--color-primary-light)" : "var(--color-surface)", color: tab === t ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {t === "inventory" ? "View & Update Store" : t === "issue" ? "Issue Item" : "Add New Item"}
            </button>
          ))}
        </div>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><ErrorBanner message={error} /></div>}
        {success && <div style={{ marginBottom: "var(--space-4)" }}><SuccessBanner message={success} /></div>}

        {tab === "inventory" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Store inventory</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr 1fr auto", gap: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <span>Item</span><span>Category</span><span>Amount</span><span>Unit</span><span>Price (KES)</span><span>Update</span>
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
                      <Button onClick={() => handleUpdateQuantity(i)} style={{ padding: "6px 10px", fontSize: 12 }}>Update</Button>
                    </div>
                  </div>
                );
              })}
            </div>
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