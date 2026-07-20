import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import StatusPill from "../components/StatusPill";
import { visitsApi, patientsApi, labApi, pharmacyApi } from "../api/endpoints";

const BLANK_DIAGNOSIS = { condition: "", icd10_code: "", notes: "" };
const BLANK_PRESCRIPTION = { medication_name: "", dosage: "", frequency: "", duration: "", instructions: "" };
const BLANK_LAB = { test_name: "", test_category: "", notes: "" };

export default function DoctorPage() {
  const [pageMode, setPageMode] = useState("consult");

  const [queue, setQueue] = useState([]);
  const [inpatients, setInpatients] = useState([]);
  const [patientNames, setPatientNames] = useState({});
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [visitDetail, setVisitDetail] = useState(null);
  const [patient, setPatient] = useState(null);
  const [history, setHistory] = useState([]);
  const [labTests, setLabTests] = useState([]);
  const [dispensingByPrescription, setDispensingByPrescription] = useState({});
  const [activeTab, setActiveTab] = useState("queue");
  const [diagnosisForm, setDiagnosisForm] = useState(BLANK_DIAGNOSIS);
  const [prescriptionForm, setPrescriptionForm] = useState(BLANK_PRESCRIPTION);
  const [labForm, setLabForm] = useState(BLANK_LAB);
  const [admitWard, setAdmitWard] = useState("");
  const [admitBed, setAdmitBed] = useState("");
  const [dischargeNotes, setDischargeNotes] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const [medicines, setMedicines] = useState([]);
  const [pharmacyLoading, setPharmacyLoading] = useState(false);
  const [labCatalog, setLabCatalog] = useState([]);

  const loadQueue = async () => {
    try {
      const [visits, ip] = await Promise.all([visitsApi.list("with_doctor"), visitsApi.getActiveInpatients()]);
      setQueue(visits); setInpatients(ip);
      const names = {};
      for (const v of [...visits, ...ip]) {
        if (!patientNames[v.patient_id]) {
          try { const p = await patientsApi.get(v.patient_id); names[v.patient_id] = `${p.first_name} ${p.last_name}`; }
          catch { names[v.patient_id] = `Patient #${v.patient_id}`; }
        }
      }
      setPatientNames(prev => ({ ...prev, ...names }));
    } catch { setError("Could not load queue."); }
  };

  const loadPharmacy = async () => {
    setPharmacyLoading(true);
    try { setMedicines(await pharmacyApi.getMedicines()); }
    catch { setError("Could not load pharmacy inventory."); }
    finally { setPharmacyLoading(false); }
  };

  useEffect(() => {
    const t = setTimeout(loadQueue, 0);
    const i = setInterval(loadQueue, 15000);
    loadPharmacy();
    labApi.getCatalog().then(setLabCatalog).catch(() => {});
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);

  useEffect(() => {
    if (pageMode === "pharmacy") loadPharmacy();
  }, [pageMode]);

  const loadDispensingStatus = async (prescriptions) => {
    const statusMap = {};
    for (const p of prescriptions || []) {
      try {
        statusMap[p.id] = await pharmacyApi.getDispensings(p.id);
      } catch { statusMap[p.id] = []; }
    }
    setDispensingByPrescription(statusMap);
  };

  const handleSelectVisit = async (visit) => {
    setSelectedVisit(visit);
    setDiagnosisForm(BLANK_DIAGNOSIS); setPrescriptionForm(BLANK_PRESCRIPTION); setLabForm(BLANK_LAB);
    setAdmitWard(""); setAdmitBed(""); setDischargeNotes("");
    setError(""); setSuccess("");
    try {
      const [detail, patientData, historyData, tests] = await Promise.all([
        visitsApi.getDetail(visit.id), patientsApi.get(visit.patient_id),
        visitsApi.getPatientHistory(visit.patient_id), labApi.getVisitTests(visit.id),
      ]);
      setVisitDetail(detail); setPatient(patientData);
      setHistory(historyData.filter(h => h.id !== visit.id)); setLabTests(tests);
      await loadDispensingStatus(detail.prescriptions);
    } catch { setError("Could not load patient details."); }
  };

  const refresh = async () => {
    if (!selectedVisit) return;
    const [detail, tests] = await Promise.all([visitsApi.getDetail(selectedVisit.id), labApi.getVisitTests(selectedVisit.id)]);
    setVisitDetail(detail); setLabTests(tests);
    await loadDispensingStatus(detail.prescriptions);
  };

  const handleAddDiagnosis = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await visitsApi.addDiagnosis(selectedVisit.id, diagnosisForm); setDiagnosisForm(BLANK_DIAGNOSIS); await refresh(); setSuccess("Diagnosis added."); }
    catch (err) { setError(err.response?.data?.detail || "Could not add diagnosis."); }
    finally { setLoading(false); }
  };

  const handleAddPrescription = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await visitsApi.addPrescription(selectedVisit.id, prescriptionForm); setPrescriptionForm(BLANK_PRESCRIPTION); await refresh(); setSuccess("Prescription added."); }
    catch (err) { setError(err.response?.data?.detail || "Could not add prescription."); }
    finally { setLoading(false); }
  };

  const handleOrderLab = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await labApi.orderTest({ visit_id: selectedVisit.id, ...labForm }); setLabForm(BLANK_LAB); await refresh(); setSuccess("Lab test ordered."); }
    catch (err) { setError(err.response?.data?.detail || "Could not order lab test."); }
    finally { setLoading(false); }
  };

  const handleAdmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await visitsApi.admit(selectedVisit.id, admitWard, admitBed); setSuccess("Patient admitted to ward."); loadQueue(); await refresh(); }
    catch (err) { setError(err.response?.data?.detail || "Could not admit patient."); }
    finally { setLoading(false); }
  };

  const handleDischarge = async () => {
    if (!dischargeNotes) { setError("Please enter discharge notes."); return; }
    setError(""); setLoading(true);
    try { await visitsApi.discharge(selectedVisit.id, dischargeNotes); setSuccess("Patient discharged."); setSelectedVisit(null); setVisitDetail(null); loadQueue(); }
    catch (err) { setError(err.response?.data?.detail || "Could not discharge patient."); }
    finally { setLoading(false); }
  };

  const handleComplete = async () => {
    setError(""); setLoading(true);
    try { await visitsApi.updateStatus(selectedVisit.id, "completed"); setSuccess("Visit completed."); setSelectedVisit(null); setVisitDetail(null); loadQueue(); }
    catch (err) { setError(err.response?.data?.detail || "Could not complete visit."); }
    finally { setLoading(false); }
  };

  const displayQueue = activeTab === "queue" ? queue : inpatients;

  return (
    <div>
      <TopBar title="Consultation" />
      <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "var(--space-6)" }}>

        <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-4)" }}>
          <ModeBtn active={pageMode === "consult"} onClick={() => setPageMode("consult")}>Consultations</ModeBtn>
          <ModeBtn active={pageMode === "pharmacy"} onClick={() => setPageMode("pharmacy")}>Pharmacy Inventory</ModeBtn>
        </div>

        {pageMode === "pharmacy" ? (
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Pharmacy inventory (view only)</h3>
            {pharmacyLoading && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Loading...</p>}
            {!pharmacyLoading && (
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "8px 12px", fontSize: 12, fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>
                  <span>Medicine</span><span>Category</span><span>Amount</span><span>Unit of measure</span><span>Price (KES)</span>
                </div>
                {medicines.map(m => (
                  <div key={m.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 8, padding: "10px 12px", fontSize: 13, borderRadius: "var(--radius-sm)", background: m.stock_quantity <= m.reorder_level ? "var(--color-warning-light)" : "transparent" }}>
                    <span style={{ fontWeight: 500 }}>{m.name}</span>
                    <span style={{ color: "var(--color-text-muted)" }}>{m.category || "—"}</span>
                    <span style={{ color: m.stock_quantity <= m.reorder_level ? "var(--color-warning)" : "var(--color-text)" }}>{m.stock_quantity}</span>
                    <span style={{ color: "var(--color-text)" }}>{m.unit}</span>
                    <span>{m.unit_price.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ) : (
        <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.5fr", gap: "var(--space-5)" }}>
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: "var(--space-3)" }}>
              {["queue", "inpatients"].map(t => (
                <button key={t} onClick={() => setActiveTab(t)} style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: activeTab === t ? "1px solid var(--color-primary)" : "1px solid var(--color-border)", background: activeTab === t ? "var(--color-primary-light)" : "var(--color-surface)", color: activeTab === t ? "var(--color-primary-dark)" : "var(--color-text-muted)", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  {t === "queue" ? `Queue ${queue.length > 0 ? `(${queue.length})` : ""}` : `Inpatients ${inpatients.length > 0 ? `(${inpatients.length})` : ""}`}
                </button>
              ))}
            </div>
            <Card>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {displayQueue.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No patients here right now.</p>}
                {displayQueue.map(v => (
                  <button key={v.id} onClick={() => handleSelectVisit(v)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: selectedVisit?.id === v.id ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", background: selectedVisit?.id === v.id ? "var(--color-primary-light)" : "var(--color-surface)", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{patientNames[v.patient_id] || `Patient #${v.patient_id}`}</span>
                      <StatusPill status={v.status} />
                    </div>
                    {v.ward && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{v.ward} · {v.bed_number}</div>}
                    {v.chief_complaint && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{v.chief_complaint}</div>}
                  </button>
                ))}
              </div>
            </Card>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {error && <ErrorBanner message={error} />}
            {success && <SuccessBanner message={success} />}

            {!selectedVisit ? (
              <Card><p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Select a patient to begin consultation.</p></Card>
            ) : (
              <>
                <Card>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <h3>{patient?.first_name} {patient?.last_name}</h3>
                      <p style={{ fontSize: 13, color: "var(--color-text-muted)", margin: "4px 0 0" }}>{patient?.patient_number} · {patient?.age}y, {patient?.gender} · {patient?.phone_number}</p>
                      {patient?.allergies && <p style={{ fontSize: 13, color: "var(--color-danger)", marginTop: 6, fontWeight: 600 }}>⚠ Allergies: {patient.allergies}</p>}
                      <p style={{ fontSize: 12, marginTop: 6, color: "var(--color-text-muted)" }}>
                        Type: <strong>{visitDetail?.visit_type}</strong>
                        {visitDetail?.ward && <> · Ward: <strong>{visitDetail.ward}</strong> · Bed: <strong>{visitDetail.bed_number}</strong></>}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      {visitDetail?.visit_type === "inpatient" && visitDetail?.status === "admitted"
                        ? <Button variant="secondary" disabled={loading} onClick={handleDischarge}>Discharge</Button>
                        : <Button variant="secondary" disabled={loading} onClick={handleComplete}>Complete visit</Button>
                      }
                    </div>
                  </div>
                  <p style={{ fontSize: 13, marginTop: "var(--space-3)" }}><strong>Chief complaint:</strong> {selectedVisit.chief_complaint || "Not recorded"}</p>
                  {visitDetail?.vitals && (
                    <div style={{ marginTop: "var(--space-3)", padding: "var(--space-3)", background: "var(--color-bg)", borderRadius: "var(--radius-sm)", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--space-2)", fontSize: 13 }}>
                      <VitalStat label="Temp" value={visitDetail.vitals.temperature_celsius ? `${visitDetail.vitals.temperature_celsius}°C` : "—"} />
                      <VitalStat label="BP" value={visitDetail.vitals.systolic_bp ? `${visitDetail.vitals.systolic_bp}/${visitDetail.vitals.diastolic_bp}` : "—"} />
                      <VitalStat label="Pulse" value={visitDetail.vitals.pulse_bpm ? `${visitDetail.vitals.pulse_bpm} bpm` : "—"} />
                      <VitalStat label="BMI" value={visitDetail.vitals.bmi ?? "—"} />
                    </div>
                  )}
                  {visitDetail?.visit_type === "inpatient" && visitDetail?.status === "admitted" && (
                    <div style={{ marginTop: "var(--space-3)" }}>
                      <Field label="Discharge notes">
                        <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={dischargeNotes} onChange={e => setDischargeNotes(e.target.value)} placeholder="Summary for discharge..." />
                      </Field>
                    </div>
                  )}
                </Card>

                <Card>
                  <h4 style={{ marginBottom: "var(--space-3)" }}>Diagnoses</h4>
                  {visitDetail?.diagnoses?.length > 0 && (
                    <ul style={{ margin: "0 0 var(--space-3)", paddingLeft: 18, fontSize: 13 }}>
                      {visitDetail.diagnoses.map(d => <li key={d.id}>{d.condition}{d.icd10_code ? ` (${d.icd10_code})` : ""}{d.notes ? ` — ${d.notes}` : ""}</li>)}
                    </ul>
                  )}
                  <form onSubmit={handleAddDiagnosis} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
                    <Field label="Condition" required><input style={inputStyle} value={diagnosisForm.condition} onChange={e => setDiagnosisForm(f => ({ ...f, condition: e.target.value }))} required /></Field>
                    <Field label="ICD-10 code"><input style={inputStyle} value={diagnosisForm.icd10_code} onChange={e => setDiagnosisForm(f => ({ ...f, icd10_code: e.target.value }))} /></Field>
                    <div style={{ gridColumn: "1 / -1" }}><Field label="Notes"><input style={inputStyle} value={diagnosisForm.notes} onChange={e => setDiagnosisForm(f => ({ ...f, notes: e.target.value }))} /></Field></div>
                    <div style={{ gridColumn: "1 / -1" }}><Button type="submit" variant="secondary" disabled={loading}>Add diagnosis</Button></div>
                  </form>
                </Card>

                <Card>
                  <h4 style={{ marginBottom: "var(--space-3)" }}>Lab / Blood tests</h4>
                  {labTests.length > 0 && (
                    <div style={{ marginBottom: "var(--space-3)", display: "flex", flexDirection: "column", gap: 6 }}>
                      {labTests.map(t => (
                        <div key={t.id} style={{ fontSize: 13, padding: "8px 12px", background: "var(--color-bg)", borderRadius: "var(--radius-sm)" }}>
                          <span style={{ fontWeight: 500 }}>{t.test_name}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: t.status === "completed" ? "var(--color-success)" : "var(--color-warning)", fontWeight: 600, textTransform: "uppercase" }}>{t.status}</span>
                          {t.result && <div style={{ marginTop: 4, color: "var(--color-text-muted)" }}>Result: {t.result.result_value} {t.result.reference_range ? `(ref: ${t.result.reference_range})` : ""}</div>}
                          {t.result?.interpretation && <div style={{ color: "var(--color-text-muted)", fontSize: 12 }}>{t.result.interpretation}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                  <form onSubmit={handleOrderLab} style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-3)" }}>
                    <Field label="Test name" required>
                      <select style={inputStyle} value={labForm.test_name} onChange={e => {
                        const chosen = labCatalog.find(c => c.test_name === e.target.value);
                        setLabForm(f => ({ ...f, test_name: e.target.value, test_category: chosen?.category || "" }));
                      }} required>
                        <option value="">Select test...</option>
                        {labCatalog.map(c => <option key={c.id} value={c.test_name}>{c.test_name}{c.category ? ` (${c.category})` : ""}</option>)}
                      </select>
                    </Field>
                    <Field label="Category"><input style={inputStyle} value={labForm.test_category} readOnly placeholder="Auto-filled from test" /></Field>
                    <div style={{ gridColumn: "1 / -1" }}><Field label="Notes for lab"><input style={inputStyle} value={labForm.notes} onChange={e => setLabForm(f => ({ ...f, notes: e.target.value }))} /></Field></div>
                    <div style={{ gridColumn: "1 / -1" }}><Button type="submit" variant="secondary" disabled={loading}>Order test</Button></div>
                  </form>
                </Card>

                <Card>
                  <h4 style={{ marginBottom: "var(--space-3)" }}>Prescriptions</h4>
                  {visitDetail?.prescriptions?.length > 0 && (
                    <div style={{ marginBottom: "var(--space-3)", display: "flex", flexDirection: "column", gap: 6 }}>
                      {visitDetail.prescriptions.map(p => {
                        const dispensings = dispensingByPrescription[p.id] || [];
                        const totalDispensed = dispensings.reduce((sum, d) => sum + d.quantity_dispensed, 0);
                        return (
                          <div key={p.id} style={{ fontSize: 13, padding: "8px 12px", background: "var(--color-bg)", borderRadius: "var(--radius-sm)" }}>
                            <span style={{ fontWeight: 500 }}>{p.medication_name} {p.dosage}</span>
                            <span style={{ color: "var(--color-text-muted)" }}> — {p.frequency}, {p.duration}</span>
                            <div style={{ marginTop: 4 }}>
                              {dispensings.length > 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-success)", textTransform: "uppercase" }}>
                                  Dispensed ({totalDispensed} units)
                                </span>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-warning)", textTransform: "uppercase" }}>
                                  Not yet dispensed
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <form onSubmit={handleAddPrescription} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                    <Field label="Medication" required>
                      <select style={inputStyle} value={prescriptionForm.medication_name} onChange={e => setPrescriptionForm(f => ({ ...f, medication_name: e.target.value }))} required>
                        <option value="">Select medicine...</option>
                        {medicines.map(m => <option key={m.id} value={m.name}>{m.name} ({m.unit})</option>)}
                      </select>
                    </Field>
                    <Field label="Dosage" required><input style={inputStyle} value={prescriptionForm.dosage} onChange={e => setPrescriptionForm(f => ({ ...f, dosage: e.target.value }))} placeholder="e.g. 500mg" required /></Field>
                    <Field label="Frequency" required>
                      <select style={inputStyle} value={prescriptionForm.frequency} onChange={e => setPrescriptionForm(f => ({ ...f, frequency: e.target.value }))} required>
                        <option value="">Select frequency...</option>
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Four times daily">Four times daily</option>
                        <option value="Every 6 hours">Every 6 hours</option>
                        <option value="Every 8 hours">Every 8 hours</option>
                        <option value="Every 12 hours">Every 12 hours</option>
                        <option value="As needed">As needed</option>
                      </select>
                    </Field>
                    <Field label="Duration" required><input style={inputStyle} value={prescriptionForm.duration} onChange={e => setPrescriptionForm(f => ({ ...f, duration: e.target.value }))} placeholder="e.g. 7 days" required /></Field>
                    <div style={{ gridColumn: "1 / -1" }}><Field label="Instructions"><input style={inputStyle} value={prescriptionForm.instructions} onChange={e => setPrescriptionForm(f => ({ ...f, instructions: e.target.value }))} /></Field></div>
                    <div style={{ gridColumn: "1 / -1" }}><Button type="submit" variant="secondary" disabled={loading}>Add prescription</Button></div>
                  </form>
                </Card>

                {visitDetail?.status === "with_doctor" && (
                  <Card>
                    <h4 style={{ marginBottom: "var(--space-3)" }}>Admit as inpatient</h4>
                    <form onSubmit={handleAdmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
                      <Field label="Ward" required><input style={inputStyle} value={admitWard} onChange={e => setAdmitWard(e.target.value)} placeholder="e.g. Medical Ward A" required /></Field>
                      <Field label="Bed number" required><input style={inputStyle} value={admitBed} onChange={e => setAdmitBed(e.target.value)} placeholder="e.g. Bed 12" required /></Field>
                      <div style={{ gridColumn: "1 / -1" }}><Button type="submit" variant="secondary" disabled={loading}>Admit patient</Button></div>
                    </form>
                  </Card>
                )}

                {history.length > 0 && (
                  <Card>
                    <h4 style={{ marginBottom: "var(--space-3)" }}>Past visits</h4>
                    {history.map(h => (
                      <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid var(--color-border)" }}>
                        <span>{new Date(h.checked_in_at).toLocaleDateString()} — {h.chief_complaint || "No complaint"}</span>
                        <StatusPill status={h.status} />
                      </div>
                    ))}
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function VitalStat({ label, value }) {
  return (
    <div>
      <div style={{ color: "var(--color-text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value}</div>
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