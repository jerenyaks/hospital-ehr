import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Field, inputStyle, ErrorBanner } from "../components/ui";

const ROLE_HOME = {
  admin: "/admin",
  doctor: "/doctor",
  nurse: "/nurse",
  receptionist: "/reception",
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(ROLE_HOME[user.role] || "/login");
    } catch (err) {
      if (err.response?.status === 401) {
        setError("Incorrect email or password.");
      } else {
        setError("Couldn't reach the server. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--color-bg)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "400px", padding: "var(--space-4)" }}>
        <div style={{ textAlign: "center", marginBottom: "var(--space-6)" }}>
          <h1 style={{ fontSize: "24px", color: "var(--color-primary-dark)", marginBottom: "6px" }}>
            Kitengela District Hospital
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>
            Electronic Health Records
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            <Field label="Email" required>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                required
                autoFocus
              />
            </Field>
            <Field label="Password" required>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
                required
              />
            </Field>

            <ErrorBanner message={error} />

            <Button type="submit" disabled={loading} style={{ width: "100%", marginTop: "4px" }}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </Card>

        <p style={{ textAlign: "center", fontSize: "12px", color: "var(--color-text-muted)", marginTop: "var(--space-5)" }}>
          Demo accounts: admin@hospital.ke / doctor@hospital.ke / nurse@hospital.ke / reception@hospital.ke<br />
          (passwords: role name + "123", e.g. admin123)
        </p>
      </div>
    </div>
  );
}
