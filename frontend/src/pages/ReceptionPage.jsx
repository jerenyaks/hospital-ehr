import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import StatusPill from "../components/StatusPill";
import { patientsApi, visitsApi, billingApi } from "../api/endpoints";

const BLANK_PATIENT = {
  first_name: "", last_name: "", date_of_birth: "", gender: "female",
  national_id: "", phone_number: "", email: "", county: "", address: "",
  next_of_kin_name: "", next_of_kin_phone: "", next_of_kin_relationship: "",
  blood_group: "unknown", allergies: "",
};

export default function ReceptionPage() {
  const [tab, setTab] = useState("checkin");
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [form, setForm] = useState(BLANK_PATIENT);
  const [todaysVisits, setTodaysVisits] = useState([]);
  const [unpaidBills, setUnpaidBills] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadVisits = async () => {
    try {
      const [visits, bills] = await Promise.all([visitsApi.list(), billingApi.getUnpaid()]);
      setTodaysVisits(visits);
      setUnpaidBills(bills);
    } catch {}
  };

  useEffect(() => { const t = setTimeout(loadVisits, 0); return () => clearTimeout(t); }, []);

  const handleSearch = async (value) => {
    setSearch(value); setSelectedPatient(null);
    if (value.trim().length < 2) { setPatients([]); return; }
    try { setPatients(await patientsApi.list(value)); } catch { setPatients([]); }
  };

  const handleCheckIn = async () => {
    if (!selectedPatient) return;
    setError(""); setSuccess(""); setLoading(true);
    try {
      const visit = await visitsApi.checkIn(selectedPatient.id, chiefComplaint, "outpatient");
      await billingApi.generate(visit.id);
      setSuccess(`${selectedPatient.first_name} ${selectedPatient.last_name} checked in. Bill generated.`);
      setSelectedPatient(null); setChiefComplaint(""); setSearch(""); setPatients([]);
      loadVisits();
    } catch (err) { setError(err.response?.data?.detail || "Couldn't check in this patient."); }
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      const payload = { ...form, national_id: form.national_id || null, email: form.email || null, county: form.county || null, address: form.address || null, next_of_kin_relationship: form.next_of_kin_relationship || null, allergies: form.allergies || null };
      const patient = await patientsApi.register(payload);
      setSuccess(`Registered ${patient.first_name} ${patient.last_name} as ${patient.patient_number}.`);
      setForm(BLANK_PATIENT); setTab("checkin");
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Couldn't register patient.");
    } finally { setLoading(false); }
  };

  const handlePayBill = async (bill) => {
    const method = prompt("Payment method? (Cash / M-Pesa / Insurance)", "M-Pesa");
    if (!method) return;
    try {
      await billingApi.pay(bill.id, method);
      setSuccess(`Bill #${bill.id} marked as paid via ${method}.`);
      loadVisits();
    } catch (err) { setError(err.response?.data?.detail || "Could not process payment."); }
  };

  const updateField = (key, value) => setForm(f => ({ ...f, [key]: value }));

  return (
    <div>
      <TopBar title="Front Desk" />
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--space-6)" }}>
        <div style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-5)", flexWrap: "wrap" }}>
          {["checkin", "register", "billing"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)", border: tab === t ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: tab === t ? "var(--color-primary-light)" : "var(--color-surface)", color: tab === t ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {t === "checkin" ? "Check in patient" : t === "register" ? "Register new patient" : `Billing ${unpaidBills.length > 0 ? `(${unpaidBills.length} unpaid)` : ""}`}
            </button>
          ))}
        </div>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><ErrorBanner message={error} /></div>}
        {success && <div style={{ marginBottom: "var(--space-4)" }}><SuccessBanner message={success} /></div>}

        {tab === "checkin" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "var(--space-5)" }}>
            <Card>
              <h3 style={{ marginBottom: "var(--space-4)" }}>Find a patient</h3>
              <Field label="Search by name, phone, or patient number">
                <input style={inputStyle} value={search} onChange={e => handleSearch(e.target.value)} placeholder="e.g. Wambui or KNH-000001" />
              </Field>
              <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: 8 }}>
                {patients.map(p => (
                  <button key={p.id} onClick={() => setSelectedPatient(p)} style={{ textAlign: "left", padding: "10px 12px", borderRadius: "var(--radius-sm)", border: selectedPatient?.id === p.id ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", background: selectedPatient?.id === p.id ? "var(--color-primary-light)" : "var(--color-surface)", cursor: "pointer" }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{p.first_name} {p.last_name}</div>
                    <div style={{ fontSize: 12, color: "var(--color-text-muted)" }}>{p.patient_number} · {p.age}y, {p.gender} · {p.phone_number}</div>
                  </button>
                ))}
              </div>
              {selectedPatient && (
                <div style={{ marginTop: "var(--space-5)", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
                  <Field label="Reason for visit">
                    <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={chiefComplaint} onChange={e => setChiefComplaint(e.target.value)} placeholder="e.g. Fever and headache for 3 days" />
                  </Field>
                  <Button onClick={handleCheckIn} disabled={loading} style={{ marginTop: "var(--space-3)", width: "100%" }}>
                    {loading ? "Checking in..." : `Check in ${selectedPatient.first_name}`}
                  </Button>
                </div>
              )}
            </Card>
            <Card>
              <h3 style={{ marginBottom: "var(--space-4)" }}>Today's queue</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 480, overflowY: "auto" }}>
                {todaysVisits.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No visits yet today.</p>}
                {todaysVisits.map(v => (
                  <div key={v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--color-border)", fontSize: 13 }}>
                    <span>Visit #{v.id}</span>
                    <StatusPill status={v.status} />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {tab === "register" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>New patient registration</h3>
            <form onSubmit={handleRegister} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
              <Field label="First name" required><input style={inputStyle} value={form.first_name} onChange={e => updateField("first_name", e.target.value)} required /></Field>
              <Field label="Last name" required><input style={inputStyle} value={form.last_name} onChange={e => updateField("last_name", e.target.value)} required /></Field>
              <Field label="Date of birth" required><input type="date" style={inputStyle} value={form.date_of_birth} onChange={e => updateField("date_of_birth", e.target.value)} required /></Field>
              <Field label="Gender" required>
                <select style={inputStyle} value={form.gender} onChange={e => updateField("gender", e.target.value)}>
                  <option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select>
              </Field>
              <Field label="National ID"><input style={inputStyle} value={form.national_id} onChange={e => updateField("national_id", e.target.value)} /></Field>
              <Field label="Phone number" required><input style={inputStyle} value={form.phone_number} onChange={e => updateField("phone_number", e.target.value)} placeholder="+254712345678" required /></Field>
              <Field label="Email"><input type="email" style={inputStyle} value={form.email} onChange={e => updateField("email", e.target.value)} /></Field>
              <Field label="County"><input style={inputStyle} value={form.county} onChange={e => updateField("county", e.target.value)} placeholder="e.g. Kajiado" /></Field>
              <Field label="Address"><input style={inputStyle} value={form.address} onChange={e => updateField("address", e.target.value)} /></Field>
              <Field label="Blood group">
                <select style={inputStyle} value={form.blood_group} onChange={e => updateField("blood_group", e.target.value)}>
                  {["unknown","A+","A-","B+","B-","AB+","AB-","O+","O-"].map(bg => <option key={bg} value={bg === "unknown" ? "unknown" : bg}>{bg === "unknown" ? "Unknown" : bg}</option>)}
                </select>
              </Field>
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--color-border)", paddingTop: "var(--space-4)" }}>
                <h4 style={{ fontSize: 14, color: "var(--color-text-muted)", marginBottom: "var(--space-3)" }}>Next of kin</h4>
              </div>
              <Field label="Name" required><input style={inputStyle} value={form.next_of_kin_name} onChange={e => updateField("next_of_kin_name", e.target.value)} required /></Field>
              <Field label="Phone" required><input style={inputStyle} value={form.next_of_kin_phone} onChange={e => updateField("next_of_kin_phone", e.target.value)} required /></Field>
              <Field label="Relationship"><input style={inputStyle} value={form.next_of_kin_relationship} onChange={e => updateField("next_of_kin_relationship", e.target.value)} placeholder="e.g. Spouse, Parent" /></Field>
              <Field label="Known allergies"><input style={inputStyle} value={form.allergies} onChange={e => updateField("allergies", e.target.value)} placeholder="e.g. Penicillin" /></Field>
              <div style={{ gridColumn: "1 / -1" }}><Button type="submit" disabled={loading} style={{ width: "100%" }}>{loading ? "Registering..." : "Register patient"}</Button></div>
            </form>
          </Card>
        )}

        {tab === "billing" && (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Unpaid bills</h3>
            {unpaidBills.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No unpaid bills right now.</p>}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {unpaidBills.map(bill => (
                <div key={bill.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 1fr auto", gap: 12, alignItems: "center", padding: "12px 14px", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                  <div><div style={{ fontWeight: 600 }}>Visit #{bill.visit_id}</div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Patient #{bill.patient_id}</div></div>
                  <div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Consultation</div><div>KES {bill.consultation_fee}</div></div>
                  <div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Lab</div><div>KES {bill.lab_fee.toFixed(0)}</div></div>
                  <div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Pharmacy</div><div>KES {bill.pharmacy_fee.toFixed(0)}</div></div>
                  <div><div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>Total</div><div style={{ fontWeight: 600, color: "var(--color-primary-dark)" }}>KES {bill.total_amount.toFixed(0)}</div></div>
                  <Button onClick={() => handlePayBill(bill)} style={{ padding: "8px 14px", fontSize: 12 }}>Mark paid</Button>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
