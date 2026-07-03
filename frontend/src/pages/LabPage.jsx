import { useState, useEffect } from "react";
import TopBar from "../components/TopBar";
import { Card, Button, Field, inputStyle, ErrorBanner, SuccessBanner } from "../components/ui";
import { labApi } from "../api/endpoints";

export default function LabPage() {
  const [pendingTests, setPendingTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [resultValue, setResultValue] = useState("");
  const [referenceRange, setReferenceRange] = useState("");
  const [interpretation, setInterpretation] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const loadTests = async () => {
    try { setPendingTests(await labApi.getPendingTests()); }
    catch { setError("Could not load pending tests."); }
  };

  useEffect(() => {
    const t = setTimeout(loadTests, 0);
    const i = setInterval(loadTests, 15000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, []);

  const handleSelectTest = (test) => {
    setSelectedTest(test); setResultValue(""); setReferenceRange(""); setInterpretation("");
    setError(""); setSuccess("");
  };

  const handleRecordResult = async (e) => {
    e.preventDefault(); setError(""); setSuccess(""); setLoading(true);
    try {
      await labApi.recordResult(selectedTest.id, { result_value: resultValue, reference_range: referenceRange, interpretation });
      setSuccess(`Result recorded for ${selectedTest.test_name}.`);
      setSelectedTest(null); loadTests();
    } catch (err) { setError(err.response?.data?.detail || "Could not record result."); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <TopBar title="Laboratory" />
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "var(--space-6)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: "var(--space-5)" }}>
          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Pending tests</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {pendingTests.length === 0 && <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>No pending tests right now.</p>}
              {pendingTests.map(test => (
                <button key={test.id} onClick={() => handleSelectTest(test)} style={{ textAlign: "left", padding: "12px 14px", borderRadius: "var(--radius-sm)", border: selectedTest?.id === test.id ? "2px solid var(--color-primary)" : "1px solid var(--color-border)", background: selectedTest?.id === test.id ? "var(--color-primary-light)" : "var(--color-surface)", cursor: "pointer" }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{test.test_name}</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{test.test_category || "General"} · Visit #{test.visit_id}</div>
                  {test.notes && <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>{test.notes}</div>}
                </button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 style={{ marginBottom: "var(--space-4)" }}>Record result</h3>
            {!selectedTest ? (
              <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Select a test from the pending queue.</p>
            ) : (
              <form onSubmit={handleRecordResult} style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                <div style={{ padding: "var(--space-3)", background: "var(--color-bg)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                  <strong>{selectedTest.test_name}</strong>
                  {selectedTest.test_category && <span style={{ color: "var(--color-text-muted)" }}> · {selectedTest.test_category}</span>}
                  {selectedTest.notes && <div style={{ marginTop: 4, color: "var(--color-text-muted)" }}>Notes: {selectedTest.notes}</div>}
                </div>
                <Field label="Result value" required>
                  <input style={inputStyle} value={resultValue} onChange={e => setResultValue(e.target.value)} placeholder="e.g. Positive, 11.2 g/dL" required />
                </Field>
                <Field label="Reference range">
                  <input style={inputStyle} value={referenceRange} onChange={e => setReferenceRange(e.target.value)} placeholder="e.g. Negative, 12-16 g/dL" />
                </Field>
                <Field label="Interpretation">
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={interpretation} onChange={e => setInterpretation(e.target.value)} placeholder="Any additional notes..." />
                </Field>
                <ErrorBanner message={error} />
                <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Record result"}</Button>
              </form>
            )}
            {success && <div style={{ marginTop: "var(--space-3)" }}><SuccessBanner message={success} /></div>}
          </Card>
        </div>
      </div>
    </div>
  );
}