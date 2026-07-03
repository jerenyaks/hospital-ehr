import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { pharmacyApi } from "../api/endpoints";

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [tab, setTab] = useState("dispense");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", category: "", unit: "tablets", stock_quantity: 0, reorder_level: 10, unit_price: 0 });

  const loadData = async () => {
    try {
      const [meds, low] = await Promise.all([pharmacyApi.getMedicines(), pharmacyApi.getLowStock()]);
      setMedicines(meds); setLowStock(low);
    } catch { setError("Could not load medicines."); }
  };

  useEffect(() => { const t = setTimeout(loadData, 0); return () => clearTimeout(t); }, []);

  const handleDispense = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await pharmacyApi.dispense({ prescription_id: Number(prescriptionId), medicine_id: Number(selectedMedicine), quantity_dispensed: Number(quantity) });
      setSuccess("Medicine dispensed successfully and stock updated.");
      setPrescriptionId(""); setSelectedMedicine(""); setQuantity(""); loadData();
    } catch (err) { setError(err.response?.data?.detail || "Could not dispense medicine."); }
    finally { setLoading(false); }
  };

  const handleAddMedicine = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await pharmacyApi.addMedicine({ ...newMed, stock_quantity: Number(newMed.stock_quantity), reorder_level: Number(newMed.reorder_level), unit_price: Number(newMed.unit_price) });
      setSuccess(`${newMed.name} added to inventory.`);
      setNewMed({ name: "", category: "", unit: "tablets", stock_quantity: 0, reorder_level: 10, unit_price: 0 }); loadData();
    } catch (err) { setError(err.response?.data?.detail || "Could not add medicine."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <TopBar title="Pharmacy" />
      <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "var(--space-6)" }}>
        {lowStock.length > 0 && (
          <div style={{ background: "var(--color-warning-light)", border: "1px solid var(--color-warning)", borderRadius: "var(--radius)", padding: "var(--space-3) var(--space-4)", marginBottom: "var(--space-4)", color: "var(--color-warning)", fontSize: 13, fontWeight: 500 }}>
            ⚠ Low stock alert: {lowStock.map(m => m.name).join(", ")}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          {["dispense", "inventory", "add"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: tab === t ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: tab === t ? "var(--color-primary-light)" : "var(--color-surface)", color: tab === t ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {t === "dispense" ? "Dispense Medicine" : t === "inventory" ? "View Inventory" : "Add Medicine"}
            </button>
          ))}
        </div>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><ErrorBanner message={error} /></div>}
        {success && <div style={{ marginBottom: "var(--space-4)" }}><SuccessBanner message={success} /></div>}

        {tab === "dispense" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Dispense medicine for a prescription</h3>
            <form onSubmit={handleDispense} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Field label="Prescription ID" required>
                <input style={inputStyle} type="number" value={prescriptionId} onChange={e => setPrescriptionId(e.target.value)} placeholder="Enter prescription ID" required />
              </Field>
              <Field label="Medicine" required>
                <select style={inputStyle} value={selectedMedicine} onChange={e => setSelectedMedicine(e.target.value)} required>
                  <option value="">Select medicine...</option>
                  {medicines.map(m => <option key={m.id} value={m.id}>{m.name} (Stock: {m.stock_quantity} {m.unit})</option>)}
                </select>
              </Field>
              <Field label="Quantity" required>
                <input style={inputStyle} type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
              </Field>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <Button type="submit" disabled={loading} style={{ width: "100%" }}>{loading ? "Dispensing..." : "Dispense"}</Button>
              </div>
            </form>
          </Card>
        )}

        {tab === "inventory" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Medicine inventory</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <span>Medicine</span><span>Category</span><span>Stock</span><span>Reorder</span><span>Price (KES)</span>
              </div>
              {medicines.map(m => (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "10px 12px", fontSize: 13, borderRadius: "var(--radius-sm)", background: m.stock_quantity <= m.reorder_level ? "var(--color-warning-light)" : "transparent", border: `1px solid ${m.stock_quantity <= m.reorder_level ? "var(--color-warning)" : "transparent"}` }}>
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{m.category || "—"}</span>
                  <span style={{ color: m.stock_quantity <= m.reorder_level ? "var(--color-warning)" : "var(--color-text)" }}>{m.stock_quantity} {m.unit}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{m.reorder_level}</span>
                  <span>{m.unit_price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === "add" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Add new medicine</h3>
            <form onSubmit={handleAddMedicine} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Field label="Medicine name" required><input style={inputStyle} value={newMed.name} onChange={e => setNewMed(p => ({ ...p, name: e.target.value }))} required /></Field>
              <Field label="Category"><input style={inputStyle} value={newMed.category} onChange={e => setNewMed(p => ({ ...p, category: e.target.value }))} placeholder="e.g. Antibiotic" /></Field>
              <Field label="Unit" required>
                <select style={inputStyle} value={newMed.unit} onChange={e => setNewMed(p => ({ ...p, unit: e.target.value }))}>
                  <option>tablets</option><option>capsules</option><option>ml</option><option>bottles</option><option>vials</option><option>sachets</option><option>ampoules</option>
                </select>
              </Field>
              <Field label="Initial stock"><input style={inputStyle} type="number" min="0" value={newMed.stock_quantity} onChange={e => setNewMed(p => ({ ...p, stock_quantity: e.target.value }))} /></Field>
              <Field label="Reorder level"><input style={inputStyle} type="number" min="0" value={newMed.reorder_level} onChange={e => setNewMed(p => ({ ...p, reorder_level: e.target.value }))} /></Field>
              <Field label="Unit price (KES)"><input style={inputStyle} type="number" min="0" step="0.01" value={newMed.unit_price} onChange={e => setNewMed(p => ({ ...p, unit_price: e.target.value }))} /></Field>
              <div style={{ gridColumn: "1 / -1" }}><Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add medicine"}</Button></div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}