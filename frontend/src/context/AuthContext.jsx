import { createContext, useContext, useState } from "react";
import { authApi } from "../api/endpoints";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("ehr_user");
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password) => {
    const data = await authApi.login(email, password);
    localStorage.setItem("ehr_token", data.access_token);
    localStorage.setItem("ehr_user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("ehr_token");
    localStorage.removeItem("ehr_user");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
