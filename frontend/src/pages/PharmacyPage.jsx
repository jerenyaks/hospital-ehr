import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { pharmacyApi, suppliersApi } from "../api/endpoints";

export default function PharmacyPage() {
  const [medicines, setMedicines] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [pendingPrescriptions, setPendingPrescriptions] = useState([]);
  const [tab, setTab] = useState("dispense");
  const [prescriptionId, setPrescriptionId] = useState("");
  const [selectedMedicine, setSelectedMedicine] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [newMed, setNewMed] = useState({ name: "", category: "", unit: "tablets", stock_quantity: 0, reorder_level: 10, unit_price: 0 });

  const [suppliers, setSuppliers] = useState([]);
  const [newSupplier, setNewSupplier] = useState({ name: "", contact_person: "", phone: "", email: "", license_number: "", is_certified: false, address: "" });
  const [restockForm, setRestockForm] = useState({ medicine_id: "", supplier_id: "", quantity_supplied: "", unit_cost: "", notes: "" });

  const loadData = async () => {
    try {
      const [meds, low, pending, sups] = await Promise.all([
        pharmacyApi.getMedicines(),
        pharmacyApi.getLowStock(),
        pharmacyApi.getPendingPrescriptions(),
        suppliersApi.list(),
      ]);
      setMedicines(meds); setLowStock(low); setPendingPrescriptions(pending); setSuppliers(sups);
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

  const handleAddSupplier = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await suppliersApi.add(newSupplier);
      setSuccess(`${newSupplier.name} added as a supplier.`);
      setNewSupplier({ name: "", contact_person: "", phone: "", email: "", license_number: "", is_certified: false, address: "" });
      loadData();
    } catch (err) { setError(err.response?.data?.detail || "Could not add supplier."); }
    finally { setLoading(false); }
  };

  const handleRestock = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await suppliersApi.restock({
        medicine_id: Number(restockForm.medicine_id),
        supplier_id: Number(restockForm.supplier_id),
        quantity_supplied: Number(restockForm.quantity_supplied),
        unit_cost: restockForm.unit_cost === "" ? null : Number(restockForm.unit_cost),
        notes: restockForm.notes || null,
      });
      setSuccess("Medicine restocked successfully.");
      setRestockForm({ medicine_id: "", supplier_id: "", quantity_supplied: "", unit_cost: "", notes: "" });
      loadData();
    } catch (err) { setError(err.response?.data?.detail || "Could not restock medicine."); }
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
            Low stock alert: {lowStock.map(m => m.name).join(", ")}
          </div>
        )}
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)" }}>
          {["dispense", "inventory", "add", "restock", "suppliers"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: tab === t ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: tab === t ? "var(--color-primary-light)" : "var(--color-surface)", color: tab === t ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {t === "dispense" ? "Dispense Medicine" : t === "inventory" ? "View Inventory" : t === "add" ? "Add Medicine" : t === "restock" ? "Restock" : "Suppliers"}
            </button>
          ))}
        </div>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><ErrorBanner message={error} /></div>}
        {success && <div style={{ marginBottom: "var(--space-4)" }}><SuccessBanner message={success} /></div>}

        {tab === "dispense" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Dispense medicine for a prescription</h3>
            {pendingPrescriptions.length === 0 && (
              <p style={{ color: "var(--color-text-muted)", fontSize: 13, marginBottom: "var(--space-4)" }}>No pending prescriptions right now.</p>
            )}
            <form onSubmit={handleDispense} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <div style={{ gridColumn: "1 / -1" }}>
                <Field label="Prescription" required>
                  <select style={inputStyle} value={prescriptionId} onChange={e => setPrescriptionId(e.target.value)} required>
                    <option value="">Select a prescription...</option>
                    {pendingPrescriptions.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.medication_name} {p.dosage} — {p.frequency}, {p.duration} (Patient #{p.patient_id})
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Medicine" required>
                <select style={inputStyle} value={selectedMedicine} onChange={e => setSelectedMedicine(e.target.value)} required>
                  <option value="">Select medicine...</option>
                  {medicines.map(m => <option key={m.id} value={m.id}>{m.name} — Amount: {m.stock_quantity}, Unit: {m.unit}</option>)}
                </select>
              </Field>
              <Field label="Quantity" required>
                <input style={inputStyle} type="number" min="1" value={quantity} onChange={e => setQuantity(e.target.value)} required />
              </Field>
              <div style={{ display: "flex", alignItems: "flex-end", gridColumn: "1 / -1" }}>
                <Button type="submit" disabled={loading} style={{ width: "100%" }}>{loading ? "Dispensing..." : "Dispense"}</Button>
              </div>
            </form>
          </Card>
        )}

        {tab === "inventory" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Medicine inventory</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                <span>Medicine</span><span>Category</span><span>Amount</span><span>Unit of measure</span><span>Reorder</span><span>Price (KES)</span>
              </div>
              {medicines.map(m => (
                <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "10px 12px", fontSize: 13, borderRadius: "var(--radius-sm)", background: m.stock_quantity <= m.reorder_level ? "var(--color-warning-light)" : "transparent", border: `1px solid ${m.stock_quantity <= m.reorder_level ? "var(--color-warning)" : "transparent"}` }}>
                  <span style={{ fontWeight: 500 }}>{m.name}</span>
                  <span style={{ color: "var(--color-text-muted)" }}>{m.category || "—"}</span>
                  <span style={{ color: m.stock_quantity <= m.reorder_level ? "var(--color-warning)" : "var(--color-text)" }}>{m.stock_quantity}</span>
                  <span style={{ color: "var(--color-text)" }}>{m.unit}</span>
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

        {tab === "restock" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Restock medicine from a certified supplier</h3>
            <form onSubmit={handleRestock} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Field label="Medicine" required>
                <select style={inputStyle} value={restockForm.medicine_id} onChange={e => setRestockForm(f => ({ ...f, medicine_id: e.target.value }))} required>
                  <option value="">Select medicine...</option>
                  {medicines.map(m => <option key={m.id} value={m.id}>{m.name} (Current: {m.stock_quantity} {m.unit})</option>)}
                </select>
              </Field>
              <Field label="Supplier" required>
                <select style={inputStyle} value={restockForm.supplier_id} onChange={e => setRestockForm(f => ({ ...f, supplier_id: e.target.value }))} required>
                  <option value="">Select certified supplier...</option>
                  {suppliers.filter(s => s.is_certified).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {suppliers.some(s => !s.is_certified) && (
                  <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>Only certified suppliers appear here — uncertified suppliers can't be used to restock.</p>
                )}
              </Field>
              <Field label="Quantity supplied" required><input style={inputStyle} type="number" min="1" value={restockForm.quantity_supplied} onChange={e => setRestockForm(f => ({ ...f, quantity_supplied: e.target.value }))} required /></Field>
              <Field label="Unit cost (KES)"><input style={inputStyle} type="number" min="0" step="0.01" value={restockForm.unit_cost} onChange={e => setRestockForm(f => ({ ...f, unit_cost: e.target.value }))} placeholder="Optional — updates medicine price" /></Field>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Notes"><input style={inputStyle} value={restockForm.notes} onChange={e => setRestockForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></Field></div>
              <div style={{ gridColumn: "1 / -1" }}><Button type="submit" disabled={loading}>{loading ? "Restocking..." : "Restock medicine"}</Button></div>
            </form>
          </Card>
        )}

        {tab === "suppliers" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Suppliers</h3>
            <div style={{ marginBottom: "var(--space-5)", display: "flex", flexDirection: "column", gap: 8 }}>
              {suppliers.map(s => (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 12px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{s.contact_person || "—"} · {s.phone || "—"}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: s.is_certified ? "var(--color-success)" : "var(--color-warning)" }}>
                    {s.is_certified ? "Certified" : "Not certified"}
                  </span>
                </div>
              ))}
            </div>
            <h4 style={{ marginBottom: "var(--space-3)" }}>Add new supplier</h4>
            <form onSubmit={handleAddSupplier} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Field label="Supplier name" required><input style={inputStyle} value={newSupplier.name} onChange={e => setNewSupplier(p => ({ ...p, name: e.target.value }))} required /></Field>
              <Field label="Contact person"><input style={inputStyle} value={newSupplier.contact_person} onChange={e => setNewSupplier(p => ({ ...p, contact_person: e.target.value }))} /></Field>
              <Field label="Phone"><input style={inputStyle} value={newSupplier.phone} onChange={e => setNewSupplier(p => ({ ...p, phone: e.target.value }))} /></Field>
              <Field label="Email"><input type="email" style={inputStyle} value={newSupplier.email} onChange={e => setNewSupplier(p => ({ ...p, email: e.target.value }))} /></Field>
              <Field label="License / certification number"><input style={inputStyle} value={newSupplier.license_number} onChange={e => setNewSupplier(p => ({ ...p, license_number: e.target.value }))} /></Field>
              <Field label="Certified supplier?">
                <select style={inputStyle} value={newSupplier.is_certified ? "yes" : "no"} onChange={e => setNewSupplier(p => ({ ...p, is_certified: e.target.value === "yes" }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </Field>
              <div style={{ gridColumn: "1 / -1" }}><Field label="Address"><input style={inputStyle} value={newSupplier.address} onChange={e => setNewSupplier(p => ({ ...p, address: e.target.value }))} /></Field></div>
              <div style={{ gridColumn: "1 / -1" }}><Button type="submit" disabled={loading}>{loading ? "Adding..." : "Add supplier"}</Button></div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}