import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import StatusPill from "../components/StatusPill";
import { visitsApi, patientsApi } from "../api/endpoints";

const BLANK_DIAGNOSIS = { condition: "", icd10_code: "", notes: "" };
const BLANK_PRESCRIPTION = { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" };

export default function DoctorPage() {
  const [queue, setQueue] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [visitDetail, setVisitDetail] = useState(null);
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);

  const [diagnosisForm, setDiagnosisForm] = useState(BLANK_DIAGNOSIS);
  const [prescriptionForm, setPrescriptionForm] = useState(BLANK_PRESCRIPTION);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadQueue = async () => {
    try {
      const visits = await visitsApi.list("with_doctor");
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

  useEffect(() => {
    const timer = setTimeout(loadQueue, 0);
    const interval = setInterval(loadQueue, 15000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setDiagnosisForm(BLANK_DIAGNOSIS);
    setPrescriptionForm(BLANK_PRESCRIPTION);
    setError("");
    setSuccess("");
    try {
      const [detail, patientData, historyData] = await Promise.all([
        visitsApi.getDetail(visit.id),
        patientsApi.get(visit.patient_id),
        visitsApi.getPatientHistory(visit.patient_id),
      ]);
      setVisitDetail(detail);
      setPatient(patientData);
      setHistory(historyData.filter((h) => h.id !== visit.id));
    } catch {
      setError("Couldn't load patient details.");
    }
  };

  const refreshVisitDetail = async () => {
    if (!selectedVisit) return;
    const detail = await visitsApi.getDetail(selectedVisit.id);
    setVisitDetail(detail);
  };

  const handleAddDiagnosis = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await visitsApi.addDiagnosis(selectedVisit.id, diagnosisForm);
      setDiagnosisForm(BLANK_DIAGNOSIS);
      await refreshVisitDetail();
      setSuccess("Diagnosis added.");
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't add diagnosis.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await visitsApi.addPrescription(selectedVisit.id, prescriptionForm);
      setPrescriptionForm(BLANK_PRESCRIPTION);
      await refreshVisitDetail();
      setSuccess("Prescription added.");
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't add prescription.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteVisit = async () => {
    setError("");
    setLoading(true);
    try {
      await visitsApi.updateStatus(selectedVisit.id, "completed");
      setSuccess("Visit marked as completed.");
      setSelectedVisit(null);
      setVisitDetail(null);
      setPatient(null);
      loadQueue();
    } catch (err) {
      setError(err.response?.data?.detail || "Couldn't complete the visit.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="Consultation" />
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "var(--space-6)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr", gap: "var(--space-5)" }}>
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Ready for consultation</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {queue.length === 0 && (
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>No patients waiting for you right now.</p>
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

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {!selectedVisit ? (
              <Card>
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>
                  Select a patient from the queue to begin the consultation.
                </p>
              </Card>
            ) : (
              <>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3>{patient?.first_name} {patient?.last_name}</h3>
                      <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "4px 0 0" }}>
                        {patient?.patient_number} · {patient?.age}y, {patient?.gender} · {patient?.phone_number}
                      </p>
                      {patient?.allergies && (
                        <p style={{ fontSize: "13px", color: "var(--color-danger)", marginTop: "6px", fontWeight: 600 }}>
                          Allergies: {patient.allergies}
                        </p>
                      )}
                    </div>
                    <Button variant="secondary" onClick={handleCompleteVisit} disabled={loading}>
                      Mark visit complete
                    </Button>
                  </div>

                  <p style={{ fontSize: "13px", marginTop: "var(--space-3)" }}>
                    <strong>Chief complaint:</strong> {selectedVisit.chief_complaint || "Not recorded"}
                  </p>

                  {visitDetail?.vitals && (
                    <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--color-bg)", borderRadius: "var(--radius-sm)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", fontSize: "13px" }}>
                      <VitalStat label="Temp" value={visitDetail.vitals.temperature_celsius ? `${visitDetail.vitals.temperature_celsius}°C` : "—"} />
                      <VitalStat label="BP" value={visitDetail.vitals.systolic_bp ? `${visitDetail.vitals.systolic_bp}/${visitDetail.vitals.diastolic_bp}` : "—"} />
                      <VitalStat label="Pulse" value={visitDetail.vitals.pulse_bpm ? `${visitDetail.vitals.pulse_bpm} bpm` : "—"} />
                      <VitalStat label="BMI" value={visitDetail.vitals.bmi ?? "—"} />
                    </div>
                  )}
                </Card>

                <Card>
                  <h4 style={{ marginBottom: "var(--space-3)" }}>Diagnoses</h4>
                  {visitDetail?.diagnoses?.length > 0 && (
                    <ul style={{ margin: "0 0 var(--space-3)", paddingLeft: "18px", fontSize: "13px" }}>
                      {visitDetail.diagnoses.map((d) => (
                        <li key={d.id}>{d.condition}{d.icd10_code ? ` (${d.icd10_code})` : ""}{d.notes ? ` — ${d.notes}` : ""}</li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={handleAddDiagnosis} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
                    <Field label="Condition" required>
                      <input style={inputStyle} value={diagnosisForm.condition} onChange={(e) => setDiagnosisForm((f) => ({ ...f, condition: e.target.value }))} required />
                    </Field>
                    <Field label="ICD-10 code (optional)">
                      <input style={inputStyle} value={diagnosisForm.icd10_code} onChange={(e) => setDiagnosisForm((f) => ({ ...f, icd10_code: e.target.value }))} />
                    </Field>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Notes">
                        <input style={inputStyle} value={diagnosisForm.notes} onChange={(e) => setDiagnosisForm((f) => ({ ...f, notes: e.target.value }))} />
                      </Field>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Button type="submit" variant="secondary" disabled={loading}>Add diagnosis</Button>
                    </div>
                  </form>
                </Card>

                <Card>
                  <h4 style={{ marginBottom: "var(--space-3)" }}>Prescriptions</h4>
                  {visitDetail?.prescriptions?.length > 0 && (
                    <ul style={{ margin: "0 0 var(--space-3)", paddingLeft: "18px", fontSize: "13px" }}>
                      {visitDetail.prescriptions.map((p) => (
                        <li key={p.id}>{p.medication_name} {p.dosage} — {p.frequency}, {p.duration}</li>
                      ))}
                    </ul>
                  )}
                  <form onSubmit={handleAddPrescription} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                    <Field label="Medication" required>
                      <input style={inputStyle} value={prescriptionForm.medication_name} onChange={(e) => setPrescriptionForm((f) => ({ ...f, medication_name: e.target.value }))} required />
                    </Field>
                    <Field label="Dosage" required>
                      <input style={inputStyle} value={prescriptionForm.dosage} onChange={(e) => setPrescriptionForm((f) => ({ ...f, dosage: e.target.value }))} required placeholder="e.g. 500mg" />
                    </Field>
                    <Field label="Frequency" required>
                      <input style={inputStyle} value={prescriptionForm.frequency} onChange={(e) => setPrescriptionForm((f) => ({ ...f, frequency: e.target.value }))} required placeholder="e.g. 3 times a day" />
                    </Field>
                    <Field label="Duration" required>
                      <input style={inputStyle} value={prescriptionForm.duration} onChange={(e) => setPrescriptionForm((f) => ({ ...f, duration: e.target.value }))} required placeholder="e.g. 7 days" />
                    </Field>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Field label="Instructions">
                        <input style={inputStyle} value={prescriptionForm.instructions} onChange={(e) => setPrescriptionForm((f) => ({ ...f, instructions: e.target.value }))} placeholder="e.g. Take after meals" />
                      </Field>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <Button type="submit" variant="secondary" disabled={loading}>Add prescription</Button>
                    </div>
                  </form>
                </Card>

                {history.length > 0 && (
                  <Card>
                    <h4 style={{ marginBottom: "var(--space-3)" }}>Past visits</h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {history.map((h) => (
                        <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                          <span>{new Date(h.checked_in_at).toLocaleDateString()} — {h.chief_complaint || "No complaint recorded"}</span>
                          <StatusPill status={h.status} />
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VitalStat({ label, value }) {
  return (
    <div>
      <div style={{ color: "var(--color-text-muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
    </div>
  );
}
