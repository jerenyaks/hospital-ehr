import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import StatusPill from "../components/StatusPill";
import { visitsApi, patientsApi } from "../api/endpoints";

const BLANK_VITALS = {
  temperature_celsius: "",
  systolic_bp: "",
  diastolic_bp: "",
  pulse_bpm: "",
  respiratory_rate: "",
  weight_kg: "",
  height_cm: "",
};

export default function NursePage() {
  const [pageMode, setPageMode] = useState("triage");

  const [queue, setQueue] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [vitals, setVitals] = useState(BLANK_VITALS);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [awaitingBed, setAwaitingBed] = useState([]);
  const [bedForms, setBedForms] = useState({});
  const [bedLoadingId, setBedLoadingId] = useState(null);

  const loadQueue = async () => {
    try {
      const visits = await visitsApi.list("waiting");
      setQueue(visits);
      const names = {};
      for (const v of visits) {
        if (!patientNames[v.patient_id]) {
          try {
            const p = await patientsApi.get(v.patient_id);
            names[v.patient_id] = `${p.first_name} ${p.last_name}`;
          } catch {
            names[v.patient_id] = `Patient #${v.patient_id}`;
          }
        }
      }
      setPatientNames((prev) => ({ ...prev, ...names }));
    } catch {
      setError("Couldn't load the queue.");
    }
  };

  const loadAwaitingBed = async () => {
    try {
      const visits = await visitsApi.getAwaitingBed();
      setAwaitingBed(visits);
      const names = {};
      for (const v of visits) {
        if (!patientNames[v.patient_id]) {
          try {
            const p = await patientsApi.get(v.patient_id);
            names[v.patient_id] = `${p.first_name} ${p.last_name}`;
          } catch {
            names[v.patient_id] = `Patient #${v.patient_id}`;
          }
        }
      }
      setPatientNames((prev) => ({ ...prev, ...names }));
    } catch {
      setError("Couldn't load patients awaiting bed assignment.");
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadQueue, 0);
    const interval = setInterval(loadQueue, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (pageMode === "beds") loadAwaitingBed();
  }, [pageMode]);

  const handleSelectVisit = (visit) => {
    setSelectedVisit(visit);
    setVitals(BLANK_VITALS);
    setError("");
    setSuccess("");
  };

  const updateVital = (key, value) => setVitals((v) => ({ ...v, [key]: value }));

  const handleSubmitVitals = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(vitals).map(([k, v]) => [k, v === "" ? null : Number(v)])
      );
      await visitsApi.recordVitals(selectedVisit.id, payload);
      setSuccess(`Vitals recorded for ${patientNames[selectedVisit.patient_id] || "patient"}. Sent to doctor's queue.`);
      setSelectedVisit(null);
      loadQueue();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't save vitals.");
    } finally {
      setLoading(false);
    }
  };

  const updateBedForm = (visitId, key, value) => {
    setBedForms((f) => ({ ...f, [visitId]: { ...(f[visitId] || {}), [key]: value } }));
  };

  const handleAssignBed = async (visitId) => {
    const form = bedForms[visitId] || {};
    if (!form.ward || !form.bed_number) {
      setError("Please enter both ward and bed number.");
      return;
    }
    setError(""); setSuccess(""); setBedLoadingId(visitId);
    try {
      await visitsApi.assignBed(visitId, form.ward, form.bed_number);
      setSuccess(`Bed assigned for ${patientNames[awaitingBed.find(v => v.id === visitId)?.patient_id] || "patient"}.`);
      setBedForms((f) => { const n = { ...f }; delete n[visitId]; return n; });
      loadAwaitingBed();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't assign bed.");
    } finally {
      setBedLoadingId(null);
    }
  };

  return (
    <div>
      <TopBar title="Nursing Station" />
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "var(--space-6)" }}>

        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
          <ModeBtn active={pageMode === "triage"} onClick={() => setPageMode("triage")}>Triage</ModeBtn>
          <ModeBtn active={pageMode === "beds"} onClick={() => setPageMode("beds")}>
            Bed Assignment {awaitingBed.length > 0 ? `(${awaitingBed.length})` : ""}
          </ModeBtn>
        </div>

        {error && <div style={{ marginBottom: "var(--space-4)" }}><ErrorBanner message={error} /></div>}
        {success && <div style={{ marginBottom: "var(--space-4)" }}><SuccessBanner message={success} /></div>}

        {pageMode === "beds" ? (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Patients awaiting bed assignment</h3>
            {awaitingBed.length === 0 && (
              <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No patients waiting for a bed right now.</p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {awaitingBed.map((v) => {
                const form = bedForms[v.id] || {};
                return (
                  <div key={v.id} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", padding: "var(--space-3) var(--space-4)" }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                      {patientNames[v.patient_id] || `Patient #${v.patient_id}`}
                    </div>
                    {v.chief_complaint && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginBottom: 8 }}>{v.chief_complaint}</div>}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 8, alignItems: "flex-end" }}>
                      <Field label="Ward">
                        <input style={inputStyle} value={form.ward || ""} onChange={e => updateBedForm(v.id, "ward", e.target.value)} placeholder="e.g. Medical Ward A" />
                      </Field>
                      <Field label="Bed number">
                        <input style={inputStyle} value={form.bed_number || ""} onChange={e => updateBedForm(v.id, "bed_number", e.target.value)} placeholder="e.g. Bed 12" />
                      </Field>
                      <Button onClick={() => handleAssignBed(v.id)} disabled={bedLoadingId === v.id} style={{ padding: "10px 16px" }}>
                        {bedLoadingId === v.id ? "Assigning..." : "Assign bed"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "var(--space-5)" }}>
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Waiting for triage</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {queue.length === 0 && (
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>No patients waiting right now.</p>
              )}
              {queue.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleSelectVisit(v)}
                  style={{
                    textAlign: "left",
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: selectedVisit?.id === v.id ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
                    background: selectedVisit?.id === v.id ? "var(--color-primary-light)" : "var(--color-surface)",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px" }}>
                      {patientNames[v.patient_id] || `Patient #${v.patient_id}`}
                    </span>
                    <StatusPill status={v.status} />
                  </div>
                  {v.chief_complaint && (
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)", marginTop: "4px" }}>
                      {v.chief_complaint}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Record vitals</h3>
            {!selectedVisit ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
                Select a patient from the waiting queue to record their vitals.
              </p>
            ) : (
              <form onSubmit={handleSubmitVitals} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <p style={{ fontWeight: 600, fontSize: "14px", margin: 0 }}>
                  {patientNames[selectedVisit.patient_id]}
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                  <Field label="Temperature (°C)">
                    <input type="number" step="0.1" style={inputStyle} value={vitals.temperature_celsius} onChange={(e) => updateVital("temperature_celsius", e.target.value)} />
                  </Field>
                  <Field label="Pulse (bpm)">
                    <input type="number" style={inputStyle} value={vitals.pulse_bpm} onChange={(e) => updateVital("pulse_bpm", e.target.value)} />
                  </Field>
                  <Field label="Systolic BP">
                    <input type="number" style={inputStyle} value={vitals.systolic_bp} onChange={(e) => updateVital("systolic_bp", e.target.value)} />
                  </Field>
                  <Field label="Diastolic BP">
                    <input type="number" style={inputStyle} value={vitals.diastolic_bp} onChange={(e) => updateVital("diastolic_bp", e.target.value)} />
                  </Field>
                  <Field label="Respiratory rate">
                    <input type="number" style={inputStyle} value={vitals.respiratory_rate} onChange={(e) => updateVital("respiratory_rate", e.target.value)} />
                  </Field>
                  <Field label="Weight (kg)">
                    <input type="number" step="0.1" style={inputStyle} value={vitals.weight_kg} onChange={(e) => updateVital("weight_kg", e.target.value)} />
                  </Field>
                  <Field label="Height (cm)">
                    <input type="number" step="0.1" style={inputStyle} value={vitals.height_cm} onChange={(e) => updateVital("height_cm", e.target.value)} />
                  </Field>
                </div>

                <Button type="submit" disabled={loading} style={{ marginTop: "var(--space-2)" }}>
                  {loading ? "Saving..." : "Save vitals & send to doctor"}
                </Button>
              </form>
            )}
          </Card>
        </div>
        )}
      </div>
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